import type { CurrencyCode } from "../domain/product.js";

export type ResearchSourceType =
  | "manual"
  | "csv"
  | "public_page"
  | "review_import"
  | "seller_input"
  | "demand_data";

export type ResearchSource = Readonly<{
  id: string;
  type: ResearchSourceType;
  label: string;
  capturedAt: string;
  sourceUrl: string | null;
}>;

export type CompetitorRecord = Readonly<{
  id: string;
  title: string;
  price: number;
  currency: CurrencyCode;
  rating: number | null;
  reviewCount: number | null;
  features: readonly string[];
  offer: string | null;
  sourceId: string;
  capturedAt: string;
}>;

export type ReviewEvidence = Readonly<{
  id: string;
  competitorId: string | null;
  rating: number | null;
  text: string;
  sourceId: string;
  capturedAt: string;
}>;

export type UnitEconomicsInput = Readonly<{
  sellingPrice: number;
  cogs: number;
  shippingCost: number;
  marketplaceFees: number;
  paymentFees: number;
  discountAmount: number;
  adAllowance: number;
}>;

export type ResearchProject = Readonly<{
  id: string;
  query: string;
  targetMarketplace: "amazon_us" | "amazon_au" | "shopify" | "other";
  currency: CurrencyCode;
  sources: readonly ResearchSource[];
  competitors: readonly CompetitorRecord[];
  reviews: readonly ReviewEvidence[];
  economics: UnitEconomicsInput | null;
}>;

export type ResearchValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type ResearchValidationResult =
  | Readonly<{ ok: true; project: ResearchProject }>
  | Readonly<{ ok: false; issues: readonly ResearchValidationIssue[] }>;

export type PriceAnalysis = Readonly<{
  sampleSize: number;
  min: number | null;
  median: number | null;
  max: number | null;
  average: number | null;
}>;

export type FeatureSignal = Readonly<{
  feature: string;
  count: number;
  share: number;
  competitorIds: readonly string[];
}>;

export type OfferSignal = Readonly<{
  offer: string;
  count: number;
  competitorIds: readonly string[];
}>;

export type ResearchConfidence = "low" | "medium" | "high";

export type ReviewTheme = Readonly<{
  label: string;
  category: "pain_point" | "desired_outcome" | "objection" | "feature_request";
  evidenceIds: readonly string[];
  mentionCount: number;
  confidence: ResearchConfidence;
}>;

export type ReviewIntelligence = Readonly<{
  themes: readonly ReviewTheme[];
}>;

export type UnitEconomicsResult = Readonly<{
  sellingPrice: number;
  revenueAfterDiscount: number;
  cogs: number;
  shippingCost: number;
  marketplaceFees: number;
  paymentFees: number;
  contributionBeforeAds: number;
  adAllowance: number;
  contributionAfterAds: number;
  contributionMarginPercent: number;
  breakEvenCpa: number;
}>;

export type ResearchFindingCategory =
  | "price_signal"
  | "feature_signal"
  | "offer_pattern"
  | "pain_point"
  | "desired_outcome"
  | "objection"
  | "feature_request"
  | "economics"
  | "demand_signal";

export type ResearchFinding = Readonly<{
  id: string;
  category: ResearchFindingCategory;
  statement: string;
  confidence: ResearchConfidence;
  evidenceIds: readonly string[];
  sourceIds: readonly string[];
  evidenceCount: number;
}>;

export type ResearchAnalysis = Readonly<{
  projectId: string;
  query: string;
  targetMarketplace: ResearchProject["targetMarketplace"];
  currency: CurrencyCode;
  competitorCount: number;
  reviewCount: number;
  price: PriceAnalysis;
  features: readonly FeatureSignal[];
  offers: readonly OfferSignal[];
  reviewIntelligence: ReviewIntelligence;
  economics: UnitEconomicsResult | null;
  findings: readonly ResearchFinding[];
  dataConfidence: ResearchConfidence;
  limitations: readonly string[];
}>;

export type ResearchQualityIssue = Readonly<{
  code: string;
  severity: "error" | "warning";
  message: string;
}>;

export type ResearchQualityReport = Readonly<{
  passed: boolean;
  errors: number;
  warnings: number;
  issues: readonly ResearchQualityIssue[];
  checks: readonly string[];
}>;

export type ProductResearchContext = Readonly<{
  sampleSize: number;
  priceBand: Readonly<{ min: number | null; median: number | null; max: number | null }>;
  topFeatures: readonly string[];
  topPainPoints: readonly string[];
  topDesiredOutcomes: readonly string[];
  topObjections: readonly string[];
  economics: UnitEconomicsResult | null;
  limitations: readonly string[];
}>;
