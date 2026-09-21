import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildDemoStatus,
  buildEmailCampaignDraft,
  buildGoogleAdsDraft,
  buildMetaCampaignDraft,
  buildShopifyLandingPageDraft,
  normalizeProduct,
  validateProduct,
} from "../../dist/index.js";

const productInput = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));
const brain = JSON.parse(await readFile(new URL("../fixtures/product-brain.json", import.meta.url), "utf8"));
const validation = validateProduct(productInput);
if (!validation.ok) throw new Error("fixture product invalid");
const product = normalizeProduct(validation.product);
const kit = {
  meta: buildMetaCampaignDraft(product, brain),
  email: buildEmailCampaignDraft(product, brain),
  shopify: buildShopifyLandingPageDraft(product, brain),
  googleAds: buildGoogleAdsDraft(product, brain),
};

function base(overrides = {}) {
  return {
    campaignId: "campaign-demo",
    aiProvider: "ollama",
    aiModel: "qwen3-vl:4b",
    researchUsed: true,
    researchQualityPassed: true,
    marketingQualityPassed: true,
    creativeCount: 3,
    videoSceneCount: 6,
    kit,
    approvals: {},
    deliveredChannels: [],
    ...overrides,
  };
}

test("demo status makes approval and delivery gates visible before any external action", () => {
  const status = buildDemoStatus(base());
  assert.equal(status.timeline.find((step) => step.id === "approval").status, "WAITING");
  assert.equal(status.timeline.find((step) => step.id === "delivery").status, "BLOCKED");
  assert.equal(status.safety.externalWrites, false);
  assert.equal(status.safety.livePublishing, false);
  assert.equal(status.safety.humanApprovalRequired, true);
  assert.equal(status.aiModel, "qwen3-vl:4b");
});

test("demo status reaches local-delivery PASS only after required approvals and all local drafts", () => {
  const approvals = {};
  for (let i = 0; i < kit.meta.ads.length; i += 1) approvals[`meta-${i}`] = { assetId: `meta-${i}`, status: "APPROVED", note: null };
  for (let i = 0; i < kit.email.emails.length; i += 1) approvals[`email-${i}`] = { assetId: `email-${i}`, status: "APPROVED", note: null };
  for (let i = 0; i < kit.shopify.sections.length; i += 1) approvals[`shopify-${i}`] = { assetId: `shopify-${i}`, status: "APPROVED", note: null };
  for (let i = 0; i < kit.googleAds.adGroups.length; i += 1) approvals[`google-${i}`] = { assetId: `google-${i}`, status: "APPROVED", note: null };

  const status = buildDemoStatus(base({ approvals, deliveredChannels: ["meta", "shopify", "google_ads", "email"] }));
  assert.equal(status.timeline.find((step) => step.id === "approval").status, "PASS");
  assert.equal(status.timeline.find((step) => step.id === "delivery").status, "PASS");
  assert.equal(status.approvals.approved, status.approvals.required);
  assert.equal(status.delivery.completedChannels.length, 4);
});
