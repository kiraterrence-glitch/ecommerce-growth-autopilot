import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAmazonListingDraft, buildEmailCampaignDraft, buildGoogleAdsDraft, buildShopifyLandingPageDraft, normalizeProduct, validateAmazonListingDraft, validateEmailCampaignDraft, validateGoogleAdsDraft, validateProduct, validateShopifyLandingPageDraft } from "../../dist/index.js";
const raw = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));
const brain = JSON.parse(await readFile(new URL("../fixtures/product-brain.json", import.meta.url), "utf8"));
const checked = validateProduct(raw);
assert.equal(checked.ok, true);
const product = normalizeProduct(checked.product);

test("email draft builds four 3-step sequences with lifecycle-specific CTAs", () => {
  const draft = buildEmailCampaignDraft(product, brain);
  assert.equal(draft.emails.length, 12);
  assert.equal(new Set(draft.emails.map((email) => email.sequence)).size, 4);
  assert.equal(validateEmailCampaignDraft(draft).length, 0);
  assert.deepEqual(draft.emails.filter((email) => email.sequence === "post_purchase").map((email) => email.ctaText), ["View order", "Read product guide", "Share feedback"]);
});
test("Shopify landing page draft contains all required safe sections", () => {
  const draft = buildShopifyLandingPageDraft(product, brain);
  assert.equal(draft.sections.length, 10);
  assert.match(draft.html, /data-type="hero"/);
  assert.equal(validateShopifyLandingPageDraft(draft).length, 0);
});
test("Google Ads draft respects headline and description limits", () => {
  const draft = buildGoogleAdsDraft(product, brain);
  assert.equal(draft.adGroups.length, 3);
  assert.equal(validateGoogleAdsDraft(draft).length, 0);
});
test("Amazon draft remains non-publishing and contains five bullets", () => {
  const draft = buildAmazonListingDraft(product, brain);
  assert.equal(draft.bullets.length, 5);
  assert.equal(validateAmazonListingDraft(draft).length, 0);
});
