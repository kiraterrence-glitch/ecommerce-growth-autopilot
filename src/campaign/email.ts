import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";

export type EmailSequenceName = "launch" | "abandoned_cart" | "post_purchase" | "win_back";
export type EmailDraft = Readonly<{
  sequence: EmailSequenceName;
  step: 1 | 2 | 3;
  status: "DRAFT";
  subject: string;
  previewText: string;
  body: string;
  ctaText: string;
}>;
export type EmailCampaignDraft = Readonly<{ channel: "email"; status: "DRAFT"; emails: readonly EmailDraft[] }>;

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

function offer(product: Product): string {
  if (product.offer.type === "percentage") return `${product.offer.value}% off`;
  if (product.offer.type === "fixed") return `${product.currency} ${product.offer.value} off`;
  return `${product.currency} ${product.price}`;
}

function draft(
  sequence: EmailSequenceName,
  step: 1 | 2 | 3,
  subject: string,
  preview: string,
  body: string,
  ctaText: string,
): EmailDraft {
  return {
    sequence,
    step,
    status: "DRAFT",
    subject: fitWords(subject, 60),
    previewText: fitWords(preview, 90),
    body: `${body}\n\nManage preferences or unsubscribe: [UNSUBSCRIBE_URL]`,
    ctaText,
  };
}

export function buildEmailCampaignDraft(product: Product, brain: ProductBrain): EmailCampaignDraft {
  const benefit = brain.benefits[0] ?? product.benefits[0] ?? product.features[0] ?? product.description;
  const audience = brain.audiences[0] ?? product.audiences[0] ?? "customers";
  const secondBenefit = brain.benefits[1] ?? product.benefits[1] ?? product.features[1] ?? benefit;
  const firstObjection = brain.objections[0] ?? "whether the product fits your routine";
  const value = offer(product);
  const emails: EmailDraft[] = [
    draft("launch", 1, `Meet ${product.title}`, benefit, `Meet ${product.title}. ${benefit}. Explore the product details and decide whether it fits your routine.`, "View product"),
    draft("launch", 2, `${product.title} for ${audience}`, brain.angles[0]?.hook ?? benefit, `${brain.angles[0]?.reason ?? benefit}. ${secondBenefit}.`, "View product"),
    draft("launch", 3, `${value} on ${product.title}`, `Current offer: ${value}`, `${product.title} is currently available with ${value}. Compare the features, price, and fit before purchasing.`, "Shop now"),
    draft("abandoned_cart", 1, `Still considering ${product.title}?`, benefit, `You left ${product.title} in your cart. If ${benefit.toLowerCase()} matters to you, your cart is ready when you are.`, "Return to cart"),
    draft("abandoned_cart", 2, `A closer look at ${product.title}`, firstObjection, `Still deciding? Consider ${firstObjection.toLowerCase()} alongside the product features and your own use case.`, "View product"),
    draft("abandoned_cart", 3, `Your ${product.title} cart reminder`, `Current offer: ${value}`, `Your cart reminder for ${product.title}. The current product offer is ${value}; no extra urgency or discount has been added.`, "Return to cart"),
    draft("post_purchase", 1, `Your ${product.title} order`, "Thanks for your purchase", `Thanks for choosing ${product.title}. Keep your order confirmation for shipping and support details.`, "View order"),
    draft("post_purchase", 2, `Getting started with ${product.title}`, secondBenefit, `Before first use, review the merchant's product guide and care instructions for ${product.title}.`, "Read product guide"),
    draft("post_purchase", 3, `How is ${product.title} working for you?`, "Share your experience", `Once you have had time to use ${product.title}, share honest feedback about your experience.`, "Share feedback"),
    draft("win_back", 1, `Revisit ${product.title}`, benefit, `${product.title} may be worth another look if you still need ${benefit.toLowerCase()}.`, "View product"),
    draft("win_back", 2, `${product.title} for ${audience}`, brain.angles[1]?.hook ?? secondBenefit, `${brain.angles[1]?.reason ?? secondBenefit}. Compare the features with what you need now.`, "View product"),
    draft("win_back", 3, `Current ${product.title} offer`, value, `If the timing is better now, the current offer for ${product.title} is ${value}.`, "See current offer"),
  ];
  return { channel: "email", status: "DRAFT", emails };
}

export function validateEmailCampaignDraft(draftValue: EmailCampaignDraft): readonly string[] {
  const issues: string[] = [];
  if (draftValue.status !== "DRAFT") issues.push("email campaign must remain DRAFT");
  if (draftValue.emails.length !== 12) issues.push("email campaign must contain 12 draft emails");
  for (const [index, email] of draftValue.emails.entries()) {
    if (email.status !== "DRAFT") issues.push(`emails[${index}] must remain DRAFT`);
    if (email.subject.length > 60) issues.push(`emails[${index}].subject exceeds 60 characters`);
    if (email.previewText.length > 90) issues.push(`emails[${index}].previewText exceeds 90 characters`);
    if (!email.body.includes("[UNSUBSCRIBE_URL]")) issues.push(`emails[${index}] is missing unsubscribe placeholder`);
  }
  return issues;
}
