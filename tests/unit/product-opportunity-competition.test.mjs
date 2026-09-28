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
  buildCompetitionProfile,
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

const project =
  normalizeResearchProject(
    checked.project,
  );

const analysis =
  analyzeResearchProject(
    project,
  );

const AS_OF =
  "2026-09-27T00:00:00Z";

function marketObservation(
  overrides = {},
) {
  return {
    id:
      "market-1",

    candidateId:
      project.id,

    sourceId:
      "market-source-1",

    sourceType:
      "MARKETPLACE",

    acquisitionMethod:
      "MANUAL_CAPTURE",

    signal:
      "SELLER_COUNT",

    value:
      24,

    unit:
      "COUNT",

    geography:
      "US",

    periodStart:
      "2026-09-01T00:00:00Z",

    periodEnd:
      "2026-09-20T00:00:00Z",

    capturedAt:
      "2026-09-21T00:00:00Z",

    sourceUrl:
      "https://example.com/market",

    verified:
      true,

    ...overrides,
  };
}

test(
  "existing research fixture produces deterministic competitor sample metrics",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [],
        AS_OF,
      );

    assert.equal(
      profile.sample
        .competitorCount,
      4,
    );

    assert.equal(
      profile.sample
        .medianPrice,
      76.75,
    );

    assert.equal(
      profile.sample
        .medianRating,
      4.15,
    );

    assert.equal(
      profile.sample
        .medianReviewCount,
      689,
    );

    assert.equal(
      profile.sample
        .p75ReviewCount,
      812,
    );

    assert.equal(
      profile.sample
        .offerPenetrationPercent,
      75,
    );

    assert.equal(
      profile.sample
        .candidatePricePercentileWithinSample,
      75,
    );
  },
);

test(
  "top feature penetration remains explicitly sample based",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [],
        AS_OF,
      );

    assert.equal(
      profile.sample
        .topFeature?.feature,
      "Portable",
    );

    assert.equal(
      profile.sample
        .topFeature
        ?.penetrationPercent,
      100,
    );

    assert.equal(
      profile.policies
        .samplePercentagesAreNotMarketShare,
      true,
    );
  },
);

test(
  "competitor sample alone does not fabricate direct saturation evidence",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [],
        AS_OF,
      );

    assert.equal(
      profile.marketEvidence
        .hasDirectSaturationEvidence,
      false,
    );

    assert.deepEqual(
      profile.marketEvidence
        .snapshots,
      [],
    );
  },
);

test(
  "fresh verified seller count creates direct saturation evidence",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [
          marketObservation(),
        ],
        AS_OF,
      );

    assert.equal(
      profile.marketEvidence
        .hasDirectSaturationEvidence,
      true,
    );

    assert.equal(
      profile.marketEvidence
        .independentVerifiedSourceCount,
      1,
    );

    assert.equal(
      profile.marketEvidence
        .snapshots[0]
        ?.periodStart,
      "2026-09-01T00:00:00Z",
    );
  },
);

