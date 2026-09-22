import { readdir, readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const state = JSON.parse(await readFile("PROJECT-STATE.json", "utf8"));
const readme = await readFile("README.md", "utf8");
const continuation = await readFile("CONTINUE-LATER.md", "utf8");
const required = ["CONTINUE-LATER.md", "docs/WORK-HANDOFF.md", "docs/V0.9.3-REPORT.md", "docs/PROJECT-INVENTORY.md", "docs/ARCHITECTURE.md", "docs/BUILD-PLAN.md", "docs/DECISIONS.md", "docs/PORTFOLIO-CASE-STUDY.md", "docs/DEMO-SCRIPT.md", "docs/GITHUB-PUBLISH.md", "CLAUDE.md", "AGENTS.md"];

const errors = [];
if (state.version !== packageJson.version) errors.push(`PROJECT-STATE version ${state.version} does not match package ${packageJson.version}`);
if (state.safety?.n8nCloudExecutionsUsed !== 0) errors.push("n8nCloudExecutionsUsed must remain 0 until an explicitly recorded cloud proof run");
if (state.safety?.externalWritesEnabled !== false) errors.push("externalWritesEnabled must be false in the portfolio baseline");
if (state.safety?.livePublishingSupported !== false) errors.push("livePublishingSupported must be false in the portfolio baseline");
if (state.safety?.humanApprovalRequired !== true) errors.push("humanApprovalRequired must remain true in the portfolio baseline");
if (!Array.isArray(state.readFirst) || state.readFirst[0] !== "PROJECT-STATE.json") errors.push("readFirst must start with PROJECT-STATE.json");
const canonicalTestSummary = `${state.verification?.deterministicTestCount} tests`;
if (!readme.includes(canonicalTestSummary)) {
  errors.push(`README must state the canonical deterministic count: ${canonicalTestSummary}`);
}
if (!continuation.includes(`${canonicalTestSummary}, ${state.verification?.n8nWorkflowExports} n8n exports`)) {
  errors.push("CONTINUE-LATER must match the canonical test and n8n export counts");
}
if (/publish the source repository to github/i.test(continuation)) {
  errors.push("CONTINUE-LATER still says the already-published source repository is pending");
}

for (const path of required) {
  try {
    const text = await readFile(path, "utf8");
    if (!text.trim()) errors.push(`${path} is empty`);
    if (/\/mnt\/data\//.test(text) || /C:\\Users\\/i.test(text)) errors.push(`${path} contains a machine-specific path`);
  } catch {
    errors.push(`${path} is missing`);
  }
}

const testDirs = ["tests/unit", "tests/integration"];
let testCount = 0;
for (const dir of testDirs) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".test.mjs")) continue;
    const text = await readFile(`${dir}/${entry.name}`, "utf8");
    // Count declarations, not calls such as regularExpression.test(value) inside a test.
    testCount += (text.match(/^\s*test\s*\(/gm) || []).length;
  }
}
if (testCount !== state.verification?.deterministicTestCount) {
  errors.push(`PROJECT-STATE deterministicTestCount=${state.verification?.deterministicTestCount} but ${testCount} tests are declared`);
}

const workflowEntries = await readdir("n8n/workflows", { withFileTypes: true });
const workflowCount = workflowEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
if (workflowCount !== state.verification?.n8nWorkflowExports) {
  errors.push(`PROJECT-STATE n8nWorkflowExports=${state.verification?.n8nWorkflowExports} but ${workflowCount} workflow exports exist`);
}

if (errors.length) {
  console.error("handoff/state check failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`handoff/state check passed for v${state.version} (${testCount} tests, ${workflowCount} n8n exports)`);
