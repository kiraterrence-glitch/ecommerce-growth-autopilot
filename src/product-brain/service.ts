import type { AiProvider } from "../ai/provider.js";
import type { Product } from "../domain/product.js";
import type { ProductResearchContext } from "../research/types.js";
import { findGroundingIssues } from "./grounding.js";
import type { ProductBrain } from "./types.js";
import { validateProductBrain } from "./validation.js";

const systemPrompt = `You are an ecommerce product strategist. Return JSON only. Do not invent product specifications, certifications, guarantees, performance claims, medical claims, or discounts that are not present in the supplied product data.`;

function buildPrompt(product: Product, research?: ProductResearchContext): string {
  const researchSection = research
    ? `\n\nResearch context (market/customer evidence only; do not convert competitor claims into facts about this product):\n${JSON.stringify(research, null, 2)}`
    : "";
  return `Analyze this ecommerce product and return a structured product brain with exactly these keys:\naudiences, painPoints, benefits, objections, buyingTriggers, angles, offerPositioning.\n\nangles must be an array with at least 3 objects containing name, hook, reason.\nAll other plural fields must be non-empty arrays of strings.\nUse research only to inform audience language, objections, and positioning hypotheses. Never treat competitor features, review claims, market prices, or seller economics as specifications or guarantees of this product.\n\nProduct JSON:\n${JSON.stringify(product, null, 2)}${researchSection}`;
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
): Promise<ProductBrain> {
  const first = await provider.generateJson({
    system: systemPrompt,
    prompt: buildPrompt(product, research),
    temperature: 0.2,
  });
  const firstInspection = inspectBrain(product, first);
  if (firstInspection.brain) return firstInspection.brain;

  const repaired = await provider.generateJson({
    system: systemPrompt,
    prompt: `${buildPrompt(product, research)}\n\nYour previous JSON failed validation for these reasons:\n- ${firstInspection.issues.join("\n- ")}\n\nReturn a corrected JSON object only. Do not add unsupported claims.`,
    temperature: 0.1,
  });
  const secondInspection = inspectBrain(product, repaired);
  if (secondInspection.brain) return secondInspection.brain;

  throw new ProductBrainValidationError(secondInspection.issues);
}
