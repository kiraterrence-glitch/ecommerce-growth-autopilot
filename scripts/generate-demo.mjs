import { readFile } from "node:fs/promises";
import { analyzeResearchProject, assessResearchQuality, normalizeProduct, normalizeResearchProject, validateProduct, validateResearchProject } from "../dist/index.js";
import { buildCampaignKit, writeCampaignArtifacts, writeResearchArtifacts } from "./demo-artifacts.mjs";

const output = ".runtime/demo";
const raw = JSON.parse(await readFile("tests/fixtures/valid-product.json", "utf8"));
const brain = JSON.parse(await readFile("tests/fixtures/product-brain.json", "utf8"));
const rawResearch = JSON.parse(await readFile("tests/fixtures/research-project.json", "utf8"));
const checked = validateProduct(raw);
if (!checked.ok) throw new Error("demo product fixture is invalid");
const product = normalizeProduct(checked.product);
const researchChecked = validateResearchProject(rawResearch);
if (!researchChecked.ok) throw new Error("demo research fixture is invalid");
const researchProject = normalizeResearchProject(researchChecked.project);
const research = analyzeResearchProject(researchProject);
const researchQuality = assessResearchQuality(researchProject, research);
if (!researchQuality.passed) throw new Error("demo research quality gate failed");
const { kit, quality } = buildCampaignKit(product, brain, {
  mode: "deterministic_demo",
  aiProvider: "fixture",
  model: null,
  validation: "PASS",
  grounding: "PASS",
  research: "PASS",
}, research);
if (!quality.passed) {
  console.error(JSON.stringify(quality, null, 2));
  throw new Error("demo marketing quality gate failed");
}
await writeCampaignArtifacts(output, kit, quality);
await writeResearchArtifacts(output, research, researchQuality);
console.log(`Demo artifacts written to ${output}`);
console.log(`Marketing quality: PASS (${quality.warnings} warning(s))`);
