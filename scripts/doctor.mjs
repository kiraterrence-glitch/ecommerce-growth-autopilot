import { access, readFile } from "node:fs/promises";
import process from "node:process";
import { loadLocalEnv } from "./env.mjs";

await loadLocalEnv();

const requireOllama = process.argv.includes("--require-ollama");
const results = [];
const pass = (name, detail) => results.push({ status: "PASS", name, detail });
const warn = (name, detail) => results.push({ status: "WARN", name, detail });
const fail = (name, detail) => results.push({ status: "FAIL", name, detail });

const major = Number(process.versions.node.split(".")[0]);
if (major >= 22) pass("Node", process.version);
else fail("Node", `${process.version}; Node 22+ is required`);

for (const path of [
  "package.json",
  "tsconfig.json",
  "tests/fixtures/valid-product.json",
  "postman/Ecom Growth Autopilot.postman_collection.json",
  "postman/Local.postman_environment.json",
]) {
  try {
    await access(path);
    pass("Project file", path);
  } catch {
    fail("Project file", `${path} is missing`);
  }
}

const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();
if (["mock", "ollama"].includes(provider)) pass("AI provider", provider);
else fail("AI provider", `unsupported AI_PROVIDER=${provider}`);

const baseUrl = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const configuredModel = process.env.OLLAMA_MODEL?.trim() || "qwen3-vl:4b";
let models = [];
let ollamaReachable = false;
try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    models = Array.isArray(payload.models)
      ? payload.models.map((model) => model?.name).filter((name) => typeof name === "string" && name)
      : [];
    ollamaReachable = true;
    pass("Ollama API", `${baseUrl} (${models.length} model${models.length === 1 ? "" : "s"})`);
  } finally {
    clearTimeout(timeout);
  }
} catch (error) {
  const detail = `${baseUrl}: ${error instanceof Error ? error.message : String(error)}`;
  if (provider === "ollama" || requireOllama) fail("Ollama API", detail);
  else warn("Ollama API", `${detail}; optional while AI_PROVIDER=mock`);
}

if (ollamaReachable) {
  if (models.includes(configuredModel)) {
    pass("Ollama model", configuredModel);
  } else {
    const detail = `${configuredModel} is not installed. Available: ${models.join(", ") || "none"}`;
    if (provider === "ollama" || requireOllama) fail("Ollama model", detail);
    else warn("Ollama model", detail);
  }
}

try {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  for (const script of ["verify", "validate:postman", "ollama:smoke", "dev:ollama"]) {
    if (packageJson?.scripts?.[script]) pass("Package script", `npm run ${script}`);
    else fail("Package script", `package.json is missing scripts.${script}`);
  }
} catch (error) {
  fail("Package scripts", error instanceof Error ? error.message : String(error));
}

for (const result of results) {
  console.log(`[${result.status}] ${result.name}: ${result.detail}`);
}

const failures = results.filter((result) => result.status === "FAIL");
const warnings = results.filter((result) => result.status === "WARN");
if (failures.length > 0) {
  console.error(`\nDOCTOR FAILED (${failures.length} failure${failures.length === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log(`\nDOCTOR PASSED${warnings.length > 0 ? ` WITH ${warnings.length} WARNING${warnings.length === 1 ? "" : "S"}` : ""}`);
