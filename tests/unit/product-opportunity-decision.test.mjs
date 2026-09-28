import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateProductOpportunity,
} from "../../dist/product-opportunity/index.js";

function strongCandidate() {
  return {
    candidateId:
      "candidate-strong",

    demand: {
      verified: true,
      independentSourceCount: 2,
      normalizedTrendIndex: 72,
      trendGrowthPercent: 18,
      seasonality: "LOW",
    },

    competition: {
      competitorCount: 20,
      comparableCompetitorCount: 15,
      medianPrice: 69.99,
      medianReviewCount: 480,
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

function evidenceBackedCandidate(
  status =
    "READY_FOR_COMMERCIAL_REVIEW",
  demandSufficiency =
    "SUPPORTED",
  competitionSufficiency =
    "SUPPORTED",
) {
  return {
    ...strongCandidate(),
    marketValidation: {
      status,
      demandSufficiency,
      competitionSufficiency,
    },
  };
}

test(
  "strong evidence and viable economics produce VALIDATE",
  () => {
    const result =
      evaluateProductOpportunity(
        strongCandidate(),
      );

    assert.equal(
      result.decision,
      "VALIDATE",
    );

    assert.equal(
      result.contractVersion,
      "1.0.0",
    );

    assert.equal(
      result.policies.outcomeMeaning,
      "VALIDATION_GUIDANCE_NOT_GUARANTEE",
    );

    assert.equal(
      result.gates.some(
        (item) =>
          item.status === "HOLD" ||
          item.status === "REJECT",
      ),
      false,
    );
  },
);

test(
  "high demand cannot rescue negative economics",
  () => {
    const candidate =
      strongCandidate();

    candidate.economics.contributionAfterAds =
      -4;

    candidate.economics.contributionMarginPercent =
      -5.7;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "REJECT",
    );

    assert.equal(
      result.gates.find(
        (item) =>
          item.code === "ECONOMICS",
      )?.status,
      "REJECT",
    );
  },
);

test(
  "good economics without verified demand stays HOLD",
  () => {
    const candidate =
      strongCandidate();

    candidate.demand.verified =
      false;

    candidate.demand.independentSourceCount =
      0;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "HOLD",
    );
  },
);

test(
  "supplier conflict blocks validation",
  () => {
    const candidate =
      strongCandidate();

    candidate.supplier.criticalConflictCount =
      1;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "HOLD",
    );

    assert.equal(
      result.gates.find(
        (item) =>
          item.code === "SUPPLIER_CONFLICT",
      )?.status,
      "HOLD",
    );
  },
);

test(
  "unsupported claims block validation",
  () => {
    const candidate =
      strongCandidate();

    candidate.evidence.unsupportedClaimCount =
      2;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "HOLD",
    );
  },
);

test(
  "too few comparable competitors blocks validation",
  () => {
    const candidate =
      strongCandidate();

    candidate.competition.comparableCompetitorCount =
      4;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "HOLD",
    );
  },
);

test(
  "small review sample warns but does not alone block validation",
  () => {
    const candidate =
      strongCandidate();

    candidate.customer.reviewCount =
      8;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "VALIDATE",
    );

    assert.equal(
      result.gates.find(
        (item) =>
          item.code === "CUSTOMER_EVIDENCE",
      )?.status,
      "WARN",
    );
  },
);

test(
  "missing economics produces HOLD rather than optimistic inference",
  () => {
    const candidate =
      strongCandidate();

    candidate.economics.breakEvenCpa =
      null;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "HOLD",
    );
  },
);

test(
  "critical evidence conflict blocks validation",
  () => {
    const candidate =
      strongCandidate();

    candidate.evidence.criticalConflictCount =
      1;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "HOLD",
    );
  },
);

test(
  "invalid competitor counts fail closed",
  () => {
    const candidate =
      strongCandidate();

    candidate.competition.comparableCompetitorCount =
      21;

    assert.throws(
      () =>
        evaluateProductOpportunity(
          candidate,
        ),
      /cannot exceed competitorCount/,
    );
  },
);

test(
  "trend index outside 0-100 fails closed",
  () => {
    const candidate =
      strongCandidate();

    candidate.demand.normalizedTrendIndex =
      140;

    assert.throws(
      () =>
        evaluateProductOpportunity(
          candidate,
        ),
      /between 0 and 100/,
    );
  },
);

test(
  "ready market evidence uses contract 1.1 and passes the market gate",
  () => {
    const result =
      evaluateProductOpportunity(
        evidenceBackedCandidate(),
      );

    assert.equal(
      result.contractVersion,
      "1.1.0",
    );

    assert.equal(
      result.decision,
      "VALIDATE",
    );

    assert.equal(
      result.gates.find(
        (gate) =>
          gate.code ===
          "MARKET_VALIDATION",
      )?.status,
      "PASS",
    );

    assert.equal(
      result.gates.some(
        (gate) =>
          gate.code ===
            "DEMAND_VERIFIED" ||
          gate.code ===
            "COMPETITOR_SAMPLE",
      ),
      false,
    );
  },
);

test(
  "partial market evidence holds the opportunity",
  () => {
    const result =
      evaluateProductOpportunity(
        evidenceBackedCandidate(
          "PARTIAL_EVIDENCE",
          "SUPPORTED",
          "PARTIAL",
        ),
      );

    assert.equal(
      result.decision,
      "HOLD",
    );
  },
);

test(
  "insufficient market evidence holds the opportunity",
  () => {
    const result =
      evaluateProductOpportunity(
        evidenceBackedCandidate(
          "INSUFFICIENT_EVIDENCE",
          "INSUFFICIENT",
          "SUPPORTED",
        ),
      );

    assert.equal(
      result.decision,
      "HOLD",
    );
  },
);

test(
  "ready market evidence cannot rescue negative economics",
  () => {
    const candidate =
      evidenceBackedCandidate();

    candidate.economics
      .contributionAfterAds = -4;
    candidate.economics
      .contributionMarginPercent =
      -5.7;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "REJECT",
    );
  },
);

test(
  "ready market evidence cannot bypass supplier evidence or claim safety gates",
  () => {
    const candidate =
      evidenceBackedCandidate();

    candidate.supplier
      .criticalConflictCount = 1;
    candidate.evidence
      .criticalConflictCount = 1;
    candidate.evidence
      .unsupportedClaimCount = 1;

    const result =
      evaluateProductOpportunity(
        candidate,
      );

    assert.equal(
      result.decision,
      "HOLD",
    );

    assert.deepEqual(
      result.gates
        .filter(
          (gate) =>
            [
              "SUPPLIER_CONFLICT",
              "EVIDENCE_CONFLICT",
              "UNSUPPORTED_CLAIMS",
            ].includes(gate.code),
        )
        .map(
          (gate) =>
            gate.status,
        ),
      [
        "HOLD",
        "HOLD",
        "HOLD",
      ],
    );
  },
);

test(
  "market readiness cannot contradict underlying sufficiency",
  () => {
    assert.throws(
      () =>
        evaluateProductOpportunity(
          evidenceBackedCandidate(
            "READY_FOR_COMMERCIAL_REVIEW",
            "PARTIAL",
            "SUPPORTED",
          ),
        ),
      /inconsistent/i,
    );
  },
);
