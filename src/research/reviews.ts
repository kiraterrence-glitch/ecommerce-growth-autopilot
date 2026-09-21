import type { ResearchConfidence, ReviewEvidence, ReviewIntelligence, ReviewTheme } from "./types.js";

type ThemeRule = Readonly<{
  label: string;
  category: ReviewTheme["category"];
  terms: readonly string[];
}>;

const rules: readonly ThemeRule[] = [
  { label: "Cleaning difficulty", category: "pain_point", terms: ["hard to clean", "difficult to clean", "cleaning", "messy"] },
  { label: "Leaks", category: "pain_point", terms: ["leak", "leaking", "drip"] },
  { label: "Weak pressure", category: "pain_point", terms: ["weak pressure", "not enough pressure", "low pressure"] },
  { label: "Too bulky", category: "pain_point", terms: ["bulky", "too big", "heavy"] },
  { label: "Portable use", category: "desired_outcome", terms: ["portable", "travel", "camp", "on the go"] },
  { label: "Easy operation", category: "desired_outcome", terms: ["easy to use", "simple", "beginner"] },
  { label: "Better espresso quality", category: "desired_outcome", terms: ["crema", "espresso quality", "better coffee"] },
  { label: "Price concern", category: "objection", terms: ["expensive", "price", "cost too much", "overpriced"] },
  { label: "Durability concern", category: "objection", terms: ["durability", "broke", "broken", "flimsy"] },
  { label: "Larger water capacity", category: "feature_request", terms: ["larger tank", "more water", "bigger chamber"] },
  { label: "Travel case", category: "feature_request", terms: ["travel case", "carrying case", "carry case"] },
];

export function confidenceFromCount(count: number): ResearchConfidence {
  if (count >= 5) return "high";
  if (count >= 2) return "medium";
  return "low";
}

export function analyzeReviewThemes(reviews: readonly ReviewEvidence[]): ReviewIntelligence {
  const themes: ReviewTheme[] = [];
  for (const rule of rules) {
    const evidenceIds = reviews
      .filter((review) => {
        const text = review.text.toLocaleLowerCase();
        return rule.terms.some((term) => text.includes(term));
      })
      .map((review) => review.id);
    if (evidenceIds.length === 0) continue;
    themes.push({
      label: rule.label,
      category: rule.category,
      evidenceIds,
      mentionCount: evidenceIds.length,
      confidence: confidenceFromCount(evidenceIds.length),
    });
  }
  return {
    themes: themes.sort((a, b) => b.mentionCount - a.mentionCount || a.label.localeCompare(b.label)),
  };
}
