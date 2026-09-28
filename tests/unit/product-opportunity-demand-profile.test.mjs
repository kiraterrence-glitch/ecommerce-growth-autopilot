import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDemandProfile,
} from "../../dist/product-opportunity/index.js";

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
      "GOOGLE_TRENDS",

    acquisitionMethod:
      "MANUAL_CAPTURE",

    signal:
      "SEARCH_INTEREST_RELATIVE",

    value:
      60,

    unit:
      "INDEX_0_100",

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

const AS_OF =
  "2026-09-27T00:00:00Z";

test(
  "empty demand profile remains explicit rather than inventing demand",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [],
        AS_OF,
      );

    assert.equal(
      profile.observationCount,
      0,
    );

    assert.equal(
      profile.hasPurchaseEvidence,
      false,
    );

    assert.equal(
      profile.independentVerifiedSourceCount,
      0,
    );
  },
);

test(
  "observations cannot cross candidate boundaries",
  () => {
    assert.throws(
      () =>
        buildDemandProfile(
          "candidate-2",
          [
            observation(),
          ],
          AS_OF,
        ),
      /belongs to another candidate/,
    );
  },
);

test(
  "unverified observations do not count as usable verified evidence",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation({
            verified: false,
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.verifiedObservationCount,
      0,
    );

    assert.equal(
      profile.usableVerifiedObservationCount,
      0,
    );
  },
);

test(
  "stale verified evidence is excluded from current evidence",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation({
            periodStart:
              "2026-05-01T00:00:00Z",

            periodEnd:
              "2026-05-31T00:00:00Z",

            capturedAt:
              "2026-06-01T00:00:00Z",
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.staleObservationCount,
      1,
    );

    assert.equal(
      profile.usableVerifiedObservationCount,
      0,
    );
  },
);

test(
  "multiple observations from one source still count as one independent source",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation({
            id: "obs-1",
            value: 55,
            periodStart:
              "2026-08-01T00:00:00Z",
            periodEnd:
              "2026-08-31T00:00:00Z",
            capturedAt:
              "2026-09-01T00:00:00Z",
          }),

          observation({
            id: "obs-2",
            value: 60,
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.independentVerifiedSourceCount,
      1,
    );
  },
);

test(
  "absolute search and purchase evidence remain separate signals",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation(),

          observation({
            id:
              "absolute-search",

            sourceId:
              "market-data",

            sourceType:
              "MARKETPLACE",

            signal:
              "SEARCH_VOLUME_ABSOLUTE",

            value:
              12500,

            unit:
              "COUNT",
          }),

          observation({
            id:
              "purchase-count",

            sourceId:
              "purchase-data",

            sourceType:
              "MARKETPLACE",

            signal:
              "PURCHASE_COUNT",

            value:
              840,

            unit:
              "COUNT",
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.hasRelativeSearchEvidence,
      true,
    );

    assert.equal(
      profile.hasAbsoluteSearchEvidence,
      true,
    );

    assert.equal(
      profile.hasPurchaseEvidence,
      true,
    );
  },
);

test(
  "series exposes latest and previous values without cross-source averaging",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation({
            id: "old",
            value: 52,
            periodStart:
              "2026-08-01T00:00:00Z",
            periodEnd:
              "2026-08-31T00:00:00Z",
            capturedAt:
              "2026-09-01T00:00:00Z",
          }),

          observation({
            id: "new",
            value: 68,
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.series.length,
      1,
    );

    assert.equal(
      profile.series[0].previousValue,
      52,
    );

    assert.equal(
      profile.series[0].latestValue,
      68,
    );

    assert.equal(
      profile.series[0].deltaInNativeUnit,
      16,
    );

    assert.equal(
      profile.series[0].direction,
      "RISING",
    );
  },
);

test(
  "relative index remains native index points and never becomes search volume",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation(),
        ],
        AS_OF,
      );

    assert.equal(
      profile.policies
        .relativeIndexNotSearchVolume,
      true,
    );

    assert.equal(
      profile.policies
        .noCrossSourceAveraging,
      true,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        profile,
        "demandScore",
      ),
      false,
    );
  },
);

test(
  "equivalent-period values from independent sources are surfaced as disagreement",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation({
            sourceId:
              "source-a",
            value:
              60,
          }),

          observation({
            id:
              "obs-b",
            sourceId:
              "source-b",
            value:
              78,
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.disagreements.length,
      1,
    );

    assert.equal(
      profile.disagreements[0]
        .observations.length,
      2,
    );

    assert.equal(
      profile.disagreements[0]
        .interpretation,
      "SOURCE_VALUES_DIFFER_REVIEW_REQUIRED",
    );
  },
);

test(
  "different measurement periods are not falsely called disagreements",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation({
            sourceId:
              "source-a",
          }),

          observation({
            id:
              "obs-b",
            sourceId:
              "source-b",
            value:
              78,
            periodStart:
              "2026-08-01T00:00:00Z",
            periodEnd:
              "2026-08-31T00:00:00Z",
            capturedAt:
              "2026-09-01T00:00:00Z",
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.disagreements.length,
      0,
    );
  },
);

test(
  "fresh aging and stale observations are counted separately",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation(),

          observation({
            id: "aging",
            sourceId: "source-aging",
            periodStart:
              "2026-07-01T00:00:00Z",
            periodEnd:
              "2026-08-01T00:00:00Z",
            capturedAt:
              "2026-08-02T00:00:00Z",
          }),

          observation({
            id: "stale",
            sourceId: "source-stale",
            periodStart:
              "2026-05-01T00:00:00Z",
            periodEnd:
              "2026-05-31T00:00:00Z",
            capturedAt:
              "2026-06-01T00:00:00Z",
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.freshObservationCount,
      1,
    );

    assert.equal(
      profile.agingObservationCount,
      1,
    );

    assert.equal(
      profile.staleObservationCount,
      1,
    );
  },
);

test(
  "revenue in different currencies is not compared as equivalent evidence",
  () => {
    const profile =
      buildDemandProfile(
        "candidate-1",
        [
          observation({
            sourceId:
              "revenue-usd",

            sourceType:
              "MARKETPLACE",

            signal:
              "REVENUE",

            value:
              50000,

            unit:
              "CURRENCY",

            currency:
              "USD",
          }),

          observation({
            id:
              "revenue-eur",

            sourceId:
              "revenue-eur",

            sourceType:
              "MARKETPLACE",

            signal:
              "REVENUE",

            value:
              45000,

            unit:
              "CURRENCY",

            currency:
              "EUR",
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.disagreements.length,
      0,
    );
  },
);
