import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getProductFingerprint, getProductId } from "../../dist/product-engine/identity.js";
import { normalizeProduct } from "../../dist/product-engine/normalize.js";
import { ProductRegistry } from "../../dist/product-engine/registry.js";
import { validateProduct } from "../../dist/validation/product.js";

async function validProduct() {
  const raw = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));
  const result = validateProduct(raw);
  assert.equal(result.ok, true);
  return result.product;
}

test("normalization is deterministic and removes case-insensitive duplicate list items", async () => {
  const product = await validProduct();
  const normalized = normalizeProduct({
    ...product,
    sku: " esp-001 ",
    features: [" Portable ", "portable", "No electricity"],
  });
  assert.equal(normalized.sku, "ESP-001");
  assert.deepEqual(normalized.features, ["Portable", "No electricity"]);
});

test("product IDs and fingerprints are deterministic", async () => {
  const product = await validProduct();
  assert.equal(getProductId(product), getProductId({ ...product }));
  assert.equal(getProductFingerprint(product), getProductFingerprint({ ...product }));
  assert.match(getProductId(product), /^prd_esp-001_[0-9a-f]{8}$/);
});

test("registry detects exact canonical duplicates without adding a second record", async () => {
  const product = await validProduct();
  const registry = new ProductRegistry();
  assert.equal(registry.register(product).status, "added");
  assert.equal(registry.register({ ...product }).status, "duplicate");
  assert.equal(registry.size, 1);
});
