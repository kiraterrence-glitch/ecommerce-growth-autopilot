import assert from "node:assert/strict";
import test from "node:test";

import { buildWindowsCommand, quoteWindowsArg } from "../../scripts/windows-cmd.mjs";

test("Windows n8n CLI flags are not passed as literal quoted command tokens", () => {
  assert.equal(quoteWindowsArg("--version"), "--version");
  assert.equal(buildWindowsCommand("n8n", ["--version"]), "n8n --version");
  assert.equal(buildWindowsCommand("n8n", ["import:workflow", "--help"]), "n8n import:workflow --help");
  assert.equal(
    buildWindowsCommand("n8n", ["import:workflow", "--input=C:\\Users\\Test User\\workflow.json"]),
    'n8n import:workflow "--input=C:\\Users\\Test User\\workflow.json"',
  );
});
