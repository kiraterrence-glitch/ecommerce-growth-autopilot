import type {
  ResearchAnalysis,
  ResearchProject,
} from "../research/types.js";

import {
  assessCompetitionMarketObservation,
} from "./competition.js";

import type {
  CompetitionMarketObservation,
  CompetitionMarketSignalKind,
  CompetitionMarketSourceType,
  CompetitionMarketUnit,
  CompetitionObservationAssessment,
} from "./competition-types.js";

export type CompetitionMarketSnapshot =
  Readonly<{
    sourceId: string;

    sourceType:
      CompetitionMarketSourceType;

    signal:
      CompetitionMarketSignalKind;

    unit:
      CompetitionMarketUnit;

    geography: string;

    value: number;

    periodEnd: string;

    freshness:
      "FRESH" | "AGING";
  }>;

export type CompetitionProfile =
  Readonly<{
    candidateId: string;

    asOf: string;

    sample: Readonly<{
      competitorCount:
        number;

      minPrice:
        number | null;

      medianPrice:
        number | null;

      maxPrice:
        number | null;

      priceSpreadPercent:
        number | null;

      candidatePricePercentileWithinSample:
        number | null;

      ratingCoveragePercent:
        number | null;

      medianRating:
        number | null;

      reviewCoveragePercent:
        number | null;

      medianReviewCount:
        number | null;

      p75ReviewCount:
        number | null;

      offerPenetrationPercent:
        number | null;

      topFeature:
        Readonly<{
          feature: string;
          count: number;
          penetrationPercent: number;
        }> | null;
    }>;

    marketEvidence: Readonly<{
      observationCount:
        number;

      verifiedObservationCount:
        number;

      usableVerifiedObservationCount:
        number;

      staleObservationCount:
        number;

      independentVerifiedSourceCount:
        number;

      independentVerifiedSourceIds:
        readonly string[];

      signalsPresent:
        readonly CompetitionMarketSignalKind[];

      snapshots:
        readonly CompetitionMarketSnapshot[];

      hasDirectSaturationEvidence:
        boolean;

      hasSponsoredCompetitionEvidence:
        boolean;

      hasPrimeOfferEvidence:
        boolean;

      hasOutOfStockEvidence:
        boolean;
    }>;

    policies: Readonly<{
      samplePercentagesAreNotMarketShare:
        true;

      candidatePricePercentileIsSampleBased:
        true;

      noCrossSourceAveraging:
        true;

      saturationNotInferredWithoutDirectEvidence:
        true;
    }>;
  }>;

type CurrentCompetitionObservationAssessment =
  CompetitionObservationAssessment &
    Readonly<{
      freshness:
        "FRESH" | "AGING";
    }>;

function isCurrentAssessment(
  assessment:
    CompetitionObservationAssessment,
): assessment is
  CurrentCompetitionObservationAssessment {
  return (
    assessment.freshness !==
    "STALE"
  );
}

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
    (
      numerator /
      denominator
    ) * 100,
  );
}

function median(
  values: readonly number[],
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  const sorted =
    [...values].sort(
      (a, b) =>
        a - b,
    );

  const middle =
    Math.floor(
      sorted.length / 2,
    );

  if (
    sorted.length % 2 ===
    1
  ) {
    return (
      sorted[middle] ??
      null
    );
  }

  const left =
    sorted[
      middle - 1
    ];

  const right =
    sorted[middle];

  if (
    left === undefined ||
    right === undefined
  ) {
    return null;
  }

  return round(
    (
      left +
      right
    ) / 2,
  );
}

function percentile75(
  values: readonly number[],
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  const sorted =
    [...values].sort(
      (a, b) =>
        a - b,
    );

  const index =
    Math.ceil(
      sorted.length *
        0.75,
    ) - 1;

  return (
    sorted[
      Math.max(
        0,
        index,
      )
    ] ??
    null
  );
}

function candidatePricePercentile(
  project: ResearchProject,
): number | null {
  if (
    project.economics ===
      null ||
    project.competitors
      .length === 0
  ) {
    return null;
  }

  const candidatePrice =
    project.economics
      .sellingPrice;

  const atOrBelow =
    project.competitors
      .filter(
        (competitor) =>
          competitor.price <=
          candidatePrice,
      ).length;

  return percentage(
    atOrBelow,
    project.competitors.length,
  );
}

function validateBinding(
  project: ResearchProject,
  analysis: ResearchAnalysis,
): void {
  if (
    analysis.projectId !==
    project.id
  ) {
    throw new Error(
      "Competition analysis does not belong to the supplied project.",
    );
  }

  if (
    analysis.competitorCount !==
    project.competitors.length
  ) {
    throw new Error(
      "Competition analysis competitor count is stale.",
    );
  }
}

