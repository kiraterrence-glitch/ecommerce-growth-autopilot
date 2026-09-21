import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildStaticCreativeDrafts, buildVideoStoryboardDraft, canPublish, normalizeProduct, recommendOptimization, transitionApproval, validateProduct, validateStaticCreativeDrafts, validateVideoStoryboardDraft } from "../../dist/index.js";
const raw = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));
const brain = JSON.parse(await readFile(new URL("../fixtures/product-brain.json", import.meta.url), "utf8"));
const checked = validateProduct(raw);
assert.equal(checked.ok, true);
const product = normalizeProduct(checked.product);

test("static creative factory generates three safe SVG draft formats", () => {
  const creatives = buildStaticCreativeDrafts(product, brain);
  assert.deepEqual(creatives.map((item) => [item.width, item.height]), [[1080,1080],[1080,1920],[1200,628]]);
  assert.equal(validateStaticCreativeDrafts(creatives).length, 0);
});
test("video creative layer produces a 20-second six-scene vertical storyboard", () => {
  const storyboard = buildVideoStoryboardDraft(product, brain);
  assert.equal(storyboard.totalDurationMs, 20_000);
  assert.equal(validateVideoStoryboardDraft(storyboard).length, 0);
});
test("approval workflow blocks publishing until explicit approval", () => {
  let record = { assetId: "meta-1", status: "DRAFT", note: null };
  assert.equal(canPublish(record), false);
  record = transitionApproval(record, "IN_REVIEW");
  record = transitionApproval(record, "APPROVED");
  assert.equal(canPublish(record), true);
  assert.throws(() => transitionApproval({ assetId: "x", status: "IN_REVIEW", note: null }, "REJECTED"), /rejection note/i);
});
test("optimizer identifies low-CTR creative problems and click-to-conversion mismatch", () => {
  const lowCtr = recommendOptimization({ spend: 100, impressions: 10000, clicks: 50, conversions: 2, revenue: 80 });
  assert.equal(lowCtr.code, "CREATIVE_HOOK_TEST");
  const mismatch = recommendOptimization({ spend: 200, impressions: 10000, clicks: 200, conversions: 1, revenue: 79 });
  assert.equal(mismatch.code, "LANDING_PAGE_OFFER_TEST");
});
