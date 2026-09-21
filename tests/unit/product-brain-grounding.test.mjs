import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { findGroundingIssues } from "../../dist/product-brain/grounding.js";
import { validateProduct } from "../../dist/validation/product.js";

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

test("grounding catches unsupported numeric and risky claims", async () => {
  const validated = validateProduct(await fixture("valid-product.json"));
  assert.equal(validated.ok, true);
  const brain = await fixture("product-brain.json");
  brain.angles[0].hook = "Clinically proven to work in 30 seconds";
  const issues = findGroundingIssues(validated.product, brain);
  assert.ok(issues.some((issue) => issue.kind === "unsupported-number" && issue.value === "30"));
  assert.ok(issues.some((issue) => issue.kind === "unsupported-risky-claim" && issue.value === "clinically proven"));
});
