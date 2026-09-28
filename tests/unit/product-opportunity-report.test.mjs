import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductOpportunityReport,
  evaluateProductOpportunity,
} from "../../dist/product-opportunity/index.js";

function candidate() {
  return {
    candidateId:
      "report-candidate",

    demand: {
      verified: true,
      independentSourceCount: 2,
      normalizedTrendIndex: 74,
      trendGrowthPercent: 16,
      seasonality: "LOW",
    },

    competition: {
      competitorCount: 20,
      comparableCompetitorCount: 15,
      medianPrice: 69.99,
      medianReviewCount: 510,
    },

    economics: {
      sellingPrice: 69.99,
      landedCost: 24,
      contributionBeforeAds: 35,
      contributionAfterAds: 17,
      contributionMarginPercent: 24.3,
      breakEvenCpa: 35,
    },

    customer: {
      reviewCount: 250,
      recurringPainPointCount: 4,
    },

    supplier: {
      supplierCount: 3,
      verifiedSupplierCount: 2,
      criticalConflictCount: 0,
    },

    evidence: {
      totalSourceCount: 12,
      verifiedSourceCount: 10,
      criticalConflictCount: 0,
      unsupportedClaimCount: 0,
    },
  };
}

function reportFor(
  input,
) {
  const decision =
    evaluateProductOpportunity(
      input,
    );

  return buildProductOpportunityReport(
    input,
    decision,
  );
}

function evidenceBackedCandidate(
  status =
    "READY_FOR_COMMERCIAL_REVIEW",
  demandSufficiency =
    "SUPPORTED",
  competitionSufficiency =
    "SUPPORTED",
) {
  return {
    ...candidate(),
    marketValidation: {
      status,
      demandSufficiency,
      competitionSufficiency,
    },
  };
}

test(
  "strong evidence produces HIGH evidence confidence",
  () => {
    const report =
      reportFor(
        candidate(),
      );

    assert.equal(
      report.decision,
      "VALIDATE",
    );

    assert.equal(
      report.evidenceConfidence,
      "HIGH",
    );

    assert.equal(
      report.confidenceMethod,
      "HEURISTIC_COVERAGE_V1",
    );

    assert.equal(
      report.calibrationStatus,
      "UNVALIDATED_INTERNAL_HEURISTIC",
    );
  },
);

test(
  "report calculates source verification percentage from actual sample",
  () => {
    const report =
      reportFor(
        candidate(),
      );

    assert.equal(
      report.metrics
        .verifiedSourcePercent,
      83.33,
    );
  },
);

test(
  "comparable competitor percentage is explicitly sample-based",
  () => {
    const report =
      reportFor(
        candidate(),
      );

    assert.equal(
      report.metrics
        .comparableCompetitorPercent,
      75,
    );

    assert.equal(
      report.policies
        .percentagesDescribeSamples,
      true,
    );

    assert.equal(
      report.policies
        .noMarketShareInference,
      true,
    );
  },
);

test(
  "missing demand creates blocker and concrete next action",
  () => {
    const input =
      candidate();

    input.demand.verified =
      false;

    input.demand.independentSourceCount =
      0;

    const report =
      reportFor(
        input,
      );

    assert.equal(
      report.decision,
      "HOLD",
    );

    assert.equal(
      report.blockingReasons.some(
        (reason) =>
          /demand evidence/i.test(
            reason,
          ),
      ),
      true,
    );

    assert.equal(
      report.nextActions.some(
        (action) =>
          /independent demand-data source/i.test(
            action,
          ),
      ),
      true,
    );
  },
);

test(
  "negative economics produces REJECT guidance",
  () => {
    const input =
      candidate();

    input.economics
      .contributionAfterAds =
      -3;

    input.economics
      .contributionMarginPercent =
      -4.2;

    const report =
      reportFor(
        input,
      );

    assert.equal(
      report.decision,
      "REJECT",
    );

    assert.equal(
      report.nextActions.some(
        (action) =>
          /do not proceed at current economics/i.test(
            action,
          ),
      ),
      true,
    );
  },
);

test(
  "review warning is separated from blocking reasons",
  () => {
    const input =
      candidate();

    input.customer.reviewCount =
      8;

    const report =
      reportFor(
        input,
      );

    assert.equal(
      report.warnings.length >
        0,
      true,
    );

    assert.equal(
      report.blockingReasons.some(
        (reason) =>
          /review/i.test(
            reason,
          ),
      ),
      false,
    );
  },
);

test(
  "VALIDATE always includes non-guarantee validation guidance",
  () => {
    const report =
      reportFor(
        candidate(),
      );

    assert.equal(
      report.nextActions.some(
        (action) =>
          /low-cost market validation/i.test(
            action,
          ),
      ),
      true,
    );

    assert.equal(
      report.policies
        .noSalesGuarantee,
      true,
    );

    assert.equal(
      report.policies
        .trendIsRelativeInterest,
      true,
    );
  },
);

test(
  "decision from another candidate fails closed",
  () => {
    const input =
      candidate();

    const decision =
      evaluateProductOpportunity(
        input,
      );

    assert.throws(
      () =>
        buildProductOpportunityReport(
          {
            ...input,

            candidateId:
              "different-candidate",
          },

          decision,
        ),
      /does not belong/,
    );
  },
);

test(
  "report does not expose fake market share",
  () => {
    const report =
      reportFor(
        candidate(),
      );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        report.metrics,
        "marketSharePercent",
      ),
      false,
    );
  },
);

test(
  "contract 1.1 report exposes the evidence-backed market classifications",
  () => {
    const report =
      reportFor(
        evidenceBackedCandidate(),
      );

    assert.equal(
      report.contractVersion,
      "1.1.0",
    );

    assert.equal(
      report.metrics
        .marketValidationStatus,
      "READY_FOR_COMMERCIAL_REVIEW",
    );

    assert.equal(
      report.metrics
        .demandSufficiency,
      "SUPPORTED",
    );

    assert.equal(
      report.metrics
        .competitionSufficiency,
      "SUPPORTED",
    );

    assert.equal(
      report.positiveReasons.some(
        (reason) =>
          /supported for commercial review/i.test(
            reason,
          ),
      ),
      true,
    );
  },
);

test(
  "partial market evidence produces blocking guidance without launch approval",
  () => {
    const report =
      reportFor(
        evidenceBackedCandidate(
          "PARTIAL_EVIDENCE",
          "SUPPORTED",
          "PARTIAL",
        ),
      );

    assert.equal(
      report.decision,
      "HOLD",
    );

    assert.equal(
      report.blockingReasons.some(
        (reason) =>
          /partial/i.test(reason),
      ),
      true,
    );

    assert.equal(
      report.nextActions.some(
        (action) =>
          /collect.*competition evidence/i.test(
            action,
          ),
      ),
      true,
    );

    assert.equal(
      report.nextActions.some(
        (action) =>
          /launch approved/i.test(
            action,
          ),
      ),
      false,
    );
  },
);
