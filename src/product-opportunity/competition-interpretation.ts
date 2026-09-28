import type {
  CompetitionProfile,
} from "./competition-profile.js";

export type CompetitionSufficiency =
  | "SUPPORTED"
  | "PARTIAL"
  | "INSUFFICIENT";

export type CompetitionInterpretation =
  Readonly<{
    candidateId: string;

    sufficiency:
      CompetitionSufficiency;

    reasons:
      readonly string[];

    warnings:
      readonly string[];

    nextActions:
      readonly string[];

    evidence: Readonly<{
      competitorCount: number;

      usableVerifiedObservationCount:
        number;

      independentVerifiedSourceCount:
        number;

      hasDirectSaturationEvidence:
        boolean;

      staleObservationCount:
        number;

      unverifiedObservationCount:
        number;

      disagreementCount:
        number;
    }>;

    policies: Readonly<{
      samplePercentagesAreNotMarketShare:
        true;

      supportedDoesNotMeanAttractiveMarket:
        true;

      disagreementsRequireReview:
        true;

      noOpaqueCompetitionScore:
        true;
    }>;
  }>;

function unique(
  values: readonly string[],
): string[] {
  return [...new Set(values)];
}

export function interpretCompetitionProfile(
  profile: CompetitionProfile,
): CompetitionInterpretation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const nextActions: string[] = [];

  const unverifiedObservationCount =
    profile.marketEvidence
      .observationCount -
    profile.marketEvidence
      .verifiedObservationCount;

  if (
    profile.sample.competitorCount ===
    0
  ) {
    reasons.push(
      "No comparable competitor sample is available.",
    );

    nextActions.push(
      "Collect and confirm genuinely comparable competitor products.",
    );
  } else if (
    profile.sample.competitorCount <
    5
  ) {
    reasons.push(
      "Fewer than five comparable competitors are available.",
    );

    nextActions.push(
      "Expand the confirmed competitor sample to at least five products.",
    );
  }

  if (
    !profile.marketEvidence
      .hasDirectSaturationEvidence
  ) {
    reasons.push(
      "No current verified direct market-saturation observation is available.",
    );

    nextActions.push(
      "Collect current verified product-count, top-click-product, or seller-count evidence.",
    );
  }

  if (
    profile.marketEvidence
      .independentVerifiedSourceCount ===
    0
  ) {
    reasons.push(
      "No independent verified current market source is available.",
    );
  }

  if (
    profile.marketEvidence
      .staleObservationCount > 0
  ) {
    warnings.push(
      `${profile.marketEvidence.staleObservationCount} competition observation(s) are stale and excluded from current support.`,
    );
  }

  if (
    unverifiedObservationCount > 0
  ) {
    warnings.push(
      `${unverifiedObservationCount} competition observation(s) are unverified and excluded from current support.`,
    );
  }

  if (
    profile.marketEvidence
      .disagreements.length > 0
  ) {
    warnings.push(
      `${profile.marketEvidence.disagreements.length} comparable competition measurement set(s) disagree across independent sources.`,
    );

    nextActions.push(
      "Review source methodology, geography, period, and measurement definitions for conflicting competition observations.",
    );
  }

  let sufficiency:
    CompetitionSufficiency;

  if (
    profile.sample.competitorCount ===
      0 &&
    profile.marketEvidence
      .usableVerifiedObservationCount ===
      0
  ) {
    sufficiency = "INSUFFICIENT";
  } else if (
    profile.sample.competitorCount >=
      5 &&
    profile.marketEvidence
      .hasDirectSaturationEvidence &&
    profile.marketEvidence
      .independentVerifiedSourceCount >=
      1 &&
    profile.marketEvidence
      .disagreements.length ===
      0
  ) {
    sufficiency = "SUPPORTED";

    reasons.push(
      "The confirmed competitor sample and current direct market evidence support commercial review.",
    );

    nextActions.push(
      "Continue to demand, economics, supplier, and customer-opportunity validation; supported competition evidence is not a launch decision.",
    );
  } else {
    sufficiency = "PARTIAL";
  }

  return {
    candidateId:
      profile.candidateId,

    sufficiency,

    reasons:
      unique(reasons),

    warnings:
      unique(warnings),

    nextActions:
      unique(nextActions),

    evidence: {
      competitorCount:
        profile.sample
          .competitorCount,

      usableVerifiedObservationCount:
        profile.marketEvidence
          .usableVerifiedObservationCount,

      independentVerifiedSourceCount:
        profile.marketEvidence
          .independentVerifiedSourceCount,

      hasDirectSaturationEvidence:
        profile.marketEvidence
          .hasDirectSaturationEvidence,

      staleObservationCount:
        profile.marketEvidence
          .staleObservationCount,

      unverifiedObservationCount,

      disagreementCount:
        profile.marketEvidence
          .disagreements.length,
    },

    policies: {
      samplePercentagesAreNotMarketShare:
        true,

      supportedDoesNotMeanAttractiveMarket:
        true,

      disagreementsRequireReview:
        true,

      noOpaqueCompetitionScore:
        true,
    },
  };
}
