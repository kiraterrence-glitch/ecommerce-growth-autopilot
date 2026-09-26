export const CONTENT_INTELLIGENCE_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "shopify",
  "amazon",
  "other",
] as const;

export type ContentIntelligencePlatform =
  (typeof CONTENT_INTELLIGENCE_PLATFORMS)[number];

export const CONTENT_INTELLIGENCE_HOOK_TYPES = [
  "Result",
  "Curiosity",
  "Question",
  "Contrarian",
  "Problem",
  "Authority",
  "Story",
  "Recognition",
  "Demonstration",
  "Unclassified",
] as const;

export type ContentIntelligenceHookType =
  (typeof CONTENT_INTELLIGENCE_HOOK_TYPES)[number];

export const CONTENT_INTELLIGENCE_STRUCTURES = [
  "Problem → Solution",
  "Before → After",
  "Mistake → Fix",
  "Claim → Proof",
  "Story → Lesson",
  "List",
  "Demonstration",
  "Testimonial",
  "Unclassified",
] as const;

export type ContentIntelligenceStructure =
  (typeof CONTENT_INTELLIGENCE_STRUCTURES)[number];

export const CONTENT_INTELLIGENCE_CREATIVE_FORMATS = [
  "Talking Head",
  "Demonstration",
  "UGC",
  "Testimonial",
  "Listicle",
  "Screen Recording",
  "Static",
  "Unclassified",
] as const;

export type ContentIntelligenceCreativeFormat =
  (typeof CONTENT_INTELLIGENCE_CREATIVE_FORMATS)[number];

export interface ContentIntelligenceMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followers: number;
}

export interface ContentIntelligenceRecord {
  id: string;
  platform: ContentIntelligencePlatform;
  sourceUrl: string | null;
  creator: string | null;
  publishedAt: string | null;
  transcript: string;
  metrics: ContentIntelligenceMetrics;
  tags: string[];
}

export interface ContentIntelligenceClassification {
  contentId: string;
  topic: string;
  hookText: string;
  hookType: ContentIntelligenceHookType;
  structure: ContentIntelligenceStructure;
  audience: string[];
  painPoints: string[];
  benefits: string[];
  objections: string[];
  buyingTriggers: string[];
  cta: string | null;
  offerPositioning: string | null;
  creativeFormat: ContentIntelligenceCreativeFormat;
  evidenceQuotes: string[];
  classifier: "deterministic";
}
