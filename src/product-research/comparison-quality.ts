import type {
  ComparisonAuditIssue,
  ComparisonAuditReport,
  ComparisonMatrix,
  SafeComparisonClaim,
} from "./types.js";

const prohibitedClaimLanguage = [
  /\bbest\b/i,
  /\bbetter\b/i,
  /\bwinner\b/i,
  /\bsuperior\b/i,
  /\bbeats?\b/i,
  /\boutperforms?\b/i,
];

export function auditComparisonOutput(
  matrix: ComparisonMatrix,
  claims: readonly SafeComparisonClaim[],
): ComparisonAuditReport {
  const issues:
    ComparisonAuditIssue[] = [];

  const competitorMap =
    new Map(
      matrix.competitors.map(
        (competitor) => [
          competitor.competitorId,
          competitor,
        ],
      ),
    );

  for (const competitor of matrix.competitors) {
    if (
      competitor.relationship ===
      "NOT_COMPARABLE"
    ) {
      issues.push({
        code:
          "competitor_excluded",
        severity: "warning",
        message:
          `${competitor.label} is excluded from comparison claims.`,
      });
    }

    if (
      competitor.relationship ===
      "PARTIALLY_COMPARABLE"
    ) {
      issues.push({
        code:
          "competitor_partially_comparable",
        severity: "warning",
        message:
          `${competitor.label} has insufficient shared verified fields for automated comparison claims.`,
      });
    }
  }

  for (const row of matrix.rows) {
    if (
      row.primary.status ===
      "CONFLICT"
    ) {
      issues.push({
        code:
          "primary_field_conflict",
        severity: "warning",
        message:
          `Primary product has conflicting evidence for ${row.field}.`,
      });
    }

    for (
      const competitor of
      row.competitors
    ) {
      if (
        competitor.cell.status ===
        "CONFLICT"
      ) {
        issues.push({
          code:
            "competitor_field_conflict",
          severity: "warning",
          message:
            `Competitor ${competitor.competitorId} has conflicting evidence for ${row.field}.`,
        });
      }
    }
  }

  for (const claim of claims) {
    const competitor =
      competitorMap.get(
        claim.competitorId,
      );

    if (!competitor) {
      issues.push({
        code:
          "unknown_claim_competitor",
        severity: "error",
        message:
          `Claim ${claim.claimId} references an unknown competitor.`,
      });

      continue;
    }

    if (
      competitor.relationship !==
      "COMPARABLE"
    ) {
      issues.push({
        code:
          "unsafe_competitor_claim",
        severity: "error",
        message:
          `Claim ${claim.claimId} was generated for a competitor that is not fully comparable.`,
      });
    }

    if (
      claim.evidenceIds.length < 2
    ) {
      issues.push({
        code:
          "claim_missing_evidence",
        severity: "error",
        message:
          `Claim ${claim.claimId} does not cite both sides of the comparison.`,
      });
    }

    if (
      prohibitedClaimLanguage.some(
        (pattern) =>
          pattern.test(
            claim.text,
          ),
      )
    ) {
      issues.push({
        code:
          "prohibited_comparison_language",
        severity: "error",
        message:
          `Claim ${claim.claimId} contains unsupported evaluative language.`,
      });
    }
  }

  const errors =
    issues.filter(
      (issue) =>
        issue.severity ===
        "error",
    ).length;

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity ===
        "warning",
    ).length;

  return {
    passed:
      errors === 0,
    errors,
    warnings,
    competitorCount:
      matrix.competitors.length,
    comparableCompetitorCount:
      matrix.competitors.filter(
        (competitor) =>
          competitor.relationship ===
          "COMPARABLE",
      ).length,
    rowCount:
      matrix.rows.length,
    claimCount:
      claims.length,
    issues,
  };
}
