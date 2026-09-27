import type { AiProvider } from "../ai/provider.js";
import type { Product } from "../domain/product.js";
import type { ProductResearchContext } from "../research/types.js";
import type { ContentIntelligenceProductBrainContext } from "../content-intelligence/product-brain-context.js";
import { findGroundingIssues } from "./grounding.js";
import type { ProductBrain } from "./types.js";
import { validateProductBrain } from "./validation.js";
import { productBrainJsonSchema } from "./schema.js";

const systemPrompt = `You are an ecommerce product strategist. Return JSON only. Do not invent product specifications, certifications, guarantees, performance claims, medical claims, or discounts that are not present in the supplied product data.`;

function buildPrompt(
  product: Product,
  research?: ProductResearchContext,
  contentIntelligence?: ContentIntelligenceProductBrainContext,
): string {
  const researchSection = research
    ? `

Research context (market/customer evidence only; do not convert competitor claims into facts about this product):
${JSON.stringify(research, null, 2)}`
    : "";

  const contentSection = contentIntelligence
    ? `

Content Intelligence context (messaging signals only; never treat this section as product evidence):
${JSON.stringify(contentIntelligence, null, 2)}

Content Intelligence may inform audience wording, pain framing, objections, buying triggers, hook categories, structure, topic, format, and CTA direction.
It must not establish product features, benefits, specifications, certifications, guarantees, performance claims, prices, discounts, or medical claims.
Product JSON remains the sole source of factual product claims.
Observed content performance is descriptive and does not establish causality.`
    : "";

  return `Analyze this ecommerce product and return a structured product brain with exactly these keys:
audiences, painPoints, benefits, objections, buyingTriggers, angles, offerPositioning.

angles must be an array with at least 3 objects containing name, hook, reason.
All other plural fields must be non-empty arrays of strings.
Use research only to inform audience language, objections, and positioning hypotheses.
Never treat competitor features, review claims, market prices, or seller economics as specifications or guarantees of this product.

Product JSON:
${JSON.stringify(product, null, 2)}${researchSection}${contentSection}`;
}

function inspectBrain(product: Product, raw: unknown): { brain: ProductBrain | null; issues: readonly string[] } {
  const validation = validateProductBrain(raw);
  if (!validation.ok) return { brain: null, issues: validation.issues };

  const grounding = findGroundingIssues(product, validation.brain);
  if (grounding.length > 0) {
    return { brain: null, issues: grounding.map((issue) => issue.message) };
  }
  return { brain: validation.brain, issues: [] };
}

export class ProductBrainValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`AI product brain failed validation: ${issues.join("; ")}`);
    this.name = "ProductBrainValidationError";
    this.issues = issues;
  }
}

export async function generateProductBrain(
  product: Product,
  provider: AiProvider,
  research?: ProductResearchContext,
  contentIntelligence?: ContentIntelligenceProductBrainContext,
): Promise<ProductBrain> {
  const first = await provider.generateJson({
    system: systemPrompt,
    prompt: buildPrompt(product, research, contentIntelligence),
    temperature: 0.2,
    schema: productBrainJsonSchema,
  });
  const firstInspection = inspectBrain(product, first);
  if (firstInspection.brain) return firstInspection.brain;

  const repaired = await provider.generateJson({
    system: systemPrompt,
    prompt: `${buildPrompt(product, research, contentIntelligence)}\n\nYour previous JSON failed validation for these reasons:\n- ${firstInspection.issues.join("\n- ")}\n\nReturn a corrected JSON object only. Do not add unsupported claims.`,
    temperature: 0.1,
    schema: productBrainJsonSchema,
  });
  const secondInspection = inspectBrain(product, repaired);
  if (secondInspection.brain) return secondInspection.brain;

  throw new ProductBrainValidationError(secondInspection.issues);
}
