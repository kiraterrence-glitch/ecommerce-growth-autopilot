import type {
  DemandProfile,
} from "./demand-profile.js";

export type DemandSufficiency =
  | "SUPPORTED"
  | "PARTIAL"
  | "INSUFFICIENT";

export type DemandEvidenceShape =
  | "SEARCH_AND_PURCHASE"
  | "SEARCH_ONLY"
  | "PURCHASE_ONLY"
  | "OTHER_ONLY"
  | "NONE";

export type DemandInterpretation =
  Readonly<{
    candidateId: string;

    sufficiency:
      DemandSufficiency;

    evidenceShape:
      DemandEvidenceShape;

    reasons:
      readonly string[];

    warnings:
      readonly string[];

    nextActions:
      readonly string[];

    evidence: Readonly<{
      usableVerifiedObservationCount:
        number;

      independentVerifiedSourceCount:
        number;

      hasRelativeSearchEvidence:
        boolean;

      hasAbsoluteSearchEvidence:
        boolean;

      hasPurchaseEvidence:
        boolean;

      staleObservationCount:
        number;

      disagreementCount:
        number;
    }>;

    policies: Readonly<{
      supportedDoesNotMeanGuaranteedDemand:
        true;

      searchInterestDoesNotEqualPurchases:
        true;

      purchaseEvidenceDoesNotProveProfitability:
        true;

      disagreementsRequireReview:
        true;

      noOpaqueDemandScore:
        true;
    }>;
  }>;

function evidenceShape(
  profile: DemandProfile,
): DemandEvidenceShape {
  const hasSearch =
    profile.hasRelativeSearchEvidence ||
    profile.hasAbsoluteSearchEvidence;

  if (
    hasSearch &&
    profile.hasPurchaseEvidence
  ) {
    return "SEARCH_AND_PURCHASE";
  }

  if (hasSearch) {
    return "SEARCH_ONLY";
  }

  if (
    profile.hasPurchaseEvidence
  ) {
    return "PURCHASE_ONLY";
  }

  if (
    profile.usableVerifiedSignals
      .length > 0
  ) {
    return "OTHER_ONLY";
  }

  return "NONE";
}

export function interpretDemandProfile(
  profile: DemandProfile,
): DemandInterpretation {
  const shape =
    evidenceShape(profile);

  const reasons: string[] =
    [];

  const warnings: string[] =
    [];

  const nextActions: string[] =
    [];

  if (
    profile.usableVerifiedObservationCount ===
    0
  ) {
    reasons.push(
      "No current verified demand observations are available.",
    );

    nextActions.push(
      "Collect at least one current verified demand observation.",
    );
  }

  if (
    profile.independentVerifiedSourceCount <
    2
  ) {
    reasons.push(
      "Demand evidence comes from fewer than two independent verified sources.",
    );

    nextActions.push(
      "Add a second independent verified demand source.",
    );
  }

  if (
    shape === "SEARCH_ONLY"
  ) {
    reasons.push(
      "Current evidence shows search interest but no verified purchasing signal.",
    );

    nextActions.push(
      "Add verified purchase, units-sold, revenue, or conversion evidence before treating demand as fully supported.",
    );
  }

  if (
    shape === "PURCHASE_ONLY"
  ) {
    reasons.push(
      "Current evidence shows purchasing activity but no verified search-demand signal.",
    );

    nextActions.push(
      "Add current search-demand evidence to understand discoverability and demand direction.",
    );
  }

  if (
    shape === "OTHER_ONLY"
  ) {
    reasons.push(
      "Current verified signals do not include search or purchasing evidence.",
    );

    nextActions.push(
      "Add search-demand and purchasing evidence.",
    );
  }

  if (
    shape === "NONE"
  ) {
    reasons.push(
      "No usable verified search or purchase demand evidence is available.",
    );
  }

  if (
    profile.staleObservationCount >
    0
  ) {
    warnings.push(
      `${profile.staleObservationCount} demand observation(s) are stale and excluded from current evidence.`,
    );
  }

  if (
    profile.disagreements.length >
    0
  ) {
    warnings.push(
      `${profile.disagreements.length} comparable demand measurement set(s) disagree across independent sources.`,
    );

    nextActions.push(
      "Review source methodology, geography, period, and measurement definitions for conflicting demand observations.",
    );
  }

  let sufficiency:
    DemandSufficiency;

  if (
    profile.usableVerifiedObservationCount ===
      0 ||
    profile.independentVerifiedSourceCount ===
      0 ||
    shape === "NONE" ||
    shape === "OTHER_ONLY"
  ) {
    sufficiency =
      "INSUFFICIENT";
  } else if (
    profile.independentVerifiedSourceCount >=
      2 &&
    shape ===
      "SEARCH_AND_PURCHASE" &&
    profile.disagreements.length ===
      0
  ) {
    sufficiency =
      "SUPPORTED";
  } else {
    sufficiency =
      "PARTIAL";
  }

  if (
    sufficiency === "SUPPORTED"
  ) {
    reasons.push(
      "Current verified evidence includes both search and purchasing signals from multiple independent sources.",
    );

    nextActions.push(
      "Continue to competition, economics, supplier, and customer-opportunity validation; supported demand alone is not a launch decision.",
    );
  }

  return {
    candidateId:
      profile.candidateId,

    sufficiency,

    evidenceShape:
      shape,

    reasons:
      [...new Set(reasons)],

    warnings:
      [...new Set(warnings)],

    nextActions:
      [...new Set(nextActions)],

    evidence: {
      usableVerifiedObservationCount:
        profile
          .usableVerifiedObservationCount,

      independentVerifiedSourceCount:
        profile
          .independentVerifiedSourceCount,

      hasRelativeSearchEvidence:
        profile
          .hasRelativeSearchEvidence,

      hasAbsoluteSearchEvidence:
        profile
          .hasAbsoluteSearchEvidence,

      hasPurchaseEvidence:
        profile
          .hasPurchaseEvidence,

      staleObservationCount:
        profile
          .staleObservationCount,

      disagreementCount:
        profile.disagreements.length,
    },

    policies: {
      supportedDoesNotMeanGuaranteedDemand:
        true,

      searchInterestDoesNotEqualPurchases:
        true,

      purchaseEvidenceDoesNotProveProfitability:
        true,

      disagreementsRequireReview:
        true,

      noOpaqueDemandScore:
        true,
    },
  };
}
