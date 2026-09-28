import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  analyzeResearchProject,
  normalizeResearchProject,
  runProductOpportunityEvidencePipeline,
  validateResearchProject,
} from "../../dist/index.js";

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

function strongProject(
  overrides = {},
) {
  const firstCompetitor =
    baseProject.competitors[0];
  const firstReview =
    baseProject.reviews[0];

  assert.ok(firstCompetitor);
  assert.ok(firstReview);

  const sources = [
    ...baseProject.sources,
    {
      id:
        "demand-search",
      type:
        "demand_data",
      label:
        "Search demand export",
      capturedAt:
        "2026-09-21T00:00:00Z",
      sourceUrl:
        "https://example.com/search-demand",
    },
    {
      id:
        "demand-purchase",
      type:
        "demand_data",
      label:
        "Purchase demand export",
      capturedAt:
        "2026-09-21T00:00:00Z",
      sourceUrl:
        "https://example.com/purchase-demand",
    },
    {
      id:
        "demand-relative-2",
      type:
        "demand_data",
      label:
        "Second relative demand export",
      capturedAt:
        "2026-09-21T00:00:00Z",
      sourceUrl:
        "https://example.com/relative-demand",
    },
    {
      id:
        "market-source",
      type:
        "csv",
      label:
        "Authorized market export",
      capturedAt:
        "2026-09-21T00:00:00Z",
      sourceUrl:
        "https://example.com/competition",
    },
  ];

  return {
    ...baseProject,
    sources,
    competitors: [
      ...baseProject.competitors,
      {
        ...firstCompetitor,
        id:
          "competitor-5",
      },
    ],
    reviews: [
      ...baseProject.reviews,
      {
        ...firstReview,
        id:
          "review-9",
        text:
          `${firstReview.text} ninth sample`,
      },
      {
        ...firstReview,
        id:
          "review-10",
        text:
          `${firstReview.text} tenth sample`,
      },
    ],
    ...overrides,
  };
}

function demandObservation(
  candidateId,
  overrides = {},
) {
  return {
    id:
      "demand-search-observation",
    candidateId,
    sourceId:
      "demand-search",
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
      "https://example.com/search-demand",
    verified:
      true,
    ...overrides,
  };
}

function supportedDemand(
  candidateId,
) {
  return [
    demandObservation(candidateId),
    demandObservation(
      candidateId,
      {
        id:
          "demand-purchase-observation",
        sourceId:
          "demand-purchase",
        signal:
          "PURCHASE_COUNT",
        value:
          900,
      },
    ),
  ];
}

function competitionObservation(
  candidateId,
  overrides = {},
) {
  return {
    id:
      "competition-observation",
    candidateId,
    sourceId:
      "market-source",
    sourceType:
      "MARKETPLACE",
    acquisitionMethod:
      "AUTHORIZED_EXPORT",
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
      "https://example.com/competition",
    verified:
      true,
    ...overrides,
  };
}

function context(
  project,
  overrides = {},
) {
  return {
    supplier: {
      supplierCount: 2,
      verifiedSupplierCount: 1,
      criticalConflictCount: 0,
    },
    verifiedSourceIds:
      project.sources.map(
        (source) => source.id,
      ),
    criticalEvidenceConflictCount:
      0,
    unsupportedClaimCount:
      0,
    ...overrides,
  };
}

function run(
  project,
  demandObservations,
  competitionObservations,
  contextOverrides = {},
) {
  return runProductOpportunityEvidencePipeline(
    project,
    analyzeResearchProject(project),
    demandObservations,
    competitionObservations,
    AS_OF,
    context(
      project,
      contextOverrides,
    ),
  );
}

