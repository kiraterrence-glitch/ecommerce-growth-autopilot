import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public repository state and CI permissions are explicit", async () => {
  const workflow = await readFile(".github/workflows/verify.yml", "utf8");
  const state = JSON.parse(await readFile("PROJECT-STATE.json", "utf8"));
  const checklist = await readFile("docs/RELEASE-CHECKLIST.md", "utf8");

  assert.match(workflow, /^permissions:\s*\n\s+contents: read$/m);
  assert.match(state.currentPhase, /github source repository published/i);
  assert.equal(state.verification.verifiedOn, "2026-09-22");
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
  assert.match(checklist, /^- \[ \] README screenshots show/m);
});
