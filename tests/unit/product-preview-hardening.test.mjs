
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductVisualPack,
  renderProductPagePreview,
} from "../../dist/index.js";

import {
  buildDemoProductPagePreview,
} from "../../scripts/product-preview-demo.mjs";

test("preview contains no corrupted separator characters", () => {
  const {
    preview,
  } =
    buildDemoProductPagePreview();

  for (
    const corrupted of [
      "USD 39.90 ? Demo fixture",
      "Local product-page preview ? Human approval required before publication",
      "Evidence-grounded ? Draft only",
      "DEMO PREVIEW ? NO LIVE CHECKOUT",
      "Local preview only ? externalWrites=false ? livePublishing=false",
      'class="trust-icon">?</span>',
      "<b>?</b>",
    ]
  ) {
    assert.equal(
      preview.html.includes(
        corrupted,
      ),
      false,
      `encoding corruption found: ${corrupted}`,
    );
  }

  assert.doesNotMatch(
    preview.html,
    /\uFFFD/,
  );

  assert.match(
    preview.html,
    /&middot;/,
  );
});

test("trust and offer verification marks use encoding-safe entities", () => {
  const {
    preview,
  } =
    buildDemoProductPagePreview();

  const matches =
    preview.html.match(
      /&#10003;/g,
    ) ?? [];

  assert.ok(
    matches.length >= 6,
  );
});

test("preview retains basic static accessibility structure", () => {
  const {
    preview,
  } =
    buildDemoProductPagePreview();

  const h1Count =
    (
      preview.html.match(
        /<h1\b/g,
      ) ?? []
    ).length;

  const summaries =
    (
      preview.html.match(
        /<summary\b/g,
      ) ?? []
    ).length;

  assert.equal(
    h1Count,
    1,
  );

  assert.equal(
    summaries,
    3,
  );

  assert.match(
    preview.html,
    /aria-disabled="true"/,
  );

  assert.doesNotMatch(
    preview.html,
    /tabindex="[1-9]/,
  );
});

test("preview and generated SVGs stay within portfolio performance budgets", () => {
  const {
    preview,
    visualPack,
  } =
    buildDemoProductPagePreview();

  const htmlBytes =
    Buffer.byteLength(
      preview.html,
      "utf8",
    );

  assert.ok(
    htmlBytes < 250_000,
    `HTML is ${htmlBytes} bytes`,
  );

  let totalSvgBytes = 0;

  for (
    const asset of
    visualPack.assets
  ) {
    const bytes =
      Buffer.byteLength(
        asset.svg,
        "utf8",
      );

    totalSvgBytes +=
      bytes;

    assert.ok(
      bytes < 75_000,
      `${asset.filename} is ${bytes} bytes`,
    );
  }

  assert.ok(
    totalSvgBytes < 250_000,
    `SVG pack is ${totalSvgBytes} bytes`,
  );
});

test("malicious HTML-like product copy is escaped instead of executed", () => {
  const {
    visualPack,
  } =
    buildDemoProductPagePreview();

  const preview =
    renderProductPagePreview({
      previewId:
        "security-preview",

      productTitle:
        '<img src=x onerror="alert(1)">',

      subtitle:
        "<script>alert(1)</script>",

      priceLine:
        "USD 10",

      ctaLabel:
        "Review",

      visualPack,

      faq: [
        {
          question:
            "<script>question</script>",

          answer:
            '<img src=x onerror="alert(1)">',
        },
      ],

      shippingReturns:
        "<script>shipping</script>",

      demoMode:
        true,
    });

  assert.doesNotMatch(
    preview.html,
    /<script\b/i,
  );

  assert.doesNotMatch(
    preview.html,
    /<img[^>]*\sonerror\s*=/i,
  );

  assert.match(
    preview.html,
    /&lt;script&gt;/,
  );

  assert.match(
    preview.html,
    /&lt;img/,
  );
});

test("malicious SVG copy is XML escaped", () => {
  const pack =
    buildProductVisualPack(
      {
        jobId:
          "svg-security",

        productTitle:
          "Safe Product",

        subtitle:
          "Safe subtitle",

        titleEvidenceIds: [
          "title",
        ],

        knownEvidenceIds: [
          "title",
          "benefit",
          "feature",
          "offer",
        ],

        sourceImage:
          null,

        benefits: [
          {
            text:
              "<script>alert(1)</script>",

            evidenceIds: [
              "benefit",
            ],
          },
        ],

        features: [
          {
            text:
              '<img src=x onerror="alert(1)">',

            evidenceIds: [
              "feature",
            ],
          },
        ],

        offer: {
          text:
            "<script>offer</script>",

          evidenceIds: [
            "offer",
          ],
        },

        comparisonClaims:
          [],
      },

      "2026-09-25T00:00:00Z",
    );

  for (
    const asset of
    pack.assets
  ) {
    assert.doesNotMatch(
      asset.svg,
      /<script\b/i,
    );

    assert.doesNotMatch(
      asset.svg,
      /<img[^>]*\sonerror\s*=/i,
    );
  }

  assert.ok(
    pack.assets.some(
      (asset) =>
        asset.svg.includes(
          "&lt;script&gt;",
        ),
    ),
  );
});

test("large SOURCE REQUIRED placeholder appears only in hero", () => {
  const {
    visualPack,
  } =
    buildDemoProductPagePreview();

  const assets =
    visualPack.assets.filter(
      (asset) =>
        asset.svg.includes(
          "SOURCE REQUIRED",
        ),
    );

  assert.equal(
    assets.length,
    1,
  );

  assert.equal(
    assets[0].kind,
    "hero",
  );
});

test("preview remains strictly local and non-publishing", () => {
  const {
    preview,
  } =
    buildDemoProductPagePreview();

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

  assert.doesNotMatch(
    preview.html,
    /shopify\.com\/checkout/i,
  );
});
