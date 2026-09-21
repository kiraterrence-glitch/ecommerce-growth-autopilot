import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";

export type StaticCreativeFormat = "meta_square" | "meta_story" | "display_landscape";
export type StaticCreativeDraft = Readonly<{
  id: string;
  status: "DRAFT";
  format: StaticCreativeFormat;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  cta: "SHOP NOW";
  svg: string;
}>;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fitWords(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
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
  if (product.offer.type === "percentage") return `${product.offer.value}% OFF`;
  if (product.offer.type === "fixed") return `SAVE ${product.currency} ${product.offer.value}`;
  return `${product.currency} ${product.price}`;
}

function initials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function renderSvg(width: number, height: number, title: string, hook: string, offer: string): string {
  const min = Math.min(width, height);
  const titleSize = Math.round(min * 0.052);
  const hookSize = Math.round(min * 0.032);
  const badgeSize = Math.round(min * 0.024);
  const ctaSize = Math.round(min * 0.027);
  const markSize = Math.round(min * 0.085);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)} ad draft">
  <rect width="100%" height="100%" fill="#f7f7f7"/>
  <rect x="6%" y="7%" width="88%" height="49%" rx="28" fill="#e9e9e9"/>
  <circle cx="50%" cy="31%" r="12%" fill="#111"/>
  <text x="50%" y="34%" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${markSize}" fill="#fff">${escapeXml(initials(title))}</text>
  <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${badgeSize}" fill="#555">DEMO PRODUCT VISUAL</text>
  <text x="8%" y="66%" font-family="Arial, sans-serif" font-weight="700" font-size="${titleSize}" fill="#111">${escapeXml(fitWords(title, 42))}</text>
  <text x="8%" y="74%" font-family="Arial, sans-serif" font-size="${hookSize}" fill="#333">${escapeXml(fitWords(hook, 64))}</text>
  <rect x="8%" y="80%" width="32%" height="8%" rx="18" fill="#111"/>
  <text x="24%" y="85.2%" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${ctaSize}" fill="#fff">SHOP NOW</text>
  <text x="92%" y="85%" text-anchor="end" font-family="Arial, sans-serif" font-weight="700" font-size="${badgeSize}" fill="#111">${escapeXml(offer)}</text>
</svg>`;
}

export function buildStaticCreativeDrafts(product: Product, brain: ProductBrain): readonly StaticCreativeDraft[] {
  const hook = brain.angles[0]?.hook ?? brain.benefits[0] ?? product.description;
  const offer = offerText(product);
  const formats: readonly [StaticCreativeFormat, number, number][] = [
    ["meta_square", 1080, 1080],
    ["meta_story", 1080, 1920],
    ["display_landscape", 1200, 628],
  ];
  return formats.map(([format, width, height]) => ({
    id: `${product.sku}-${format}`,
    status: "DRAFT",
    format,
    width,
    height,
    headline: product.title,
    subheadline: hook,
    cta: "SHOP NOW",
    svg: renderSvg(width, height, product.title, hook, offer),
  }));
}

export function validateStaticCreativeDrafts(drafts: readonly StaticCreativeDraft[]): readonly string[] {
  const issues: string[] = [];
  if (drafts.length !== 3) issues.push("static creative pack must contain exactly 3 formats");
  for (const [index, draft] of drafts.entries()) {
    if (draft.status !== "DRAFT") issues.push(`creatives[${index}] must remain DRAFT`);
    if (draft.width <= 0 || draft.height <= 0) issues.push(`creatives[${index}] has invalid dimensions`);
    if (!draft.svg.startsWith("<svg")) issues.push(`creatives[${index}] is not SVG`);
    if (/<script\b/i.test(draft.svg)) issues.push(`creatives[${index}] contains a script tag`);
  }
  return issues;
}
