import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";

export type MetaAdDraft = Readonly<{
  angleName: string;
  variant: "A" | "B";
  primaryText: string;
  headline: string;
  cta: "SHOP_NOW";
  audienceHypothesis: string;
  creativeBrief: string;
}>;

export type MetaCampaignDraft = Readonly<{
  channel: "meta";
  status: "DRAFT";
  objective: "SALES";
  campaignName: string;
  ads: readonly MetaAdDraft[];
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

function offerSentence(product: Product): string {
  if (product.offer.type === "percentage") return `Save ${product.offer.value}% on the current offer.`;
  if (product.offer.type === "fixed") return `Save ${product.currency} ${product.offer.value} on the current offer.`;
  return `Explore ${product.title}.`;
}

export function buildMetaCampaignDraft(product: Product, brain: ProductBrain): MetaCampaignDraft {
  const angles = brain.angles.slice(0, 3);
  if (angles.length !== 3) throw new Error("Meta campaign requires exactly 3 validated marketing angles");

  const audiences = brain.audiences.length > 0 ? brain.audiences : product.audiences;
  const benefit = brain.benefits[0] ?? product.benefits[0] ?? product.features[0] ?? product.description;
  const offer = offerSentence(product);

  const ads = angles.flatMap((angle, angleIndex) => {
    const audience = audiences[angleIndex % Math.max(1, audiences.length)] ?? "online shoppers";
    const secondAudience = audiences[(angleIndex + 1) % Math.max(1, audiences.length)] ?? audience;
    const feature = product.features[angleIndex % Math.max(1, product.features.length)] ?? benefit;
    const secondBenefit = brain.benefits[(angleIndex + 1) % Math.max(1, brain.benefits.length)] ?? benefit;
    const aText = fitWords(`${angle.hook}. ${benefit}. ${offer}`, 125);
    const bText = fitWords(`For ${secondAudience}: ${product.title} — ${feature.toLowerCase()}. ${secondBenefit}. ${offer}`, 125);
    return [
      {
        angleName: angle.name,
        variant: "A" as const,
        primaryText: aText,
        headline: fitWords(`${angle.name}: ${feature}`, 40),
        cta: "SHOP_NOW" as const,
        audienceHypothesis: audience,
        creativeBrief: `Use a product-led scene relevant to ${audience}. Visualize the ${angle.name.toLowerCase()} angle without adding unsupported claims.`,
      },
      {
        angleName: angle.name,
        variant: "B" as const,
        primaryText: bText,
        headline: fitWords(`${product.title} for ${secondAudience}`, 40),
        cta: "SHOP_NOW" as const,
        audienceHypothesis: secondAudience,
        creativeBrief: `Create a contrasting concept for ${secondAudience}. Keep product facts literal and make the offer secondary to the use case.`,
      },
    ];
  });

  return {
    channel: "meta",
    status: "DRAFT",
    objective: "SALES",
    campaignName: `${product.sku} - ${product.title} - Draft`,
    ads,
  };
}

export function validateMetaCampaignDraft(draft: MetaCampaignDraft): readonly string[] {
  const issues: string[] = [];
  if (draft.status !== "DRAFT") issues.push("campaign must remain DRAFT");
  if (draft.ads.length !== 6) issues.push("campaign must contain exactly 6 ads");
  for (const [index, ad] of draft.ads.entries()) {
    if (ad.primaryText.length > 125) issues.push(`ads[${index}].primaryText exceeds 125 characters`);
    if (ad.headline.length > 40) issues.push(`ads[${index}].headline exceeds 40 characters`);
    if (ad.cta !== "SHOP_NOW") issues.push(`ads[${index}].cta is unsupported`);
  }
  return issues;
}
