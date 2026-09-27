import assert from "node:assert/strict";
import test from "node:test";

import {
  assessProductPageQuality,
  buildGemPagesManifest,
  buildProductPageBrief,
  buildProductPageMediaPlan,
  buildProductPageShopifyDraft,
  createProductPageJob,
  parseSupplierUrl,
  updateProductPageJobVerification,
  verifySpecifications,
} from "../../dist/index.js";

const product = {
  sku: "ESP-001",
  title: "Portable Espresso Maker",
  description: "A compact manual espresso maker for travel and work.",
  price: 79,
  currency: "USD",
  cost: 31,
  inventory: 150,
  features: ["Portable", "No electricity required", "Easy to clean"],
  benefits: ["Make espresso anywhere", "Reduce cafe spending"],
  audiences: ["Travelers", "Office workers", "Campers"],
  imageUrls: ["https://example.invalid/espresso-1.jpg"],
  offer: { type: "percentage", value: 20 },
  channels: { shopify: true, amazon: true },
};

const brain = {
  audiences: ["Travelers", "Office workers", "Campers"],
  painPoints: [
    "Need coffee while traveling",
    "Want a portable brewing option",
    "Need clear product information",
  ],
  benefits: [
    "Make espresso anywhere",
    "Use without electricity",
    "Keep a compact setup",
  ],
  objections: [
    "Whether it is easy to clean",
    "Whether it fits the intended routine",
    "Whether the listed capacity is correct",
  ],
  buyingTriggers: ["Travel", "Office use", "Current product offer"],
  angles: [
    {
      name: "Portable routine",
      hook: "Make espresso anywhere",
      reason: "Grounded in supplied product benefits",
    },
    {
      name: "No power",
      hook: "No electricity required",
      reason: "Grounded in supplied product features",
    },
    {
      name: "Compact",
      hook: "Portable",
      reason: "Grounded in supplied product features",
    },
  ],
  offerPositioning: "Current offer: 20% off",
};

test("supplier intake recognizes AliExpress", () => {
  const supplier = parseSupplierUrl(
    "https://www.aliexpress.com/item/100500123456.html?utm_source=demo#reviews",
  );

  assert.equal(supplier.platform, "aliexpress");
  assert.equal(supplier.normalizedUrl.includes("utm_source"), false);
  assert.equal(supplier.normalizedUrl.includes("#reviews"), false);
});

test("supplier intake recognizes Alibaba and rejects unsafe targets", () => {
  assert.equal(
    parseSupplierUrl("https://www.alibaba.com/product-detail/example.html").platform,
    "alibaba",
  );

  assert.throws(() => parseSupplierUrl("http://www.alibaba.com/product"));
  assert.throws(() => parseSupplierUrl("https://127.0.0.1/product"));
});

test("equivalent unit formatting verifies", () => {
  const result = verifySpecifications([
    { field: "Capacity", value: "500 ml", sourceId: "a", critical: true },
    { field: "Capacity", value: "500ml", sourceId: "b", critical: true },
  ]);

  assert.equal(result.specifications[0].status, "VERIFIED");
  assert.deepEqual(result.unresolvedCriticalFields, []);
});

test("conflicting critical specifications fail closed", () => {
  const result = verifySpecifications([
    { field: "Capacity", value: "500 ml", sourceId: "a", critical: true },
    { field: "Capacity", value: "600 ml", sourceId: "b", critical: true },
  ]);

  assert.equal(result.specifications[0].status, "NEEDS_VERIFICATION");
  assert.equal(result.specifications[0].value, null);
});

test("product page job moves to needs verification", () => {
  const supplier = parseSupplierUrl(
    "https://www.aliexpress.com/item/example.html",
  );

  const job = createProductPageJob(
    "job-1",
    supplier,
    "2026-09-24T12:00:00Z",
  );

  const verification = verifySpecifications([
    { field: "Voltage", value: "110V", sourceId: "a", critical: true },
    { field: "Voltage", value: "220V", sourceId: "b", critical: true },
  ]);

  const updated = updateProductPageJobVerification(
    job,
    verification,
    "2026-09-24T12:01:00Z",
  );

  assert.equal(updated.status, "NEEDS_VERIFICATION");
});

test("product page brief includes required sections", () => {
  const verification = verifySpecifications([
    { field: "Capacity", value: "500 ml", sourceId: "supplier", critical: true },
  ]);

  const brief = buildProductPageBrief(
    product,
    brain,
    verification,
  );

  const types = brief.sections.map((section) => section.type);

  assert.equal(types.includes("hero"), true);
  assert.equal(types.includes("comparison"), true);
  assert.equal(types.includes("faq"), true);
  assert.equal(types.includes("cta"), true);
});

test("Shopify and GemPages remain draft-only", () => {
  const verification = verifySpecifications([
    { field: "Capacity", value: "500 ml", sourceId: "supplier", critical: true },
  ]);

  const brief = buildProductPageBrief(product, brain, verification);
  const mediaPlan = buildProductPageMediaPlan(product);
  const shopify = buildProductPageShopifyDraft(product, brief, mediaPlan);
  const gemPages = buildGemPagesManifest(brief);

  assert.equal(shopify.status, "DRAFT");
  assert.equal(shopify.externalWrite, false);
  assert.equal(gemPages.status, "DRAFT");
  assert.equal(gemPages.externalWrite, false);
});

test("product page QA passes safe draft", () => {
  const supplier = parseSupplierUrl(
    "https://www.aliexpress.com/item/example.html",
  );

  const verification = verifySpecifications([
    { field: "Capacity", value: "500 ml", sourceId: "supplier", critical: true },
  ]);

  const brief = buildProductPageBrief(product, brain, verification);
  const mediaPlan = buildProductPageMediaPlan(product);
  const shopify = buildProductPageShopifyDraft(product, brief, mediaPlan);
  const gemPages = buildGemPagesManifest(brief);

  const quality = assessProductPageQuality({
    supplier,
    product,
    verification,
    brief,
    mediaPlan,
    shopifyDraft: shopify,
    gemPagesManifest: gemPages,
  });

  assert.equal(quality.passed, true);
  assert.equal(quality.errors, 0);
});
