import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildStaticCreativeDrafts,
  buildVideoStoryboardDraft,
  normalizeProduct,
  renderCreativeHtml,
  renderVideoSceneHtml,
  validateProduct,
} from "../../dist/index.js";

const raw = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));
const brain = JSON.parse(await readFile(new URL("../fixtures/product-brain.json", import.meta.url), "utf8"));
const checked = validateProduct(raw);
assert.equal(checked.ok, true);
const product = normalizeProduct(checked.product);

test("creative HTML is standalone, sized, and free of unresolved placeholders", () => {
  const creative = buildStaticCreativeDrafts(product, brain)[0];
  const html = renderCreativeHtml(creative, product);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /width:1080px/);
  assert.match(html, /Portfolio demo/);
  assert.doesNotMatch(html, /\[[A-Z0-9_]+\]/);
});

test("video scene HTML contains the validated scene copy", () => {
  const storyboard = buildVideoStoryboardDraft(product, brain);
  const html = renderVideoSceneHtml(storyboard.scenes[0], product);
  assert.match(html, new RegExp(storyboard.scenes[0].onScreenText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /Scene 1/);
});
