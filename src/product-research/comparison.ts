import {
  normalizedComparableKey,
} from "./normalization.js";

import type {
  ComparisonCell,
  ComparisonMatrix,
  ComparisonRow,
  CompetitorComparisonInput,
  CompetitorRelationship,
  EvidenceRecord,
  SafeComparisonClaim,
  SourceSnapshot,
} from "./types.js";

const excludedDefaultFields =
  new Set([
    "title",
    "description",
    "sku",
    "brand",
    "image url",
    "video url",
    "currency",
    "variant name",
    "variant sku",
    "variant price",
    "variant currency",
  ]);

function normalizeField(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function groupedEvidence(
  snapshot: SourceSnapshot,
): Map<string, EvidenceRecord[]> {
  const groups =
    new Map<string, EvidenceRecord[]>();

  for (const item of snapshot.evidence) {
    if (item.variantId !== null) {
      continue;
    }

    const key =
      normalizeField(item.field);

    const current =
      groups.get(key) ?? [];

    current.push(item);

    groups.set(
      key,
      current,
    );
  }

  return groups;
}

function buildCell(
  records: readonly EvidenceRecord[] | undefined,
): ComparisonCell {
  if (
    !records ||
    records.length === 0
  ) {
    return {
      status: "MISSING",
      rawValue: null,
      normalizedValue: null,
      unit: null,
      evidenceIds: [],
    };
  }

  const unique =
    new Map<string, EvidenceRecord[]>();

  for (const item of records) {
    const key =
      normalizedComparableKey(
        item.normalizedValue,
        item.unit,
      );

    const current =
      unique.get(key) ?? [];

    current.push(item);

    unique.set(
      key,
      current,
    );
  }

  if (unique.size > 1) {
    return {
      status: "CONFLICT",
      rawValue: null,
      normalizedValue: null,
      unit: null,
      evidenceIds:
        records.map(
          (item) =>
            item.evidenceId,
        ),
    };
  }

  const first =
    records[0];

  if (!first) {
    return {
      status: "MISSING",
      rawValue: null,
      normalizedValue: null,
      unit: null,
      evidenceIds: [],
    };
  }

  return {
    status: "VERIFIED",
    rawValue: first.rawValue,
    normalizedValue:
      first.normalizedValue,
    unit: first.unit,
    evidenceIds:
      records.map(
        (item) =>
          item.evidenceId,
      ),
  };
}

function comparableFieldKeys(
  snapshot: SourceSnapshot,
): Set<string> {
  const groups =
    groupedEvidence(snapshot);

  const result =
    new Set<string>();

  for (
    const [field, records] of groups
  ) {
    if (
      excludedDefaultFields.has(
        field,
      )
    ) {
      continue;
    }

    const cell =
      buildCell(records);

    if (
      cell.status === "VERIFIED"
    ) {
      result.add(field);
    }
  }

  return result;
}

function sharedFieldCount(
  primary: SourceSnapshot,
  competitor: SourceSnapshot,
): number {
  const primaryFields =
    comparableFieldKeys(
      primary,
    );

  const competitorFields =
    comparableFieldKeys(
      competitor,
    );

  let count = 0;

  for (const field of primaryFields) {
    if (
      competitorFields.has(field)
    ) {
      count += 1;
    }
  }

  return count;
}

function relationshipFor(
  primary: SourceSnapshot,
  input: CompetitorComparisonInput,
  minimumSharedFields: number,
): Readonly<{
  relationship: CompetitorRelationship;
  sharedFieldCount: number;
}> {
  if (
    !input.userConfirmedComparable
  ) {
    return {
      relationship:
        "NOT_COMPARABLE",
      sharedFieldCount: 0,
    };
  }

  if (
    input.comparisonBasis.length === 0
  ) {
    throw new Error(
      `competitor ${input.competitorId} requires a comparison basis`,
    );
  }

  const shared =
    sharedFieldCount(
      primary,
      input.snapshot,
    );

  if (
    shared >= minimumSharedFields
  ) {
    return {
      relationship:
        "COMPARABLE",
      sharedFieldCount:
        shared,
    };
  }

  if (shared > 0) {
    return {
      relationship:
        "PARTIALLY_COMPARABLE",
      sharedFieldCount:
        shared,
    };
  }

  return {
    relationship:
      "NOT_COMPARABLE",
    sharedFieldCount: 0,
  };
}

function displayFieldMap(
  primary: SourceSnapshot,
  competitors: readonly CompetitorComparisonInput[],
): Map<string, string> {
  const result =
    new Map<string, string>();

  const snapshots = [
    primary,
    ...competitors.map(
      (item) =>
        item.snapshot,
    ),
  ];

  for (const snapshot of snapshots) {
    for (const evidence of snapshot.evidence) {
      if (evidence.variantId !== null) {
        continue;
      }

      const key =
        normalizeField(
          evidence.field,
        );

      if (
        excludedDefaultFields.has(
          key,
        )
      ) {
        continue;
      }

      if (!result.has(key)) {
        result.set(
          key,
          evidence.field,
        );
      }
    }
  }

  return result;
}

export function buildComparisonMatrix(
  primary: SourceSnapshot,
  competitors: readonly CompetitorComparisonInput[],
  options: Readonly<{
    primaryLabel?: string;
    fields?: readonly string[];
    minimumSharedFields?: number;
    generatedAt?: string;
  }> = {},
): ComparisonMatrix {
  if (competitors.length === 0) {
    throw new Error(
      "comparison requires at least one competitor",
    );
  }

  const minimumSharedFields =
    options.minimumSharedFields ??
    2;

  if (
    !Number.isInteger(
      minimumSharedFields,
    ) ||
    minimumSharedFields < 1
  ) {
    throw new Error(
      "minimumSharedFields must be a positive integer",
    );
  }

  const generatedAt =
    options.generatedAt ??
    new Date().toISOString();

  if (
    !Number.isFinite(
      Date.parse(
        generatedAt,
      ),
    )
  ) {
    throw new Error(
      "comparison generatedAt must be ISO-like",
    );
  }

  const ids =
    new Set<string>();

  for (const input of competitors) {
    if (!input.competitorId.trim()) {
      throw new Error(
        "competitorId is required",
      );
    }

    if (!input.label.trim()) {
      throw new Error(
        `competitor ${input.competitorId} requires a label`,
      );
    }

    if (
      ids.has(
        input.competitorId,
      )
    ) {
      throw new Error(
        `duplicate competitorId: ${input.competitorId}`,
      );
    }

    ids.add(
      input.competitorId,
    );
  }

  const evaluated =
    competitors.map(
      (input) => {
        const assessment =
          relationshipFor(
            primary,
            input,
            minimumSharedFields,
          );

        return {
          competitorId:
            input.competitorId,
          label:
            input.label,
          relationship:
            assessment.relationship,
          comparisonBasis:
            input.comparisonBasis,
          sharedFieldCount:
            assessment.sharedFieldCount,
        };
      },
    );

  const displayFields =
    displayFieldMap(
      primary,
      competitors,
    );

  const requested =
    options.fields
      ? options.fields.map(
          normalizeField,
        )
      : [
          ...displayFields.keys(),
        ];

  const primaryGroups =
    groupedEvidence(
      primary,
    );

  const competitorGroups =
    new Map(
      competitors.map(
        (input) => [
          input.competitorId,
          groupedEvidence(
            input.snapshot,
          ),
        ],
      ),
    );

  const rows:
    ComparisonRow[] = [];

  for (
    const key of requested
  ) {
    if (
      excludedDefaultFields.has(
        key,
      )
    ) {
      continue;
    }

    const field =
      displayFields.get(key) ??
      key;

    const primaryCell =
      buildCell(
        primaryGroups.get(key),
      );

    const competitorCells =
      competitors.map(
        (input) => ({
          competitorId:
            input.competitorId,
          cell:
            buildCell(
              competitorGroups
                .get(
                  input.competitorId,
                )
                ?.get(key),
            ),
        }),
      );

    const useful =
      primaryCell.status !==
        "MISSING" ||
      competitorCells.some(
        (item) =>
          item.cell.status !==
          "MISSING",
      );

    if (!useful) {
      continue;
    }

    rows.push({
      field,
      primary:
        primaryCell,
      competitors:
        competitorCells,
    });
  }

  return {
    primaryLabel:
      options.primaryLabel ??
      "Primary product",
    generatedAt,
    competitors:
      evaluated,
    rows,
    excludedCompetitors:
      evaluated
        .filter(
          (item) =>
            item.relationship ===
            "NOT_COMPARABLE",
        )
        .map(
          (item) =>
            item.competitorId,
        ),
  };
}

function formatNumber(
  value: number,
): string {
  if (
    Number.isInteger(value)
  ) {
    return String(value);
  }

  return String(
    Number(
      value.toFixed(3),
    ),
  );
}

export function generateSafeComparisonClaims(
  matrix: ComparisonMatrix,
): readonly SafeComparisonClaim[] {
  const claims:
    SafeComparisonClaim[] = [];

  let sequence = 0;

  for (
    const competitor of
    matrix.competitors
  ) {
    if (
      competitor.relationship !==
      "COMPARABLE"
    ) {
      continue;
    }

    for (const row of matrix.rows) {
      const competitorEntry =
        row.competitors.find(
          (entry) =>
            entry.competitorId ===
            competitor.competitorId,
        );

      if (!competitorEntry) {
        continue;
      }

      const left =
        row.primary;

      const right =
        competitorEntry.cell;

      if (
        left.status !==
          "VERIFIED" ||
        right.status !==
          "VERIFIED"
      ) {
        continue;
      }

      if (
        typeof left.normalizedValue !==
          "number" ||
        typeof right.normalizedValue !==
          "number"
      ) {
        continue;
      }

      if (
        !left.unit ||
        !right.unit ||
        left.unit !== right.unit
      ) {
        continue;
      }

      let direction:
        | "higher"
        | "lower"
        | "equal";

      if (
        left.normalizedValue >
        right.normalizedValue
      ) {
        direction = "higher";
      } else if (
        left.normalizedValue <
        right.normalizedValue
      ) {
        direction = "lower";
      } else {
        direction = "equal";
      }

      sequence += 1;

      const leftText =
        `${formatNumber(left.normalizedValue)} ${left.unit}`;

      const rightText =
        `${formatNumber(right.normalizedValue)} ${right.unit}`;

      const text =
        direction === "equal"
          ? `${matrix.primaryLabel} and ${competitor.label} have the same listed ${row.field} (${leftText}).`
          : `${matrix.primaryLabel} has a ${direction} listed ${row.field} than ${competitor.label} (${leftText} vs ${rightText}).`;

      claims.push({
        claimId:
          `comparison-claim-${String(sequence).padStart(3, "0")}`,
        competitorId:
          competitor.competitorId,
        field:
          row.field,
        direction,
        text,
        evidenceIds: [
          ...new Set([
            ...left.evidenceIds,
            ...right.evidenceIds,
          ]),
        ],
      });
    }
  }

  return claims;
}
