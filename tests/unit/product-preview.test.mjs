import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductVisualPack,
  renderProductPagePreview,
} from "../../dist/index.js";

function buildFixture() {
  const evidence = [
    "title",
    "benefit",
    "feature",
    "price",
    "primary-capacity",
    "competitor-capacity",
  ];

  const visualPack =
    buildProductVisualPack(
      {
        jobId:
          "preview-test",
        productTitle:
          "Portable Espresso Maker",
        subtitle:
          "Compact manual espresso.",
        titleEvidenceIds: [
          "title",
        ],
        knownEvidenceIds:
          evidence,
        sourceImage: null,
        benefits: [
          {
            text:
              "Portable for travel",
            evidenceIds: [
              "benefit",
            ],
          },
        ],
        features: [
          {
            text:
              "Listed capacity: 500 ml",
            evidenceIds: [
              "feature",
            ],
          },
        ],
        offer: {
          text:
            "Listed price: USD 39.90",
          evidenceIds: [
            "price",
          ],
        },
        comparisonClaims: [
          {
            claimId:
              "claim-1",
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
      },
      "2026-09-25T00:00:00Z",
    );

  return renderProductPagePreview({
    previewId:
      "preview-test",
    productTitle:
      "Portable Espresso Maker",
    subtitle:
      "Compact manual espresso.",
    priceLine:
      "USD 39.90",
    ctaLabel:
      "Review product details",
    visualPack,
    faq: [
      {
        question:
          "Is this live?",
        answer:
          "No. Local preview only.",
      },
    ],
    shippingReturns:
      "Merchant policy required before publication.",
    demoMode: true,
  });
}

test("product preview renders a complete standalone HTML document", () => {
  const preview =
    buildFixture();

  assert.match(
    preview.html,
    /^<!doctype html>/i,
  );

  assert.match(
    preview.html,
    /<\/html>$/,
  );

  assert.equal(
    preview.qa.passed,
    true,
  );
});

test("product preview contains all five generated visual types", () => {
  const preview =
    buildFixture();

  for (
    const kind of [
      "hero",
      "benefit",
      "feature",
      "comparison",
      "offer",
    ]
  ) {
    assert.match(
      preview.html,
      new RegExp(
        `data-visual-kind="${kind}"`,
      ),
    );
  }
});

test("product preview contains responsive desktop and mobile layout rules", () => {
  const preview =
    buildFixture();

  assert.match(
    preview.html,
    /name="viewport"/,
  );

  assert.match(
    preview.html,
    /@media\(max-width:900px\)/,
  );

  assert.match(
    preview.html,
    /@media\(max-width:560px\)/,
  );
});

test("product preview remains draft-only with no live checkout", () => {
  const preview =
    buildFixture();

  assert.equal(
    preview.externalWrites,
    false,
  );

  assert.equal(
    preview.livePublishing,
    false,
  );

  assert.match(
    preview.html,
    /data-external-writes="false"/,
  );

  assert.match(
    preview.html,
    /data-live-publishing="false"/,
  );

  assert.doesNotMatch(
    preview.html,
    /\/checkout\b/i,
  );
});

test("product preview contains no executable JavaScript", () => {
  const preview =
    buildFixture();

  assert.doesNotMatch(
    preview.html,
    /<script\b/i,
  );

  assert.doesNotMatch(
    preview.html,
    /javascript:/i,
  );
});
