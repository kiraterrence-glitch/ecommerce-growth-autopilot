import type { CurrencyCode } from "../domain/product.js";
import type {
  CompetitorRecord,
  ResearchProject,
  ResearchSource,
  ResearchSourceType,
  ResearchValidationIssue,
  ResearchValidationResult,
  ReviewEvidence,
  UnitEconomicsInput,
} from "./types.js";

const currencies = new Set<CurrencyCode>(["USD", "AUD", "PHP", "GBP", "EUR", "CAD"]);
const sourceTypes = new Set<ResearchSourceType>([
  "manual",
  "csv",
  "public_page",
  "review_import",
  "seller_input",
  "demand_data",
]);
const marketplaces = new Set<ResearchProject["targetMarketplace"]>([
  "amazon_us",
  "amazon_au",
  "shopify",
  "other",
]);
const bannedEstimateKeys = new Set([
  "estimatedsales",
  "monthlysales",
  "salesestimate",
  "estimatedrevenue",
  "monthlyrevenue",
  "revenueestimate",
  "opportunityscore",
  "winningscore",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function readString(source: Record<string, unknown>, key: string, path: string, issues: ResearchValidationIssue[]): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path: `${path}.${key}`, message: "must be a non-empty string" });
    return "";
  }
  return value.trim();
}

function readNullableString(
  source: Record<string, unknown>,
  key: string,
  path: string,
  issues: ResearchValidationIssue[],
): string | null {
  const value = source[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    issues.push({ path: `${path}.${key}`, message: "must be null or a string" });
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function readNullableNumber(
  source: Record<string, unknown>,
  key: string,
  path: string,
  issues: ResearchValidationIssue[],
  options: Readonly<{ min: number; max?: number; integer?: boolean }>,
): number | null {
  const value = source[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < options.min) {
    issues.push({ path: `${path}.${key}`, message: `must be null or a finite number >= ${options.min}` });
    return null;
  }
  if (options.max !== undefined && value > options.max) {
    issues.push({ path: `${path}.${key}`, message: `must be <= ${options.max}` });
  }
  if (options.integer && !Number.isInteger(value)) {
    issues.push({ path: `${path}.${key}`, message: "must be an integer" });
  }
  return value;
}

function readStringArray(value: unknown, path: string, issues: ResearchValidationIssue[]): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    issues.push({ path, message: "must be an array of strings" });
    return [];
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function findBannedEstimateKeys(value: unknown, path: string, issues: ResearchValidationIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findBannedEstimateKeys(item, `${path}[${index}]`, issues));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const compact = key.replace(/[^a-z]/gi, "").toLowerCase();
    if (bannedEstimateKeys.has(compact)) {
      issues.push({
        path: `${path}.${key}`,
        message: "unsupported estimated-sales/opportunity fields are not allowed without an evidence-backed adapter",
      });
    }
    findBannedEstimateKeys(child, `${path}.${key}`, issues);
  }
}

function validateSource(value: unknown, index: number, issues: ResearchValidationIssue[]): ResearchSource | null {
  const path = `sources[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path, message: "must be an object" });
    return null;
  }
  const id = readString(value, "id", path, issues);
  const label = readString(value, "label", path, issues);
  const type = value.type;
  if (typeof type !== "string" || !sourceTypes.has(type as ResearchSourceType)) {
    issues.push({ path: `${path}.type`, message: "must be a supported research source type" });
  }
  const capturedAt = value.capturedAt;
  if (!isIsoTimestamp(capturedAt)) issues.push({ path: `${path}.capturedAt`, message: "must be a valid timestamp" });
  const sourceUrl = readNullableString(value, "sourceUrl", path, issues);
  if (sourceUrl !== null) {
    try {
      const parsed = new URL(sourceUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported protocol");
    } catch {
      issues.push({ path: `${path}.sourceUrl`, message: "must be null or an absolute http(s) URL" });
    }
  }
  if (!id || !label || typeof type !== "string" || !sourceTypes.has(type as ResearchSourceType) || !isIsoTimestamp(capturedAt)) {
    return null;
  }
  return { id, label, type: type as ResearchSourceType, capturedAt, sourceUrl };
}

function validateCompetitor(value: unknown, index: number, issues: ResearchValidationIssue[]): CompetitorRecord | null {
  const path = `competitors[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path, message: "must be an object" });
    return null;
  }
  const id = readString(value, "id", path, issues);
  const title = readString(value, "title", path, issues);
  const sourceId = readString(value, "sourceId", path, issues);
  const price = value.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    issues.push({ path: `${path}.price`, message: "must be a finite number greater than 0" });
  }
  const currency = value.currency;
  if (typeof currency !== "string" || !currencies.has(currency as CurrencyCode)) {
    issues.push({ path: `${path}.currency`, message: "must be a supported currency code" });
  }
  const rating = readNullableNumber(value, "rating", path, issues, { min: 0, max: 5 });
  const reviewCount = readNullableNumber(value, "reviewCount", path, issues, { min: 0, integer: true });
  const features = readStringArray(value.features, `${path}.features`, issues);
  const offer = readNullableString(value, "offer", path, issues);
  const capturedAt = value.capturedAt;
  if (!isIsoTimestamp(capturedAt)) issues.push({ path: `${path}.capturedAt`, message: "must be a valid timestamp" });
  if (!id || !title || !sourceId || typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  if (typeof currency !== "string" || !currencies.has(currency as CurrencyCode) || !isIsoTimestamp(capturedAt)) return null;
  return {
    id,
    title,
    price,
    currency: currency as CurrencyCode,
    rating,
    reviewCount,
    features,
    offer,
    sourceId,
    capturedAt,
  };
}

