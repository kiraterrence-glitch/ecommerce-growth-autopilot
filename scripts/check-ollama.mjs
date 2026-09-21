import { loadLocalEnv } from "./env.mjs";

await loadLocalEnv();

const baseUrl = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 3000);

try {
  const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const models = Array.isArray(payload.models)
    ? payload.models.map((model) => model.name).filter(Boolean)
    : [];
  console.log(`Ollama reachable at ${baseUrl}`);
  console.log(models.length > 0 ? `Models: ${models.join(", ")}` : "No local models reported.");
} catch (error) {
  console.error(
    `Ollama check failed at ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
