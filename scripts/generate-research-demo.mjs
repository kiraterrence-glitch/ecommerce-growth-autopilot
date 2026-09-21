import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  analyzeResearchProject,
  assessResearchQuality,
  createProductResearchContext,
  normalizeResearchProject,
  validateResearchProject,
} from "../dist/index.js";

const output = ".runtime/research-demo";
const raw = JSON.parse(await readFile("tests/fixtures/research-project.json", "utf8"));
const checked = validateResearchProject(raw);
if (!checked.ok) throw new Error(`research fixture invalid: ${JSON.stringify(checked.issues)}`);
const project = normalizeResearchProject(checked.project);
const analysis = analyzeResearchProject(project);
const quality = assessResearchQuality(project, analysis);
if (!quality.passed) throw new Error(`research quality gate failed: ${JSON.stringify(quality.issues)}`);
await mkdir(output, { recursive: true });
await writeFile(`${output}/research-project.json`, JSON.stringify(project, null, 2), "utf8");
await writeFile(`${output}/research-analysis.json`, JSON.stringify(analysis, null, 2), "utf8");
await writeFile(`${output}/research-quality-report.json`, JSON.stringify(quality, null, 2), "utf8");
await writeFile(`${output}/product-research-context.json`, JSON.stringify(createProductResearchContext(analysis), null, 2), "utf8");
console.log(`Research demo artifacts written to ${output}`);
console.log(`Research quality: PASS (${quality.warnings} warning(s))`);
