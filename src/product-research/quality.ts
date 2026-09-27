import type {
  EvidenceAuditIssue,
  EvidenceAuditReport,
  EvidenceLedger,
} from "./types.js";

export function auditEvidenceLedger(
  ledger: EvidenceLedger,
): EvidenceAuditReport {
  const issues:
    EvidenceAuditIssue[] = [];

  for (const snapshot of ledger.snapshots) {
    if (
      snapshot.status ===
      "MANUAL_CAPTURE_REQUIRED"
    ) {
      issues.push({
        code:
          "manual_capture_required",
        severity: "warning",
        message:
          `Source ${snapshot.sourceId} requires manual capture.`,
        evidenceId: null,
      });
    }

    if (
      snapshot.status ===
      "BLOCKED"
    ) {
      issues.push({
        code: "source_blocked",
        severity: "warning",
        message:
          `Source ${snapshot.sourceId} is blocked.`,
        evidenceId: null,
      });
    }
  }

  for (const item of ledger.evidence) {
    if (!item.sourceId.trim()) {
      issues.push({
        code:
          "missing_source_id",
        severity: "error",
        message:
          "Evidence item is missing source identity.",
        evidenceId:
          item.evidenceId,
      });
    }

    if (!item.field.trim()) {
      issues.push({
        code:
          "missing_field",
        severity: "error",
        message:
          "Evidence item is missing field identity.",
        evidenceId:
          item.evidenceId,
      });
    }

    if (!item.rawValue.trim()) {
      issues.push({
        code:
          "missing_raw_value",
        severity: "error",
        message:
          "Evidence item is missing its original raw value.",
        evidenceId:
          item.evidenceId,
      });
    }

    if (
      !Number.isFinite(
        Date.parse(
          item.capturedAt,
        ),
      )
    ) {
      issues.push({
        code:
          "invalid_capture_time",
        severity: "error",
        message:
          "Evidence item has an invalid capture timestamp.",
        evidenceId:
          item.evidenceId,
      });
    }
  }

  for (const conflict of ledger.conflicts) {
    issues.push({
      code:
        "evidence_conflict",
      severity: "warning",
      message:
        `Conflicting evidence exists for ${conflict.field}${
          conflict.variantId
            ? ` variant ${conflict.variantId}`
            : ""
        }.`,
      evidenceId: null,
    });
  }

  const errors =
    issues.filter(
      (issue) =>
        issue.severity === "error",
    ).length;

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity === "warning",
    ).length;

  return {
    passed: errors === 0,
    errors,
    warnings,
    evidenceCount:
      ledger.evidence.length,
    sourceCount:
      ledger.snapshots.length,
    conflictCount:
      ledger.conflicts.length,
    issues,
  };
}
