import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("n8n engine proof uses an isolated local CLI profile and disables network diagnostics", async () => {
  const source = await readFile("scripts/run-n8n-engine-proof.mjs", "utf8");
  assert.match(source, /N8N_USER_FOLDER:\s*n8nProfileRoot/);
  assert.match(source, /n8n-engine-profile-\$\{runId\}/);
  assert.match(source, /N8N_DIAGNOSTICS_ENABLED:\s*"false"/);
  assert.match(source, /N8N_PERSONALIZATION_ENABLED:\s*"false"/);
  assert.match(source, /N8N_VERSION_NOTIFICATIONS_ENABLED:\s*"false"/);
});
