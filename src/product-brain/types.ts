export type MarketingAngle = Readonly<{
  name: string;
  hook: string;
  reason: string;
}>;

export type ProductBrain = Readonly<{
  audiences: readonly string[];
  painPoints: readonly string[];
  benefits: readonly string[];
  objections: readonly string[];
  buyingTriggers: readonly string[];
  angles: readonly MarketingAngle[];
  offerPositioning: string;
}>;

export type ProductBrainValidationResult =
  | Readonly<{ ok: true; brain: ProductBrain }>
  | Readonly<{ ok: false; issues: readonly string[] }>;
