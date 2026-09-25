import assert from "node:assert/strict";
import test from "node:test";

import {
  auditComparisonOutput,
  buildComparisonMatrix,
  buildManualSourceSnapshot,
  generateSafeComparisonClaims,
} from "../../dist/index.js";

function snapshot(
  sourceId,
  values,
) {
  return buildManualSourceSnapshot(
    values,
    {
      jobId:
        "comparison-job",
      sourceId,
      sourceKind:
        sourceId === "primary"
          ? "supplier"
          : "competitor",
      capturedAt:
        "2026-09-25T00:00:00Z",
    },
  );
}

const primary =
  snapshot(
    "primary",
    [
      {
        field: "Capacity",
        value: "500 ml",
      },
      {
        field: "Weight",
        value: "400 g",
      },
      {
        field: "Material",
        value:
          "Stainless steel",
      },
      {
        field: "Color",
        value: "Black",
      },
    ],
  );

const competitorA =
  snapshot(
    "competitor-a",
    [
      {
        field: "Capacity",
        value: "350 ml",
      },
      {
        field: "Weight",
        value: "0.5 kg",
      },
      {
        field: "Material",
        value:
          "Stainless steel",
      },
      {
        field: "Color",
        value: "Silver",
      },
    ],
  );

test("user confirmation is required before a competitor is considered comparable", () => {
  const matrix =
    buildComparisonMatrix(
      primary,
      [
        {
          competitorId:
            "competitor-a",
          label:
            "Competitor A",
          snapshot:
            competitorA,
          userConfirmedComparable:
            false,
          comparisonBasis: [],
        },
      ],
      {
        generatedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  assert.equal(
    matrix.competitors[0]
      .relationship,
    "NOT_COMPARABLE",
  );

  assert.deepEqual(
    matrix.excludedCompetitors,
    ["competitor-a"],
  );
});

test("confirmed competitor with enough shared verified fields becomes comparable", () => {
  const matrix =
    buildComparisonMatrix(
      primary,
      [
        {
          competitorId:
            "competitor-a",
          label:
            "Competitor A",
          snapshot:
            competitorA,
          userConfirmedComparable:
            true,
          comparisonBasis: [
            "Same product type",
            "Same intended use",
          ],
        },
      ],
      {
        generatedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  assert.equal(
    matrix.competitors[0]
      .relationship,
    "COMPARABLE",
  );

  assert.ok(
    matrix.competitors[0]
      .sharedFieldCount >= 2,
  );
});

test("comparison matrix uses normalized measurements rather than raw formatting", () => {
  const equivalent =
    snapshot(
      "competitor-equivalent",
      [
        {
          field: "Capacity",
          value: "0.5 L",
        },
        {
          field: "Weight",
          value: "0.4 kg",
        },
      ],
    );

  const matrix =
    buildComparisonMatrix(
      primary,
      [
        {
          competitorId:
            "equivalent",
          label:
            "Equivalent Product",
          snapshot:
            equivalent,
          userConfirmedComparable:
            true,
          comparisonBasis: [
            "Same product type",
          ],
        },
      ],
      {
        minimumSharedFields: 2,
        fields: [
          "Capacity",
          "Weight",
        ],
        generatedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const capacity =
    matrix.rows.find(
      (row) =>
        row.field ===
        "Capacity",
    );

  assert.equal(
    capacity.primary
      .normalizedValue,
    500,
  );

  assert.equal(
    capacity.competitors[0]
      .cell.normalizedValue,
    500,
  );

  assert.equal(
    capacity.primary.unit,
    "ml",
  );

  assert.equal(
    capacity.competitors[0]
      .cell.unit,
    "ml",
  );
});

test("conflicting competitor evidence is exposed instead of resolved by AI", () => {
  const conflicting =
    snapshot(
      "competitor-conflict",
      [
        {
          field: "Capacity",
          value: "350 ml",
        },
        {
          field: "Capacity",
          value: "600 ml",
        },
        {
          field: "Weight",
          value: "500 g",
        },
      ],
    );

  const matrix =
    buildComparisonMatrix(
      primary,
      [
        {
          competitorId:
            "conflict",
          label:
            "Conflict Product",
          snapshot:
            conflicting,
          userConfirmedComparable:
            true,
          comparisonBasis: [
            "Same intended use",
          ],
        },
      ],
      {
        minimumSharedFields: 1,
        fields: [
          "Capacity",
          "Weight",
        ],
        generatedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const capacity =
    matrix.rows.find(
      (row) =>
        row.field ===
        "Capacity",
    );

  assert.equal(
    capacity.competitors[0]
      .cell.status,
    "CONFLICT",
  );
});

test("safe comparison claims cite both sides of numeric evidence", () => {
  const matrix =
    buildComparisonMatrix(
      primary,
      [
        {
          competitorId:
            "competitor-a",
          label:
            "Competitor A",
          snapshot:
            competitorA,
          userConfirmedComparable:
            true,
          comparisonBasis: [
            "Same product type",
            "Same intended use",
          ],
        },
      ],
      {
        primaryLabel:
          "Our product",
        fields: [
          "Capacity",
          "Weight",
          "Material",
        ],
        generatedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const claims =
    generateSafeComparisonClaims(
      matrix,
    );

  const capacityClaim =
    claims.find(
      (claim) =>
        claim.field ===
        "Capacity",
    );

  assert.ok(
    capacityClaim,
  );

  assert.equal(
    capacityClaim.direction,
    "higher",
  );

  assert.match(
    capacityClaim.text,
    /500 ml vs 350 ml/i,
  );

  assert.ok(
    capacityClaim.evidenceIds
      .length >= 2,
  );
});

test("no automated claims are produced for unconfirmed competitors", () => {
  const matrix =
    buildComparisonMatrix(
      primary,
      [
        {
          competitorId:
            "competitor-a",
          label:
            "Competitor A",
          snapshot:
            competitorA,
          userConfirmedComparable:
            false,
          comparisonBasis: [],
        },
      ],
      {
        generatedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  assert.deepEqual(
    generateSafeComparisonClaims(
      matrix,
    ),
    [],
  );
});

test("text differences do not become unsupported superiority claims", () => {
  const matrix =
    buildComparisonMatrix(
      primary,
      [
        {
          competitorId:
            "competitor-a",
          label:
            "Competitor A",
          snapshot:
            competitorA,
          userConfirmedComparable:
            true,
          comparisonBasis: [
            "Same product type",
          ],
        },
      ],
      {
        fields: [
          "Material",
          "Color",
        ],
        minimumSharedFields: 2,
        generatedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const claims =
    generateSafeComparisonClaims(
      matrix,
    );

  assert.equal(
    claims.length,
    0,
  );
});

test("comparison audit rejects unsupported winner-style language", () => {
  const matrix =
    buildComparisonMatrix(
      primary,
      [
        {
          competitorId:
            "competitor-a",
          label:
            "Competitor A",
          snapshot:
            competitorA,
          userConfirmedComparable:
            true,
          comparisonBasis: [
            "Same product type",
            "Same intended use",
          ],
        },
      ],
      {
        fields: [
          "Capacity",
          "Weight",
        ],
        generatedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const safeClaims =
    generateSafeComparisonClaims(
      matrix,
    );

  const cleanAudit =
    auditComparisonOutput(
      matrix,
      safeClaims,
    );

  assert.equal(
    cleanAudit.passed,
    true,
  );

  const unsafeAudit =
    auditComparisonOutput(
      matrix,
      [
        {
          claimId:
            "bad-claim",
          competitorId:
            "competitor-a",
          field:
            "Capacity",
          direction:
            "higher",
          text:
            "Our product is the best and beats Competitor A.",
          evidenceIds: [
            "primary-e0001",
            "competitor-a-e0001",
          ],
        },
      ],
    );

  assert.equal(
    unsafeAudit.passed,
    false,
  );

  assert.equal(
    unsafeAudit.errors,
    1,
  );
});
