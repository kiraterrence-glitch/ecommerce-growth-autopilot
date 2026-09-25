import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductVisualPack,
} from "../../dist/index.js";

const knownEvidenceIds = [
  "title-e1",
  "image-e1",
  "benefit-e1",
  "benefit-e2",
  "feature-e1",
  "feature-e2",
  "price-e1",
  "primary-capacity",
  "competitor-capacity",
];

function input(overrides = {}) {
  return {
    jobId: "visual-job",
    productTitle:
      "Portable Espresso Maker",
    subtitle:
      "Compact manual espresso for travel, work and everyday routines.",
    titleEvidenceIds: [
      "title-e1",
    ],
    knownEvidenceIds,
    sourceImage: {
      url:
        "https://cdn.example.invalid/product.jpg",
      evidenceId:
        "image-e1",
      rightsStatus:
        "UNKNOWN_RIGHTS",
    },
    benefits: [
      {
        text:
          "Portable for travel and work",
        evidenceIds: [
          "benefit-e1",
        ],
      },
      {
        text:
          "No electricity required",
        evidenceIds: [
          "benefit-e2",
        ],
      },
    ],
    features: [
      {
        text:
          "Listed capacity: 500 ml",
        evidenceIds: [
          "feature-e1",
        ],
      },
      {
        text:
          "Stainless-steel construction",
        evidenceIds: [
          "feature-e2",
        ],
      },
    ],
    offer: {
      text:
        "Current listed price: USD 39.90",
      evidenceIds: [
        "price-e1",
      ],
    },
    comparisonClaims: [
      {
        claimId:
          "comparison-claim-001",
        competitorId:
          "competitor-a",
        field:
          "Capacity",
        direction:
          "higher",
        text:
          "Our product has a higher listed Capacity than Competitor A (500 ml vs 350 ml).",
        evidenceIds: [
          "primary-capacity",
          "competitor-capacity",
        ],
      },
    ],
    ...overrides,
  };
}

test("visual engine creates the five required marketing assets", () => {
  const pack =
    buildProductVisualPack(
      input(),
      "2026-09-25T00:00:00Z",
    );

  assert.deepEqual(
    pack.assets.map(
      (asset) =>
        asset.kind,
    ),
    [
      "hero",
      "benefit",
      "feature",
      "comparison",
      "offer",
    ],
  );
});

test("visual assets are real standalone SVG documents", () => {
  const pack =
    buildProductVisualPack(
      input(),
      "2026-09-25T00:00:00Z",
    );

  for (const asset of pack.assets) {
    assert.match(
      asset.svg,
      /^<svg/,
    );

    assert.match(
      asset.svg,
      /<\/svg>$/,
    );
  }
});

test("visual engine preserves product image provenance and rights state", () => {
  const pack =
    buildProductVisualPack(
      input(),
      "2026-09-25T00:00:00Z",
    );

  const hero =
    pack.assets.find(
      (asset) =>
        asset.kind === "hero",
    );

  assert.equal(
    hero.sourceImageUrl,
    "https://cdn.example.invalid/product.jpg",
  );

  assert.equal(
    hero.rightsStatus,
    "UNKNOWN_RIGHTS",
  );

  assert.equal(
    hero.evidenceIds.includes(
      "image-e1",
    ),
    true,
  );
});

test("comparison visual contains only supplied safe evidence-backed claim copy", () => {
  const pack =
    buildProductVisualPack(
      input(),
      "2026-09-25T00:00:00Z",
    );

  const comparison =
    pack.assets.find(
      (asset) =>
        asset.kind ===
        "comparison",
    );

  assert.match(
    comparison.svg,
    /500 ml vs 350 ml/,
  );

  assert.equal(
    comparison.evidenceIds.includes(
      "primary-capacity",
    ),
    true,
  );

  assert.equal(
    comparison.evidenceIds.includes(
      "competitor-capacity",
    ),
    true,
  );
});

test("visual QA fails when an asset references unknown evidence", () => {
  const pack =
    buildProductVisualPack(
      input({
        offer: {
          text:
            "Current offer",
          evidenceIds: [
            "unknown-evidence",
          ],
        },
      }),
      "2026-09-25T00:00:00Z",
    );

  assert.equal(
    pack.qa.passed,
    false,
  );

  assert.equal(
    pack.qa.issues.some(
      (issue) =>
        issue.code ===
        "unknown_visual_evidence",
    ),
    true,
  );
});

test("missing source image creates explicit warnings instead of fabricated product imagery", () => {
  const pack =
    buildProductVisualPack(
      input({
        sourceImage: null,
      }),
      "2026-09-25T00:00:00Z",
    );

  assert.equal(
    pack.qa.passed,
    true,
  );

  assert.ok(
    pack.qa.needsSourceCount >
      0,
  );

  assert.equal(
    pack.assets.find(
      (asset) =>
        asset.kind === "hero",
    ).status,
    "NEEDS_SOURCE",
  );
});

test("unknown image rights remain a visible warning", () => {
  const pack =
    buildProductVisualPack(
      input(),
      "2026-09-25T00:00:00Z",
    );

  assert.equal(
    pack.qa.passed,
    true,
  );

  assert.equal(
    pack.qa.issues.some(
      (issue) =>
        issue.code ===
        "image_rights_unknown",
    ),
    true,
  );
});
