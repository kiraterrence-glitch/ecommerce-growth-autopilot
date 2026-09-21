import { readFile } from "node:fs/promises";
import {
  analyzeResearchProject,
  assessResearchQuality,
  normalizeResearchProject,
  validateResearchProject,
} from "../dist/index.js";

const raw = JSON.parse(await readFile("tests/fixtures/research-project.json", "utf8"));
const checked = validateResearchProject(raw);
if (!checked.ok) {
  console.error(JSON.stringify(checked.issues, null, 2));
  process.exit(1);
}
const project = normalizeResearchProject(checked.project);
const analysis = analyzeResearchProject(project);
const quality = assessResearchQuality(project, analysis);
if (!quality.passed) {
  console.error(JSON.stringify(quality, null, 2));
  process.exit(1);
}
console.log(`research quality check passed (${quality.warnings} warning(s))`);
