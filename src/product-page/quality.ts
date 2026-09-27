import type { Product } from "../domain/product.js";
import type {
  GemPagesManifest,
  ProductPageBrief,
  ProductPageMediaAsset,
  ProductPageQualityIssue,
  ProductPageQualityReport,
  ProductPageSectionType,
  ProductPageShopifyDraft,
  SpecificationVerification,
  SupplierUrlIntake,
} from "./types.js";

function issue(
  code: string,
  severity: "error" | "warning",
  message: string,
): ProductPageQualityIssue {
  return { code, severity, message };
}

export function assessProductPageQuality(input: Readonly<{
  supplier: SupplierUrlIntake;
  product: Product;
  verification: SpecificationVerification;
  brief: ProductPageBrief;
  mediaPlan: readonly ProductPageMediaAsset[];
  shopifyDraft: ProductPageShopifyDraft;
  gemPagesManifest: GemPagesManifest;
}>): ProductPageQualityReport {
  const issues: ProductPageQualityIssue[] = [];

  if (input.verification.unresolvedCriticalFields.length > 0) {
    issues.push(
      issue(
        "critical_spec_conflict",
        "error",
        `Critical specifications still need verification: ${input.verification.unresolvedCriticalFields.join(", ")}`,
      ),
    );
  }

  const required = new Set<ProductPageSectionType>([
    "hero",
    "problem",
    "benefits",
    "demo",
    "features",
    "comparison",
    "use_cases",
    "objections",
    "faq",
    "offer",
    "shipping_returns",
    "cta",
  ]);

  const present = new Set(
    input.brief.sections.map((section) => section.type),
  );

  for (const section of required) {
    if (!present.has(section)) {
      issues.push(
        issue(
          "missing_section",
          "error",
          `Required section is missing: ${section}`,
        ),
      );
    }
  }

  const copy = input.brief.sections
    .map((section) => `${section.headline} ${section.body}`)
    .join(" ");

  const risky = [
    /\bcures?\b/i,
    /\btreats?\b/i,
    /\bguaranteed\b/i,
    /\bclinically proven\b/i,
    /\b100% effective\b/i,
  ];

  if (risky.some((pattern) => pattern.test(copy))) {
    issues.push(
      issue(
        "unsupported_claim_language",
        "error",
        "Product-page copy contains claim language requiring stronger evidence.",
      ),
    );
  }

  if (input.shopifyDraft.status !== "DRAFT") {
    issues.push(issue("shopify_not_draft", "error", "Shopify output must remain DRAFT."));
  }

  if (input.shopifyDraft.externalWrite !== false) {
    issues.push(issue("shopify_external_write", "error", "Shopify external writes must remain disabled."));
  }

  if (input.gemPagesManifest.externalWrite !== false) {
    issues.push(issue("gempages_external_write", "error", "GemPages external writes must remain disabled."));
  }

  if (input.product.imageUrls.length === 0) {
    issues.push(issue("product_images_missing", "warning", "No product image source is available."));
  }

  if (input.shopifyDraft.variantStatus === "NEEDS_SOURCE") {
    issues.push(issue("variants_need_source", "warning", "Variant details still need a verified source."));
  }

  if (!input.brief.seoTitle || !input.brief.seoDescription) {
    issues.push(issue("seo_missing", "error", "SEO metadata is required."));
  }

  const errors = issues.filter((item) => item.severity === "error").length;
  const warnings = issues.filter((item) => item.severity === "warning").length;

  return {
    passed: errors === 0,
    errors,
    warnings,
    checks: [
      `supplier:${input.supplier.platform}`,
      "critical-specifications",
      "required-sections",
      "unsupported-claims",
      "shopify-draft-only",
      "gempages-draft-only",
      "media-readiness",
      "seo",
    ],
    issues,
  };
}
