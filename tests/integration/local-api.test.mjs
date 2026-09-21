import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : null;
      probe.close((error) => {
        if (error) reject(error);
        else if (!port) reject(new Error("failed to allocate an isolated test port"));
        else resolve(port);
      });
    });
  });
}

function collect(stream) {
  let value = "";
  stream?.setEncoding("utf8");
  stream?.on("data", (chunk) => {
    value += chunk;
  });
  return () => value.trim();
}

async function waitForHealth(child, baseUrl, logs) {
  const deadline = Date.now() + 10_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `local API exited before becoming healthy (exit=${child.exitCode})\nstdout:\n${logs.stdout() || "<empty>"}\nstderr:\n${logs.stderr() || "<empty>"}`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `local API did not become healthy within 10s; last error: ${lastError}\nstdout:\n${logs.stdout() || "<empty>"}\nstderr:\n${logs.stderr() || "<empty>"}`,
  );
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

test("local API validates product and returns a grounded mock Product Brain", async (context) => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const tempDir = await mkdtemp(join(tmpdir(), "ecom-api-history-"));
  context.after(() => rm(tempDir, { recursive: true, force: true }));
  const child = spawn(process.execPath, ["scripts/local-api.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LOCAL_API_PORT: String(port),
      AI_PROVIDER: "mock",
      LOG_LEVEL: "info",
      PROJECT_HISTORY_PATH: join(tempDir, "project-history.jsonl"),
      AUDIT_PATH: join(tempDir, "audit.jsonl"),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const logs = { stdout: collect(child.stdout), stderr: collect(child.stderr) };
  context.after(async () => stopChild(child));
  await waitForHealth(child, baseUrl, logs);

  const dashboardResponse = await fetch(`${baseUrl}/dashboard`);
  assert.equal(dashboardResponse.status, 200);
  const dashboardHtml = await dashboardResponse.text();
  assert.match(dashboardHtml, /Ecom Growth Autopilot/);

  const capabilitiesResponse = await fetch(`${baseUrl}/delivery/capabilities`);
  assert.equal(capabilitiesResponse.status, 200);
  const capabilitiesPayload = await capabilitiesResponse.json();
  assert.equal(capabilitiesPayload.liveSupported, false);
  assert.equal(capabilitiesPayload.externalWritesEnabled, false);

  const approvalReview = await fetch(`${baseUrl}/approval/transition`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ record: { assetId: "meta-0", status: "DRAFT", note: null }, next: "IN_REVIEW" }),
  });
  assert.equal(approvalReview.status, 200);
  const approvalPayload = await approvalReview.json();
  assert.equal(approvalPayload.record.status, "IN_REVIEW");

  const invalidApproval = await fetch(`${baseUrl}/approval/transition`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ record: { assetId: "meta-0", status: "DRAFT", note: null }, next: "APPROVED" }),
  });
  assert.equal(invalidApproval.status, 409);

  const product = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));
  const response = await fetch(`${baseUrl}/product-brain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(product),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.product.sku, "ESP-001");
  assert.equal(payload.brain.angles.length, 3);
  const research = JSON.parse(await readFile(new URL("../fixtures/research-project.json", import.meta.url), "utf8"));
  const researchResponse = await fetch(`${baseUrl}/research/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(research),
  });
  assert.equal(researchResponse.status, 200);
  const researchPayload = await researchResponse.json();
  assert.equal(researchPayload.ok, true);
  assert.equal(researchPayload.analysis.competitorCount, 4);
  assert.equal(researchPayload.quality.passed, true);

  const kitResponse = await fetch(`${baseUrl}/campaign-kit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(product),
  });
  assert.equal(kitResponse.status, 200);
  const kitPayload = await kitResponse.json();
  assert.equal(kitPayload.kit.meta.ads.length, 6);
  assert.equal(kitPayload.kit.email.emails.length, 12);
  assert.equal(kitPayload.kit.shopify.sections.length, 10);
  assert.equal(kitPayload.kit.googleAds.adGroups.length, 3);
  assert.equal(kitPayload.kit.amazon.bullets.length, 5);
  assert.equal(kitPayload.quality.passed, true);

  const researchKitResponse = await fetch(`${baseUrl}/campaign-kit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product, research }),
  });
  assert.equal(researchKitResponse.status, 200);
  const researchKitPayload = await researchKitResponse.json();
  assert.equal(researchKitPayload.research.projectId, "research-espresso-001");
  assert.equal(researchKitPayload.researchQuality.passed, true);
  assert.equal(researchKitPayload.kit.meta.ads.length, 6);
  assert.equal(typeof researchKitPayload.campaignId, "string");
  assert.equal(researchKitPayload.aiProvider, "mock");
  assert.equal(researchKitPayload.aiModel, "deterministic-mock");

  const demoStatusResponse = await fetch(`${baseUrl}/demo/status?campaignId=${researchKitPayload.campaignId}`);
  assert.equal(demoStatusResponse.status, 200);
  const demoStatusPayload = await demoStatusResponse.json();
  assert.equal(demoStatusPayload.status.timeline.find((step) => step.id === "research").status, "PASS");
  assert.equal(demoStatusPayload.status.timeline.find((step) => step.id === "approval").status, "WAITING");
  assert.equal(demoStatusPayload.status.timeline.find((step) => step.id === "delivery").status, "BLOCKED");
  assert.equal(demoStatusPayload.status.safety.externalWrites, false);

  const unsafeProofResponse = await fetch(`${baseUrl}/proof/assert-local-safety`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...demoStatusPayload,
      status: {
        ...demoStatusPayload.status,
        safety: { ...demoStatusPayload.status.safety, externalWrites: true },
      },
    }),
  });
  assert.equal(unsafeProofResponse.status, 422);
  assert.equal((await unsafeProofResponse.json()).error, "unsafe_or_invalid_proof");

  const proofResponse = await fetch(`${baseUrl}/proof/assert-local-safety`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(demoStatusPayload),
  });
  assert.equal(proofResponse.status, 200);
  const proofPayload = await proofResponse.json();
  assert.equal(proofPayload.proof.proofType, "local_n8n_engine");
  assert.equal(proofPayload.proof.aiProvider, "mock");
  assert.equal(proofPayload.proof.aiModel, "deterministic-mock");
  assert.equal(proofPayload.proof.coreStagesPassed, true);
  assert.equal(proofPayload.proof.externalWrites, false);
  assert.equal(proofPayload.proof.livePublishing, false);

  const latestProofResponse = await fetch(`${baseUrl}/proof/latest`);
  assert.equal(latestProofResponse.status, 200);
  const latestProofPayload = await latestProofResponse.json();
  assert.equal(latestProofPayload.proof.payload.proofType, "local_n8n_engine");

  const historyResponse = await fetch(`${baseUrl}/history/campaigns`);
  assert.equal(historyResponse.status, 200);
  const historyPayload = await historyResponse.json();
  assert.equal(historyPayload.campaigns.length, 2);
  assert.equal(historyPayload.campaigns[0].campaignId, researchKitPayload.campaignId);

  const blockedDelivery = await fetch(`${baseUrl}/delivery/draft`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ campaignId: researchKitPayload.campaignId, channel: "google_ads", mode: "draft" }),
  });
  assert.equal(blockedDelivery.status, 409);
  assert.equal((await blockedDelivery.json()).error, "approval_required");

  const approveGoogle = await fetch(`${baseUrl}/approval/channel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ campaignId: researchKitPayload.campaignId, channel: "google_ads" }),
  });
  assert.equal(approveGoogle.status, 200);
  const approveGooglePayload = await approveGoogle.json();
  assert.equal(approveGooglePayload.approvedCount, 3);
  assert.equal(approveGooglePayload.total, 3);

  const approveGoogleAgain = await fetch(`${baseUrl}/approval/channel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ campaignId: researchKitPayload.campaignId, channel: "google_ads" }),
  });
  assert.equal(approveGoogleAgain.status, 200);
  assert.equal((await approveGoogleAgain.json()).approvedCount, 3);

  const approvalsResponse = await fetch(`${baseUrl}/history/approvals?campaignId=${researchKitPayload.campaignId}`);
  assert.equal(approvalsResponse.status, 200);
  const approvalsPayload = await approvalsResponse.json();
  assert.equal(approvalsPayload.approvals["google-0"].status, "APPROVED");

  const deliveryResponse = await fetch(`${baseUrl}/delivery/draft`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ campaignId: researchKitPayload.campaignId, channel: "google_ads", mode: "draft" }),
  });
  assert.equal(deliveryResponse.status, 200);
  const deliveryPayload = await deliveryResponse.json();
  assert.equal(deliveryPayload.result.externalWrite, false);
  assert.equal(deliveryPayload.result.status, "DRAFT_CREATED_LOCAL");
});

