import type {
  CompetitionInterpretation,
  CompetitionSufficiency,
} from "./competition-interpretation.js";

import type {
  DemandInterpretation,
  DemandSufficiency,
} from "./demand-interpretation.js";

export type MarketValidationStatus =
  | "READY_FOR_COMMERCIAL_REVIEW"
  | "PARTIAL_EVIDENCE"
  | "INSUFFICIENT_EVIDENCE";

export type MarketValidation =
  Readonly<{
    candidateId: string;

    status:
      MarketValidationStatus;

    demand:
      DemandInterpretation;

    competition:
      CompetitionInterpretation;

    reasons:
      readonly string[];

    warnings:
      readonly string[];

    nextActions:
      readonly string[];

    policies: Readonly<{
      readyMeansCommercialReviewNotLaunch:
        true;

      noDemandGuarantee:
        true;

      noMarketShareInference:
        true;

      noOpaqueMarketScore:
        true;
    }>;
  }>;

function unique(
  values: readonly string[],
): string[] {
  return [...new Set(values)];
}

export function deriveMarketValidationStatus(
  demandSufficiency:
    DemandSufficiency,
  competitionSufficiency:
    CompetitionSufficiency,
): MarketValidationStatus {
  if (
    demandSufficiency ===
      "INSUFFICIENT" ||
    competitionSufficiency ===
      "INSUFFICIENT"
  ) {
    return "INSUFFICIENT_EVIDENCE";
  }

  if (
    demandSufficiency ===
      "SUPPORTED" &&
    competitionSufficiency ===
      "SUPPORTED"
  ) {
    return "READY_FOR_COMMERCIAL_REVIEW";
  }

  return "PARTIAL_EVIDENCE";
}

export function validateMarketEvidence(
  demand: DemandInterpretation,
  competition:
    CompetitionInterpretation,
): MarketValidation {
  if (
    demand.candidateId !==
    competition.candidateId
  ) {
    throw new Error(
      "Cannot combine market evidence from different candidates.",
    );
  }

  const status =
    deriveMarketValidationStatus(
      demand.sufficiency,
      competition.sufficiency,
    );

  return {
    candidateId:
      demand.candidateId,

    status,

    demand,

    competition,

    reasons:
      unique([
        ...demand.reasons,
        ...competition.reasons,
      ]),

    warnings:
      unique([
        ...demand.warnings,
        ...competition.warnings,
      ]),

    nextActions:
      unique([
        ...demand.nextActions,
        ...competition.nextActions,
      ]),

    policies: {
      readyMeansCommercialReviewNotLaunch:
        true,

      noDemandGuarantee:
        true,

      noMarketShareInference:
        true,

      noOpaqueMarketScore:
        true,
    },
  };
}
