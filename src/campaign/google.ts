import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";

export type GoogleAdGroupDraft = Readonly<{ angleName: string; headlines: readonly string[]; descriptions: readonly string[] }>;
export type GoogleAdsDraft = Readonly<{ channel: "google_ads"; status: "DRAFT"; objective: "SALES"; adGroups: readonly GoogleAdGroupDraft[] }>;

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

function offerText(product: Product): string {
  if (product.offer.type === "percentage") return `${product.offer.value}% off`;
  if (product.offer.type === "fixed") return `${product.currency} ${product.offer.value} off`;
  return `${product.currency} ${product.price}`;
}

function description(primary: string, secondary: string): string {
  const first = primary.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
  const second = secondary.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
  const combined = `${first}. ${second}.`;
  if (combined.length <= 90) return combined;
  const firstOnly = `${first}.`;
  if (firstOnly.length <= 90) return firstOnly;
  return `${fitWords(first, 89)}.`;
}

export function buildGoogleAdsDraft(product: Product, brain: ProductBrain): GoogleAdsDraft {
  const groups = brain.angles.slice(0, 3).map((angle, index) => {
    const feature = product.features[index % Math.max(1, product.features.length)] ?? product.title;
    const benefit = brain.benefits[index % Math.max(1, brain.benefits.length)] ?? product.description;
    return {
      angleName: angle.name,
      headlines: [
        fitWords(product.title, 30),
        fitWords(angle.name, 30),
        fitWords(feature, 30),
      ],
      descriptions: [
        description(angle.hook, benefit),
        description(`${product.title}: ${feature}`, `Current offer: ${offerText(product)}`),
      ],
    };
  });
  if (groups.length !== 3) throw new Error("Google Ads draft requires 3 validated marketing angles");
  return { channel: "google_ads", status: "DRAFT", objective: "SALES", adGroups: groups };
}

export function validateGoogleAdsDraft(draft: GoogleAdsDraft): readonly string[] {
  const issues: string[] = [];
  if (draft.status !== "DRAFT") issues.push("Google Ads campaign must remain DRAFT");
  if (draft.adGroups.length !== 3) issues.push("Google Ads draft must contain 3 ad groups");
  for (const [g, group] of draft.adGroups.entries()) {
    if (group.headlines.length < 3) issues.push(`adGroups[${g}] needs at least 3 headlines`);
    group.headlines.forEach((value, i) => {
      if (value.length > 30) issues.push(`adGroups[${g}].headlines[${i}] exceeds 30 characters`);
    });
    group.descriptions.forEach((value, i) => {
      if (value.length > 90) issues.push(`adGroups[${g}].descriptions[${i}] exceeds 90 characters`);
    });
  }
  return issues;
}
