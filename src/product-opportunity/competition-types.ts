export type CompetitionMarketSignalKind =
  | "NICHE_PRODUCT_COUNT"
  | "TOP_CLICK_PRODUCT_COUNT"
  | "SELLER_COUNT"
  | "SPONSORED_PRODUCT_SHARE"
  | "PRIME_OFFER_SHARE"
  | "OUT_OF_STOCK_RATE";

export type CompetitionMarketUnit =
  | "COUNT"
  | "PERCENT";

export type CompetitionMarketSourceType =
  | "MARKETPLACE"
  | "FIRST_PARTY"
  | "OTHER";

export type CompetitionAcquisitionMethod =
  | "AUTHORIZED_API"
  | "AUTHORIZED_EXPORT"
  | "CSV_IMPORT"
  | "HTML_SNAPSHOT"
  | "MANUAL_CAPTURE";

export type CompetitionMarketObservation =
  Readonly<{
    id: string;
    candidateId: string;
    sourceId: string;

    sourceType:
      CompetitionMarketSourceType;

    acquisitionMethod:
      CompetitionAcquisitionMethod;

    signal:
      CompetitionMarketSignalKind;

    value: number;

    unit:
      CompetitionMarketUnit;

    geography: string;

    periodStart: string;
    periodEnd: string;
    capturedAt: string;

    sourceUrl: string;

    verified: boolean;
  }>;

export type CompetitionFreshness =
  | "FRESH"
  | "AGING"
  | "STALE";

export type CompetitionFreshnessPolicy =
  Readonly<{
    freshDays: number;
    staleDays: number;
  }>;

export type CompetitionObservationAssessment =
  Readonly<{
    observation:
      CompetitionMarketObservation;

    freshness:
      CompetitionFreshness;

    ageDays:
      number;
  }>;
