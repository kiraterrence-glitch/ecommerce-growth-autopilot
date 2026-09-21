import { calculateUnitEconomics } from "./economics.js";
import { analyzeReviewThemes } from "./reviews.js";
import type {
  FeatureSignal,
  OfferSignal,
  PriceAnalysis,
  ProductResearchContext,
  ResearchAnalysis,
  ResearchConfidence,
  ResearchFinding,
  ResearchProject,
  ReviewIntelligence,
} from "./types.js";

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  const left = sorted[middle - 1];
  const right = sorted[middle];
  if (left === undefined || right === undefined) return null;
  return round((left + right) / 2);
}

function analyzePrices(project: ResearchProject): PriceAnalysis {
  const prices = project.competitors.map((competitor) => competitor.price);
  if (prices.length === 0) return { sampleSize: 0, min: null, median: null, max: null, average: null };
  return {
    sampleSize: prices.length,
    min: round(Math.min(...prices)),
    median: median(prices),
    max: round(Math.max(...prices)),
    average: round(prices.reduce((sum, value) => sum + value, 0) / prices.length),
  };
}

function analyzeFeatures(project: ResearchProject): FeatureSignal[] {
  const map = new Map<string, { label: string; ids: Set<string> }>();
  for (const competitor of project.competitors) {
    for (const raw of competitor.features) {
      const label = raw.replace(/\s+/g, " ").trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase();
      const current = map.get(key) ?? { label, ids: new Set<string>() };
      current.ids.add(competitor.id);
      map.set(key, current);
    }
  }
  const denominator = Math.max(1, project.competitors.length);
  return [...map.values()]
    .map((entry) => ({
      feature: entry.label,
      count: entry.ids.size,
      share: round(entry.ids.size / denominator),
      competitorIds: [...entry.ids].sort(),
    }))
    .sort((a, b) => b.count - a.count || a.feature.localeCompare(b.feature));
}

function analyzeOffers(project: ResearchProject): OfferSignal[] {
  const map = new Map<string, { label: string; ids: Set<string> }>();
  for (const competitor of project.competitors) {
    if (!competitor.offer) continue;
    const key = competitor.offer.toLocaleLowerCase();
    const current = map.get(key) ?? { label: competitor.offer, ids: new Set<string>() };
    current.ids.add(competitor.id);
    map.set(key, current);
  }
  return [...map.values()]
    .map((entry) => ({ offer: entry.label, count: entry.ids.size, competitorIds: [...entry.ids].sort() }))
    .sort((a, b) => b.count - a.count || a.offer.localeCompare(b.offer));
}

function confidenceForSample(count: number): ResearchConfidence {
  if (count >= 10) return "high";
  if (count >= 4) return "medium";
  return "low";
}

function sourceIdsForCompetitors(project: ResearchProject, ids: readonly string[]): string[] {
  const wanted = new Set(ids);
  return [...new Set(project.competitors.filter((competitor) => wanted.has(competitor.id)).map((competitor) => competitor.sourceId))].sort();
}

function sourceIdsForReviews(project: ResearchProject, ids: readonly string[]): string[] {
  const wanted = new Set(ids);
  return [...new Set(project.reviews.filter((review) => wanted.has(review.id)).map((review) => review.sourceId))].sort();
}

