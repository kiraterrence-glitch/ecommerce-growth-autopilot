import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildMetaCampaignDraft, normalizeProduct, validateMetaCampaignDraft, validateProduct } from "../../dist/index.js";

const brain = JSON.parse(await readFile(new URL("../fixtures/product-brain.json", import.meta.url), "utf8"));
const raw = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));

test("Meta draft creates 3 angles x 2 variants and remains non-publishing", () => {
  const validation = validateProduct(raw);
  assert.equal(validation.ok, true);
  const product = normalizeProduct(validation.product);
  const draft = buildMetaCampaignDraft(product, brain);
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.ads.length, 6);
  assert.deepEqual([...new Set(draft.ads.map((ad) => ad.angleName))].length, 3);
  assert.equal(validateMetaCampaignDraft(draft).length, 0);
  assert.equal(new Set(draft.ads.map((ad) => ad.audienceHypothesis)).size, 3);
  assert.equal(new Set(draft.ads.map((ad) => ad.primaryText)).size, 6);
});
