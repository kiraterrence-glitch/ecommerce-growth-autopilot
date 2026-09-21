import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";

export type AmazonListingDraft = Readonly<{
  channel: "amazon";
  status: "DRAFT";
  title: string;
  bullets: readonly string[];
  description: string;
  searchTerms: readonly string[];
}>;

function fitWords(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  const words = normalized.split(" ");
  let result = "";
  for (const word of words) {
    const candidate = result ? `${result} ${word}` : word;
    if (candidate.length > max) break;
    result = candidate;
  }
  return result || normalized.slice(0, max);
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildAmazonListingDraft(product: Product, brain: ProductBrain): AmazonListingDraft {
  if (!product.channels.amazon) throw new Error("Amazon listing requested for a product with Amazon channel disabled");

  const featureDescriptors = product.features.slice(0, 2).join(", ");
  const title = fitWords(featureDescriptors ? `${product.title} - ${featureDescriptors}` : product.title, 200);
  const sources = unique([
    ...brain.benefits,
    ...product.benefits,
    ...product.features,
    ...brain.buyingTriggers,
  ]);
  const labels = ["USE CASE", "BENEFIT", "FEATURE", "ROUTINE", "BUYING FIT"];
  const bullets = labels.map((label, index) => {
    const source = sources[index % Math.max(1, sources.length)] ?? product.description;
    return fitWords(`${label}: ${source}`, 500);
  });
  const searchTerms = unique([...product.audiences, ...product.features, ...brain.buyingTriggers])
    .map((value) => value.toLowerCase())
    .slice(0, 12);
  const description = fitWords(`${product.description} Key listed features: ${product.features.join(", ")}.`, 2000);

  return { channel: "amazon", status: "DRAFT", title, bullets, description, searchTerms };
}

export function validateAmazonListingDraft(draft: AmazonListingDraft): readonly string[] {
  const issues: string[] = [];
  if (draft.status !== "DRAFT") issues.push("Amazon listing must remain DRAFT");
  if (draft.title.length > 200) issues.push("Amazon title exceeds 200 characters");
  if (draft.bullets.length !== 5) issues.push("Amazon listing must contain exactly 5 bullets");
  draft.bullets.forEach((value, i) => {
    if (value.length > 500) issues.push(`bullets[${i}] exceeds 500 characters`);
  });
  return issues;
}
