import type {
  OpportunityGate,
  OpportunityMarketValidationEvidence,
  ProductOpportunityDecision,
  ProductOpportunityInput,
} from "./types.js";

export type OpportunityEvidenceConfidence =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type ProductOpportunityReport =
  Readonly<{
    candidateId:
      string;

    decision:
      ProductOpportunityDecision["decision"];

    contractVersion:
      ProductOpportunityDecision["contractVersion"];

    evidenceConfidence:
      OpportunityEvidenceConfidence;

    confidenceMethod:
      "HEURISTIC_COVERAGE_V1";

    calibrationStatus:
      "UNVALIDATED_INTERNAL_HEURISTIC";

    metrics: Readonly<{
      demandVerified:
        boolean;

      independentDemandSourceCount:
        number;

      normalizedTrendIndex:
        number | null;

      trendGrowthPercent:
        number | null;

      seasonality:
        ProductOpportunityInput["demand"]["seasonality"];

      competitorSampleSize:
        number;

      comparableCompetitorCount:
        number;

      comparableCompetitorPercent:
        number | null;

      medianCompetitorPrice:
        number | null;

      medianCompetitorReviewCount:
        number | null;

      reviewSampleSize:
        number;

      recurringPainPointCount:
        number;

      contributionMarginPercent:
        number | null;

      breakEvenCpa:
        number | null;

      verifiedSupplierCount:
        number;

      supplierConflictCount:
        number;

      verifiedSourcePercent:
        number | null;

      evidenceConflictCount:
        number;

      unsupportedClaimCount:
        number;

      marketValidationStatus:
        OpportunityMarketValidationEvidence["status"] | null;

      demandSufficiency:
        OpportunityMarketValidationEvidence["demandSufficiency"] | null;

      competitionSufficiency:
        OpportunityMarketValidationEvidence["competitionSufficiency"] | null;
    }>;

    positiveReasons:
      readonly string[];

    blockingReasons:
      readonly string[];

    warnings:
      readonly string[];

    nextActions:
      readonly string[];

    policies: Readonly<{
      noMarketShareInference:
        true;

      noSalesGuarantee:
        true;

      trendIsRelativeInterest:
        true;

      percentagesDescribeSamples:
        true;
    }>;
  }>;

function round(
  value: number,
): number {
  return (
    Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100
  );
}

function percentage(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator <= 0) {
    return null;
  }

  return round(
    (numerator / denominator) *
      100,
  );
}

function evidenceConfidence(
  input: ProductOpportunityInput,
): OpportunityEvidenceConfidence {
  const verifiedPercent =
    percentage(
      input.evidence
        .verifiedSourceCount,

      input.evidence
        .totalSourceCount,
    );

  const strong =
    input.demand.verified &&
    input.demand
      .independentSourceCount >= 2 &&
    verifiedPercent !== null &&
    verifiedPercent >= 80 &&
    input.competition
      .comparableCompetitorCount >= 10 &&
    input.customer
      .reviewCount >= 50 &&
    input.supplier
      .verifiedSupplierCount >= 1 &&
    input.supplier
      .criticalConflictCount === 0 &&
    input.evidence
      .criticalConflictCount === 0;

  if (strong) {
    return "HIGH";
  }

  const moderate =
    input.demand.verified &&
    input.demand
      .independentSourceCount >= 1 &&
    verifiedPercent !== null &&
    verifiedPercent >= 50 &&
    input.competition
      .comparableCompetitorCount >= 5 &&
    input.customer
      .reviewCount >= 10 &&
    input.supplier
      .verifiedSupplierCount >= 1;

  if (moderate) {
    return "MEDIUM";
  }

  return "LOW";
}

function actionForGate(
  gate: OpportunityGate,
): string | null {
  if (
    gate.status === "PASS"
  ) {
    return null;
  }

  switch (gate.code) {
    case "DEMAND_VERIFIED":
      return "Collect and verify at least one independent demand-data source.";

    case "COMPETITOR_SAMPLE":
      return "Confirm at least five genuinely comparable competitor products.";

    case "MARKET_VALIDATION":
      return "Collect the missing demand or competition evidence required for commercial review.";

    case "CUSTOMER_EVIDENCE":
      return "Expand the customer-review sample before relying heavily on review themes.";

    case "ECONOMICS":
      return gate.status ===
        "REJECT"
        ? "Do not proceed at current economics; revise price, costs, or advertising assumptions and rerun the analysis."
        : "Complete selling price, landed cost, fees, advertising allowance, and contribution economics.";

    case "SUPPLIER_VERIFIED":
      return "Verify at least one supplier record before commercial validation.";

    case "SUPPLIER_CONFLICT":
      return "Resolve conflicting critical supplier specifications before proceeding.";

    case "EVIDENCE_PROVENANCE":
      return "Verify source provenance for the evidence supporting the opportunity.";

    case "EVIDENCE_CONFLICT":
      return "Resolve critical evidence conflicts before making a launch decision.";

    case "UNSUPPORTED_CLAIMS":
      return "Remove unsupported claims or attach verified product evidence.";

    default:
      return null;
  }
}

