import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProduct } from "../../dist/validation/product.js";

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

test("accepts and normalizes a valid product", async () => {
  const input = await fixture("valid-product.json");
  const result = validateProduct(input);
  assert.equal(result.ok, true);
  assert.equal(result.product.sku, "ESP-001");
  assert.equal(result.product.offer.value, 20);
});

test("rejects invalid product data with actionable issue paths", async () => {
  const input = await fixture("invalid-product.json");
  const result = validateProduct(input);
  assert.equal(result.ok, false);
  const paths = new Set(result.issues.map((issue) => issue.path));
  for (const expected of ["sku", "price", "currency", "cost", "inventory", "features", "audiences", "offer.value", "channels.shopify"]) {
    assert.equal(paths.has(expected), true, `missing validation issue for ${expected}`);
  }
});

test("rejects non-object input safely", () => {
  const result = validateProduct("not-an-object");
  assert.deepEqual(result, { ok: false, issues: [{ path: "$", message: "must be an object" }] });
});