test(
  "stale market evidence is excluded from current saturation evidence",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [
          marketObservation({
            periodStart:
              "2026-04-01T00:00:00Z",

            periodEnd:
              "2026-04-30T00:00:00Z",

            capturedAt:
              "2026-05-01T00:00:00Z",
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.marketEvidence
        .staleObservationCount,
      1,
    );

    assert.equal(
      profile.marketEvidence
        .hasDirectSaturationEvidence,
      false,
    );
  },
);

test(
  "unverified market observations do not create saturation evidence",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [
          marketObservation({
            verified:
              false,
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.marketEvidence
        .usableVerifiedObservationCount,
      0,
    );

    assert.equal(
      profile.marketEvidence
        .hasDirectSaturationEvidence,
      false,
    );
  },
);

test(
  "sponsored product share is tracked separately from seller count",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [
          marketObservation(),

          marketObservation({
            id:
              "sponsored-share",

            sourceId:
              "ad-source",

            signal:
              "SPONSORED_PRODUCT_SHARE",

            value:
              62,

            unit:
              "PERCENT",
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.marketEvidence
        .hasSponsoredCompetitionEvidence,
      true,
    );

    assert.equal(
      profile.marketEvidence
        .snapshots.length,
      2,
    );
  },
);

test(
  "competition percentage above 100 fails closed",
  () => {
    assert.throws(
      () =>
        buildCompetitionProfile(
          project,
          analysis,
          [
            marketObservation({
              signal:
                "SPONSORED_PRODUCT_SHARE",

              value:
                101,

              unit:
                "PERCENT",
            }),
          ],
          AS_OF,
        ),
      /between 0 and 100/,
    );
  },
);

test(
  "competition count signals require integer values",
  () => {
    assert.throws(
      () =>
        buildCompetitionProfile(
          project,
          analysis,
          [
            marketObservation({
              value:
                24.5,
            }),
          ],
          AS_OF,
        ),
      /must contain an integer/,
    );
  },
);

test(
  "competition observations cannot cross candidate boundaries",
  () => {
    assert.throws(
      () =>
        buildCompetitionProfile(
          project,
          analysis,
          [
            marketObservation({
              candidateId:
                "another-product",
            }),
          ],
          AS_OF,
        ),
      /belongs to another candidate/,
    );
  },
);

test(
  "stale or mismatched Research Analysis fails closed",
  () => {
    assert.throws(
      () =>
        buildCompetitionProfile(
          project,
          {
            ...analysis,

            projectId:
              "wrong-project",
          },
          [],
          AS_OF,
        ),
      /does not belong/,
    );
  },
);

test(
  "multiple measurements from one source count as one independent source",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [
          marketObservation(),

          marketObservation({
            id:
              "seller-older",

            value:
              21,

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
      profile.marketEvidence
        .independentVerifiedSourceCount,
      1,
    );

    assert.equal(
      profile.marketEvidence
        .snapshots.length,
      1,
    );

    assert.equal(
      profile.marketEvidence
        .snapshots[0].value,
      24,
    );

    assert.equal(
      profile.marketEvidence
        .disagreements.length,
      0,
    );
  },
);

test(
  "independent marketplace measurements remain separate and are never averaged",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [
          marketObservation({
            sourceId:
              "source-a",

            value:
              20,
          }),

          marketObservation({
            id:
              "seller-b",

            sourceId:
              "source-b",

            value:
              35,
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.marketEvidence
        .snapshots.length,
      2,
    );

    assert.equal(
      profile.policies
        .noCrossSourceAveraging,
      true,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        profile.marketEvidence,
        "averageSellerCount",
      ),
      false,
    );
  },
);

test(
  "equivalent-period competition values from independent sources are surfaced as disagreement",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [
          marketObservation({
            sourceId:
              "source-a",
            value:
              20,
          }),

          marketObservation({
            id:
              "seller-b",
            sourceId:
              "source-b",
            value:
              35,
          }),
        ],
        AS_OF,
      );

    assert.deepEqual(
      profile.marketEvidence
        .disagreements,
      [
        {
          signal:
            "SELLER_COUNT",
          unit:
            "COUNT",
          geography:
            "US",
          periodStart:
            "2026-09-01T00:00:00Z",
          periodEnd:
            "2026-09-20T00:00:00Z",
          observations: [
            {
              sourceId:
                "source-a",
              value:
                20,
            },
            {
              sourceId:
                "source-b",
              value:
                35,
            },
          ],
          interpretation:
            "SOURCE_VALUES_DIFFER_REVIEW_REQUIRED",
        },
      ],
    );
  },
);

test(
  "different competition measurement periods are not compared as disagreement",
  () => {
    const profile =
      buildCompetitionProfile(
        project,
        analysis,
        [
          marketObservation({
            sourceId:
              "source-a",
            value:
              20,
          }),

          marketObservation({
            id:
              "seller-b",
            sourceId:
              "source-b",
            value:
              35,
            periodStart:
              "2026-08-01T00:00:00Z",
            periodEnd:
              "2026-08-31T00:00:00Z",
          }),
        ],
        AS_OF,
      );

    assert.equal(
      profile.marketEvidence
        .disagreements.length,
      0,
    );
  },
);
