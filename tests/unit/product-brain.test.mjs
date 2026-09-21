import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MockAiProvider } from "../../dist/ai/mock-provider.js";
import { generateProductBrain, ProductBrainValidationError } from "../../dist/product-brain/service.js";
import { validateProduct } from "../../dist/validation/product.js";

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

async function product() {
  const result = validateProduct(await fixture("valid-product.json"));
  assert.equal(result.ok, true);
  return result.product;
}

test("product brain service accepts valid structured AI output", async () => {
  const expected = await fixture("product-brain.json");
  const brain = await generateProductBrain(await product(), new MockAiProvider(expected));
  assert.equal(brain.angles.length, 3);
  assert.equal(brain.audiences[0], "Travelers");
});

test("product brain service rejects malformed AI output", async () => {
  await assert.rejects(
    () => generateProductBrain(product(), new MockAiProvider({ audiences: [] })),
    ProductBrainValidationError,
  );
});
