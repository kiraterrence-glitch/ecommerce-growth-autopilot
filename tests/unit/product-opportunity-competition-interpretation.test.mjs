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
  interpretCompetitionProfile,
} from "../../dist/product-opportunity/index.js";

const raw = JSON.parse(
  await readFile(
    new URL(
      "../fixtures/research-project.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const checked =
  validateResearchProject(raw);

assert.equal(checked.ok, true);

const baseProject =
  normalizeResearchProject(
    checked.project,
  );

const AS_OF =
  "2026-09-27T00:00:00Z";

function projectWithCompetitors(
  count,
) {
  const seed =
    baseProject.competitors[0];

  assert.ok(seed);

  return {
    ...baseProject,
    competitors:
      Array.from(
        {
          length: count,
        },
        (_, index) => ({
          ...seed,
          id:
            `competitor-${index + 1}`,
          price:
            seed.price + index,
        }),
      ),
  };
}

function marketObservation(
  candidateId,
  overrides = {},
) {
  return {
    id:
      "market-1",
    candidateId,
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

function interpret(
  competitorCount,
  observations = [],
) {
  const project =
    projectWithCompetitors(
      competitorCount,
    );

  const analysis =
    analyzeResearchProject(
      project,
    );

  const profile =
    buildCompetitionProfile(
      project,
      analysis,
      observations.map(
        (observation) => ({
          ...observation,
          candidateId:
            project.id,
        }),
      ),
      AS_OF,
    );

  return interpretCompetitionProfile(
    profile,
  );
}

test(
  "no sample and no current market evidence is INSUFFICIENT",
  () => {
    const result = interpret(0);

    assert.equal(
      result.sufficiency,
      "INSUFFICIENT",
    );
  },
);

test(
  "a non-empty sample below five competitors is PARTIAL",
  () => {
    const result = interpret(4);

    assert.equal(
      result.sufficiency,
      "PARTIAL",
    );
  },
);

test(
  "five competitors plus current direct saturation evidence is SUPPORTED",
  () => {
    const project =
      projectWithCompetitors(5);

    const result = interpret(
      5,
      [
        marketObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.sufficiency,
      "SUPPORTED",
    );

    assert.equal(
      result.evidence
        .hasDirectSaturationEvidence,
      true,
    );
  },
);

test(
  "five sampled competitors without direct saturation evidence is PARTIAL",
  () => {
    const result = interpret(5);

    assert.equal(
      result.sufficiency,
      "PARTIAL",
    );
  },
);

test(
  "current independent-source disagreement prevents SUPPORTED competition",
  () => {
    const project =
      projectWithCompetitors(5);

    const result = interpret(
      5,
      [
        marketObservation(
          project.id,
          {
            sourceId:
              "market-a",
            value:
              20,
          },
        ),
        marketObservation(
          project.id,
          {
            id:
              "market-2",
            sourceId:
              "market-b",
            value:
              35,
          },
        ),
      ],
    );

    assert.equal(
      result.sufficiency,
      "PARTIAL",
    );

    assert.equal(
      result.evidence
        .disagreementCount,
      1,
    );
  },
);

test(
  "stale and unverified market observations warn but do not support competition",
  () => {
    const project =
      projectWithCompetitors(5);

    const result = interpret(
      5,
      [
        marketObservation(
          project.id,
          {
            periodStart:
              "2026-04-01T00:00:00Z",
            periodEnd:
              "2026-04-30T00:00:00Z",
            capturedAt:
              "2026-05-01T00:00:00Z",
          },
        ),
        marketObservation(
          project.id,
          {
            id:
              "unverified",
            sourceId:
              "market-source-2",
            verified:
              false,
          },
        ),
      ],
    );

    assert.equal(
      result.sufficiency,
      "PARTIAL",
    );

    assert.equal(
      result.warnings.some(
        (warning) =>
          /stale/i.test(warning),
      ),
      true,
    );

    assert.equal(
      result.warnings.some(
        (warning) =>
          /unverified/i.test(warning),
      ),
      true,
    );
  },
);

test(
  "competition support remains evidence sufficiency rather than market share or a guarantee",
  () => {
    const project =
      projectWithCompetitors(5);

    const result = interpret(
      5,
      [
        marketObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.policies
        .samplePercentagesAreNotMarketShare,
      true,
    );

    assert.equal(
      result.policies
        .supportedDoesNotMeanAttractiveMarket,
      true,
    );

    assert.equal(
      result.policies
        .noOpaqueCompetitionScore,
      true,
    );
  },
);
