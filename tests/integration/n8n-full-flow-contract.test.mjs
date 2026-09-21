import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = "n8n/workflows/full-portfolio-demo.local.json";

function nodeByName(workflow, name) {
  return workflow.nodes.find((node) => node.name === name);
}

test("full portfolio n8n export matches the native-Windows local API contract", async () => {
  const workflow = JSON.parse(await readFile(workflowPath, "utf8"));
  const research = nodeByName(workflow, "Verify Research Evidence");
  const campaign = nodeByName(workflow, "Generate Verified Campaign");
  const status = nodeByName(workflow, "Read Demo Timeline");

  assert.equal(workflow.active, false);
  assert.equal(nodeByName(workflow, "Full Demo Webhook")?.parameters?.path, "ecom-full-demo");
  assert.equal(research?.parameters?.url, "http://127.0.0.1:3001/research/analyze");
  assert.equal(campaign?.parameters?.url, "http://127.0.0.1:3001/campaign-kit");
  assert.match(status?.parameters?.url || "", /^=http:\/\/127\.0\.0\.1:3001\/demo\/status\?campaignId=/);
});

test("full portfolio n8n export keeps business logic outside n8n", async () => {
  const workflow = JSON.parse(await readFile(workflowPath, "utf8"));
  const disallowed = new Set(["n8n-nodes-base.code", "n8n-nodes-base.function", "n8n-nodes-base.functionItem"]);
  assert.equal(workflow.nodes.some((node) => disallowed.has(node.type)), false);
  assert.equal(JSON.stringify(workflow).includes('"credentials"'), false);
});
