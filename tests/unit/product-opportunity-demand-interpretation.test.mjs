import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDemandProfile,
  interpretDemandProfile,
} from "../../dist/product-opportunity/index.js";

const AS_OF =
  "2026-09-27T00:00:00Z";

function observation(
  overrides = {},
) {
  return {
    id:
      "obs-1",

    candidateId:
      "candidate-1",

    sourceId:
      "source-1",

    sourceType:
      "MARKETPLACE",

    acquisitionMethod:
      "AUTHORIZED_EXPORT",

    signal:
      "SEARCH_VOLUME_ABSOLUTE",

    value:
      12000,

    unit:
      "COUNT",

    currency:
      null,

    geography:
      "US",

    periodStart:
      "2026-09-01T00:00:00Z",

    periodEnd:
      "2026-09-20T00:00:00Z",

    capturedAt:
      "2026-09-21T00:00:00Z",

    sourceUrl:
      "https://example.com/demand",

    verified:
      true,

    ...overrides,
  };
}

function interpret(
  observations,
) {
  const profile =
    buildDemandProfile(
      "candidate-1",
      observations,
      AS_OF,
    );

  return interpretDemandProfile(
    profile,
  );
}

test(
  "no demand evidence is INSUFFICIENT",
  () => {
    const result =
      interpret([]);

    assert.equal(
      result.sufficiency,
      "INSUFFICIENT",
    );

    assert.equal(
      result.evidenceShape,
      "NONE",
    );
  },
);

test(
  "search-only evidence is PARTIAL",
  () => {
    const result =
      interpret([
        observation(),
        observation({
          id:
            "search-2",
          sourceId:
            "source-2",
          value:
            13000,
        }),
      ]);

    assert.equal(
      result.sufficiency,
      "PARTIAL",
    );

    assert.equal(
      result.evidenceShape,
      "SEARCH_ONLY",
    );
  },
);

test(
  "purchase-only evidence is PARTIAL",
  () => {
    const result =
      interpret([
        observation({
          signal:
            "PURCHASE_COUNT",
          value:
            900,
        }),

        observation({
          id:
            "purchase-2",
          sourceId:
            "source-2",
          signal:
            "UNITS_SOLD",
          value:
            850,
        }),
      ]);

    assert.equal(
      result.sufficiency,
      "PARTIAL",
    );

    assert.equal(
      result.evidenceShape,
      "PURCHASE_ONLY",
    );
  },
);

test(
  "search and purchase evidence from two independent sources is SUPPORTED",
  () => {
    const result =
      interpret([
        observation(),

        observation({
          id:
            "purchase",
          sourceId:
            "purchase-source",
          signal:
            "PURCHASE_COUNT",
          value:
            840,
        }),
      ]);

    assert.equal(
      result.sufficiency,
      "SUPPORTED",
    );

    assert.equal(
      result.evidenceShape,
      "SEARCH_AND_PURCHASE",
    );
  },
);

test(
  "multiple measurements from only one source remain PARTIAL",
  () => {
    const result =
      interpret([
        observation(),

        observation({
          id:
            "purchase",
          signal:
            "PURCHASE_COUNT",
          value:
            840,
        }),
      ]);

    assert.equal(
      result.evidence
        .independentVerifiedSourceCount,
      1,
    );

    assert.equal(
      result.sufficiency,
      "PARTIAL",
    );
  },
);

test(
  "cross-source disagreement prevents SUPPORTED classification",
  () => {
    const result =
      interpret([
        observation({
          sourceId:
            "search-a",
          value:
            12000,
        }),

        observation({
          id:
            "search-b",
          sourceId:
            "search-b",
          value:
            18000,
        }),

        observation({
          id:
            "purchase",
          sourceId:
            "purchase-source",
          signal:
            "PURCHASE_COUNT",
          value:
            900,
        }),
      ]);

    assert.equal(
      result.evidence
        .disagreementCount,
      1,
    );

    assert.equal(
      result.sufficiency,
      "PARTIAL",
    );

    assert.equal(
      result.warnings.some(
        (warning) =>
          /disagree/i.test(
            warning,
          ),
      ),
      true,
    );
  },
);

test(
  "stale evidence cannot create supported demand",
  () => {
    const result =
      interpret([
        observation({
          periodStart:
            "2026-04-01T00:00:00Z",
          periodEnd:
            "2026-04-30T00:00:00Z",
          capturedAt:
            "2026-05-01T00:00:00Z",
        }),

        observation({
          id:
            "old-purchase",
          sourceId:
            "purchase-source",
          signal:
            "PURCHASE_COUNT",
          value:
            900,
          periodStart:
            "2026-04-01T00:00:00Z",
          periodEnd:
            "2026-04-30T00:00:00Z",
          capturedAt:
            "2026-05-01T00:00:00Z",
        }),
      ]);

    assert.equal(
      result.sufficiency,
      "INSUFFICIENT",
    );

    assert.equal(
      result.evidence
        .staleObservationCount,
      2,
    );
  },
);

test(
  "unverified evidence cannot create supported demand",
  () => {
    const result =
      interpret([
        observation({
          verified:
            false,
        }),

        observation({
          id:
            "purchase",
          sourceId:
            "purchase-source",
          signal:
            "PURCHASE_COUNT",
          value:
            900,
          verified:
            false,
        }),
      ]);

    assert.equal(
      result.sufficiency,
      "INSUFFICIENT",
    );
  },
);

test(
  "SUPPORTED explicitly does not mean guaranteed demand or profitability",
  () => {
    const result =
      interpret([
        observation(),

        observation({
          id:
            "purchase",
          sourceId:
            "purchase-source",
          signal:
            "PURCHASE_COUNT",
          value:
            840,
        }),
      ]);

    assert.equal(
      result.policies
        .supportedDoesNotMeanGuaranteedDemand,
      true,
    );

    assert.equal(
      result.policies
        .purchaseEvidenceDoesNotProveProfitability,
      true,
    );

    assert.equal(
      result.policies
        .noOpaqueDemandScore,
      true,
    );
  },
);

test(
  "SUPPORTED demand directs the product to broader commercial validation",
  () => {
    const result =
      interpret([
        observation(),

        observation({
          id:
            "purchase",
          sourceId:
            "purchase-source",
          signal:
            "PURCHASE_COUNT",
          value:
            840,
        }),
      ]);

    assert.equal(
      result.nextActions.some(
        (action) =>
          /competition, economics, supplier/i.test(
            action,
          ),
      ),
      true,
    );
  },
);
