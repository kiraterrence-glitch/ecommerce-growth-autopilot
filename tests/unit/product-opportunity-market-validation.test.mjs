import assert from "node:assert/strict";
import test from "node:test";

import {
  validateMarketEvidence,
} from "../../dist/product-opportunity/index.js";

function demand(
  sufficiency,
  candidateId = "candidate-1",
) {
  return {
    candidateId,
    sufficiency,
    evidenceShape:
      sufficiency === "SUPPORTED"
        ? "SEARCH_AND_PURCHASE"
        : "SEARCH_ONLY",
    reasons: [
      `demand-${sufficiency}`,
    ],
    warnings: [],
    nextActions: [
      "demand-action",
    ],
    evidence: {
      usableVerifiedObservationCount:
        sufficiency === "INSUFFICIENT"
          ? 0
          : 2,
      independentVerifiedSourceCount:
        sufficiency === "SUPPORTED"
          ? 2
          : 1,
      hasRelativeSearchEvidence:
        true,
      hasAbsoluteSearchEvidence:
        false,
      hasPurchaseEvidence:
        sufficiency === "SUPPORTED",
      staleObservationCount:
        0,
      disagreementCount:
        0,
    },
    policies: {
      supportedDoesNotMeanGuaranteedDemand:
        true,
      searchInterestDoesNotEqualPurchases:
        true,
      purchaseEvidenceDoesNotProveProfitability:
        true,
      disagreementsRequireReview:
        true,
      noOpaqueDemandScore:
        true,
    },
  };
}

function competition(
  sufficiency,
  candidateId = "candidate-1",
) {
  return {
    candidateId,
    sufficiency,
    reasons: [
      `competition-${sufficiency}`,
    ],
    warnings: [],
    nextActions: [
      "competition-action",
    ],
    evidence: {
      competitorCount:
        sufficiency === "INSUFFICIENT"
          ? 0
          : 5,
      usableVerifiedObservationCount:
        sufficiency === "INSUFFICIENT"
          ? 0
          : 1,
      independentVerifiedSourceCount:
        sufficiency === "INSUFFICIENT"
          ? 0
          : 1,
      hasDirectSaturationEvidence:
        sufficiency === "SUPPORTED",
      staleObservationCount:
        0,
      unverifiedObservationCount:
        0,
      disagreementCount:
        0,
    },
    policies: {
      samplePercentagesAreNotMarketShare:
        true,
      supportedDoesNotMeanAttractiveMarket:
        true,
      disagreementsRequireReview:
        true,
      noOpaqueCompetitionScore:
        true,
    },
  };
}

const cases = [
  [
    "SUPPORTED",
    "SUPPORTED",
    "READY_FOR_COMMERCIAL_REVIEW",
  ],
  [
    "SUPPORTED",
    "PARTIAL",
    "PARTIAL_EVIDENCE",
  ],
  [
    "SUPPORTED",
    "INSUFFICIENT",
    "INSUFFICIENT_EVIDENCE",
  ],
  [
    "PARTIAL",
    "SUPPORTED",
    "PARTIAL_EVIDENCE",
  ],
  [
    "PARTIAL",
    "PARTIAL",
    "PARTIAL_EVIDENCE",
  ],
  [
    "PARTIAL",
    "INSUFFICIENT",
    "INSUFFICIENT_EVIDENCE",
  ],
  [
    "INSUFFICIENT",
    "SUPPORTED",
    "INSUFFICIENT_EVIDENCE",
  ],
  [
    "INSUFFICIENT",
    "PARTIAL",
    "INSUFFICIENT_EVIDENCE",
  ],
  [
    "INSUFFICIENT",
    "INSUFFICIENT",
    "INSUFFICIENT_EVIDENCE",
  ],
];

for (
  const [
    demandSufficiency,
    competitionSufficiency,
    expected,
  ] of cases
) {
  test(
    `${demandSufficiency} demand plus ${competitionSufficiency} competition produces ${expected}`,
    () => {
      const result =
        validateMarketEvidence(
          demand(
            demandSufficiency,
          ),
          competition(
            competitionSufficiency,
          ),
        );

      assert.equal(
        result.status,
        expected,
      );
    },
  );
}

test(
  "market validation refuses to combine different candidates",
  () => {
    assert.throws(
      () =>
        validateMarketEvidence(
          demand("SUPPORTED"),
          competition(
            "SUPPORTED",
            "candidate-2",
          ),
        ),
      /different candidates/i,
    );
  },
);

test(
  "market validation preserves underlying evidence explanations without duplicates",
  () => {
    const demandResult = {
      ...demand("PARTIAL"),
      warnings: [
        "shared-warning",
      ],
      nextActions: [
        "shared-action",
      ],
    };

    const competitionResult = {
      ...competition("PARTIAL"),
      warnings: [
        "shared-warning",
      ],
      nextActions: [
        "shared-action",
      ],
    };

    const result =
      validateMarketEvidence(
        demandResult,
        competitionResult,
      );

    assert.deepEqual(
      result.warnings,
      [
        "shared-warning",
      ],
    );

    assert.deepEqual(
      result.nextActions,
      [
        "shared-action",
      ],
    );
  },
);

test(
  "commercial review readiness is not launch approval or a market guarantee",
  () => {
    const result =
      validateMarketEvidence(
        demand("SUPPORTED"),
        competition("SUPPORTED"),
      );

    assert.equal(
      result.policies
        .readyMeansCommercialReviewNotLaunch,
      true,
    );

    assert.equal(
      result.policies
        .noDemandGuarantee,
      true,
    );

    assert.equal(
      result.policies
        .noMarketShareInference,
      true,
    );

    assert.equal(
      result.policies
        .noOpaqueMarketScore,
      true,
    );
  },
);
