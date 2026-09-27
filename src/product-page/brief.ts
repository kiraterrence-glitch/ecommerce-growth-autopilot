import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";
import type {
  ProductPageBrief,
  ProductPageSectionBrief,
  SpecificationVerification,
  VerifiedSpecificationSummary,
} from "./types.js";

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function clip(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maximum) return normalized;

  return `${normalized.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}

function offerText(product: Product): string {
  if (product.offer.type === "percentage") {
    return `${product.offer.value}% off the listed product price`;
  }

  if (product.offer.type === "fixed") {
    return `${product.currency} ${product.offer.value} off the listed product price`;
  }

  return `Listed price: ${product.currency} ${product.price}`;
}

export function buildProductPageBrief(
  product: Product,
  brain: ProductBrain,
  verification: SpecificationVerification,
): ProductPageBrief {
  if (verification.unresolvedCriticalFields.length > 0) {
    throw new Error("critical product specifications still need verification");
  }

  const verifiedSpecifications: VerifiedSpecificationSummary[] =
    verification.specifications
      .filter(
        (specification) =>
          specification.status === "VERIFIED" &&
          specification.value !== null,
      )
      .map((specification) => ({
        field: specification.field,
        value: specification.value ?? "",
        sourceIds: unique(
          specification.observations.map(
            (observation) => observation.sourceId,
          ),
        ),
      }));

  const specificationEvidence = unique(
    verifiedSpecifications.flatMap(
      (specification) => specification.sourceIds,
    ),
  );

  const verifiedFacts =
    verifiedSpecifications.length > 0
      ? verifiedSpecifications
          .map(
            (specification) =>
              `${specification.field}: ${specification.value}`,
          )
          .join(" • ")
      : "Use only the validated product information supplied for this draft.";

  const primaryBenefit =
    brain.benefits[0] ?? product.benefits[0] ?? product.description;

  const primaryHook =
    brain.angles[0]?.hook ?? product.description;

  const sections: ProductPageSectionBrief[] = [
    {
      type: "hero",
      objective: "Explain the product and primary value quickly.",
      headline: product.title,
      body: `${primaryHook}. ${primaryBenefit}.`,
      evidenceIds: specificationEvidence,
      recommendedVisual: "Clean hero product image.",
    },
    {
      type: "problem",
      objective: "Frame customer problems without inventing product facts.",
      headline: "Why shoppers may be looking for a better option",
      body: brain.painPoints.join(" • "),
      evidenceIds: [],
      recommendedVisual: "Use-case visual.",
    },
    {
      type: "benefits",
      objective: "Present grounded customer-facing benefits.",
      headline: "What this product is designed to help with",
      body: brain.benefits.join(" • "),
      evidenceIds: specificationEvidence,
      recommendedVisual: "Benefit graphic using only grounded claims.",
    },
    {
      type: "demo",
      objective: "Plan a product demonstration.",
      headline: "See the product in use",
      body: `Demonstrate ${product.title} using only listed features and supplier-provided instructions.`,
      evidenceIds: specificationEvidence,
      recommendedVisual: "Short product demonstration GIF or video.",
    },
    {
      type: "features",
      objective: "Present validated product facts.",
      headline: "Product details",
      body: `${product.features.join(" • ")}${verifiedSpecifications.length > 0 ? ` • ${verifiedFacts}` : ""}`,
      evidenceIds: specificationEvidence,
      recommendedVisual: "Annotated detail image.",
    },
    {
      type: "comparison",
      objective: "Help shoppers compare criteria without unsupported claims.",
      headline: "Compare the details that matter",
      body: `Compare specifications, included features, price, and intended use case. No superiority claim is inferred. ${verifiedFacts}`,
      evidenceIds: specificationEvidence,
      recommendedVisual: "Neutral comparison table.",
    },
    {
      type: "use_cases",
      objective: "Connect the product to validated audience contexts.",
      headline: "Designed around practical use cases",
      body: brain.audiences.join(" • "),
      evidenceIds: specificationEvidence,
      recommendedVisual: "Audience-specific use-case image.",
    },
    {
      type: "objections",
      objective: "Address purchase considerations honestly.",
      headline: "Things to consider before ordering",
      body: brain.objections.join(" • "),
      evidenceIds: specificationEvidence,
      recommendedVisual: null,
    },
    {
      type: "faq",
      objective: "Answer common purchase questions with grounded information.",
      headline: "Questions before buying",
      body: `Who is it for? ${brain.audiences.join(", ")}. Review listed features, specifications, sizing, compatibility, package contents, shipping, and return terms before publication.`,
      evidenceIds: specificationEvidence,
      recommendedVisual: null,
    },
    {
      type: "offer",
      objective: "Present supplied pricing only.",
      headline: "Current product offer",
      body: offerText(product),
      evidenceIds: [],
      recommendedVisual: "Simple offer callout.",
    },
    {
      type: "shipping_returns",
      objective: "Reserve space for merchant fulfillment information.",
      headline: "Shipping and returns",
      body: "Connect the live merchant shipping and returns policy before publication. This draft does not invent fulfillment terms.",
      evidenceIds: [],
      recommendedVisual: null,
    },
    {
      type: "cta",
      objective: "Provide a clear next step without live publishing.",
      headline: `Review ${product.title}`,
      body: "Review product details, specifications, offer, and merchant terms before publication.",
      evidenceIds: specificationEvidence,
      recommendedVisual: "Product image beside the final CTA.",
    },
  ];

  return {
    status: "DRAFT",
    productTitle: product.title,
    primaryAngle: brain.angles[0]?.name ?? "Product fit",
    targetAudiences: brain.audiences,
    customerProblems: brain.painPoints,
    desiredOutcomes: brain.benefits,
    objections: brain.objections,
    buyingTriggers: brain.buyingTriggers,
    verifiedSpecifications,
    sections,
    seoTitle: clip(`${product.title} | Product Details`, 60),
    seoDescription: clip(
      `${product.description} ${primaryBenefit}`,
      155,
    ),
  };
}
