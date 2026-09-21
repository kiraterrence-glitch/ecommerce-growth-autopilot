import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WORKFLOW_PATH = "n8n/workflows/full-portfolio-demo.local.json";

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : null;
      probe.close((error) => {
        if (error) reject(error);
        else if (!port) reject(new Error("failed to allocate a local test port"));
        else resolve(port);
      });
    });
  });
}

function collect(stream) {
  let value = "";
  stream?.setEncoding("utf8");
  stream?.on("data", (chunk) => { value += chunk; });
  return () => value.trim();
}

async function waitForHealth(child, baseUrl, logs) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`local API exited early (${child.exitCode})\n${logs.stderr()}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`local API did not become healthy\nstdout:\n${logs.stdout()}\nstderr:\n${logs.stderr()}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function requireNode(workflow, name, type) {
  const node = workflow.nodes.find((entry) => entry.name === name);
  assert.ok(node, `missing n8n node: ${name}`);
  assert.equal(node.type, type, `${name} node type changed`);
  return node;
}

function assertConnection(workflow, from, to) {
  const targets = workflow.connections?.[from]?.main?.[0] || [];
  assert.ok(targets.some((target) => target.node === to), `missing n8n connection: ${from} -> ${to}`);
}

const workflow = JSON.parse(await readFile(WORKFLOW_PATH, "utf8"));
const webhook = requireNode(workflow, "Full Demo Webhook", "n8n-nodes-base.webhook");
const researchNode = requireNode(workflow, "Verify Research Evidence", "n8n-nodes-base.httpRequest");
const campaignNode = requireNode(workflow, "Generate Verified Campaign", "n8n-nodes-base.httpRequest");
const statusNode = requireNode(workflow, "Read Demo Timeline", "n8n-nodes-base.httpRequest");
const responseNode = requireNode(workflow, "Return Portfolio Proof", "n8n-nodes-base.respondToWebhook");

assert.equal(workflow.active, false, "portfolio workflow must stay inactive in git");
assert.equal(webhook.parameters.path, "ecom-full-demo");
assert.equal(researchNode.parameters.body, '={{ JSON.stringify($node["Full Demo Webhook"].json.body.research) }}');
assert.equal(campaignNode.parameters.body, '={{ JSON.stringify($node["Full Demo Webhook"].json.body) }}');
assert.match(statusNode.parameters.url, /campaignId=\{\{ \$json\.campaignId \}\}/);
assert.equal(responseNode.parameters.responseBody, "={{ JSON.stringify($json) }}");
assertConnection(workflow, "Full Demo Webhook", "Verify Research Evidence");
assertConnection(workflow, "Verify Research Evidence", "Generate Verified Campaign");
assertConnection(workflow, "Generate Verified Campaign", "Read Demo Timeline");
assertConnection(workflow, "Read Demo Timeline", "Return Portfolio Proof");

const product = JSON.parse(await readFile("tests/fixtures/valid-product.json", "utf8"));
const research = JSON.parse(await readFile("tests/fixtures/research-project.json", "utf8"));
const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = await mkdtemp(join(tmpdir(), "ecom-n8n-contract-"));
const child = spawn(process.execPath, ["scripts/local-api.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    LOCAL_API_PORT: String(port),
    AI_PROVIDER: "mock",
    LOG_LEVEL: "silent",
    PROJECT_HISTORY_PATH: join(tempDir, "project-history.jsonl"),
    AUDIT_PATH: join(tempDir, "audit.jsonl"),
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
const logs = { stdout: collect(child.stdout), stderr: collect(child.stderr) };

try {
  await waitForHealth(child, baseUrl, logs);
  console.log("Local n8n workflow contract");
  console.log(`[PASS] Full Demo Webhook -> ${webhook.parameters.path}`);

  const researchResponse = await fetch(`${baseUrl}/research/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(research),
  });
  assert.equal(researchResponse.status, 200);
  const researchPayload = await researchResponse.json();
  assert.equal(researchPayload.ok, true);
  assert.equal(researchPayload.quality.passed, true);
  console.log("[PASS] Verify Research Evidence -> research quality passed");

  const campaignResponse = await fetch(`${baseUrl}/campaign-kit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product, research }),
  });
  assert.equal(campaignResponse.status, 200);
  const campaignPayload = await campaignResponse.json();
  assert.equal(campaignPayload.ok, true);
  assert.equal(campaignPayload.quality.passed, true);
  assert.equal(campaignPayload.researchQuality.passed, true);
  assert.equal(typeof campaignPayload.campaignId, "string");
  console.log(`[PASS] Generate Verified Campaign -> ${campaignPayload.campaignId}`);

  const statusResponse = await fetch(`${baseUrl}/demo/status?campaignId=${encodeURIComponent(campaignPayload.campaignId)}`);
  assert.equal(statusResponse.status, 200);
  const statusPayload = await statusResponse.json();
  assert.equal(statusPayload.ok, true);
  assert.ok(Array.isArray(statusPayload.status.timeline));
  assert.equal(statusPayload.status.safety.externalWrites, false);
  assert.equal(statusPayload.status.safety.livePublishing, false);
  assert.equal(statusPayload.status.timeline.find((step) => step.id === "approval")?.status, "WAITING");
  assert.equal(statusPayload.status.timeline.find((step) => step.id === "delivery")?.status, "BLOCKED");
  console.log("[PASS] Read Demo Timeline -> approval WAITING, delivery BLOCKED");
  console.log("[PASS] Return Portfolio Proof -> structured JSON contract valid");
  console.log("[PASS] Safety -> externalWrites=false, livePublishing=false");
  console.log("N8N WORKFLOW CONTRACT PASSED");
  console.log("Note: this validates the exact committed workflow contract against the real local API. It is not a substitute for one final run inside the n8n runtime.");
} finally {
  await stopChild(child);
  await rm(tempDir, { recursive: true, force: true });
}
