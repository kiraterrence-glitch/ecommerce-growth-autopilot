export type SupplierPlatform = "aliexpress" | "alibaba" | "other";

export type SupplierUrlIntake = Readonly<{
  originalUrl: string;
  normalizedUrl: string;
  hostname: string;
  platform: SupplierPlatform;
}>;

export type ProductPageJobStatus =
  | "RESEARCH_REQUIRED"
  | "READY_FOR_BRIEF"
  | "NEEDS_VERIFICATION"
  | "BRIEF_READY"
  | "WAITING_APPROVAL"
  | "APPROVED_LOCAL";

export type SpecificationObservation = Readonly<{
  field: string;
  value: string;
  sourceId: string;
  critical: boolean;
}>;

export type VerifiedSpecification = Readonly<{
  field: string;
  status: "VERIFIED" | "NEEDS_VERIFICATION";
  value: string | null;
  critical: boolean;
  observations: readonly SpecificationObservation[];
}>;

export type SpecificationVerification = Readonly<{
  specifications: readonly VerifiedSpecification[];
  unresolvedCriticalFields: readonly string[];
}>;

export type ProductPageSectionType =
  | "hero"
  | "problem"
  | "benefits"
  | "demo"
  | "features"
  | "comparison"
  | "use_cases"
  | "objections"
  | "faq"
  | "offer"
  | "shipping_returns"
  | "cta";

export type ProductPageSectionBrief = Readonly<{
  type: ProductPageSectionType;
  objective: string;
  headline: string;
  body: string;
  evidenceIds: readonly string[];
  recommendedVisual: string | null;
}>;

export type VerifiedSpecificationSummary = Readonly<{
  field: string;
  value: string;
  sourceIds: readonly string[];
}>;

export type ProductPageBrief = Readonly<{
  status: "DRAFT";
  productTitle: string;
  primaryAngle: string;
  targetAudiences: readonly string[];
  customerProblems: readonly string[];
  desiredOutcomes: readonly string[];
  objections: readonly string[];
  buyingTriggers: readonly string[];
  verifiedSpecifications: readonly VerifiedSpecificationSummary[];
  sections: readonly ProductPageSectionBrief[];
  seoTitle: string;
  seoDescription: string;
}>;

export type ProductPageMediaStatus =
  | "AVAILABLE"
  | "NEEDS_SOURCE"
  | "READY_TO_RENDER";

export type ProductPageMediaAsset = Readonly<{
  id: string;
  type: "image" | "gif" | "video";
  purpose: string;
  status: ProductPageMediaStatus;
  sourceUrl: string | null;
}>;

export type ProductPageShopifyDraft = Readonly<{
  channel: "shopify";
  status: "DRAFT";
  externalWrite: false;
  handle: string;
  title: string;
  descriptionHtml: string;
  sections: readonly ProductPageSectionBrief[];
  mediaSlots: readonly ProductPageMediaAsset[];
  variants: readonly Readonly<Record<string, string>>[];
  variantStatus: "NEEDS_SOURCE";
  tags: readonly string[];
  seo: Readonly<{
    title: string;
    description: string;
  }>;
  metafields: Readonly<Record<string, string>>;
}>;

export type GemPagesBlock = Readonly<{
  blockType: ProductPageSectionType;
  content: Readonly<Record<string, string | null>>;
}>;

export type GemPagesManifest = Readonly<{
  status: "DRAFT";
  externalWrite: false;
  blocks: readonly GemPagesBlock[];
}>;

export type ProductPageQualityIssue = Readonly<{
  code: string;
  severity: "error" | "warning";
  message: string;
}>;

export type ProductPageQualityReport = Readonly<{
  passed: boolean;
  errors: number;
  warnings: number;
  checks: readonly string[];
  issues: readonly ProductPageQualityIssue[];
}>;

export type ProductPageApproval = Readonly<{
  status: "WAITING" | "APPROVED" | "REJECTED";
  reviewedAt: string | null;
  note: string | null;
}>;

export type ProductPageSafety = Readonly<{
  externalWrites: false;
  livePublishing: false;
  humanApprovalRequired: true;
}>;

export type ProductPageJob = Readonly<{
  jobId: string;
  supplier: SupplierUrlIntake;
  status: ProductPageJobStatus;
  createdAt: string;
  updatedAt: string;
  productId: string | null;
  researchProjectId: string | null;
  verification: SpecificationVerification | null;
  brief: ProductPageBrief | null;
  mediaPlan: readonly ProductPageMediaAsset[] | null;
  shopifyDraft: ProductPageShopifyDraft | null;
  gemPagesManifest: GemPagesManifest | null;
  quality: ProductPageQualityReport | null;
  approval: ProductPageApproval;
  safety: ProductPageSafety;
}>;
