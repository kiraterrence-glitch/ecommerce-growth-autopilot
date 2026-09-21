import { readFile } from "node:fs/promises";
import {
  analyzeResearchProject,
  assessResearchQuality,
  createProductResearchContext,
  generateProductBrain,
  normalizeProduct,
  normalizeResearchProject,
  OllamaProvider,
  validateProduct,
  validateResearchProject,
} from "../dist/index.js";
import { loadLocalEnv } from "./env.mjs";
import { buildCampaignKit, writeCampaignArtifacts, writeResearchArtifacts } from "./demo-artifacts.mjs";

await loadLocalEnv();
const output = ".runtime/demo-live";
const raw = JSON.parse(await readFile("tests/fixtures/valid-product.json", "utf8"));
const rawResearch = JSON.parse(await readFile("tests/fixtures/research-project.json", "utf8"));
const checked = validateProduct(raw);
if (!checked.ok) throw new Error("demo product fixture is invalid");
const product = normalizeProduct(checked.product);
const researchChecked = validateResearchProject(rawResearch);
if (!researchChecked.ok) throw new Error("demo research fixture is invalid");
const researchProject = normalizeResearchProject(researchChecked.project);
const research = analyzeResearchProject(researchProject);
const researchQuality = assessResearchQuality(researchProject, research);
if (!researchQuality.passed) throw new Error("live demo research quality gate failed");
const researchContext = createProductResearchContext(research);
const model = process.env.OLLAMA_MODEL || "qwen3-vl:4b";
const provider = new OllamaProvider({
  baseUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
  model,
  think: (process.env.OLLAMA_THINK || "false").toLowerCase() === "true",
  timeoutMs: 90_000,
});
console.log(`Generating live Product Brain with Ollama model: ${model}`);
const startedAt = Date.now();
const brain = await generateProductBrain(product, provider, researchContext);
const durationMs = Date.now() - startedAt;
const { kit, quality } = buildCampaignKit(product, brain, {
  mode: "live_local_demo",
  aiProvider: "ollama",
  model,
  validation: "PASS",
  grounding: "PASS",
  durationMs,
  research: "PASS",
}, research);
if (!quality.passed) {
  console.error(JSON.stringify(quality, null, 2));
  throw new Error("live demo marketing quality gate failed");
}
await writeCampaignArtifacts(output, kit, quality);
await writeResearchArtifacts(output, research, researchQuality);
console.log(`Live demo artifacts written to ${output}`);
console.log(`Marketing quality: PASS (${quality.warnings} warning(s))`);
