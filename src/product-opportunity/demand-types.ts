export type DemandSignalKind =
  | "SEARCH_INTEREST_RELATIVE"
  | "SEARCH_VOLUME_ABSOLUTE"
  | "PURCHASE_COUNT"
  | "UNITS_SOLD"
  | "REVENUE"
  | "CONVERSION_RATE"
  | "RETURN_RATE"
  | "SOCIAL_INTEREST_RELATIVE";

export type DemandMeasurementUnit =
  | "INDEX_0_100"
  | "COUNT"
  | "CURRENCY"
  | "PERCENT";

export type DemandSourceType =
  | "GOOGLE_TRENDS"
  | "MARKETPLACE"
  | "FIRST_PARTY"
  | "SOCIAL_PLATFORM"
  | "OTHER";

export type DemandAcquisitionMethod =
  | "AUTHORIZED_API"
  | "AUTHORIZED_EXPORT"
  | "CSV_IMPORT"
  | "HTML_SNAPSHOT"
  | "MANUAL_CAPTURE";

export type DemandObservation =
  Readonly<{
    id: string;
    candidateId: string;

    sourceId: string;
    sourceType: DemandSourceType;
    acquisitionMethod: DemandAcquisitionMethod;

    signal: DemandSignalKind;

    value: number;
    unit: DemandMeasurementUnit;

    /**
     * Required only for REVENUE.
     */
    currency: string | null;

    geography: string;

    periodStart: string;
    periodEnd: string;
    capturedAt: string;

    sourceUrl: string;

    verified: boolean;
  }>;

export type DemandFreshness =
  | "FRESH"
  | "AGING"
  | "STALE";

export type DemandFreshnessPolicy =
  Readonly<{
    freshDays: number;
    staleDays: number;
  }>;

export type DemandObservationAssessment =
  Readonly<{
    observation: DemandObservation;
    freshness: DemandFreshness;
    ageDays: number;
  }>;
