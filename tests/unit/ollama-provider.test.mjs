import assert from "node:assert/strict";
import test from "node:test";
import { OllamaProvider } from "../../dist/ai/ollama-provider.js";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Ollama provider uses chat JSON mode, disables thinking by default, and parses content", async () => {
  let captured;
  let capturedUrl;
  globalThis.fetch = async (url, options) => {
    capturedUrl = String(url);
    captured = JSON.parse(options.body);
    return new Response(JSON.stringify({ message: { role: "assistant", content: '{"ok":true}' } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const provider = new OllamaProvider({ model: "local-test-model" });
  const result = await provider.generateJson({ system: "system", prompt: "prompt", temperature: 0.1 });
  assert.deepEqual(result, { ok: true });
  assert.match(capturedUrl, /\/api\/chat$/);
  assert.equal(captured.model, "local-test-model");
  assert.equal(captured.format, "json");
  assert.equal(captured.stream, false);
  assert.equal(captured.think, false);
  assert.deepEqual(captured.messages, [
    { role: "system", content: "system" },
    { role: "user", content: "prompt" },
  ]);
});

test("Ollama provider safely accepts qwen3-vl JSON from message.thinking when content is empty", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ message: { role: "assistant", content: "", thinking: '{"ok":true}' } }),
      { status: 200 },
    );
  const provider = new OllamaProvider({ model: "qwen3-vl:4b" });
  const result = await provider.generateJson({ system: "system", prompt: "prompt" });
  assert.deepEqual(result, { ok: true });
});

test("Ollama provider prefers normal content over thinking fallback", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: { role: "assistant", content: '{"source":"content"}', thinking: '{"source":"thinking"}' },
      }),
      { status: 200 },
    );
  const provider = new OllamaProvider({ model: "local-test-model" });
  const result = await provider.generateJson({ system: "system", prompt: "prompt" });
  assert.deepEqual(result, { source: "content" });
});

test("Ollama provider remains compatible with generate-style response payloads", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ response: '{"ok":true}' }), { status: 200 });
  const provider = new OllamaProvider({ model: "local-test-model" });
  const result = await provider.generateJson({ system: "system", prompt: "prompt" });
  assert.deepEqual(result, { ok: true });
});

test("Ollama provider tolerates fenced JSON while still validating parsed data downstream", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: { content: '```json\n{"ok":true}\n```' } }), { status: 200 });
  const provider = new OllamaProvider({ model: "local-test-model" });
  const result = await provider.generateJson({ system: "system", prompt: "prompt" });
  assert.deepEqual(result, { ok: true });
});

test("Ollama provider extracts one JSON object from harmless surrounding text", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: { content: 'Result:\n{"ok":true}\nDone.' } }), { status: 200 });
  const provider = new OllamaProvider({ model: "local-test-model" });
  const result = await provider.generateJson({ system: "system", prompt: "prompt" });
  assert.deepEqual(result, { ok: true });
});

test("Ollama provider fails closed when thinking fallback is not valid JSON", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: { content: "", thinking: "not-json" } }), { status: 200 });
  const provider = new OllamaProvider({ model: "local-test-model" });
  await assert.rejects(
    () => provider.generateJson({ system: "system", prompt: "prompt" }),
    /did not return valid JSON/,
  );
});

test("Ollama provider reports all checked response fields when nothing usable is returned", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: { content: "", thinking: "" }, response: "", thinking: "" }), {
      status: 200,
    });
  const provider = new OllamaProvider({ model: "local-test-model" });
  await assert.rejects(
    () => provider.generateJson({ system: "system", prompt: "prompt" }),
    /message\.content, response, message\.thinking, or thinking/,
  );
});
