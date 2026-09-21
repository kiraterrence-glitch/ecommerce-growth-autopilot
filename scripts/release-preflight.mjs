import { readFile } from "node:fs/promises";

let receipt;
try {
  receipt = JSON.parse(await readFile(".runtime/n8n-engine-proof.json", "utf8"));
} catch (error) {
  if (error && typeof error === "object" && error.code === "ENOENT") {
    console.error("RELEASE PREFLIGHT BLOCKED: .runtime/n8n-engine-proof.json is missing.");
    console.error("Run engine-proof-local-n8n-windows.cmd on the Windows machine first.");
    process.exit(2);
  }
  throw error;
}

const proof = receipt?.proof;
const failures = [];
if (receipt?.project !== "Ecom Growth Autopilot") failures.push("unexpected project identity");
if (receipt?.source !== "local n8n CLI engine execution") failures.push("proof source is not the local n8n CLI engine");
if (receipt?.cloudExecutionsUsed !== 0) failures.push("cloud execution count is not zero");
if (typeof receipt?.n8nVersion !== "string" || !/^2\./.test(receipt.n8nVersion)) failures.push("n8n 2.x version was not captured");
if (proof?.proofType !== "local_n8n_engine") failures.push("wrong proof type");
if (proof?.aiProvider !== "mock" || proof?.aiModel !== "deterministic-mock") failures.push("engine proof was not deterministic mock mode");
if (proof?.coreStagesPassed !== true) failures.push("core stages did not pass");
if (proof?.externalWrites !== false) failures.push("external writes are not disabled");
if (proof?.livePublishing !== false) failures.push("live publishing is not disabled");
if (proof?.approvalStatus !== "WAITING") failures.push("human approval gate was not WAITING");
if (proof?.deliveryStatus !== "BLOCKED") failures.push("delivery gate was not BLOCKED");
if (!Number.isFinite(Date.parse(proof?.verifiedAt || ""))) failures.push("proof timestamp is invalid");

if (failures.length > 0) {
  console.error("RELEASE PREFLIGHT FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("release preflight passed");
console.log(`n8n ${receipt.n8nVersion}; campaign ${proof.campaignId}`);
console.log("local engine proof verified; cloud executions=0; external writes=false; live publishing=false");
