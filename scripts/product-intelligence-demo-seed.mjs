import {
  persistProductIntelligenceBundle,
} from "./product-intelligence-ingest.mjs";

const NOW = "2026-09-26T00:00:00Z";
const MAIN_ID = "demo-portable-espresso-maker";
const COMPETITOR_ID = "demo-competitor-a";

function primaryBundle() {
  return {
    product: {
      id: MAIN_ID,
      sku: "DEMO-ESPRESSO-001",
      title: "Portable Espresso Maker",
      status: "READY",
      fingerprint: "demo:portable-espresso-maker:v1",
      createdAt: NOW,
      updatedAt: NOW,
    },

    revisions: [
      {
        id: "demo-main-revision-1",
        productId: MAIN_ID,
        revisionNumber: 1,
        snapshotJson: JSON.stringify({
          title: "Portable Espresso Maker",
          price: 39.9,
          currency: "USD",
          capacity: "500 ml",
          weight: "400 g",
          operation: "manual",
        }),
        createdAt: NOW,
      },
    ],

    variants: [
      {
        id: "demo-main-variant-default",
        productId: MAIN_ID,
        variantKey: "default",
        title: "Default",
        sku: "DEMO-ESPRESSO-001",
        price: 39.9,
        currency: "USD",
        createdAt: NOW,
      },
    ],

    sources: [
      {
        id: "demo-main-source",
        productId: MAIN_ID,
        sourceType: "manual",
        sourceUrl: null,
        contentHash: "demo-main-source-v1",
        capturedAt: NOW,
        status: "CAPTURED",
      },
    ],

    evidence: [
      {
        id: "demo-main-title",
        productId: MAIN_ID,
        sourceId: "demo-main-source",
        field: "title",
        rawValue: "Portable Espresso Maker",
        normalizedValue: "Portable Espresso Maker",
        unit: null,
        status: "VERIFIED",
        capturedAt: NOW,
      },
      {
        id: "demo-main-price",
        productId: MAIN_ID,
        sourceId: "demo-main-source",
        field: "price",
        rawValue: "USD 39.90",
        normalizedValue: "39.90",
        unit: "USD",
        status: "VERIFIED",
        capturedAt: NOW,
      },
      {
        id: "demo-main-capacity",
        productId: MAIN_ID,
        sourceId: "demo-main-source",
        field: "capacity",
        rawValue: "500 ml",
        normalizedValue: "500",
        unit: "ml",
        status: "VERIFIED",
        capturedAt: NOW,
      },
      {
        id: "demo-main-weight",
        productId: MAIN_ID,
        sourceId: "demo-main-source",
        field: "weight",
        rawValue: "400 g",
        normalizedValue: "400",
        unit: "g",
        status: "VERIFIED",
        capturedAt: NOW,
      },
      {
        id: "demo-main-operation",
        productId: MAIN_ID,
        sourceId: "demo-main-source",
        field: "operation",
        rawValue: "Manual",
        normalizedValue: "manual",
        unit: null,
        status: "VERIFIED",
        capturedAt: NOW,
      },
    ],

    visuals: [
      "hero",
      "benefit",
      "feature",
      "comparison",
      "offer",
    ].map((kind, index) => ({
      id: `demo-main-visual-${kind}`,
      productId: MAIN_ID,
      kind,
      filePath: `docs/portfolio-proof/product-page-demo/visuals/${String(
        index + 1,
      ).padStart(2, "0")}-${kind}.svg`,
      rightsStatus: kind === "hero" ? "SOURCE_REQUIRED" : null,
      evidenceIdsJson: JSON.stringify(["demo-main-title"]),
      createdAt: NOW,
    })),

    drafts: [
      {
        id: "demo-main-page-draft-1",
        productId: MAIN_ID,
        version: 1,
        htmlPath: "docs/portfolio-proof/product-page-demo/index.html",
        status: "DRAFT",
        createdAt: NOW,
      },
    ],

    qaRuns: [
      {
        id: "demo-main-qa-browser",
        productId: MAIN_ID,
        qaType: "browser",
        passed: true,
        errors: 0,
        warnings: 1,
        reportJson: JSON.stringify({
          viewports: 8,
          externalWrites: false,
          livePublishing: false,
        }),
        createdAt: NOW,
      },
    ],

    approvals: [
      {
        id: "demo-main-approval",
        productId: MAIN_ID,
        artifactType: "product_page",
        artifactId: "demo-main-page-draft-1",
        status: "PENDING",
        approvedAt: null,
        createdAt: NOW,
      },
    ],
  };
}

function competitorBundle() {
  return {
    product: {
      id: COMPETITOR_ID,
      sku: "DEMO-COMP-001",
      title: "Competitor A Espresso Maker",
      status: "READY",
      fingerprint: "demo:competitor-a:v1",
      createdAt: NOW,
      updatedAt: NOW,
    },

    revisions: [
      {
        id: "demo-competitor-revision-1",
        productId: COMPETITOR_ID,
        revisionNumber: 1,
        snapshotJson: JSON.stringify({
          capacity: "350 ml",
          weight: "500 g",
        }),
        createdAt: NOW,
      },
    ],

    sources: [
      {
        id: "demo-competitor-source",
        productId: COMPETITOR_ID,
        sourceType: "competitor",
        sourceUrl: null,
        contentHash: "demo-competitor-source-v1",
        capturedAt: NOW,
        status: "CAPTURED",
      },
    ],

    evidence: [
      {
        id: "demo-competitor-capacity",
        productId: COMPETITOR_ID,
        sourceId: "demo-competitor-source",
        field: "capacity",
        rawValue: "350 ml",
        normalizedValue: "350",
        unit: "ml",
        status: "VERIFIED",
        capturedAt: NOW,
      },
      {
        id: "demo-competitor-weight",
        productId: COMPETITOR_ID,
        sourceId: "demo-competitor-source",
        field: "weight",
        rawValue: "500 g",
        normalizedValue: "500",
        unit: "g",
        status: "VERIFIED",
        capturedAt: NOW,
      },
    ],
  };
}

export function ensureDemoProductIntelligence(repository) {
  persistProductIntelligenceBundle(repository, primaryBundle());
  persistProductIntelligenceBundle(repository, competitorBundle());

  const main = repository.getSnapshot(MAIN_ID);

  const alreadyLinked =
    main?.competitors.some(
      (link) => link.competitorProductId === COMPETITOR_ID,
    ) ?? false;

  if (!alreadyLinked) {
    repository.addCompetitorLink({
      id: "demo-main-competitor-link",
      productId: MAIN_ID,
      competitorProductId: COMPETITOR_ID,
      relationship: "confirmed-comparable",
      confirmed: true,
      createdAt: NOW,
    });

    repository.addComparisonRun({
      id: "demo-main-comparison-1",
      productId: MAIN_ID,
      competitorProductId: COMPETITOR_ID,
      status: "VERIFIED",
      resultJson: JSON.stringify({
        capacity: {
          primary: "500 ml",
          competitor: "350 ml",
        },
        weight: {
          primary: "400 g",
          competitor: "500 g",
        },
      }),
      createdAt: NOW,
    });
  }

  return repository.getSnapshot(MAIN_ID);
}

export const DEMO_PRODUCT_ID = MAIN_ID;