function validateReview(value: unknown, index: number, issues: ResearchValidationIssue[]): ReviewEvidence | null {
  const path = `reviews[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path, message: "must be an object" });
    return null;
  }
  const id = readString(value, "id", path, issues);
  const sourceId = readString(value, "sourceId", path, issues);
  const text = readString(value, "text", path, issues);
  const competitorId = readNullableString(value, "competitorId", path, issues);
  const rating = readNullableNumber(value, "rating", path, issues, { min: 0, max: 5 });
  const capturedAt = value.capturedAt;
  if (!isIsoTimestamp(capturedAt)) issues.push({ path: `${path}.capturedAt`, message: "must be a valid timestamp" });
  if (!id || !sourceId || !text || !isIsoTimestamp(capturedAt)) return null;
  return { id, sourceId, text, competitorId, rating, capturedAt };
}

function validateEconomics(value: unknown, issues: ResearchValidationIssue[]): UnitEconomicsInput | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) {
    issues.push({ path: "economics", message: "must be null or an object" });
    return null;
  }
  const keys = [
    "sellingPrice",
    "cogs",
    "shippingCost",
    "marketplaceFees",
    "paymentFees",
    "discountAmount",
    "adAllowance",
  ] as const;
  const numbers: Record<(typeof keys)[number], number> = {
    sellingPrice: 0,
    cogs: 0,
    shippingCost: 0,
    marketplaceFees: 0,
    paymentFees: 0,
    discountAmount: 0,
    adAllowance: 0,
  };
  for (const key of keys) {
    const raw = value[key];
    const minimum = key === "sellingPrice" ? Number.EPSILON : 0;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < minimum) {
      issues.push({ path: `economics.${key}`, message: `must be a finite number >= ${minimum}` });
    } else {
      numbers[key] = raw;
    }
  }
  if (numbers.discountAmount > numbers.sellingPrice) {
    issues.push({ path: "economics.discountAmount", message: "cannot exceed sellingPrice" });
  }
  return numbers;
}

export function validateResearchProject(input: unknown): ResearchValidationResult {
  const issues: ResearchValidationIssue[] = [];
  if (!isRecord(input)) return { ok: false, issues: [{ path: "$", message: "must be an object" }] };
  findBannedEstimateKeys(input, "$", issues);

  const id = readString(input, "id", "$", issues);
  const query = readString(input, "query", "$", issues);
  const targetMarketplace = input.targetMarketplace;
  if (typeof targetMarketplace !== "string" || !marketplaces.has(targetMarketplace as ResearchProject["targetMarketplace"])) {
    issues.push({ path: "targetMarketplace", message: "must be amazon_us, amazon_au, shopify, or other" });
  }
  const currency = input.currency;
  if (typeof currency !== "string" || !currencies.has(currency as CurrencyCode)) {
    issues.push({ path: "currency", message: "must be a supported currency code" });
  }

  const sourcesRaw = input.sources;
  const sources = Array.isArray(sourcesRaw)
    ? sourcesRaw.map((value, index) => validateSource(value, index, issues)).filter((value): value is ResearchSource => value !== null)
    : [];
  if (!Array.isArray(sourcesRaw)) issues.push({ path: "sources", message: "must be an array" });

  const competitorsRaw = input.competitors;
  const competitors = Array.isArray(competitorsRaw)
    ? competitorsRaw.map((value, index) => validateCompetitor(value, index, issues)).filter((value): value is CompetitorRecord => value !== null)
    : [];
  if (!Array.isArray(competitorsRaw)) issues.push({ path: "competitors", message: "must be an array" });

  const reviewsRaw = input.reviews;
  const reviews = Array.isArray(reviewsRaw)
    ? reviewsRaw.map((value, index) => validateReview(value, index, issues)).filter((value): value is ReviewEvidence => value !== null)
    : [];
  if (!Array.isArray(reviewsRaw)) issues.push({ path: "reviews", message: "must be an array" });

  const economics = validateEconomics(input.economics, issues);
  const sourceIds = new Set(sources.map((source) => source.id));
  const competitorIds = new Set(competitors.map((competitor) => competitor.id));
  const duplicateSourceIds = sources.filter((source, index) => sources.findIndex((candidate) => candidate.id === source.id) !== index);
  const duplicateCompetitorIds = competitors.filter((competitor, index) => competitors.findIndex((candidate) => candidate.id === competitor.id) !== index);
  const duplicateReviewIds = reviews.filter((review, index) => reviews.findIndex((candidate) => candidate.id === review.id) !== index);
  for (const duplicate of duplicateSourceIds) issues.push({ path: "sources", message: `duplicate source id: ${duplicate.id}` });
  for (const duplicate of duplicateCompetitorIds) issues.push({ path: "competitors", message: `duplicate competitor id: ${duplicate.id}` });
  for (const duplicate of duplicateReviewIds) issues.push({ path: "reviews", message: `duplicate review id: ${duplicate.id}` });
  for (const competitor of competitors) {
    if (!sourceIds.has(competitor.sourceId)) issues.push({ path: `competitors.${competitor.id}.sourceId`, message: "must reference an existing source" });
    if (competitor.currency !== currency) issues.push({ path: `competitors.${competitor.id}.currency`, message: "must match project currency in the free-tier research engine" });
  }
  for (const review of reviews) {
    if (!sourceIds.has(review.sourceId)) issues.push({ path: `reviews.${review.id}.sourceId`, message: "must reference an existing source" });
    if (review.competitorId !== null && !competitorIds.has(review.competitorId)) {
      issues.push({ path: `reviews.${review.id}.competitorId`, message: "must reference an existing competitor" });
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    project: {
      id,
      query,
      targetMarketplace: targetMarketplace as ResearchProject["targetMarketplace"],
      currency: currency as CurrencyCode,
      sources,
      competitors,
      reviews,
      economics,
    },
  };
}