test("project history and approvals survive an API restart", async (context) => {
  const tempDir = await mkdtemp(join(tmpdir(), "ecom-api-restart-"));
  context.after(() => rm(tempDir, { recursive: true, force: true }));
  const historyPath = join(tempDir, "project-history.jsonl");
  const auditPath = join(tempDir, "audit.jsonl");
  const product = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));

  async function start() {
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const child = spawn(process.execPath, ["scripts/local-api.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        LOCAL_API_PORT: String(port),
        AI_PROVIDER: "mock",
        LOG_LEVEL: "silent",
        PROJECT_HISTORY_PATH: historyPath,
        AUDIT_PATH: auditPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const logs = { stdout: collect(child.stdout), stderr: collect(child.stderr) };
    await waitForHealth(child, baseUrl, logs);
    return { child, baseUrl };
  }

  const first = await start();
  const kitResponse = await fetch(`${first.baseUrl}/campaign-kit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(product),
  });
  assert.equal(kitResponse.status, 200);
  const kit = await kitResponse.json();
  const campaignId = kit.campaignId;

  const review = await fetch(`${first.baseUrl}/approval/transition`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ campaignId, assetId: "meta-0", next: "IN_REVIEW" }),
  });
  assert.equal(review.status, 200);
  await stopChild(first.child);

  const second = await start();
  context.after(async () => stopChild(second.child));
  const campaignResponse = await fetch(`${second.baseUrl}/history/campaign?campaignId=${campaignId}`);
  assert.equal(campaignResponse.status, 200);
  const campaignPayload = await campaignResponse.json();
  assert.equal(campaignPayload.snapshot.product.sku, "ESP-001");

  const approvalsResponse = await fetch(`${second.baseUrl}/history/approvals?campaignId=${campaignId}`);
  assert.equal(approvalsResponse.status, 200);
  const approvals = await approvalsResponse.json();
  assert.equal(approvals.approvals["meta-0"].status, "IN_REVIEW");
});
