import {
  normalizeEvidenceText,
  normalizeMeasurement,
} from "./normalization.js";

import type {
  EvidenceRecord,
  ManualEvidenceInput,
  ProductSourceAdapterContext,
  SourceSnapshot,
} from "./types.js";

function safeTimestamp(value: string | undefined): string {
  const timestamp =
    value ?? new Date().toISOString();

  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new Error("capturedAt must be ISO-like");
  }

  return timestamp;
}

function evidenceId(
  sourceId: string,
  index: number,
): string {
  return `${sourceId}-e${String(index + 1).padStart(4, "0")}`;
}

export function buildManualSourceSnapshot(
  input: readonly ManualEvidenceInput[],
  context: ProductSourceAdapterContext,
  sourceUrl: string | null = null,
): SourceSnapshot {
  if (!context.jobId.trim()) {
    throw new Error("jobId is required");
  }

  if (!context.sourceId.trim()) {
    throw new Error("sourceId is required");
  }

  if (!Array.isArray(input) || input.length === 0) {
    throw new Error(
      "manual evidence requires at least one evidence item",
    );
  }

  const capturedAt =
    safeTimestamp(context.capturedAt);

  const evidence: EvidenceRecord[] =
    input.map((item, index) => {
      const field =
        normalizeEvidenceText(item.field);

      const rawValue =
        normalizeEvidenceText(item.value);

      if (!field) {
        throw new Error(
          `manual evidence item ${index} requires field`,
        );
      }

      if (!rawValue) {
        throw new Error(
          `manual evidence item ${index} requires value`,
        );
      }

      const measurement =
        normalizeMeasurement(
          `${rawValue}${item.unit ? ` ${item.unit}` : ""}`,
        );

      return {
        evidenceId:
          evidenceId(context.sourceId, index),
        jobId: context.jobId,
        sourceId: context.sourceId,
        sourceKind: context.sourceKind,
        sourceUrl,
        field,
        rawValue,
        normalizedValue:
          measurement?.normalizedValue ??
          rawValue,
        unit:
          measurement?.unit ??
          item.unit ??
          null,
        variantId:
          item.variantId?.trim() ||
          null,
        confidence:
          item.confidence ??
          "user_confirmed",
        capturedAt,
        extractor:
          "manual-evidence-v1",
        notes:
          item.notes ?? [],
      };
    });

  return {
    sourceId: context.sourceId,
    sourceKind: context.sourceKind,
    sourceUrl,
    capturedAt,
    adapterId:
      "manual-evidence-v1",
    status: "EXTRACTED",
    rawFormat: "manual",
    evidence,
    warnings: [],
  };
}
