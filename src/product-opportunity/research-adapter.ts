import type {
  ResearchAnalysis,
  ResearchProject,
} from "../research/types.js";

import type {
  DemandEvidence,
  ProductOpportunityInput,
  SupplierEvidence,
} from "./types.js";

export type ResearchOpportunityBridge =
  Readonly<{
    demand: Readonly<{
      verified: boolean;

      /**
       * Caller must supply genuinely independent
       * demand-data source IDs.
       */
      independentSourceIds:
        readonly string[];

      normalizedTrendIndex:
        number | null;

      trendGrowthPercent:
        number | null;

      seasonality:
        DemandEvidence["seasonality"];
    }>;

    /**
     * Only competitors confirmed as genuinely
     * comparable should be included.
     */
    comparableCompetitorIds:
      readonly string[];

    supplier:
      SupplierEvidence;

    /**
     * Source IDs whose provenance has actually
     * been verified.
     */
    verifiedSourceIds:
      readonly string[];

    criticalEvidenceConflictCount:
      number;

    unsupportedClaimCount:
      number;
  }>;

function unique(
  values: readonly string[],
): string[] {
  return [
    ...new Set(values),
  ];
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

function median(
  values: readonly number[],
): number | null {
  if (values.length === 0) {
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
    sorted.length % 2 === 1
  ) {
    return (
      sorted[middle] ??
      null
    );
  }

  const left =
    sorted[middle - 1];

  const right =
    sorted[middle];

  if (
    left === undefined ||
    right === undefined
  ) {
    return null;
  }

  return round(
    (left + right) / 2,
  );
}

function validateAnalysisBinding(
  project: ResearchProject,
  analysis: ResearchAnalysis,
): void {
  if (
    analysis.projectId !==
    project.id
  ) {
    throw new Error(
      "Research analysis does not belong to the supplied project.",
    );
  }

  if (
    analysis.competitorCount !==
    project.competitors.length
  ) {
    throw new Error(
      "Research analysis competitor count is stale.",
    );
  }

  if (
    analysis.reviewCount !==
    project.reviews.length
  ) {
    throw new Error(
      "Research analysis review count is stale.",
    );
  }
}

function validateComparableCompetitors(
  project: ResearchProject,
  ids: readonly string[],
): string[] {
  const uniqueIds =
    unique(ids);

  const known =
    new Set(
      project.competitors.map(
        (competitor) =>
          competitor.id,
      ),
    );

  for (const id of uniqueIds) {
    if (!known.has(id)) {
      throw new Error(
        `Unknown comparable competitor: ${id}`,
      );
    }
  }

  return uniqueIds;
}

function validateDemandSources(
  project: ResearchProject,
  ids: readonly string[],
  verified: boolean,
): string[] {
  const uniqueIds =
    unique(ids);

  const sources =
    new Map(
      project.sources.map(
        (source) => [
          source.id,
          source,
        ],
      ),
    );

  for (const id of uniqueIds) {
    const source =
      sources.get(id);

    if (!source) {
      throw new Error(
        `Unknown demand source: ${id}`,
      );
    }

    if (
      source.type !==
      "demand_data"
    ) {
      throw new Error(
        `Demand source ${id} is not demand_data.`,
      );
    }
  }

  if (
    verified &&
    uniqueIds.length === 0
  ) {
    throw new Error(
      "Verified demand requires at least one independent demand-data source.",
    );
  }

  return uniqueIds;
}

function validateVerifiedSources(
  project: ResearchProject,
  ids: readonly string[],
): string[] {
  const uniqueIds =
    unique(ids);

  const known =
    new Set(
      project.sources.map(
        (source) =>
          source.id,
      ),
    );

  for (const id of uniqueIds) {
    if (!known.has(id)) {
      throw new Error(
        `Unknown verified source: ${id}`,
      );
    }
  }

  return uniqueIds;
}

export function buildProductOpportunityInput(
  project: ResearchProject,
  analysis: ResearchAnalysis,
  bridge: ResearchOpportunityBridge,
): ProductOpportunityInput {
  validateAnalysisBinding(
    project,
    analysis,
  );

  const comparableIds =
    validateComparableCompetitors(
      project,
      bridge.comparableCompetitorIds,
    );

  const demandSourceIds =
    validateDemandSources(
      project,
      bridge.demand.independentSourceIds,
      bridge.demand.verified,
    );

  const verifiedSourceIds =
    validateVerifiedSources(
      project,
      bridge.verifiedSourceIds,
    );

  const comparableSet =
    new Set(
      comparableIds,
    );

  const comparableCompetitors =
    project.competitors.filter(
      (competitor) =>
        comparableSet.has(
          competitor.id,
        ),
    );

  const reviewCounts: number[] =
    [];

  for (
    const competitor
    of comparableCompetitors
  ) {
    if (
      typeof competitor.reviewCount ===
        "number" &&
      Number.isFinite(
        competitor.reviewCount,
      )
    ) {
      reviewCounts.push(
        competitor.reviewCount,
      );
    }
  }

  const recurringPainPointCount =
    analysis.reviewIntelligence.themes.filter(
      (theme) =>
        theme.category ===
          "pain_point" &&
        theme.mentionCount >= 2,
    ).length;

  const economics =
    analysis.economics;

  return {
    candidateId:
      project.id,

    demand: {
      verified:
        bridge.demand.verified,

      independentSourceCount:
        demandSourceIds.length,

      normalizedTrendIndex:
        bridge.demand.normalizedTrendIndex,

      trendGrowthPercent:
        bridge.demand.trendGrowthPercent,

      seasonality:
        bridge.demand.seasonality,
    },

    competition: {
      competitorCount:
        analysis.competitorCount,

      comparableCompetitorCount:
        comparableIds.length,

      medianPrice:
        analysis.price.median,

      medianReviewCount:
        median(reviewCounts),
    },

    economics: {
      sellingPrice:
        economics?.sellingPrice ??
        null,

      landedCost:
        economics
          ? round(
              economics.cogs +
                economics.shippingCost,
            )
          : null,

      contributionBeforeAds:
        economics?.contributionBeforeAds ??
        null,

      contributionAfterAds:
        economics?.contributionAfterAds ??
        null,

      contributionMarginPercent:
        economics?.contributionMarginPercent ??
        null,

      breakEvenCpa:
        economics?.breakEvenCpa ??
        null,
    },

    customer: {
      reviewCount:
        analysis.reviewCount,

      recurringPainPointCount,
    },

    supplier:
      bridge.supplier,

    evidence: {
      totalSourceCount:
        project.sources.length,

      verifiedSourceCount:
        verifiedSourceIds.length,

      criticalConflictCount:
        bridge
          .criticalEvidenceConflictCount,

      unsupportedClaimCount:
        bridge
          .unsupportedClaimCount,
    },
  };
}