function latestSnapshots(
  assessments:
    readonly CurrentCompetitionObservationAssessment[],
): CompetitionMarketSnapshot[] {
  const latest =
    new Map<
      string,
      CurrentCompetitionObservationAssessment
    >();

  for (
    const assessment
    of assessments
  ) {
    const item =
      assessment.observation;

    const key =
      [
        item.sourceId,
        item.signal,
        item.geography,
      ].join("|");

    const current =
      latest.get(key);

    if (
      !current ||
      Date.parse(
        item.periodEnd,
      ) >
        Date.parse(
          current.observation
            .periodEnd,
        ) ||
      (
        item.periodEnd ===
          current.observation
            .periodEnd &&
        Date.parse(
          item.capturedAt,
        ) >
          Date.parse(
            current.observation
              .capturedAt,
          )
      )
    ) {
      latest.set(
        key,
        assessment,
      );
    }
  }

  return [
    ...latest.values(),
  ]
    .map(
      (assessment) => ({
        sourceId:
          assessment
            .observation
            .sourceId,

        sourceType:
          assessment
            .observation
            .sourceType,

        signal:
          assessment
            .observation
            .signal,

        unit:
          assessment
            .observation
            .unit,

        geography:
          assessment
            .observation
            .geography,

        value:
          assessment
            .observation
            .value,

        periodEnd:
          assessment
            .observation
            .periodEnd,

        freshness:
          assessment
            .freshness,
      }),
    )
    .sort(
      (left, right) =>
        [
          left.signal,
          left.sourceId,
          left.geography,
        ]
          .join("|")
          .localeCompare(
            [
              right.signal,
              right.sourceId,
              right.geography,
            ].join("|"),
          ),
    );
}

export function buildCompetitionProfile(
  project: ResearchProject,

  analysis: ResearchAnalysis,

  observations:
    readonly CompetitionMarketObservation[],

  asOf: string,
): CompetitionProfile {
  validateBinding(
    project,
    analysis,
  );

  const assessments =
    observations.map(
      (observation) => {
        if (
          observation.candidateId !==
          project.id
        ) {
          throw new Error(
            `Competition observation ${observation.id} belongs to another candidate.`,
          );
        }

        return assessCompetitionMarketObservation(
          observation,
          asOf,
        );
      },
    );

  const verified =
    assessments.filter(
      (assessment) =>
        assessment.observation
          .verified,
    );

  const usable =
    verified.filter(
      isCurrentAssessment,
    );

  const sourceIds =
    [
      ...new Set(
        usable.map(
          (assessment) =>
            assessment
              .observation
              .sourceId,
        ),
      ),
    ].sort();

  const signalsPresent =
    [
      ...new Set(
        usable.map(
          (assessment) =>
            assessment
              .observation
              .signal,
        ),
      ),
    ].sort() as
      CompetitionMarketSignalKind[];

  const ratings =
    project.competitors
      .map(
        (competitor) =>
          competitor.rating,
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null,
      );

  const reviewCounts =
    project.competitors
      .map(
        (competitor) =>
          competitor.reviewCount,
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null,
      );

  const offers =
    project.competitors
      .filter(
        (competitor) =>
          competitor.offer !==
          null,
      ).length;

  const topFeature =
    analysis.features[0];

  const minPrice =
    analysis.price.min;

  const medianPrice =
    analysis.price.median;

  const maxPrice =
    analysis.price.max;

  const priceSpreadPercent =
    minPrice !== null &&
    medianPrice !== null &&
    maxPrice !== null &&
    medianPrice > 0
      ? round(
          (
            (
              maxPrice -
              minPrice
            ) /
            medianPrice
          ) *
            100,
        )
      : null;

  const saturationSignals =
    new Set<
      CompetitionMarketSignalKind
    >([
      "NICHE_PRODUCT_COUNT",
      "TOP_CLICK_PRODUCT_COUNT",
      "SELLER_COUNT",
    ]);

  return {
    candidateId:
      project.id,

    asOf,

    sample: {
      competitorCount:
        project.competitors.length,

      minPrice,

      medianPrice,

      maxPrice,

      priceSpreadPercent,

      candidatePricePercentileWithinSample:
        candidatePricePercentile(
          project,
        ),

      ratingCoveragePercent:
        percentage(
          ratings.length,
          project.competitors.length,
        ),

      medianRating:
        median(
          ratings,
        ),

      reviewCoveragePercent:
        percentage(
          reviewCounts.length,
          project.competitors.length,
        ),

      medianReviewCount:
        median(
          reviewCounts,
        ),

      p75ReviewCount:
        percentile75(
          reviewCounts,
        ),

      offerPenetrationPercent:
        percentage(
          offers,
          project.competitors.length,
        ),

      topFeature:
        topFeature
          ? {
              feature:
                topFeature.feature,

              count:
                topFeature.count,

              penetrationPercent:
                round(
                  topFeature.share *
                    100,
                ),
            }
          : null,
    },

    marketEvidence: {
      observationCount:
        assessments.length,

      verifiedObservationCount:
        verified.length,

      usableVerifiedObservationCount:
        usable.length,

      staleObservationCount:
        assessments.filter(
          (assessment) =>
            assessment.freshness ===
            "STALE",
        ).length,

      independentVerifiedSourceCount:
        sourceIds.length,

      independentVerifiedSourceIds:
        sourceIds,

      signalsPresent,

      snapshots:
        latestSnapshots(
          usable,
        ),

      hasDirectSaturationEvidence:
        signalsPresent.some(
          (signal) =>
            saturationSignals.has(
              signal,
            ),
        ),

      hasSponsoredCompetitionEvidence:
        signalsPresent.includes(
          "SPONSORED_PRODUCT_SHARE",
        ),

      hasPrimeOfferEvidence:
        signalsPresent.includes(
          "PRIME_OFFER_SHARE",
        ),

      hasOutOfStockEvidence:
        signalsPresent.includes(
          "OUT_OF_STOCK_RATE",
        ),
    },

    policies: {
      samplePercentagesAreNotMarketShare:
        true,

      candidatePricePercentileIsSampleBased:
        true,

      noCrossSourceAveraging:
        true,

      saturationNotInferredWithoutDirectEvidence:
        true,
    },
  };
}
