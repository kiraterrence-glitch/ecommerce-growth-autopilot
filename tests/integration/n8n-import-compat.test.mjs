import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

test("committed n8n exports carry stable import-compatible workflow IDs", async () => {
  const directory = "n8n/workflows";
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  const ids = new Set();
  assert.ok(files.length > 0, "expected committed n8n workflow exports");

  for (const file of files) {
    const workflow = JSON.parse(await readFile(join(directory, file), "utf8"));
    assert.equal(typeof workflow.id, "string", `${file}: workflow id must be a string`);
    assert.match(workflow.id, /^[A-Za-z0-9_-]{8,64}$/, `${file}: workflow id must be import-compatible`);
    assert.equal(ids.has(workflow.id), false, `${file}: workflow id must be unique`);
    ids.add(workflow.id);
    assert.equal(workflow.active, false, `${file}: committed workflow must stay inactive`);
  }
});
