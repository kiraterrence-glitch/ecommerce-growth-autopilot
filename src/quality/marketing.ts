import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";
import type { AmazonListingDraft } from "../campaign/amazon.js";
import type { EmailCampaignDraft } from "../campaign/email.js";
import type { GoogleAdsDraft } from "../campaign/google.js";
import type { MetaCampaignDraft } from "../campaign/meta.js";
import type { ShopifyLandingPageDraft } from "../campaign/shopify.js";
import type { StaticCreativeDraft } from "../creatives/static.js";
import type { VideoStoryboardDraft } from "../creatives/video.js";

export type MarketingQualitySeverity = "error" | "warning";
export type MarketingQualityIssue = Readonly<{
  severity: MarketingQualitySeverity;
  code: string;
  path: string;
  message: string;
}>;

export type MarketingQualityInput = Readonly<{
  product: Product;
  brain: ProductBrain;
  meta: MetaCampaignDraft;
  email: EmailCampaignDraft;
  shopify: ShopifyLandingPageDraft;
  googleAds: GoogleAdsDraft;
  amazon: AmazonListingDraft | null;
  creatives: readonly StaticCreativeDraft[];
  videoStoryboard: VideoStoryboardDraft;
}>;

export type MarketingQualityReport = Readonly<{
  passed: boolean;
  errors: number;
  warnings: number;
  checks: readonly string[];
  issues: readonly MarketingQualityIssue[];
}>;

const internalInstructionFragments = [
  "without inventing",
  "supplied offer",
  "supplied discount",
  "supplied product",
  "position the",
  "review the product details",
  "product image placeholder",
  "verified_review_or_testimonial_placeholder",
  "shopify_product_cta",
];

function textIssue(path: string, value: string): MarketingQualityIssue[] {
  const lower = value.toLowerCase();
  return internalInstructionFragments
    .filter((fragment) => lower.includes(fragment))
    .map((fragment) => ({
      severity: "error" as const,
      code: "internal_instruction_leak",
      path,
      message: `Customer-facing content contains internal instruction text: ${fragment}`,
    }));
}

function countDistinct(values: readonly string[]): number {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)).size;
}

function pushTextIssues(issues: MarketingQualityIssue[], path: string, value: string): void {
  issues.push(...textIssue(path, value));
}

