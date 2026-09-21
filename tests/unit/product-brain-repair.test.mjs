import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { generateProductBrain } from "../../dist/product-brain/service.js";
import { validateProduct } from "../../dist/validation/product.js";

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

test("product brain gets one controlled repair attempt for invalid model output", async () => {
  const validated = validateProduct(await fixture("valid-product.json"));
  assert.equal(validated.ok, true);
  const validBrain = await fixture("product-brain.json");
  let calls = 0;
  const provider = {
    name: "scripted-test",
    async generateJson() {
      calls += 1;
      return calls === 1 ? { audiences: [] } : validBrain;
    },
  };
  const brain = await generateProductBrain(validated.product, provider);
  assert.equal(calls, 2);
  assert.equal(brain.angles.length, 3);
});
