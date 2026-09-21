import { readFile } from "node:fs/promises";
import { OllamaProvider, generateProductBrain, validateProduct } from "../dist/index.js";
import { loadLocalEnv } from "./env.mjs";

await loadLocalEnv();

const baseUrl = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
let model = process.env.OLLAMA_MODEL?.trim();

if (!model) {
  const response = await fetch(`${baseUrl}/api/tags`);
  if (!response.ok) throw new Error(`Could not list Ollama models: HTTP ${response.status}`);
  const payload = await response.json();
  model = payload.models?.[0]?.name;
}

if (!model) throw new Error("No Ollama model is available. Pull a model or set OLLAMA_MODEL.");

const rawProduct = JSON.parse(
  await readFile(new URL("../tests/fixtures/valid-product.json", import.meta.url), "utf8"),
);
const validation = validateProduct(rawProduct);
if (!validation.ok) {
  throw new Error(`Fixture product is invalid: ${JSON.stringify(validation.issues)}`);
}

console.log(`Using Ollama model: ${model}`);
const brain = await generateProductBrain(
  validation.product,
  new OllamaProvider({
    baseUrl,
    model,
    timeoutMs: 120_000,
    think: (process.env.OLLAMA_THINK || "false").toLowerCase() === "true",
  }),
);
console.log(JSON.stringify(brain, null, 2));
console.log("OLLAMA PRODUCT BRAIN SMOKE TEST PASSED");