function unique(
  values: readonly string[],
): string[] {
  return [
    ...new Set(values),
  ];
}

export function buildProductOpportunityReport(
  input: ProductOpportunityInput,
  decision: ProductOpportunityDecision,
): ProductOpportunityReport {
  if (
    decision.candidateId !==
    input.candidateId
  ) {
    throw new Error(
      "Opportunity decision does not belong to the supplied candidate.",
    );
  }

  const positiveReasons =
    decision.gates
      .filter(
        (gate) =>
          gate.status ===
          "PASS",
      )
      .map(
        (gate) =>
          gate.message,
      );

  const blockingReasons =
    decision.gates
      .filter(
        (gate) =>
          gate.status ===
            "HOLD" ||
          gate.status ===
            "REJECT",
      )
      .map(
        (gate) =>
          gate.message,
      );

  const warnings =
    decision.gates
      .filter(
        (gate) =>
          gate.status ===
          "WARN",
      )
      .map(
        (gate) =>
          gate.message,
      );

  const gateActions =
    decision.gates
      .map(actionForGate)
      .filter(
        (value) =>
          value !== null,
      );

  const nextActions =
    unique([
      ...gateActions,

      ...(decision.decision ===
      "VALIDATE"
        ? [
            "Proceed to a low-cost market validation stage before committing meaningful inventory or advertising spend.",
            "Treat VALIDATE as permission to test, not as a guaranteed launch recommendation.",
          ]
        : []),
    ]);

  return {
    candidateId:
      input.candidateId,

    decision:
      decision.decision,

    contractVersion:
      decision.contractVersion,

    evidenceConfidence:
      evidenceConfidence(
        input,
      ),

    confidenceMethod:
      "HEURISTIC_COVERAGE_V1",

    calibrationStatus:
      "UNVALIDATED_INTERNAL_HEURISTIC",

    metrics: {
      demandVerified:
        input.demand.verified,

      independentDemandSourceCount:
        input.demand
          .independentSourceCount,

      normalizedTrendIndex:
        input.demand
          .normalizedTrendIndex,

      trendGrowthPercent:
        input.demand
          .trendGrowthPercent,

      seasonality:
        input.demand.seasonality,

      competitorSampleSize:
        input.competition
          .competitorCount,

      comparableCompetitorCount:
        input.competition
          .comparableCompetitorCount,

      comparableCompetitorPercent:
        percentage(
          input.competition
            .comparableCompetitorCount,

          input.competition
            .competitorCount,
        ),

      medianCompetitorPrice:
        input.competition
          .medianPrice,

      medianCompetitorReviewCount:
        input.competition
          .medianReviewCount,

      reviewSampleSize:
        input.customer
          .reviewCount,

      recurringPainPointCount:
        input.customer
          .recurringPainPointCount,

      contributionMarginPercent:
        input.economics
          .contributionMarginPercent,

      breakEvenCpa:
        input.economics
          .breakEvenCpa,

      verifiedSupplierCount:
        input.supplier
          .verifiedSupplierCount,

      supplierConflictCount:
        input.supplier
          .criticalConflictCount,

      verifiedSourcePercent:
        percentage(
          input.evidence
            .verifiedSourceCount,

          input.evidence
            .totalSourceCount,
        ),

      evidenceConflictCount:
        input.evidence
          .criticalConflictCount,

      unsupportedClaimCount:
        input.evidence
          .unsupportedClaimCount,

      marketValidationStatus:
        input.marketValidation
          ?.status ?? null,

      demandSufficiency:
        input.marketValidation
          ?.demandSufficiency ??
        null,

      competitionSufficiency:
        input.marketValidation
          ?.competitionSufficiency ??
        null,
    },

    positiveReasons,

    blockingReasons,

    warnings,

    nextActions,

    policies: {
      noMarketShareInference:
        true,

      noSalesGuarantee:
        true,

      trendIsRelativeInterest:
        true,

      percentagesDescribeSamples:
        true,
    },
  };
}
