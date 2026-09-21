import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = "n8n/workflows/engine-proof-cli.local.json";

async function loadWorkflow() {
  return JSON.parse(await readFile(workflowPath, "utf8"));
}

function nodeByName(workflow, name) {
  return workflow.nodes.find((node) => node.name === name);
}

test("CLI engine-proof workflow is inactive, manual, local-only, and credential-free", async () => {
  const workflow = await loadWorkflow();
  assert.equal(workflow.id, "EcomEngineProof0920");
  assert.equal(workflow.active, false);
  assert.equal(nodeByName(workflow, "Manual Trigger")?.type, "n8n-nodes-base.manualTrigger");
  assert.equal(workflow.nodes.some((node) => node.type === "n8n-nodes-base.webhook"), false);
  assert.equal(JSON.stringify(workflow).includes('"credentials"'), false);
  assert.equal(
    workflow.nodes.some((node) => ["n8n-nodes-base.code", "n8n-nodes-base.function", "n8n-nodes-base.functionItem"].includes(node.type)),
    false,
  );
});

test("CLI engine-proof workflow embeds the canonical product and research fixtures", async () => {
  const workflow = await loadWorkflow();
  const expectedProduct = JSON.parse(await readFile("tests/fixtures/valid-product.json", "utf8"));
  const expectedResearch = JSON.parse(await readFile("tests/fixtures/research-project.json", "utf8"));
  const researchBody = JSON.parse(nodeByName(workflow, "Verify Research Evidence").parameters.body);
  const campaignBody = JSON.parse(nodeByName(workflow, "Generate Verified Campaign").parameters.body);
  assert.deepEqual(researchBody, expectedResearch);
  assert.deepEqual(campaignBody, { product: expectedProduct, research: expectedResearch });
});

test("CLI engine-proof workflow ends at the fail-closed local safety assertion endpoint", async () => {
  const workflow = await loadWorkflow();
  const httpNodes = workflow.nodes.filter((node) => node.type === "n8n-nodes-base.httpRequest");
  assert.equal(httpNodes.length, 4);
  for (const node of httpNodes) {
    assert.match(node.parameters.url, /^=?http:\/\/127\.0\.0\.1:3011\//);
  }
  const assertNode = nodeByName(workflow, "Assert Local Safety");
  assert.equal(assertNode.parameters.url, "http://127.0.0.1:3011/proof/assert-local-safety");
  assert.equal(assertNode.parameters.body, "={{ JSON.stringify($json) }}");
  assert.deepEqual(workflow.connections["Read Demo Timeline"].main[0][0], {
    node: "Assert Local Safety",
    type: "main",
    index: 0,
  });
});
