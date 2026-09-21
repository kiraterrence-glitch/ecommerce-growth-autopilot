import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../../dist/index.js";

test("public package surface exposes core product and AI boundaries", () => {
  for (const key of [
    "validateProduct",
    "normalizeProduct",
    "getProductId",
    "ProductRegistry",
    "importProductsFromCsv",
    "MockAiProvider",
    "OllamaProvider",
    "validateProductBrain",
    "generateProductBrain",
    "validateResearchProject",
    "normalizeResearchProject",
    "analyzeResearchProject",
    "assessResearchQuality",
    "calculateUnitEconomics",
    "generateReviewIntelligence",
    "importCompetitorsFromCsv",
    "importReviewsFromCsv",
  ]) {
    assert.ok(key in api, `missing public export: ${key}`);
  }
});
