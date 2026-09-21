import type { MarketingAngle, ProductBrain, ProductBrainValidationResult } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringList(source: Record<string, unknown>, key: string, issues: string[]): string[] {
  const value = source[key];
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !item.trim())) {
    issues.push(`${key} must be a non-empty array of non-empty strings`);
    return [];
  }
  return value.map((item) => (item as string).trim());
}

function readAngles(source: Record<string, unknown>, issues: string[]): MarketingAngle[] {
  const value = source.angles;
  if (!Array.isArray(value) || value.length < 3) {
    issues.push("angles must contain at least 3 marketing angles");
    return [];
  }

  const angles: MarketingAngle[] = [];
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      issues.push(`angles[${index}] must be an object`);
      continue;
    }
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const hook = typeof item.hook === "string" ? item.hook.trim() : "";
    const reason = typeof item.reason === "string" ? item.reason.trim() : "";
    if (!name || !hook || !reason) {
      issues.push(`angles[${index}] must include non-empty name, hook, and reason`);
      continue;
    }
    angles.push({ name, hook, reason });
  }
  return angles;
}

export function validateProductBrain(input: unknown): ProductBrainValidationResult {
  if (!isRecord(input)) return { ok: false, issues: ["brain must be an object"] };

  const issues: string[] = [];
  const audiences = readStringList(input, "audiences", issues);
  const painPoints = readStringList(input, "painPoints", issues);
  const benefits = readStringList(input, "benefits", issues);
  const objections = readStringList(input, "objections", issues);
  const buyingTriggers = readStringList(input, "buyingTriggers", issues);
  const angles = readAngles(input, issues);
  const offerPositioning = typeof input.offerPositioning === "string" ? input.offerPositioning.trim() : "";
  if (!offerPositioning) issues.push("offerPositioning must be a non-empty string");

  if (issues.length > 0) return { ok: false, issues };

  const brain: ProductBrain = {
    audiences,
    painPoints,
    benefits,
    objections,
    buyingTriggers,
    angles,
    offerPositioning,
  };
  return { ok: true, brain };
}
