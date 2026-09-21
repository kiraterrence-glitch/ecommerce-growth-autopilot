import type { CompetitorRecord, ResearchProject, ReviewEvidence } from "./types.js";

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function competitorKey(competitor: CompetitorRecord): string {
  return `${normalizeTitle(competitor.title).toLocaleLowerCase()}|${competitor.currency}|${competitor.price.toFixed(2)}`;
}

function reviewKey(review: ReviewEvidence): string {
  return `${review.competitorId ?? "none"}|${review.text.replace(/\s+/g, " ").trim().toLocaleLowerCase()}`;
}

export function normalizeResearchProject(project: ResearchProject): ResearchProject {
  const competitors: CompetitorRecord[] = [];
  const competitorKeys = new Set<string>();
  for (const competitor of project.competitors) {
    const normalized: CompetitorRecord = {
      ...competitor,
      title: normalizeTitle(competitor.title),
      features: uniqueStrings(competitor.features),
      offer: competitor.offer?.replace(/\s+/g, " ").trim() || null,
    };
    const key = competitorKey(normalized);
    if (competitorKeys.has(key)) continue;
    competitorKeys.add(key);
    competitors.push(normalized);
  }

  const reviews: ReviewEvidence[] = [];
  const reviewKeys = new Set<string>();
  for (const review of project.reviews) {
    const normalized: ReviewEvidence = { ...review, text: review.text.replace(/\s+/g, " ").trim() };
    const key = reviewKey(normalized);
    if (reviewKeys.has(key)) continue;
    reviewKeys.add(key);
    reviews.push(normalized);
  }

  return {
    ...project,
    query: project.query.replace(/\s+/g, " ").trim(),
    sources: [...project.sources].sort((a, b) => a.id.localeCompare(b.id)),
    competitors: competitors.sort((a, b) => a.id.localeCompare(b.id)),
    reviews: reviews.sort((a, b) => a.id.localeCompare(b.id)),
  };
}
