import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { JsonlProjectHistoryStore } from "../../scripts/project-history-store.mjs";

test("project history persists campaign snapshots and latest approvals", async (context) => {
  const dir = await mkdtemp(join(tmpdir(), "ecom-history-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const store = new JsonlProjectHistoryStore(join(dir, "history.jsonl"));

  await store.append({
    eventId: "campaign-event-1",
    eventType: "campaign.generated",
    timestamp: "2026-09-20T00:00:00.000Z",
    campaignId: "campaign-1",
    productId: "product-1",
    researchProjectId: null,
    assetId: null,
    payload: { product: { title: "Demo Product" }, quality: { passed: true }, kit: {} },
  });
  await store.append({
    eventId: "approval-1",
    eventType: "approval.transition",
    timestamp: "2026-09-20T00:01:00.000Z",
    campaignId: "campaign-1",
    productId: "product-1",
    researchProjectId: null,
    assetId: "meta-0",
    payload: { record: { assetId: "meta-0", status: "IN_REVIEW", note: null } },
  });
  await store.append({
    eventId: "approval-2",
    eventType: "approval.transition",
    timestamp: "2026-09-20T00:02:00.000Z",
    campaignId: "campaign-1",
    productId: "product-1",
    researchProjectId: null,
    assetId: "meta-0",
    payload: { record: { assetId: "meta-0", status: "APPROVED", note: null } },
  });

  const campaign = await store.getCampaign("campaign-1");
  assert.equal(campaign?.payload.product.title, "Demo Product");
  const approval = await store.getLatestApproval("campaign-1", "meta-0");
  assert.equal(approval.status, "APPROVED");
  const approvals = await store.getLatestApprovals("campaign-1");
  assert.equal(approvals["meta-0"].status, "APPROVED");
});

test("project history treats a missing file as an empty store", async (context) => {
  const dir = await mkdtemp(join(tmpdir(), "ecom-history-empty-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const store = new JsonlProjectHistoryStore(join(dir, "missing.jsonl"));
  assert.deepEqual(await store.all(), []);
});
