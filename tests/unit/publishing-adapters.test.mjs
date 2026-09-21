import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DeliveryBlockedError,
  buildChannelDeliveryPlan,
  buildEmailCampaignDraft,
  buildGoogleAdsDraft,
  buildMetaCampaignDraft,
  buildShopifyLandingPageDraft,
  createLocalDeliveryAdapter,
  getDeliveryCapabilities,
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

test("delivery capabilities are explicitly local-only with no live writes", () => {
  const capabilities = getDeliveryCapabilities();
  assert.equal(capabilities.liveSupported, false);
  assert.equal(capabilities.externalWritesEnabled, false);
  assert.deepEqual(capabilities.modes, ["mock", "draft"]);
});

test("delivery adapters reject live mode and block unapproved channel assets", () => {
  assert.throws(
    () => createLocalDeliveryAdapter("meta", "live"),
    (error) => error instanceof DeliveryBlockedError && error.code === "unsupported_mode",
  );

  const adapter = createLocalDeliveryAdapter("google_ads", "draft");
  const plan = buildChannelDeliveryPlan("google_ads", kit);
  assert.equal(plan.artifacts.length, 3);
  assert.throws(
    () => adapter.deliver({
      campaignId: "campaign-1",
      channel: "google_ads",
      mode: "draft",
      artifacts: plan.artifacts,
      approvedAssetIds: ["google-0"],
      payload: plan.payload,
    }),
    (error) => error instanceof DeliveryBlockedError && error.code === "approval_required",
  );
});

test("approved local draft adapters return payloads without external writes", () => {
  const adapter = createLocalDeliveryAdapter("google_ads", "draft");
  const plan = buildChannelDeliveryPlan("google_ads", kit);
  const result = adapter.deliver({
    campaignId: "campaign-1",
    channel: "google_ads",
    mode: "draft",
    artifacts: plan.artifacts,
    approvedAssetIds: plan.artifacts.map((artifact) => artifact.assetId),
    payload: plan.payload,
  });
  assert.equal(result.status, "DRAFT_CREATED_LOCAL");
  assert.equal(result.externalWrite, false);
  assert.equal(result.artifactCount, 3);
});
