export type CampaignMetricsInput = Readonly<{
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  targetCpa?: number;
  targetRoas?: number;
}>;

export type CampaignMetrics = Readonly<{
  ctr: number;
  cpc: number | null;
  conversionRate: number;
  cpa: number | null;
  roas: number | null;
}>;

export type OptimizationRecommendation = Readonly<{
  code: "INSUFFICIENT_DATA" | "CREATIVE_HOOK_TEST" | "LANDING_PAGE_OFFER_TEST" | "CPA_EFFICIENCY_TEST" | "ROAS_EFFICIENCY_TEST" | "CONTROLLED_SCALE_TEST";
  priority: "low" | "medium" | "high";
  reason: string;
  action: string;
}>;

export function calculateCampaignMetrics(input: CampaignMetricsInput): CampaignMetrics {
  if ([input.spend, input.impressions, input.clicks, input.conversions, input.revenue].some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("campaign metrics must be finite non-negative numbers");
  }
  return {
    ctr: input.impressions > 0 ? input.clicks / input.impressions : 0,
    cpc: input.clicks > 0 ? input.spend / input.clicks : null,
    conversionRate: input.clicks > 0 ? input.conversions / input.clicks : 0,
    cpa: input.conversions > 0 ? input.spend / input.conversions : null,
    roas: input.spend > 0 ? input.revenue / input.spend : null,
  };
}

export function recommendOptimization(input: CampaignMetricsInput): OptimizationRecommendation {
  const metrics = calculateCampaignMetrics(input);
  if (input.impressions < 1000 || input.clicks < 20) {
    return { code: "INSUFFICIENT_DATA", priority: "low", reason: "The sample is too small for a confident optimization decision.", action: "Collect more data before changing creative or landing pages." };
  }
  if (metrics.ctr < 0.01) {
    return { code: "CREATIVE_HOOK_TEST", priority: "high", reason: "CTR is below 1%, suggesting the current creative or hook is not earning enough clicks.", action: "Generate and test new hooks/creative variants while keeping the landing page stable." };
  }
  if (metrics.ctr >= 0.015 && metrics.conversionRate < 0.01) {
    return { code: "LANDING_PAGE_OFFER_TEST", priority: "high", reason: "The ad is attracting clicks but fewer than 1% of clicks convert.", action: "Keep the winning ad stable and test landing-page message/offer alignment." };
  }
  if (input.targetCpa !== undefined && metrics.cpa !== null && metrics.cpa > input.targetCpa) {
    return { code: "CPA_EFFICIENCY_TEST", priority: "medium", reason: "CPA is above the supplied target.", action: "Test audience, offer, and conversion-path efficiency before increasing budget." };
  }
  if (input.targetRoas !== undefined && metrics.roas !== null && metrics.roas < input.targetRoas) {
    return { code: "ROAS_EFFICIENCY_TEST", priority: "medium", reason: "ROAS is below the supplied target.", action: "Review margin, offer economics, and conversion quality before scaling." };
  }
  return { code: "CONTROLLED_SCALE_TEST", priority: "low", reason: "No configured guardrail is currently failing.", action: "Run a controlled scale test and keep monitoring efficiency metrics." };
}
