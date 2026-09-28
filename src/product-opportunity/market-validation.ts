import type {
  CompetitionInterpretation,
} from "./competition-interpretation.js";

import type {
  DemandInterpretation,
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

  let status:
    MarketValidationStatus;

  if (
    demand.sufficiency ===
      "INSUFFICIENT" ||
    competition.sufficiency ===
      "INSUFFICIENT"
  ) {
    status =
      "INSUFFICIENT_EVIDENCE";
  } else if (
    demand.sufficiency ===
      "SUPPORTED" &&
    competition.sufficiency ===
      "SUPPORTED"
  ) {
    status =
      "READY_FOR_COMMERCIAL_REVIEW";
  } else {
    status =
      "PARTIAL_EVIDENCE";
  }

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