test(
  "supported evidence and viable commercial gates produce contract 1.1 VALIDATE",
  () => {
    const project = strongProject();

    const result = run(
      project,
      supportedDemand(project.id),
      [
        competitionObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.marketValidation.status,
      "READY_FOR_COMMERCIAL_REVIEW",
    );
    assert.equal(
      result.decision.contractVersion,
      "1.1.0",
    );
    assert.equal(
      result.decision.decision,
      "VALIDATE",
    );
  },
);

test(
  "ambiguous market evidence produces HOLD",
  () => {
    const project = strongProject();

    const result = run(
      project,
      [
        demandObservation(project.id),
      ],
      [
        competitionObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.marketValidation.status,
      "PARTIAL_EVIDENCE",
    );
    assert.equal(
      result.decision.decision,
      "HOLD",
    );
  },
);

test(
  "supported market evidence cannot rescue negative economics",
  () => {
    const project = strongProject({
      economics: {
        ...baseProject.economics,
        adAllowance:
          200,
      },
    });

    const result = run(
      project,
      supportedDemand(project.id),
      [
        competitionObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.marketValidation.status,
      "READY_FOR_COMMERCIAL_REVIEW",
    );
    assert.equal(
      result.decision.decision,
      "REJECT",
    );
  },
);

test(
  "missing stale and unverified demand evidence fail closed",
  () => {
    const project = strongProject();

    const cases = [
      [],
      supportedDemand(project.id).map(
        (observation) => ({
          ...observation,
          periodStart:
            "2026-04-01T00:00:00Z",
          periodEnd:
            "2026-04-30T00:00:00Z",
          capturedAt:
            "2026-05-01T00:00:00Z",
        }),
      ),
      supportedDemand(project.id).map(
        (observation) => ({
          ...observation,
          verified:
            false,
        }),
      ),
    ];

    for (const observations of cases) {
      const result = run(
        project,
        observations,
        [
          competitionObservation(
            project.id,
          ),
        ],
      );

      assert.equal(
        result.marketValidation.status,
        "INSUFFICIENT_EVIDENCE",
      );
      assert.equal(
        result.decision.decision,
        "HOLD",
      );
    }
  },
);

test(
  "conflicting demand sources downgrade market evidence to partial",
  () => {
    const project = strongProject();

    const result = run(
      project,
      [
        demandObservation(project.id),
        demandObservation(
          project.id,
          {
            id:
              "conflicting-search",
            sourceId:
              "demand-relative-2",
            value:
              18000,
          },
        ),
        demandObservation(
          project.id,
          {
            id:
              "purchase",
            sourceId:
              "demand-purchase",
            signal:
              "PURCHASE_COUNT",
            value:
              900,
          },
        ),
      ],
      [
        competitionObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.demandProfile
        .disagreements.length,
      1,
    );
    assert.equal(
      result.marketValidation.status,
      "PARTIAL_EVIDENCE",
    );
  },
);

test(
  "duplicate observations from one demand source do not inflate independence",
  () => {
    const project = strongProject();
    const first =
      demandObservation(project.id);

    const result = run(
      project,
      [
        first,
        {
          ...first,
          id:
            "duplicate-later",
          capturedAt:
            "2026-09-22T00:00:00Z",
        },
        demandObservation(
          project.id,
          {
            id:
              "same-source-purchase",
            signal:
              "PURCHASE_COUNT",
            value:
              900,
          },
        ),
      ],
      [
        competitionObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.demandProfile
        .independentVerifiedSourceCount,
      1,
    );
    assert.equal(
      result.demandInterpretation
        .sufficiency,
      "PARTIAL",
    );
  },
);

test(
  "unknown evidence sources and candidate mismatches fail closed",
  () => {
    const project = strongProject();

    assert.throws(
      () =>
        run(
          project,
          [
            demandObservation(
              project.id,
              {
                sourceId:
                  "unknown-source",
              },
            ),
          ],
          [],
        ),
      /unknown.*source/i,
    );

    assert.throws(
      () =>
        run(
          project,
          [
            demandObservation(
              "another-candidate",
            ),
          ],
          [],
        ),
      /another candidate/i,
    );
  },
);

test(
  "canonical context rejects caller supplied demand and market conclusions",
  () => {
    const project = strongProject();

    for (
      const forbiddenKey of [
        "demand",
        "demandVerified",
        "normalizedTrendIndex",
        "trendGrowthPercent",
        "marketValidation",
        "marketValidationStatus",
      ]
    ) {
      assert.throws(
        () =>
          run(
            project,
            supportedDemand(project.id),
            [
              competitionObservation(
                project.id,
              ),
            ],
            {
              [forbiddenKey]:
                "caller-override",
            },
          ),
        /caller-supplied.*conclusion/i,
      );
    }
  },
);

test(
  "relative trend evidence remains an index and never becomes absolute volume",
  () => {
    const project = strongProject();

    const result = run(
      project,
      [
        demandObservation(
          project.id,
          {
            signal:
              "SEARCH_INTEREST_RELATIVE",
            value:
              72,
            unit:
              "INDEX_0_100",
          },
        ),
        demandObservation(
          project.id,
          {
            id:
              "purchase",
            sourceId:
              "demand-purchase",
            signal:
              "PURCHASE_COUNT",
            value:
              900,
          },
        ),
      ],
      [
        competitionObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.input.demand
        .normalizedTrendIndex,
      72,
    );
    assert.equal(
      result.demandProfile
        .hasAbsoluteSearchEvidence,
      false,
    );
    assert.equal(
      result.demandProfile
        .series.find(
          (series) =>
            series.signal ===
            "SEARCH_INTEREST_RELATIVE",
        )?.unit,
      "INDEX_0_100",
    );
  },
);

test(
  "multiple relative demand series remain separate and are not averaged",
  () => {
    const project = strongProject();

    const result = run(
      project,
      [
        demandObservation(
          project.id,
          {
            signal:
              "SEARCH_INTEREST_RELATIVE",
            value:
              60,
            unit:
              "INDEX_0_100",
            geography:
              "US",
          },
        ),
        demandObservation(
          project.id,
          {
            id:
              "relative-au",
            sourceId:
              "demand-relative-2",
            signal:
              "SEARCH_INTEREST_RELATIVE",
            value:
              80,
            unit:
              "INDEX_0_100",
            geography:
              "AU",
          },
        ),
        demandObservation(
          project.id,
          {
            id:
              "purchase",
            sourceId:
              "demand-purchase",
            signal:
              "PURCHASE_COUNT",
            value:
              900,
          },
        ),
      ],
      [
        competitionObservation(
          project.id,
        ),
      ],
    );

    assert.equal(
      result.demandProfile
        .series.filter(
          (series) =>
            series.signal ===
            "SEARCH_INTEREST_RELATIVE",
        ).length,
      2,
    );
    assert.equal(
      result.input.demand
        .normalizedTrendIndex,
      null,
    );
  },
);

test(
  "supplier provenance conflict and unsupported claim gates remain independent",
  () => {
    const project = strongProject();

    const overrides = [
      {
        supplier: {
          supplierCount: 2,
          verifiedSupplierCount: 1,
          criticalConflictCount: 1,
        },
      },
      {
        verifiedSourceIds: [],
      },
      {
        criticalEvidenceConflictCount:
          1,
      },
      {
        unsupportedClaimCount:
          1,
      },
    ];

    for (const override of overrides) {
      const result = run(
        project,
        supportedDemand(project.id),
        [
          competitionObservation(
            project.id,
          ),
        ],
        override,
      );

      assert.equal(
        result.marketValidation.status,
        "READY_FOR_COMMERCIAL_REVIEW",
      );
      assert.equal(
        result.decision.decision,
        "HOLD",
      );
    }
  },
);
