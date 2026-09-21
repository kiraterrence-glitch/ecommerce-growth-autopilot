import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessMarketingQuality,
  buildAmazonListingDraft,
  buildEmailCampaignDraft,
  buildGoogleAdsDraft,
  buildMetaCampaignDraft,
  buildShopifyLandingPageDraft,
  buildStaticCreativeDrafts,
  buildVideoStoryboardDraft,
  normalizeProduct,
  validateProduct,
} from "../../dist/index.js";

const raw = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));
const brain = JSON.parse(await readFile(new URL("../fixtures/product-brain.json", import.meta.url), "utf8"));
const checked = validateProduct(raw);
assert.equal(checked.ok, true);
const product = normalizeProduct(checked.product);

function makeInput() {
  return {
    product,
    brain,
    meta: buildMetaCampaignDraft(product, brain),
    email: buildEmailCampaignDraft(product, brain),
    shopify: buildShopifyLandingPageDraft(product, brain),
    googleAds: buildGoogleAdsDraft(product, brain),
    amazon: buildAmazonListingDraft(product, brain),
    creatives: buildStaticCreativeDrafts(product, brain),
    videoStoryboard: buildVideoStoryboardDraft(product, brain),
  };
}

test("marketing quality gate passes the portfolio demo pack", () => {
  const report = assessMarketingQuality(makeInput());
  assert.equal(report.passed, true, JSON.stringify(report.issues, null, 2));
  assert.equal(report.errors, 0);
});

test("marketing quality gate rejects internal prompt leakage", () => {
  const input = makeInput();
  const corrupted = {
    ...input,
    brain: { ...input.brain, offerPositioning: "Position the supplied discount without inventing urgency" },
  };
  const report = assessMarketingQuality(corrupted);
  assert.equal(report.passed, false);
  assert.ok(report.issues.some((issue) => issue.code === "internal_instruction_leak"));
});

test("marketing quality gate rejects post-purchase Shop now CTA", () => {
  const input = makeInput();
  const emails = input.email.emails.map((email) => email.sequence === "post_purchase" && email.step === 1 ? { ...email, ctaText: "Shop now" } : email);
  const report = assessMarketingQuality({ ...input, email: { ...input.email, emails } });
  assert.equal(report.passed, false);
  assert.ok(report.issues.some((issue) => issue.code === "email_wrong_lifecycle_cta"));
});
