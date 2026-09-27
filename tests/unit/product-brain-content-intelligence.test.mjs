import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  analyzeContentIntelligence,
  validateContentIntelligenceDataset,
} from "../../dist/content-intelligence/index.js";

import {
  createContentIntelligenceProductBrainContext,
} from "../../dist/content-intelligence/product-brain-context.js";

import {
  generateProductBrain,
} from "../../dist/product-brain/service.js";

import {
  normalizeProduct,
  validateProduct,
} from "../../dist/index.js";

const rawProduct =
  JSON.parse(
    await readFile(
      new URL(
        "../fixtures/valid-product.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

const checked =
  validateProduct(
    rawProduct,
  );

assert.equal(
  checked.ok,
  true,
);

const product =
  normalizeProduct(
    checked.product,
  );

const rawContent =
  JSON.parse(
    await readFile(
      new URL(
        "../../examples/content-intelligence/sample-content.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

const records =
  validateContentIntelligenceDataset(
    rawContent,
  );

const report =
  analyzeContentIntelligence(
    records,
  );

const contentContext =
  createContentIntelligenceProductBrainContext(
    report,
  );

const safeBrain = {
  audiences: [
    "Travelers",
    "Office workers",
    "Campers",
  ],

  painPoints: [
    "Coffee access while traveling",
  ],

  benefits: [
    "Portable espresso preparation",
  ],

  objections: [
    "Cleaning effort",
  ],

  buyingTriggers: [
    "Travel convenience",
  ],

  angles: [
    {
      name: "Travel",
      hook: "Espresso on the move",
      reason: "Portable use case",
    },
    {
      name: "Office",
      hook: "Coffee without another cafe run",
      reason: "Office use case",
    },
    {
      name: "Camping",
      hook: "Coffee away from outlets",
      reason: "Manual use case",
    },
  ],

  offerPositioning:
    "20% off current offer",
};

test("Content Intelligence Product Brain context stays messaging-only", () => {
  assert.equal(
    contentContext.policy,
    "messaging_signals_only",
  );

  assert.equal(
    contentContext.productFactPolicy,
    "verified_product_evidence_only",
  );

  assert.equal(
    contentContext.causality,
    "correlation_not_causation",
  );

  assert.equal(
    "benefits" in contentContext,
    false,
  );

  assert.ok(
    contentContext.sourceContentIds.length > 0,
  );
});

test("Product Brain receives Content Intelligence as fourth-argument messaging context", async () => {
  let capturedPrompt =
    "";

  const provider = {
    name:
      "test",

    async generateJson(request) {
      capturedPrompt =
        request.prompt;

      return safeBrain;
    },
  };

  const brain =
    await generateProductBrain(
      product,
      provider,
      undefined,
      contentContext,
    );

  assert.equal(
    brain.angles.length,
    3,
  );

  assert.match(
    capturedPrompt,
    /Content Intelligence context/,
  );

  assert.match(
    capturedPrompt,
    /messaging signals only/i,
  );

  assert.match(
    capturedPrompt,
    /never treat this section as product evidence/i,
  );

  assert.match(
    capturedPrompt,
    /Product JSON remains the sole source of factual product claims/i,
  );
});

test("Content Intelligence prompt keeps product benefit claims outside messaging context", async () => {
  let capturedPrompt =
    "";

  const provider = {
    name:
      "test",

    async generateJson(request) {
      capturedPrompt =
        request.prompt;

      return safeBrain;
    },
  };

  await generateProductBrain(
    product,
    provider,
    undefined,
    contentContext,
  );

  const marker =
    "Content Intelligence context";

  const contentSection =
    capturedPrompt.slice(
      capturedPrompt.indexOf(marker),
    );

  assert.equal(
    contentSection.includes(
      '"benefits"',
    ),
    false,
  );

  assert.match(
    contentSection,
    /must not establish product features, benefits, specifications/i,
  );
});

test("Content Intelligence Product Brain context is deterministic", () => {
  const second =
    createContentIntelligenceProductBrainContext(
      report,
    );

  assert.deepEqual(
    second,
    contentContext,
  );
});

test("Product Brain supplies strict JSON Schema to provider", async () => {
  let capturedSchema;

  const provider = {
    name: "test",

    async generateJson(request) {
      capturedSchema = request.schema;
      return safeBrain;
    },
  };

  await generateProductBrain(
    product,
    provider,
    undefined,
    contentContext,
  );

  assert.ok(capturedSchema);

  assert.equal(
    capturedSchema.type,
    "object",
  );

  assert.equal(
    capturedSchema.additionalProperties,
    false,
  );

  assert.equal(
    capturedSchema.properties.angles.minItems,
    3,
  );

  assert.deepEqual(
    [...capturedSchema.required].sort(),
    [
      "angles",
      "audiences",
      "benefits",
      "buyingTriggers",
      "objections",
      "offerPositioning",
      "painPoints",
    ].sort(),
  );
});

test("Product Brain repair attempt keeps the same JSON Schema", async () => {
  const schemas = [];
  let calls = 0;

  const provider = {
    name: "test",

    async generateJson(request) {
      schemas.push(
        request.schema,
      );

      calls += 1;

      if (calls === 1) {
        return {
          audiences: [],
        };
      }

      return safeBrain;
    },
  };

  const brain =
    await generateProductBrain(
      product,
      provider,
      undefined,
      contentContext,
    );

  assert.equal(
    calls,
    2,
  );

  assert.equal(
    brain.angles.length,
    3,
  );

  assert.deepEqual(
    schemas[1],
    schemas[0],
  );
});