export function assessMarketingQuality(input: MarketingQualityInput): MarketingQualityReport {
  const issues: MarketingQualityIssue[] = [];

  pushTextIssues(issues, "brain.offerPositioning", input.brain.offerPositioning);

  const audienceDiversity = countDistinct(input.meta.ads.map((ad) => ad.audienceHypothesis));
  const expectedAudienceDiversity = Math.min(3, Math.max(1, input.product.audiences.length));
  if (audienceDiversity < expectedAudienceDiversity) {
    issues.push({
      severity: "error",
      code: "meta_audience_repetition",
      path: "meta.ads",
      message: `Meta drafts use ${audienceDiversity} distinct audience hypothesis(es); expected at least ${expectedAudienceDiversity}`,
    });
  }
  if (countDistinct(input.meta.ads.map((ad) => ad.primaryText)) !== input.meta.ads.length) {
    issues.push({
      severity: "error",
      code: "meta_variant_duplication",
      path: "meta.ads",
      message: "Meta ad primary text variants must be distinct",
    });
  }
  input.meta.ads.forEach((ad, index) => {
    pushTextIssues(issues, `meta.ads[${index}].primaryText`, ad.primaryText);
    pushTextIssues(issues, `meta.ads[${index}].creativeBrief`, ad.creativeBrief);
  });

  const expectedCtas: Readonly<Record<string, readonly string[]>> = {
    launch: ["Shop now", "View product"],
    abandoned_cart: ["Return to cart", "View product"],
    post_purchase: ["View order", "Read product guide", "Share feedback"],
    win_back: ["View product", "See current offer"],
  };
  input.email.emails.forEach((email, index) => {
    pushTextIssues(issues, `email.emails[${index}].subject`, email.subject);
    pushTextIssues(issues, `email.emails[${index}].previewText`, email.previewText);
    pushTextIssues(issues, `email.emails[${index}].body`, email.body);
    const allowed = expectedCtas[email.sequence] ?? [];
    if (!allowed.includes(email.ctaText)) {
      issues.push({
        severity: "error",
        code: "email_wrong_lifecycle_cta",
        path: `email.emails[${index}].ctaText`,
        message: `${email.sequence} email uses inappropriate CTA: ${email.ctaText}`,
      });
    }
  });

  input.shopify.sections.forEach((section, index) => {
    pushTextIssues(issues, `shopify.sections[${index}].body`, section.body);
    if (/\[[A-Z0-9_]+\]/.test(section.body)) {
      issues.push({
        severity: "error",
        code: "shopify_placeholder_leak",
        path: `shopify.sections[${index}].body`,
        message: "Shopify portfolio output contains an unresolved placeholder token",
      });
    }
    if (section.type === "faq" && (!section.body.includes("Q:") || !section.body.includes("A:"))) {
      issues.push({
        severity: "error",
        code: "shopify_faq_missing_answer",
        path: `shopify.sections[${index}].body`,
        message: "FAQ content must contain both questions and answers",
      });
    }
  });

  const awkwardTerminalWords = new Set(["a", "an", "and", "at", "does", "for", "from", "in", "not", "of", "on", "or", "that", "the", "to", "with"]);
  const endsAwkwardly = (value: string): boolean => {
    const last = value.trim().toLowerCase().replace(/[^a-z]+$/g, "").split(/\s+/).at(-1) ?? "";
    return awkwardTerminalWords.has(last);
  };

  input.googleAds.adGroups.forEach((group, groupIndex) => {
    if (countDistinct(group.headlines) !== group.headlines.length) {
      issues.push({
        severity: "error",
        code: "google_duplicate_headlines",
        path: `googleAds.adGroups[${groupIndex}].headlines`,
        message: "Google ad group headlines must be distinct",
      });
    }
    [...group.headlines, ...group.descriptions].forEach((value, valueIndex) => {
      if (value.includes("…")) {
        issues.push({
          severity: "error",
          code: "google_automatic_ellipsis",
          path: `googleAds.adGroups[${groupIndex}].copy[${valueIndex}]`,
          message: "Google copy must be rewritten to fit rather than automatically truncated with an ellipsis",
        });
      }
      if (endsAwkwardly(value)) {
        issues.push({
          severity: "error",
          code: "google_incomplete_copy",
          path: `googleAds.adGroups[${groupIndex}].copy[${valueIndex}]`,
          message: "Google copy ends on an incomplete connector word",
        });
      }
      pushTextIssues(issues, `googleAds.adGroups[${groupIndex}].copy[${valueIndex}]`, value);
    });
  });

  if (input.amazon) {
    if (input.amazon.title.trim().toLowerCase() === input.product.title.trim().toLowerCase()) {
      issues.push({
        severity: "warning",
        code: "amazon_title_underoptimized",
        path: "amazon.title",
        message: "Amazon title does not add a grounded product feature or use-case descriptor",
      });
    }
    input.amazon.bullets.forEach((bullet, index) => pushTextIssues(issues, `amazon.bullets[${index}]`, bullet));
  }

  input.creatives.forEach((creative, index) => {
    if (/placeholder/i.test(creative.svg)) {
      issues.push({
        severity: "error",
        code: "creative_placeholder_leak",
        path: `creatives[${index}].svg`,
        message: "Creative export still contains visible placeholder language",
      });
    }
  });

  input.videoStoryboard.scenes.forEach((scene, index) => {
    pushTextIssues(issues, `videoStoryboard.scenes[${index}].onScreenText`, scene.onScreenText);
  });

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return {
    passed: errors === 0,
    errors,
    warnings,
    checks: [
      "internal prompt leakage",
      "Meta audience and variant diversity",
      "email lifecycle CTA correctness",
      "Shopify FAQ and placeholder completeness",
      "Google copy fit and uniqueness",
      "Amazon listing completeness",
      "creative placeholder leakage",
      "video customer-facing copy safety",
    ],
    issues,
  };
}
