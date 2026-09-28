export type OpportunityDecision =
  | "VALIDATE"
  | "HOLD"
  | "REJECT";

import type {
  CompetitionSufficiency,
} from "./competition-interpretation.js";

import type {
  DemandSufficiency,
} from "./demand-interpretation.js";

import type {
  MarketValidationStatus,
} from "./market-validation.js";

export type OpportunityGateStatus =
  | "PASS"
  | "WARN"
  | "HOLD"
  | "REJECT";

export type OpportunityGateCode =
  | "DEMAND_VERIFIED"
  | "COMPETITOR_SAMPLE"
  | "MARKET_VALIDATION"
  | "CUSTOMER_EVIDENCE"
  | "ECONOMICS"
  | "SUPPLIER_VERIFIED"
  | "SUPPLIER_CONFLICT"
  | "EVIDENCE_PROVENANCE"
  | "EVIDENCE_CONFLICT"
  | "UNSUPPORTED_CLAIMS";

export type DemandEvidence = Readonly<{
  verified: boolean;

  independentSourceCount:
    number;

  normalizedTrendIndex:
    number | null;

  trendGrowthPercent:
    number | null;

  seasonality:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "UNKNOWN";
}>;

export type CompetitionEvidence =
  Readonly<{
    competitorCount:
      number;

    comparableCompetitorCount:
      number;

    medianPrice:
      number | null;

    medianReviewCount:
      number | null;
  }>;

export type EconomicsEvidence =
  Readonly<{
    sellingPrice:
      number | null;

    landedCost:
      number | null;

    contributionBeforeAds:
      number | null;

    contributionAfterAds:
      number | null;

    contributionMarginPercent:
      number | null;

    breakEvenCpa:
      number | null;
  }>;

export type CustomerEvidence =
  Readonly<{
    reviewCount:
      number;

    recurringPainPointCount:
      number;
  }>;

export type SupplierEvidence =
  Readonly<{
    supplierCount:
      number;

    verifiedSupplierCount:
      number;

    criticalConflictCount:
      number;
  }>;

export type OpportunityEvidenceQuality =
  Readonly<{
    totalSourceCount:
      number;

    verifiedSourceCount:
      number;

    criticalConflictCount:
      number;

    unsupportedClaimCount:
      number;
  }>;

export type OpportunityMarketValidationEvidence =
  Readonly<{
    status:
      MarketValidationStatus;

    demandSufficiency:
      DemandSufficiency;

    competitionSufficiency:
      CompetitionSufficiency;
  }>;

export type ProductOpportunityInput =
  Readonly<{
    candidateId:
      string;

    demand:
      DemandEvidence;

    competition:
      CompetitionEvidence;

    economics:
      EconomicsEvidence;

    customer:
      CustomerEvidence;

    supplier:
      SupplierEvidence;

    evidence:
      OpportunityEvidenceQuality;

    marketValidation?:
      OpportunityMarketValidationEvidence;
  }>;

export type OpportunityGate =
  Readonly<{
    code:
      OpportunityGateCode;

    status:
      OpportunityGateStatus;

    message:
      string;
  }>;

export type ProductOpportunityDecision =
  Readonly<{
    candidateId:
      string;

    contractVersion:
      "1.0.0" | "1.1.0";

    decision:
      OpportunityDecision;

    gates:
      readonly OpportunityGate[];

    policies: Readonly<{
      normalizedTrendMeaning:
        "RELATIVE_INTEREST_ONLY";

      competitorPercentageMeaning:
        "SAMPLED_COMPETITOR_PENETRATION_ONLY";

      outcomeMeaning:
        "VALIDATION_GUIDANCE_NOT_GUARANTEE";
    }>;
  }>;