function buildFindings(
  project: ResearchProject,
  price: PriceAnalysis,
  features: readonly FeatureSignal[],
  offers: readonly OfferSignal[],
  reviewIntelligence: ReviewIntelligence,
): ResearchFinding[] {
  const findings: ResearchFinding[] = [];
  if (price.sampleSize > 0 && price.min !== null && price.median !== null && price.max !== null) {
    const ids = project.competitors.map((competitor) => competitor.id);
    findings.push({
      id: "finding-price-band",
      category: "price_signal",
      statement: `Observed competitor prices range from ${project.currency} ${price.min.toFixed(2)} to ${project.currency} ${price.max.toFixed(2)}, with a median of ${project.currency} ${price.median.toFixed(2)} across ${price.sampleSize} sampled competitors.`,
      confidence: confidenceForSample(price.sampleSize),
      evidenceIds: ids,
      sourceIds: sourceIdsForCompetitors(project, ids),
      evidenceCount: ids.length,
    });
  }
  for (const [index, feature] of features.slice(0, 5).entries()) {
    findings.push({
      id: `finding-feature-${index + 1}`,
      category: "feature_signal",
      statement: `${feature.feature} appears in ${feature.count} of ${project.competitors.length} sampled competitor records.`,
      confidence: confidenceForSample(feature.count),
      evidenceIds: feature.competitorIds,
      sourceIds: sourceIdsForCompetitors(project, feature.competitorIds),
      evidenceCount: feature.count,
    });
  }
  for (const [index, offer] of offers.slice(0, 3).entries()) {
    findings.push({
      id: `finding-offer-${index + 1}`,
      category: "offer_pattern",
      statement: `Observed offer pattern: ${offer.offer} (${offer.count} sampled competitor${offer.count === 1 ? "" : "s"}).`,
      confidence: confidenceForSample(offer.count),
      evidenceIds: offer.competitorIds,
      sourceIds: sourceIdsForCompetitors(project, offer.competitorIds),
      evidenceCount: offer.count,
    });
  }
  for (const [index, theme] of reviewIntelligence.themes.slice(0, 8).entries()) {
    findings.push({
      id: `finding-review-${index + 1}`,
      category: theme.category,
      statement: `${theme.label} is supported by ${theme.mentionCount} imported review${theme.mentionCount === 1 ? "" : "s"}.`,
      confidence: theme.confidence,
      evidenceIds: theme.evidenceIds,
      sourceIds: sourceIdsForReviews(project, theme.evidenceIds),
      evidenceCount: theme.mentionCount,
    });
  }
  if (project.economics !== null) {
    findings.push({
      id: "finding-economics",
      category: "economics",
      statement: "Unit economics are calculated from seller-supplied inputs and should be treated as a scenario, not a market forecast.",
      confidence: "high",
      evidenceIds: ["seller-economics-input"],
      sourceIds: project.sources.filter((source) => source.type === "seller_input").map((source) => source.id),
      evidenceCount: 1,
    });
  }
  return findings;
}

export function analyzeResearchProject(
  project: ResearchProject,
  reviewIntelligence: ReviewIntelligence = analyzeReviewThemes(project.reviews),
): ResearchAnalysis {
  const price = analyzePrices(project);
  const features = analyzeFeatures(project);
  const offers = analyzeOffers(project);
  const economics = project.economics === null ? null : calculateUnitEconomics(project.economics);
  const findings = buildFindings(project, price, features, offers, reviewIntelligence);
  const evidenceVolume = project.competitors.length + project.reviews.length;
  const limitations: string[] = [
    "This report analyzes only the supplied evidence and does not estimate sales or market demand.",
    "Competitor price, reviews, and offers are point-in-time observations and may change.",
  ];
  if (!project.sources.some((source) => source.type === "demand_data")) {
    limitations.push("No independent demand-data source was supplied; demand strength is not assessed.");
  }
  if (project.competitors.length < 5) limitations.push("Competitor sample is small; price and feature patterns are directional only.");
  if (project.reviews.length < 10) limitations.push("Review sample is small; customer themes are directional only.");
  return {
    projectId: project.id,
    query: project.query,
    targetMarketplace: project.targetMarketplace,
    currency: project.currency,
    competitorCount: project.competitors.length,
    reviewCount: project.reviews.length,
    price,
    features,
    offers,
    reviewIntelligence,
    economics,
    findings,
    dataConfidence: confidenceForSample(evidenceVolume),
    limitations,
  };
}

export function createProductResearchContext(analysis: ResearchAnalysis): ProductResearchContext {
  const byCategory = (category: string): string[] => analysis.reviewIntelligence.themes
    .filter((theme) => theme.category === category)
    .slice(0, 5)
    .map((theme) => theme.label);
  return {
    sampleSize: analysis.competitorCount + analysis.reviewCount,
    priceBand: { min: analysis.price.min, median: analysis.price.median, max: analysis.price.max },
    topFeatures: analysis.features.slice(0, 5).map((feature) => feature.feature),
    topPainPoints: byCategory("pain_point"),
    topDesiredOutcomes: byCategory("desired_outcome"),
    topObjections: byCategory("objection"),
    economics: analysis.economics,
    limitations: analysis.limitations,
  };
}
