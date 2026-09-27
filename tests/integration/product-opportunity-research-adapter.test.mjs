import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  analyzeResearchProject,
  normalizeResearchProject,
  validateResearchProject,
} from "../../dist/index.js";

import {
  buildProductOpportunityInput,
  evaluateProductOpportunity,
} from "../../dist/product-opportunity/index.js";

const raw =
  JSON.parse(
    await readFile(
      new URL(
        "../fixtures/research-project.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

const checked =
  validateResearchProject(
    raw,
  );

assert.equal(
  checked.ok,
  true,
);

const baseProject =
  normalizeResearchProject(
    checked.project,
  );

function bridgeFor(
  project,
  overrides = {},
) {
  return {
    demand: {
      verified: false,
      independentSourceIds: [],
      normalizedTrendIndex: null,
      trendGrowthPercent: null,
      seasonality: "UNKNOWN",
      ...overrides.demand,
    },

    comparableCompetitorIds:
      overrides.comparableCompetitorIds ??
      project.competitors.map(
        (competitor) =>
          competitor.id,
      ),

    supplier: {
      supplierCount: 2,
      verifiedSupplierCount: 1,
      criticalConflictCount: 0,
      ...overrides.supplier,
    },

    verifiedSourceIds:
      overrides.verifiedSourceIds ??
      project.sources.map(
        (source) =>
          source.id,
      ),

    criticalEvidenceConflictCount:
      overrides.criticalEvidenceConflictCount ??
      0,

    unsupportedClaimCount:
      overrides.unsupportedClaimCount ??
      0,
  };
}

test(
  "existing Research Analysis maps into Product Opportunity input",
  () => {
    const analysis =
      analyzeResearchProject(
        baseProject,
      );

    const input =
      buildProductOpportunityInput(
        baseProject,
        analysis,
        bridgeFor(
          baseProject,
        ),
      );

    assert.equal(
      input.candidateId,
      baseProject.id,
    );

    assert.equal(
      input.competition.competitorCount,
      analysis.competitorCount,
    );

    assert.equal(
      input.competition.medianPrice,
      analysis.price.median,
    );

    assert.equal(
      input.customer.reviewCount,
      analysis.reviewCount,
    );

    assert.equal(
      input.economics
        .contributionAfterAds,
      analysis.economics
        ?.contributionAfterAds ??
        null,
    );
  },
);

test(
  "current research fixture stays HOLD when independent demand evidence is missing",
  () => {
    const analysis =
      analyzeResearchProject(
        baseProject,
      );

    const input =
      buildProductOpportunityInput(
        baseProject,
        analysis,
        bridgeFor(
          baseProject,
        ),
      );

    const decision =
      evaluateProductOpportunity(
        input,
      );

    assert.equal(
      decision.decision,
      "HOLD",
    );

    assert.equal(
      decision.gates.find(
        (gate) =>
          gate.code ===
          "DEMAND_VERIFIED",
      )?.status,
      "HOLD",
    );
  },
);

test(
  "stale Research Analysis is rejected",
  () => {
    const analysis =
      analyzeResearchProject(
        baseProject,
      );

    assert.throws(
      () =>
        buildProductOpportunityInput(
          baseProject,
          {
            ...analysis,
            projectId:
              "wrong-project",
          },
          bridgeFor(
            baseProject,
          ),
        ),
      /does not belong/,
    );
  },
);

test(
  "unknown comparable competitor fails closed",
  () => {
    const analysis =
      analyzeResearchProject(
        baseProject,
      );

    assert.throws(
      () =>
        buildProductOpportunityInput(
          baseProject,
          analysis,
          bridgeFor(
            baseProject,
            {
              comparableCompetitorIds:
                [
                  "not-real",
                ],
            },
          ),
        ),
      /Unknown comparable competitor/,
    );
  },
);

test(
  "non-demand source cannot masquerade as demand evidence",
  () => {
    const analysis =
      analyzeResearchProject(
        baseProject,
      );

    const nonDemand =
      baseProject.sources.find(
        (source) =>
          source.type !==
          "demand_data",
      );

    assert.ok(
      nonDemand,
    );

    assert.throws(
      () =>
        buildProductOpportunityInput(
          baseProject,
          analysis,
          bridgeFor(
            baseProject,
            {
              demand: {
                verified: true,

                independentSourceIds:
                  [
                    nonDemand.id,
                  ],

                normalizedTrendIndex:
                  80,

                trendGrowthPercent:
                  20,

                seasonality:
                  "LOW",
              },
            },
          ),
        ),
      /is not demand_data/,
    );
  },
);

test(
  "Research Engine can feed a commercially viable VALIDATE case",
  () => {
    const firstCompetitor =
      baseProject
        .competitors[0];

    const firstReview =
      baseProject
        .reviews[0];

    assert.ok(
      firstCompetitor,
    );

    assert.ok(
      firstReview,
    );

    const demandSource = {
      id:
        "demand-source-1",

      type:
        "demand_data",

      label:
        "Independent demand snapshot",

      capturedAt:
        "2026-09-27T00:00:00Z",

      sourceUrl:
        "https://example.com/demand",
    };

    const fifthCompetitor = {
      ...firstCompetitor,

      id:
        "competitor-extra",
    };

    const reviewNine = {
      ...firstReview,

      id:
        "review-extra-9",

      text:
        `${firstReview.text} additional observation`,
    };

    const reviewTen = {
      ...firstReview,

      id:
        "review-extra-10",

      text:
        `${firstReview.text} second observation`,
    };

    const project = {
      ...baseProject,

      sources: [
        ...baseProject.sources,
        demandSource,
      ],

      competitors: [
        ...baseProject.competitors,
        fifthCompetitor,
      ],

      reviews: [
        ...baseProject.reviews,
        reviewNine,
        reviewTen,
      ],

      economics: {
        sellingPrice: 79,
        cogs: 20,
        shippingCost: 5,
        marketplaceFees: 8,
        paymentFees: 3,
        discountAmount: 0,
        adAllowance: 15,
      },
    };

    const analysis =
      analyzeResearchProject(
        project,
      );

    const input =
      buildProductOpportunityInput(
        project,
        analysis,
        bridgeFor(
          project,
          {
            demand: {
              verified: true,

              independentSourceIds:
                [
                  demandSource.id,
                ],

              normalizedTrendIndex:
                76,

              trendGrowthPercent:
                18,

              seasonality:
                "LOW",
            },

            comparableCompetitorIds:
              project.competitors.map(
                (competitor) =>
                  competitor.id,
              ),
          },
        ),
      );

    const decision =
      evaluateProductOpportunity(
        input,
      );

    assert.equal(
      input.competition
        .comparableCompetitorCount,
      5,
    );

    assert.equal(
      input.customer.reviewCount >=
        10,
      true,
    );

    assert.equal(
      input.economics
        .contributionAfterAds >
        0,
      true,
    );

    assert.equal(
      decision.decision,
      "VALIDATE",
    );
  },
);
