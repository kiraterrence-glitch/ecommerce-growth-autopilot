import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.N8N_ENGINE_PROOF_API || "http://127.0.0.1:3011";
const output = process.env.N8N_ENGINE_PROOF_RECEIPT || ".runtime/n8n-engine-proof.json";

const response = await fetch(`${baseUrl}/proof/latest`);
if (!response.ok) {
  const text = await response.text();
  throw new Error(`proof receipt unavailable: HTTP ${response.status} ${text}`);
}
const body = await response.json();
const payload = body?.proof?.payload;
if (
  body?.ok !== true ||
  payload?.proofType !== "local_n8n_engine" ||
  payload?.aiProvider !== "mock" ||
  payload?.aiModel !== "deterministic-mock" ||
  payload?.coreStagesPassed !== true ||
  payload?.externalWrites !== false ||
  payload?.livePublishing !== false ||
  payload?.approvalStatus !== "WAITING" ||
  payload?.deliveryStatus !== "BLOCKED"
) {
  throw new Error("latest proof receipt does not satisfy the local-only safety contract");
}

const receipt = {
  project: "Ecom Growth Autopilot",
  proof: payload,
  n8nVersion: process.env.N8N_VERSION || null,
  capturedAt: new Date().toISOString(),
  source: "local n8n CLI engine execution",
  runId: process.env.N8N_ENGINE_PROOF_RUN_ID || null,
  cloudExecutionsUsed: 0,
};
await mkdir(".runtime", { recursive: true });
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(`n8n engine proof receipt written: ${output}`);
console.log(`campaign: ${payload.campaignId}`);
console.log("core stages: PASS; safety: externalWrites=false, livePublishing=false");
console.log("approval: WAITING; delivery: BLOCKED (expected before human approval)");
