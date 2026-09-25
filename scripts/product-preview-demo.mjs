import {
  buildProductVisualPack,
  renderProductPagePreview,
} from "../dist/index.js";

export function buildDemoProductPagePreview() {
  const knownEvidenceIds = [
    "demo-title",
    "demo-benefit-1",
    "demo-benefit-2",
    "demo-feature-1",
    "demo-feature-2",
    "demo-price",
    "demo-primary-capacity",
    "demo-competitor-capacity",
  ];

  const visualPack =
    buildProductVisualPack(
      {
        jobId:
          "demo-product-preview",
        productTitle:
          "Portable Espresso Maker",
        subtitle:
          "A compact manual espresso concept demonstrating an evidence-grounded ecommerce workflow.",
        titleEvidenceIds: [
          "demo-title",
        ],
        knownEvidenceIds,
        sourceImage: null,
        benefits: [
          {
            text:
              "Portable for travel and work",
            evidenceIds: [
              "demo-benefit-1",
            ],
          },
          {
            text:
              "No electricity required",
            evidenceIds: [
              "demo-benefit-2",
            ],
          },
        ],
        features: [
          {
            text:
              "Listed capacity: 500 ml",
            evidenceIds: [
              "demo-feature-1",
            ],
          },
          {
            text:
              "Manual operation",
            evidenceIds: [
              "demo-feature-2",
            ],
          },
        ],
        offer: {
          text:
            "Demo listed price: USD 39.90",
          evidenceIds: [
            "demo-price",
          ],
        },
        comparisonClaims: [
          {
            claimId:
              "demo-comparison-1",
            competitorId:
              "demo-competitor-a",
            field:
              "Capacity",
            direction:
              "higher",
            text:
              "Our product has a higher listed Capacity than Competitor A (500 ml vs 350 ml).",
            evidenceIds: [
              "demo-primary-capacity",
              "demo-competitor-capacity",
            ],
          },
        ],
      },
      "2026-09-25T00:00:00Z",
    );

  const preview =
    renderProductPagePreview({
      previewId:
        "demo-product-preview",
      productTitle:
        "Portable Espresso Maker",
      subtitle:
        "A compact manual espresso concept demonstrating an evidence-grounded ecommerce workflow.",
      priceLine:
        "USD 39.90 · Demo fixture",
      ctaLabel:
        "Review product details",
      visualPack,
      faq: [
        {
          question:
            "Is this connected to a live store?",
          answer:
            "No. This is a local portfolio preview. External writes and live publishing are disabled.",
        },
        {
          question:
            "Where do the comparison claims come from?",
          answer:
            "Comparison claims are generated only from normalized verified evidence supplied for both comparable products.",
        },
        {
          question:
            "Why is there no fabricated product photograph?",
          answer:
            "A real source image has not been approved for this deterministic demo fixture, so the visual layer explicitly shows that a source is required.",
        },
      ],
      shippingReturns:
        "Connect the merchant's verified shipping and returns policy before publication. This preview does not invent fulfillment terms.",
      demoMode: true,
    });

  return {
    preview,
    visualPack,
  };
}
