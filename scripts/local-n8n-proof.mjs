import { readFile } from "node:fs/promises";
import { buildLocalN8nWebhookUrl } from "../dist/index.js";

const baseUrl = process.env.N8N_LOCAL_URL || "http://127.0.0.1:5678";
const testMode = (process.env.N8N_TEST_WEBHOOK || "false").toLowerCase() === "true";
const webhookUrl = buildLocalN8nWebhookUrl(baseUrl, "ecom-full-demo", testMode);
const product = JSON.parse(await readFile("tests/fixtures/valid-product.json", "utf8"));
const research = JSON.parse(await readFile("tests/fixtures/research-project.json", "utf8"));

console.log("Local n8n portfolio proof");
console.log(`Target: ${webhookUrl}`);
console.log("Safety: loopback URL enforced; n8n Cloud URLs are rejected by this script.");

let response;
try {
  response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product, research }),
  });
} catch (error) {
  console.error("LOCAL N8N PROOF NOT RUN");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("Start local n8n, import n8n/workflows/full-portfolio-demo.local.json, then activate it (or use test-webhook mode) and rerun.");
  process.exit(2);
}

const text = await response.text();
let body = null;
try { body = JSON.parse(text); } catch { /* show raw body below */ }
if (!response.ok) {
  console.error(`LOCAL N8N PROOF FAILED: HTTP ${response.status}`);
  console.error(body ? JSON.stringify(body, null, 2) : text);
  process.exit(1);
}

const status = body?.status;
if (!body?.ok || !status || !Array.isArray(status.timeline)) {
  console.error("LOCAL N8N PROOF FAILED: response did not contain the expected demo timeline");
  console.error(body ? JSON.stringify(body, null, 2) : text);
  process.exit(1);
}
if (status.safety?.externalWrites !== false || status.safety?.livePublishing !== false) {
  console.error("LOCAL N8N PROOF FAILED: safety state is not local-only");
  process.exit(1);
}

console.log(`Campaign: ${status.campaignId}`);
for (const step of status.timeline) console.log(`[${step.status}] ${step.label} — ${step.detail}`);
console.log("LOCAL N8N PROOF PASSED");
console.log("Expected initial state: human approval may be WAITING and local delivery may be BLOCKED until you explicitly approve assets.");
