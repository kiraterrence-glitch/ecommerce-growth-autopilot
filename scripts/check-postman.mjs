import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const directory = "postman";
const files = await readdir(directory);
const collections = files.filter((name) => name.endsWith(".postman_collection.json"));
const environments = files.filter((name) => name.endsWith(".postman_environment.json"));

if (collections.length < 1) throw new Error("postman: at least one collection is required");
if (environments.length < 1) throw new Error("postman: at least one environment is required");

const forbiddenPatterns = [
  /authorization\s*:\s*bearer\s+[a-z0-9._-]{12,}/i,
  /["'](?:api[_-]?key|access[_-]?token|secret)["']\s*:\s*["'][^"']{8,}["']/i,
];

for (const file of [...collections, ...environments]) {
  const path = join(directory, file);
  const raw = await readFile(path, "utf8");
  JSON.parse(raw);
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(raw)) throw new Error(`${path}: possible committed credential detected`);
  }
}

const collection = JSON.parse(await readFile(join(directory, collections[0]), "utf8"));
const names = (collection.item || []).map((item) => item.name);
for (const expected of [
  "Ollama Models",
  "Ollama JSON Smoke",
  "Health",
  "Readiness",
  "Generate Product Brain",
  "Analyze Product Research",
  "Generate Research-Aware Campaign Kit",
  "Delivery Capabilities",
  "Campaign History",
  "Unapproved Delivery Is Blocked",
  "Demo Timeline",
  "Live Delivery Mode Is Blocked",
  "Latest Local n8n Engine Proof",
  "Reject Invalid Product",
]) {
  if (!names.includes(expected)) throw new Error(`postman collection missing request: ${expected}`);
}


function flattenItems(items) {
  return (items || []).flatMap((item) => item.item ? flattenItems(item.item) : [item]);
}
for (const item of flattenItems(collection.item)) {
  const rawUrl = typeof item.request?.url === "string" ? item.request.url : item.request?.url?.raw;
  if (!rawUrl) continue;
  if (!rawUrl.startsWith("{{baseUrl}}/") && !rawUrl.startsWith("{{ollamaUrl}}/")) {
    throw new Error(`postman request ${item.name}: URL must use local baseUrl/ollamaUrl variables; got ${rawUrl}`);
  }
}

const environment = JSON.parse(await readFile(join(directory, environments[0]), "utf8"));
const values = Object.fromEntries((environment.values || []).map((entry) => [entry.key, entry.value]));
if (values.baseUrl !== "http://127.0.0.1:3001") {
  throw new Error(`postman local environment must default baseUrl to http://127.0.0.1:3001; got ${values.baseUrl}`);
}
if (values.ollamaUrl !== "http://127.0.0.1:11434") {
  throw new Error(`postman local environment must default ollamaUrl to http://127.0.0.1:11434; got ${values.ollamaUrl}`);
}
if (values.ollamaModel !== "qwen3-vl:4b") {
  throw new Error(`postman local environment must default ollamaModel to qwen3-vl:4b; got ${values.ollamaModel}`);
}

console.log(`Postman validation passed (${collections.length} collection, ${environments.length} environment)`);
