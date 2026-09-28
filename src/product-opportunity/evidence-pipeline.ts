import type {
  ResearchAnalysis,
  ResearchProject,
} from "../research/types.js";

import {
  buildCompetitionProfile,
} from "./competition-profile.js";

import type {
  CompetitionProfile,
} from "./competition-profile.js";

import {
  interpretCompetitionProfile,
} from "./competition-interpretation.js";

import type {
  CompetitionInterpretation,
} from "./competition-interpretation.js";

import type {
  CompetitionMarketObservation,
} from "./competition-types.js";

import {
  evaluateProductOpportunity,
} from "./decision.js";

import {
  interpretDemandProfile,
} from "./demand-interpretation.js";

import type {
  DemandInterpretation,
} from "./demand-interpretation.js";

import {
  buildDemandProfile,
} from "./demand-profile.js";

import type {
  DemandProfile,
} from "./demand-profile.js";

import type {
  DemandObservation,
} from "./demand-types.js";

import {
  validateMarketEvidence,
} from "./market-validation.js";

import type {
  MarketValidation,
} from "./market-validation.js";

import {
  buildProductOpportunityInput,
} from "./research-adapter.js";

import {
  buildProductOpportunityReport,
} from "./report.js";

import type {
  ProductOpportunityReport,
} from "./report.js";

import type {
  ProductOpportunityDecision,
  ProductOpportunityInput,
  SupplierEvidence,
} from "./types.js";

export type ProductOpportunityEvidencePipelineContext =
  Readonly<{
    supplier:
      SupplierEvidence;

    verifiedSourceIds:
      readonly string[];

    criticalEvidenceConflictCount:
      number;

    unsupportedClaimCount:
      number;
  }>;

export type ProductOpportunityEvidencePipelineResult =
  Readonly<{
    demandProfile:
      DemandProfile;

    demandInterpretation:
      DemandInterpretation;

    competitionProfile:
      CompetitionProfile;

    competitionInterpretation:
      CompetitionInterpretation;

    marketValidation:
      MarketValidation;

    input:
      ProductOpportunityInput;

    decision:
      ProductOpportunityDecision;

    report:
      ProductOpportunityReport;
  }>;

const FORBIDDEN_CONTEXT_KEYS =
  new Set([
    "demand",
    "demandVerified",
    "normalizedTrendIndex",
    "trendGrowthPercent",
    "marketValidation",
    "marketValidationStatus",
  ]);

function validateContext(
  context:
    ProductOpportunityEvidencePipelineContext,
): void {
  for (
    const key
    of Object.keys(context)
  ) {
    if (
      FORBIDDEN_CONTEXT_KEYS.has(
        key,
      )
    ) {
      throw new Error(
        `Canonical evidence pipeline rejects caller-supplied demand or market conclusion: ${key}.`,
      );
    }
  }
}

function validateObservationSources(
  project: ResearchProject,
  demandObservations:
    readonly DemandObservation[],
  competitionObservations:
    readonly CompetitionMarketObservation[],
): void {
  const sources =
    new Map(
      project.sources.map(
        (source) => [
          source.id,
          source,
        ],
      ),
    );

  for (
    const observation
    of demandObservations
  ) {
    const source =
      sources.get(
        observation.sourceId,
      );

    if (!source) {
      throw new Error(
        `Unknown demand observation source: ${observation.sourceId}.`,
      );
    }

    if (
      source.type !==
      "demand_data"
    ) {
      throw new Error(
        `Demand observation source ${observation.sourceId} is not demand_data.`,
      );
    }
  }

  for (
    const observation
    of competitionObservations
  ) {
    if (
      !sources.has(
        observation.sourceId,
      )
    ) {
      throw new Error(
        `Unknown competition observation source: ${observation.sourceId}.`,
      );
    }
  }
}

function relativeTrendIndex(
  profile: DemandProfile,
): number | null {
  const relativeSeries =
    profile.series.filter(
      (series) =>
        series.signal ===
        "SEARCH_INTEREST_RELATIVE",
    );

  if (
    relativeSeries.length !== 1
  ) {
    return null;
  }

  return (
    relativeSeries[0]
      ?.latestValue ?? null
  );
}

export function runProductOpportunityEvidencePipeline(
  project: ResearchProject,
  analysis: ResearchAnalysis,
  demandObservations:
    readonly DemandObservation[],
  competitionObservations:
    readonly CompetitionMarketObservation[],
  asOf: string,
  context:
    ProductOpportunityEvidencePipelineContext,
): ProductOpportunityEvidencePipelineResult {
  validateContext(context);

  validateObservationSources(
    project,
    demandObservations,
    competitionObservations,
  );

  const demandProfile =
    buildDemandProfile(
      project.id,
      demandObservations,
      asOf,
    );

  const demandInterpretation =
    interpretDemandProfile(
      demandProfile,
    );

  const competitionProfile =
    buildCompetitionProfile(
      project,
      analysis,
      competitionObservations,
      asOf,
    );

  const competitionInterpretation =
    interpretCompetitionProfile(
      competitionProfile,
    );

  const marketValidation =
    validateMarketEvidence(
      demandInterpretation,
      competitionInterpretation,
    );

  const legacyInput =
    buildProductOpportunityInput(
      project,
      analysis,
      {
        demand: {
          verified:
            demandInterpretation
              .sufficiency ===
            "SUPPORTED",

          independentSourceIds:
            demandProfile
              .independentVerifiedSourceIds,

          normalizedTrendIndex:
            relativeTrendIndex(
              demandProfile,
            ),

          trendGrowthPercent:
            null,

          seasonality:
            "UNKNOWN",
        },

        comparableCompetitorIds:
          project.competitors.map(
            (competitor) =>
              competitor.id,
          ),

        supplier:
          context.supplier,

        verifiedSourceIds:
          context.verifiedSourceIds,

        criticalEvidenceConflictCount:
          context
            .criticalEvidenceConflictCount,

        unsupportedClaimCount:
          context
            .unsupportedClaimCount,
      },
    );

  const input:
    ProductOpportunityInput = {
      ...legacyInput,

      marketValidation: {
        status:
          marketValidation.status,

        demandSufficiency:
          demandInterpretation
            .sufficiency,

        competitionSufficiency:
          competitionInterpretation
            .sufficiency,
      },
    };

  const decision =
    evaluateProductOpportunity(
      input,
    );

  const report =
    buildProductOpportunityReport(
      input,
      decision,
    );

  return {
    demandProfile,
    demandInterpretation,
    competitionProfile,
    competitionInterpretation,
    marketValidation,
    input,
    decision,
    report,
  };
}
