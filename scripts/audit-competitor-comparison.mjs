import {
  auditComparisonOutput,
  buildComparisonMatrix,
  buildManualSourceSnapshot,
  generateSafeComparisonClaims,
} from "../dist/index.js";

function snapshot(
  sourceId,
  sourceKind,
  values,
) {
  return buildManualSourceSnapshot(
    values,
    {
      jobId:
        "phase-3-audit",
      sourceId,
      sourceKind,
      capturedAt:
        "2026-09-25T00:00:00Z",
    },
  );
}

function pass(name, details) {
  console.log(
    `[PASS] ${name} -> ${details}`,
  );
}

function fail(name, details) {
  console.error(
    `[FAIL] ${name} -> ${details}`,
  );

  process.exitCode = 1;
}

console.log("");
console.log(
  "PHASE 3 COMPETITOR COMPARISON AUDIT",
);
console.log(
  "-----------------------------------",
);

try {
  const primary =
    snapshot(
      "primary",
      "supplier",
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
      ],
    );

  const competitorA =
    snapshot(
      "competitor-a",
      "competitor",
      [
        {
          field: "Capacity",
          value: "0.35 L",
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
      ],
    );

  const unrelated =
    snapshot(
      "unrelated",
      "competitor",
      [
        {
          field:
            "Battery capacity",
          value: "5000 mAh",
        },
      ],
    );

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
            "Same product category",
            "Same intended customer use",
          ],
        },
        {
          competitorId:
            "unrelated",
          label:
            "Unrelated Candidate",
          snapshot:
            unrelated,
          userConfirmedComparable:
            false,
          comparisonBasis: [],
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

  const competitor =
    matrix.competitors.find(
      (item) =>
        item.competitorId ===
        "competitor-a",
    );

  if (
    competitor?.relationship !==
    "COMPARABLE"
  ) {
    throw new Error(
      "confirmed competitor was not classified as comparable",
    );
  }

  pass(
    "Comparability gate",
    `${competitor.sharedFieldCount} shared verified fields`,
  );

  if (
    !matrix.excludedCompetitors.includes(
      "unrelated",
    )
  ) {
    throw new Error(
      "unconfirmed candidate was not excluded",
    );
  }

  pass(
    "Unrelated-product protection",
    "unconfirmed candidate excluded",
  );

  const capacity =
    matrix.rows.find(
      (row) =>
        row.field ===
        "Capacity",
    );

  if (
    capacity?.primary
      .normalizedValue !== 500
  ) {
    throw new Error(
      "primary capacity was not normalized",
    );
  }

  if (
    capacity.competitors[0]
      ?.cell.normalizedValue !==
    350
  ) {
    throw new Error(
      "competitor capacity was not normalized",
    );
  }

  pass(
    "Unit normalization",
    "500 ml compared with normalized 350 ml",
  );

  const claims =
    generateSafeComparisonClaims(
      matrix,
    );

  if (
    claims.length === 0
  ) {
    throw new Error(
      "no safe numeric comparison claims were generated",
    );
  }

  if (
    !claims.every(
      (claim) =>
        claim.evidenceIds.length >= 2,
    )
  ) {
    throw new Error(
      "one or more claims lack evidence from both products",
    );
  }

  pass(
    "Evidence-backed claims",
    `${claims.length} safe numeric claims`,
  );

  const report =
    auditComparisonOutput(
      matrix,
      claims,
    );

  if (!report.passed) {
    throw new Error(
      `comparison audit returned ${report.errors} errors`,
    );
  }

  pass(
    "Comparison QA",
    `${report.rowCount} rows, ${report.claimCount} claims, ${report.warnings} warning(s)`,
  );

  if (
    claims.some(
      (claim) =>
        /\b(best|better|winner|superior|beats?|outperforms?)\b/i.test(
          claim.text,
        ),
    )
  ) {
    throw new Error(
      "unsafe evaluative comparison language was generated",
    );
  }

  pass(
    "Claim-language boundary",
    "no winner/better/superior claims generated",
  );
} catch (error) {
  fail(
    "Phase 3 comparison",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

if (process.exitCode) {
  console.error("");
  console.error(
    "PHASE 3 AUDIT FAILED",
  );
} else {
  console.log("");
  console.log(
    "PHASE 3 AUDIT PASSED",
  );
}
