import type { Product } from "../domain/product.js";
import type { ProductBrain } from "./types.js";

export type GroundingIssue = Readonly<{
  kind: "unsupported-number" | "unsupported-risky-claim";
  value: string;
  message: string;
}>;

const riskyClaims = [
  "fda approved",
  "clinically proven",
  "doctor recommended",
  "guaranteed results",
  "100% guaranteed",
  "cures",
  "treats disease",
  "prevents disease",
  "medically certified",
];

function productSource(product: Product): string {
  return [
    product.sku,
    product.title,
    product.description,
    ...product.features,
    ...product.benefits,
    ...product.audiences,
    product.offer.type,
    String(product.offer.value),
    String(product.price),
    product.currency,
  ]
    .join(" ")
    .toLocaleLowerCase("en-US");
}

function brainSource(brain: ProductBrain): string {
  return [
    ...brain.audiences,
    ...brain.painPoints,
    ...brain.benefits,
    ...brain.objections,
    ...brain.buyingTriggers,
    ...brain.angles.flatMap((angle) => [angle.name, angle.hook, angle.reason]),
    brain.offerPositioning,
  ].join(" ");
}

function numericTokens(value: string): Set<string> {
  const matches = value.match(/\b\d+(?:\.\d+)?%?\b/g) ?? [];
  return new Set(matches.map((token) => token.replace(/%$/, "")));
}

export function findGroundingIssues(product: Product, brain: ProductBrain): readonly GroundingIssue[] {
  const source = productSource(product);
  const generated = brainSource(brain);
  const sourceNumbers = numericTokens(source);
  const generatedNumbers = numericTokens(generated);
  const issues: GroundingIssue[] = [];

  for (const number of generatedNumbers) {
    if (!sourceNumbers.has(number)) {
      issues.push({
        kind: "unsupported-number",
        value: number,
        message: `generated numeric claim ${number} is not present in supplied product data`,
      });
    }
  }

  const generatedLower = generated.toLocaleLowerCase("en-US");
  for (const phrase of riskyClaims) {
    if (generatedLower.includes(phrase) && !source.includes(phrase)) {
      issues.push({
        kind: "unsupported-risky-claim",
        value: phrase,
        message: `generated risky claim \"${phrase}\" is not supported by supplied product data`,
      });
    }
  }

  return issues;
}
