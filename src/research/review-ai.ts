import type { AiProvider } from "../ai/provider.js";
import type { ResearchConfidence, ReviewEvidence, ReviewIntelligence, ReviewTheme } from "./types.js";
import { confidenceFromCount } from "./reviews.js";

const categories = new Set<ReviewTheme["category"]>([
  "pain_point",
  "desired_outcome",
  "objection",
  "feature_request",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeConfidence(count: number): ResearchConfidence {
  return confidenceFromCount(count);
}

export function validateReviewIntelligence(
  raw: unknown,
  reviews: readonly ReviewEvidence[],
): Readonly<{ ok: true; intelligence: ReviewIntelligence } | { ok: false; issues: readonly string[] }> {
  const issues: string[] = [];
  if (!isRecord(raw) || !Array.isArray(raw.themes)) return { ok: false, issues: ["themes must be an array"] };
  const reviewIds = new Set(reviews.map((review) => review.id));
  const themes: ReviewTheme[] = [];
  raw.themes.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(`themes[${index}] must be an object`);
      return;
    }
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    const category = entry.category;
    const evidenceIds = Array.isArray(entry.evidenceIds)
      ? entry.evidenceIds.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
      : [];
    if (!label) issues.push(`themes[${index}].label must be non-empty`);
    if (typeof category !== "string" || !categories.has(category as ReviewTheme["category"])) {
      issues.push(`themes[${index}].category is unsupported`);
      return;
    }
    const uniqueEvidence = [...new Set(evidenceIds)];
    if (uniqueEvidence.length === 0) issues.push(`themes[${index}].evidenceIds must contain at least one review id`);
    for (const evidenceId of uniqueEvidence) {
      if (!reviewIds.has(evidenceId)) issues.push(`themes[${index}] references unknown review id ${evidenceId}`);
    }
    if (label && uniqueEvidence.length > 0 && uniqueEvidence.every((id) => reviewIds.has(id))) {
      themes.push({
        label,
        category: category as ReviewTheme["category"],
        evidenceIds: uniqueEvidence,
        mentionCount: uniqueEvidence.length,
        confidence: normalizeConfidence(uniqueEvidence.length),
      });
    }
  });
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, intelligence: { themes } };
}

export async function generateReviewIntelligence(
  reviews: readonly ReviewEvidence[],
  provider: AiProvider,
): Promise<ReviewIntelligence> {
  if (reviews.length === 0) return { themes: [] };
  const reviewPayload = reviews.map((review) => ({ id: review.id, text: review.text, rating: review.rating }));
  const raw = await provider.generateJson({
    system: "You analyze ecommerce review evidence. Return JSON only. Never invent review IDs, counts, product facts, demand, sales, or URLs.",
    prompt: `Return {"themes": [...]} where each theme has label, category, evidenceIds. category must be pain_point, desired_outcome, objection, or feature_request. Every evidenceIds entry must be one of the supplied review IDs and must directly support the label.\n\nReviews:\n${JSON.stringify(reviewPayload, null, 2)}`,
    temperature: 0.1,
  });
  const checked = validateReviewIntelligence(raw, reviews);
  if (!checked.ok) throw new Error(`Review intelligence failed validation: ${checked.issues.join("; ")}`);
  return checked.intelligence;
}
