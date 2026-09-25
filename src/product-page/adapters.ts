import type { Product } from "../domain/product.js";
import type {
  GemPagesManifest,
  ProductPageBrief,
  ProductPageMediaAsset,
  ProductPageShopifyDraft,
} from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function handleize(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "product"
  );
}

export function buildProductPageMediaPlan(
  product: Product,
): readonly ProductPageMediaAsset[] {
  const firstImage = product.imageUrls[0] ?? null;
  const secondImage = product.imageUrls[1] ?? null;

  return [
    {
      id: "page-hero-image",
      type: "image",
      purpose: "Hero product image",
      status: firstImage ? "AVAILABLE" : "NEEDS_SOURCE",
      sourceUrl: firstImage,
    },
    {
      id: "page-detail-image",
      type: "image",
      purpose: "Product detail image",
      status: secondImage ? "AVAILABLE" : "NEEDS_SOURCE",
      sourceUrl: secondImage,
    },
    {
      id: "page-benefit-graphic",
      type: "image",
      purpose: "Grounded benefit graphic",
      status: firstImage ? "READY_TO_RENDER" : "NEEDS_SOURCE",
      sourceUrl: firstImage,
    },
    {
      id: "page-comparison-graphic",
      type: "image",
      purpose: "Neutral comparison graphic",
      status: firstImage ? "READY_TO_RENDER" : "NEEDS_SOURCE",
      sourceUrl: firstImage,
    },
    {
      id: "page-demo-gif",
      type: "gif",
      purpose: "Short product demonstration",
      status: "NEEDS_SOURCE",
      sourceUrl: null,
    },
    {
      id: "page-demo-video",
      type: "video",
      purpose: "Short vertical product demonstration",
      status: "NEEDS_SOURCE",
      sourceUrl: null,
    },
  ];
}

export function buildProductPageShopifyDraft(
  product: Product,
  brief: ProductPageBrief,
  mediaPlan: readonly ProductPageMediaAsset[],
): ProductPageShopifyDraft {
  const descriptionHtml = brief.sections
    .map(
      (section) =>
        `<section data-type="${section.type}"><h2>${escapeHtml(section.headline)}</h2><p>${escapeHtml(section.body)}</p></section>`,
    )
    .join("\n");

  return {
    channel: "shopify",
    status: "DRAFT",
    externalWrite: false,
    handle: handleize(product.title),
    title: product.title,
    descriptionHtml,
    sections: brief.sections,
    mediaSlots: mediaPlan,
    variants: [],
    variantStatus: "NEEDS_SOURCE",
    tags: ["product-page-draft", "human-review-required"],
    seo: {
      title: brief.seoTitle,
      description: brief.seoDescription,
    },
    metafields: {
      "custom.product_page_status": "draft",
      "custom.external_write": "false",
      "custom.human_review_required": "true",
    },
  };
}

export function buildGemPagesManifest(
  brief: ProductPageBrief,
): GemPagesManifest {
  return {
    status: "DRAFT",
    externalWrite: false,
    blocks: brief.sections.map((section) => ({
      blockType: section.type,
      content: {
        objective: section.objective,
        headline: section.headline,
        body: section.body,
        recommendedVisual: section.recommendedVisual,
      },
    })),
  };
}
