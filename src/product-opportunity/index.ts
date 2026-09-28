export {
  evaluateProductOpportunity,
} from "./decision.js";

export type {
  CompetitionEvidence,
  CustomerEvidence,
  DemandEvidence,
  EconomicsEvidence,
  OpportunityDecision,
  OpportunityEvidenceQuality,
  OpportunityGate,
  OpportunityGateCode,
  OpportunityGateStatus,
  ProductOpportunityDecision,
  ProductOpportunityInput,
  SupplierEvidence,
} from "./types.js";

export {
  buildProductOpportunityInput,
} from "./research-adapter.js";

export type {
  ResearchOpportunityBridge,
} from "./research-adapter.js";

export {
  buildProductOpportunityReport,
} from "./report.js";

export type {
  OpportunityEvidenceConfidence,
  ProductOpportunityReport,
} from "./report.js";

export {
  assessDemandObservation,
  DEFAULT_DEMAND_FRESHNESS_POLICY,
  validateDemandObservation,
} from "./demand.js";

export type {
  DemandAcquisitionMethod,
  DemandFreshness,
  DemandFreshnessPolicy,
  DemandMeasurementUnit,
  DemandObservation,
  DemandObservationAssessment,
  DemandSignalKind,
  DemandSourceType,
} from "./demand-types.js";

export {
  buildDemandProfile,
} from "./demand-profile.js";

export type {
  DemandProfile,
  DemandSeriesDirection,
  DemandSeriesSummary,
  DemandSourceDisagreement,
} from "./demand-profile.js";

export {
  interpretDemandProfile,
} from "./demand-interpretation.js";

export type {
  DemandEvidenceShape,
  DemandInterpretation,
  DemandSufficiency,
} from "./demand-interpretation.js";

export {
  assessCompetitionMarketObservation,
  DEFAULT_COMPETITION_FRESHNESS_POLICY,
  validateCompetitionMarketObservation,
} from "./competition.js";

export {
  buildCompetitionProfile,
} from "./competition-profile.js";

export type {
  CompetitionAcquisitionMethod,
  CompetitionFreshness,
  CompetitionFreshnessPolicy,
  CompetitionMarketObservation,
  CompetitionMarketSignalKind,
  CompetitionMarketSourceType,
  CompetitionMarketUnit,
  CompetitionObservationAssessment,
} from "./competition-types.js";

export type {
  CompetitionMarketSnapshot,
  CompetitionProfile,
  CompetitionSourceDisagreement,
} from "./competition-profile.js";

export {
  interpretCompetitionProfile,
} from "./competition-interpretation.js";

export type {
  CompetitionInterpretation,
  CompetitionSufficiency,
} from "./competition-interpretation.js";
