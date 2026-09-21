import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";

export type ShopifySectionType =
  | "hero"
  | "problem"
  | "benefits"
  | "features"
  | "how_it_works"
  | "social_proof"
  | "offer"
  | "faq"
  | "shipping_returns"
  | "cta";

export type ShopifySection = Readonly<{ type: ShopifySectionType; heading: string; body: string }>;
export type ShopifyLandingPageDraft = Readonly<{
  channel: "shopify";
  status: "DRAFT";
  slug: string;
  title: string;
  sections: readonly ShopifySection[];
  html: string;
}>;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "product";
}

function offerText(product: Product): string {
  if (product.offer.type === "percentage") return `${product.offer.value}% off the current product price`;
  if (product.offer.type === "fixed") return `${product.currency} ${product.offer.value} off the current product price`;
  return `${product.currency} ${product.price}`;
}

function faqBody(product: Product, brain: ProductBrain): string {
  const audience = brain.audiences.length > 0 ? brain.audiences.join(", ") : product.audiences.join(", ");
  const features = product.features.length > 0 ? product.features.join(", ") : product.description;
  const consideration = brain.objections[0] ?? "whether the product fits your use case";
  return [
    `Q: Who is ${product.title} designed for? A: The current product profile targets ${audience}.`,
    `Q: What product details should I compare? A: Key listed features are ${features}.`,
    `Q: What should I consider before buying? A: Consider ${consideration.toLowerCase()} and compare it with your own needs.`,
  ].join(" • ");
}

export function buildShopifyLandingPageDraft(product: Product, brain: ProductBrain): ShopifyLandingPageDraft {
  const sections: ShopifySection[] = [
    { type: "hero", heading: product.title, body: `${brain.angles[0]?.hook ?? product.description}. ${brain.benefits[0] ?? product.description}.` },
    { type: "problem", heading: "Built around real use cases", body: brain.painPoints.join(" • ") },
    { type: "benefits", heading: "Why it may fit your routine", body: brain.benefits.join(" • ") },
    { type: "features", heading: "Product details", body: product.features.join(" • ") },
    { type: "how_it_works", heading: "Before you use it", body: `Review the product instructions, use ${product.title} as directed, and follow the merchant's care guidance.` },
    { type: "social_proof", heading: "Customer proof policy", body: "This demo does not fabricate reviews. Verified customer reviews can be connected before publication." },
    { type: "offer", heading: "Current offer", body: offerText(product) },
    { type: "faq", heading: "Questions before buying", body: faqBody(product, brain) },
    { type: "shipping_returns", heading: "Shipping and returns", body: "Shipping and return terms are merchant-specific and should be connected from the live store before publication." },
    { type: "cta", heading: `Explore ${product.title}`, body: `View the current ${product.title} product page and compare the details with your needs.` },
  ];
  const html = sections
    .map((section) => `<section data-type="${section.type}"><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`)
    .join("\n");
  return { channel: "shopify", status: "DRAFT", slug: slugify(product.title), title: product.title, sections, html };
}

export function validateShopifyLandingPageDraft(draft: ShopifyLandingPageDraft): readonly string[] {
  const issues: string[] = [];
  const required: ShopifySectionType[] = ["hero", "problem", "benefits", "features", "how_it_works", "social_proof", "offer", "faq", "shipping_returns", "cta"];
  if (draft.status !== "DRAFT") issues.push("landing page must remain DRAFT");
  for (const type of required) if (!draft.sections.some((section) => section.type === type)) issues.push(`missing ${type} section`);
  if (/<script\b/i.test(draft.html)) issues.push("landing page HTML must not contain script tags");
  return issues;
}
