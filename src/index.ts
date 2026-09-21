export type {
  CurrencyCode,
  Offer,
  Product,
  ProductValidationIssue,
  ProductValidationResult,
  SalesChannels,
} from "./domain/product.js";
export { validateProduct } from "./validation/product.js";
export { normalizeProduct } from "./product-engine/normalize.js";
export { getProductFingerprint, getProductId } from "./product-engine/identity.js";
export { ProductRegistry } from "./product-engine/registry.js";
export type { ProductRecord, RegisterProductResult } from "./product-engine/registry.js";
export { importProductsFromCsv } from "./product-engine/csv.js";
export type { ProductCsvImportResult, ProductImportRowResult } from "./product-engine/csv.js";
export type { AiGenerateRequest, AiProvider } from "./ai/provider.js";
export { MockAiProvider } from "./ai/mock-provider.js";
export { OllamaProvider, OllamaProviderError } from "./ai/ollama-provider.js";
export type { OllamaProviderErrorCode, OllamaProviderOptions } from "./ai/ollama-provider.js";
export type { MarketingAngle, ProductBrain, ProductBrainValidationResult } from "./product-brain/types.js";
export { validateProductBrain } from "./product-brain/validation.js";
export { generateProductBrain, ProductBrainValidationError } from "./product-brain/service.js";

export { findGroundingIssues } from "./product-brain/grounding.js";
export type { GroundingIssue } from "./product-brain/grounding.js";

export type { AuditEvent, AuditStatus, AuditStore } from "./audit/types.js";
export type { MetaAdDraft, MetaCampaignDraft } from "./campaign/meta.js";
export { buildMetaCampaignDraft, validateMetaCampaignDraft } from "./campaign/meta.js";

export type { EmailCampaignDraft, EmailDraft, EmailSequenceName } from "./campaign/email.js";
export { buildEmailCampaignDraft, validateEmailCampaignDraft } from "./campaign/email.js";
export type { ShopifyLandingPageDraft, ShopifySection, ShopifySectionType } from "./campaign/shopify.js";
export { buildShopifyLandingPageDraft, validateShopifyLandingPageDraft } from "./campaign/shopify.js";
export type { GoogleAdGroupDraft, GoogleAdsDraft } from "./campaign/google.js";
export { buildGoogleAdsDraft, validateGoogleAdsDraft } from "./campaign/google.js";
export type { AmazonListingDraft } from "./campaign/amazon.js";
export { buildAmazonListingDraft, validateAmazonListingDraft } from "./campaign/amazon.js";

export type { StaticCreativeDraft, StaticCreativeFormat } from "./creatives/static.js";
export { buildStaticCreativeDrafts, validateStaticCreativeDrafts } from "./creatives/static.js";
export type { VideoSceneDraft, VideoStoryboardDraft } from "./creatives/video.js";
export { buildVideoStoryboardDraft, validateVideoStoryboardDraft } from "./creatives/video.js";
export type { ApprovalRecord, ApprovalStatus } from "./approval/workflow.js";
export { canPublish, transitionApproval } from "./approval/workflow.js";
export type { CampaignMetrics, CampaignMetricsInput, OptimizationRecommendation } from "./optimization/rules.js";
export { calculateCampaignMetrics, recommendOptimization } from "./optimization/rules.js";
export type {
  MarketingQualityInput,
  MarketingQualityIssue,
  MarketingQualityReport,
  MarketingQualitySeverity,
} from "./quality/marketing.js";
export { assessMarketingQuality } from "./quality/marketing.js";
export { renderCreativeHtml, renderVideoSceneHtml, renderVideoSceneSvg } from "./rendering/html.js";
export { renderDashboardHtml } from "./dashboard/page.js";


export type {
  CompetitorRecord,
  FeatureSignal,
  OfferSignal,
  PriceAnalysis,
  ProductResearchContext,
  ResearchAnalysis,
  ResearchConfidence,
  ResearchFinding,
  ResearchFindingCategory,
  ResearchProject,
  ResearchQualityIssue,
  ResearchQualityReport,
  ResearchSource,
  ResearchSourceType,
  ResearchValidationIssue,
  ResearchValidationResult,
  ReviewEvidence,
  ReviewIntelligence,
  ReviewTheme,
  UnitEconomicsInput,
  UnitEconomicsResult,
} from "./research/types.js";
export { validateResearchProject } from "./research/validation.js";
export { normalizeResearchProject } from "./research/normalize.js";
export { calculateUnitEconomics } from "./research/economics.js";
export { analyzeReviewThemes, confidenceFromCount } from "./research/reviews.js";
export { generateReviewIntelligence, validateReviewIntelligence } from "./research/review-ai.js";
export { analyzeResearchProject, createProductResearchContext } from "./research/analysis.js";
export { assessResearchQuality } from "./research/quality.js";
export { importCompetitorsFromCsv, importReviewsFromCsv } from "./research/csv.js";
export type {
  CompetitorCsvImportResult,
  CompetitorImportRowResult,
  ReviewCsvImportResult,
  ReviewImportRowResult,
} from "./research/csv.js";

export type { ProjectHistoryEvent, ProjectHistoryEventType, CampaignHistorySummary } from "./history/types.js";
export type { DeliveryAdapter, DeliveryArtifact, DeliveryChannel, DeliveryMode, DeliveryRequest, DeliveryResult, DeliveryStatus } from "./publishing/types.js";
export { DeliveryBlockedError, assertDeliveryChannel, assertDeliveryMode, createLocalDeliveryAdapter, getDeliveryCapabilities } from "./publishing/adapters.js";
export type { DeliverableCampaignKit, ChannelDeliveryPlan } from "./publishing/plan.js";
export { buildChannelDeliveryPlan } from "./publishing/plan.js";
export type { DemoStatusInput, DemoStepStatus, DemoTimelineStep } from "./demo/status.js";
export { buildDemoStatus } from "./demo/status.js";
export { assertLocalN8nBaseUrl, buildLocalN8nWebhookUrl } from "./orchestration/local-n8n.js";
