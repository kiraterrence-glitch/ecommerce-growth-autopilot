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
