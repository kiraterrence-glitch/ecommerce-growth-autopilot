import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { importProductsFromCsv } from "../../dist/product-engine/csv.js";

test("CSV import accepts valid rows and returns actionable failures for invalid rows", async () => {
  const csv = await readFile(new URL("../fixtures/products.csv", import.meta.url), "utf8");
  const result = importProductsFromCsv(csv);
  assert.equal(result.imported.length, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.imported[0].sku, "ESP-001");
  assert.deepEqual(result.imported[0].features, ["Portable", "No electricity"]);
  const failed = result.rows.find((row) => !row.ok);
  assert.ok(failed);
  assert.ok(failed.issues.some((issue) => issue.path === "price"));
  assert.ok(failed.issues.some((issue) => issue.path === "currency"));
});
