import { calculateUnitEconomics } from "./economics.js";
import type {
  ResearchAnalysis,
  ResearchFinding,
  ResearchProject,
  ResearchQualityIssue,
  ResearchQualityReport,
} from "./types.js";

function addIssue(issues: ResearchQualityIssue[], code: string, severity: "error" | "warning", message: string): void {
  issues.push({ code, severity, message });
}

function sameMoney(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function checkFindingEvidence(
  finding: ResearchFinding,
  project: ResearchProject,
  issues: ResearchQualityIssue[],
): void {
  if (finding.evidenceCount !== finding.evidenceIds.length) {
    addIssue(issues, "finding_evidence_count_mismatch", "error", `${finding.id} evidenceCount does not match evidenceIds`);
  }
  if (finding.sourceIds.length === 0) {
    addIssue(issues, "finding_missing_source", "error", `${finding.id} has no source IDs`);
  }
  const validSources = new Set(project.sources.map((source) => source.id));
  for (const sourceId of finding.sourceIds) {
    if (!validSources.has(sourceId)) addIssue(issues, "finding_unknown_source", "error", `${finding.id} references unknown source ${sourceId}`);
  }
}

export function assessResearchQuality(project: ResearchProject, analysis: ResearchAnalysis): ResearchQualityReport {
  const issues: ResearchQualityIssue[] = [];
  const competitorKeys = new Set<string>();
  for (const competitor of project.competitors) {
    const key = `${competitor.title.toLocaleLowerCase()}|${competitor.currency}|${competitor.price.toFixed(2)}`;
    if (competitorKeys.has(key)) addIssue(issues, "duplicate_competitor", "error", `Duplicate canonical competitor: ${competitor.title}`);
    competitorKeys.add(key);
  }
  const demandSources = new Set(project.sources.filter((source) => source.type === "demand_data").map((source) => source.id));
  for (const finding of analysis.findings) {
    checkFindingEvidence(finding, project, issues);
    if (finding.category === "demand_signal" && !finding.sourceIds.some((sourceId) => demandSources.has(sourceId))) {
      addIssue(issues, "unsupported_demand_claim", "error", `${finding.id} claims demand without demand-data evidence`);
    }
  }
  if (project.economics !== null && analysis.economics !== null) {
    const recomputed = calculateUnitEconomics(project.economics);
    if (!sameMoney(recomputed.contributionAfterAds, analysis.economics.contributionAfterAds)
      || !sameMoney(recomputed.breakEvenCpa, analysis.economics.breakEvenCpa)) {
      addIssue(issues, "economics_not_reproducible", "error", "Unit economics do not reproduce from seller-supplied inputs");
    }
  }
  if (!project.sources.some((source) => source.type === "demand_data")) {
    addIssue(issues, "demand_not_measured", "warning", "No demand-data source supplied; report must not infer demand strength");
  }
  if (project.competitors.length < 5) addIssue(issues, "small_competitor_sample", "warning", "Fewer than 5 competitors supplied");
  if (project.reviews.length < 10) addIssue(issues, "small_review_sample", "warning", "Fewer than 10 reviews supplied");
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return {
    passed: errors === 0,
    errors,
    warnings,
    issues,
    checks: [
      "source provenance",
      "competitor deduplication",
      "evidence-backed findings",
      "demand-claim guardrail",
      "reproducible unit economics",
    ],
  };
}
