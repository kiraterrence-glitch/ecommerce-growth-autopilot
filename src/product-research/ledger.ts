import {
  normalizedComparableKey,
} from "./normalization.js";

import type {
  EvidenceConflict,
  EvidenceLedger,
  EvidenceRecord,
  SourceSnapshot,
} from "./types.js";

function normalizeField(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function conflictGroupKey(
  item: EvidenceRecord,
): string {
  return [
    normalizeField(item.field),
    item.variantId ?? "",
  ].join("::");
}

function detectConflicts(
  evidence: readonly EvidenceRecord[],
): EvidenceConflict[] {
  const groups =
    new Map<
      string,
      EvidenceRecord[]
    >();

  for (const item of evidence) {
    const key =
      conflictGroupKey(item);

    const current =
      groups.get(key) ?? [];

    current.push(item);
    groups.set(key, current);
  }

  const conflicts: EvidenceConflict[] =
    [];

  for (const records of groups.values()) {
    const first = records[0];

    if (!first) continue;

    const values =
      new Map<
        string,
        EvidenceRecord[]
      >();

    for (const record of records) {
      const key =
        normalizedComparableKey(
          record.normalizedValue,
          record.unit,
        );

      const current =
        values.get(key) ?? [];

      current.push(record);
      values.set(key, current);
    }

    if (values.size <= 1) {
      continue;
    }

    conflicts.push({
      field: first.field,
      variantId:
        first.variantId,
      values:
        [...values.values()].map(
          (matching) => ({
            normalizedValue:
              matching[0]
                ?.normalizedValue ??
              null,
            unit:
              matching[0]?.unit ??
              null,
            evidenceIds:
              matching.map(
                (item) =>
                  item.evidenceId,
              ),
          }),
        ),
    });
  }

  conflicts.sort((left, right) =>
    left.field.localeCompare(
      right.field,
    ),
  );

  return conflicts;
}

export function buildEvidenceLedger(
  jobId: string,
  snapshots: readonly SourceSnapshot[],
  createdAt = new Date().toISOString(),
): EvidenceLedger {
  if (!jobId.trim()) {
    throw new Error(
      "evidence ledger jobId is required",
    );
  }

  if (
    !Number.isFinite(
      Date.parse(createdAt),
    )
  ) {
    throw new Error(
      "evidence ledger createdAt must be ISO-like",
    );
  }

  const evidence =
    snapshots.flatMap(
      (snapshot) =>
        snapshot.evidence,
    );

  const duplicateIds =
    new Set<string>();

  const seen =
    new Set<string>();

  for (const item of evidence) {
    if (
      seen.has(item.evidenceId)
    ) {
      duplicateIds.add(
        item.evidenceId,
      );
    }

    seen.add(item.evidenceId);
  }

  if (duplicateIds.size > 0) {
    throw new Error(
      `duplicate evidence IDs: ${
        [...duplicateIds].join(", ")
      }`,
    );
  }

  for (const item of evidence) {
    if (item.jobId !== jobId) {
      throw new Error(
        `evidence ${item.evidenceId} belongs to a different job`,
      );
    }
  }

  return {
    jobId,
    createdAt,
    snapshots,
    evidence,
    conflicts:
      detectConflicts(evidence),
  };
}
