import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public repository state and CI permissions are explicit", async () => {
  const workflow = await readFile(".github/workflows/verify.yml", "utf8");
  const state = JSON.parse(await readFile("PROJECT-STATE.json", "utf8"));
  const checklist = await readFile("docs/RELEASE-CHECKLIST.md", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const readme = await readFile("README.md", "utf8");
  const captureScript = await readFile("scripts/capture-portfolio-proof.mjs", "utf8");

  assert.match(workflow, /^permissions:\s*\n\s+contents: read$/m);
  assert.match(state.currentPhase, /github source repository published/i);
  assert.equal(state.verification.verifiedOn, "2026-09-23");
  assert.ok(!state.next.some((item) => /publish .*github|github publication/i.test(item)));
  for (const completed of [
    "`npm run verify` is green",
    "`portfolio-release-preflight-windows.cmd` is green after the actual engine proof",
    "`finish-portfolio-proof-windows.cmd` completes",
  ]) {
    assert.ok(
      checklist.split(/\r?\n/).some((line) => line.startsWith("- [x] ") && line.includes(completed)),
      `release checklist contradicts verified state for ${completed}`,
    );
  }
  assert.equal(packageJson.scripts["portfolio:capture"], "node scripts/capture-portfolio-proof.mjs");
  assert.match(captureScript, /127\.0\.0\.1/);
  assert.match(captureScript, /externalWrites=false/);
  assert.match(captureScript, /livePublishing=false/);
  assert.match(captureScript, /querySelector\([^\n]+\.active/);
  assert.match(captureScript, /maxRetries:\s*5/);
  for (const screenshot of [
    "dashboard-run-timeline.png",
    "research-unit-economics.png",
    "product-brain.png",
    "campaign-drafts.png",
    "approval-delivery-blocked.png",
    "local-n8n-engine-proof.png",
  ]) {
    await readFile(`docs/screenshots/${screenshot}`);
    assert.match(readme, new RegExp(`docs/screenshots/${screenshot.replaceAll(".", "\\.")}`));
  }
  assert.match(checklist, /^- \[x\] README screenshots show/m);
});
