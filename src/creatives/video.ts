import type { Product } from "../domain/product.js";
import type { ProductBrain } from "../product-brain/types.js";

export type VideoSceneDraft = Readonly<{
  scene: number;
  durationMs: number;
  purpose: "hook" | "problem" | "product" | "benefit" | "offer" | "cta";
  onScreenText: string;
  assetHint: string;
}>;

export type VideoStoryboardDraft = Readonly<{
  status: "DRAFT";
  width: 1080;
  height: 1920;
  fps: 30;
  totalDurationMs: number;
  scenes: readonly VideoSceneDraft[];
}>;

function offerText(product: Product): string {
  if (product.offer.type === "percentage") return `${product.offer.value}% off`;
  if (product.offer.type === "fixed") return `${product.currency} ${product.offer.value} off`;
  return `Explore ${product.title}`;
}

export function buildVideoStoryboardDraft(product: Product, brain: ProductBrain): VideoStoryboardDraft {
  const scenes: VideoSceneDraft[] = [
    { scene: 1, durationMs: 3000, purpose: "hook", onScreenText: brain.angles[0]?.hook ?? product.title, assetHint: "Fast product reveal or contextual lifestyle shot" },
    { scene: 2, durationMs: 3000, purpose: "problem", onScreenText: brain.painPoints[0] ?? "A familiar customer problem", assetHint: "Show the customer problem without exaggeration" },
    { scene: 3, durationMs: 4000, purpose: "product", onScreenText: product.title, assetHint: "Clean product close-up using supplied product imagery" },
    { scene: 4, durationMs: 4000, purpose: "benefit", onScreenText: brain.benefits[0] ?? product.benefits[0] ?? product.description, assetHint: "Demonstrate or visualize only supplied product benefits" },
    { scene: 5, durationMs: 3000, purpose: "offer", onScreenText: offerText(product), assetHint: "Simple offer card; no invented scarcity or countdown" },
    { scene: 6, durationMs: 3000, purpose: "cta", onScreenText: "Shop now", assetHint: "Product plus clear CTA" },
  ];
  return { status: "DRAFT", width: 1080, height: 1920, fps: 30, totalDurationMs: scenes.reduce((sum, scene) => sum + scene.durationMs, 0), scenes };
}

export function validateVideoStoryboardDraft(draft: VideoStoryboardDraft): readonly string[] {
  const issues: string[] = [];
  if (draft.status !== "DRAFT") issues.push("video storyboard must remain DRAFT");
  if (draft.width !== 1080 || draft.height !== 1920) issues.push("video storyboard must be 1080x1920");
  if (draft.scenes.length !== 6) issues.push("video storyboard must contain 6 scenes");
  if (draft.totalDurationMs !== 20_000) issues.push("video storyboard must total 20 seconds");
  return issues;
}
