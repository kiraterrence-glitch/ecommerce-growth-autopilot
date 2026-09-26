
export type ProductLifecycleStatus =
  | "DRAFT"
  | "RESEARCHING"
  | "NEEDS_VERIFICATION"
  | "READY"
  | "ARCHIVED";

export type ProductSourceType =
  | "supplier"
  | "competitor"
  | "manual"
  | "import";

export type EvidenceStatus =
  | "VERIFIED"
  | "CONFLICTING"
  | "UNVERIFIED";

export type QaRunType =
  | "deterministic"
  | "browser"
  | "visual"
  | "security"
  | "accessibility"
  | "performance";

export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type ProductRecord = Readonly<{
  id: string;
  sku: string;
  title: string;
  status: ProductLifecycleStatus;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}>;

export type ProductRevisionRecord = Readonly<{
  id: string;
  productId: string;
  revisionNumber: number;
  snapshotJson: string;
  createdAt: string;
}>;

export type ProductVariantRecord = Readonly<{
  id: string;
  productId: string;
  variantKey: string;
  title: string;
  sku: string | null;
  price: number | null;
  currency: string | null;
  createdAt: string;
}>;

export type ProductSourceRecord = Readonly<{
  id: string;
  productId: string;
  sourceType: ProductSourceType;
  sourceUrl: string | null;
  contentHash: string | null;
  capturedAt: string;
  status: string;
}>;

export type EvidenceRecord = Readonly<{
  id: string;
  productId: string;
  sourceId: string;
  field: string;
  rawValue: string;
  normalizedValue: string | null;
  unit: string | null;
  status: EvidenceStatus;
  capturedAt: string;
}>;

export type CompetitorLinkRecord = Readonly<{
  id: string;
  productId: string;
  competitorProductId: string;
  relationship: string;
  confirmed: boolean;
  createdAt: string;
}>;

export type ComparisonRunRecord = Readonly<{
  id: string;
  productId: string;
  competitorProductId: string;
  status: string;
  resultJson: string;
  createdAt: string;
}>;

export type VisualAssetRecord = Readonly<{
  id: string;
  productId: string;
  kind: string;
  filePath: string;
  rightsStatus: string | null;
  evidenceIdsJson: string;
  createdAt: string;
}>;

export type ProductPageDraftRecord = Readonly<{
  id: string;
  productId: string;
  version: number;
  htmlPath: string;
  status: string;
  createdAt: string;
}>;

export type QaRunRecord = Readonly<{
  id: string;
  productId: string;
  qaType: QaRunType;
  passed: boolean;
  errors: number;
  warnings: number;
  reportJson: string;
  createdAt: string;
}>;

export type ApprovalRecord = Readonly<{
  id: string;
  productId: string;
  artifactType: string;
  artifactId: string;
  status: ApprovalStatus;
  approvedAt: string | null;
  createdAt: string;
}>;

export type ProductIntelligenceSnapshot = Readonly<{
  product: ProductRecord;
  revisions: readonly ProductRevisionRecord[];
  variants: readonly ProductVariantRecord[];
  sources: readonly ProductSourceRecord[];
  evidence: readonly EvidenceRecord[];
  competitors: readonly CompetitorLinkRecord[];
  comparisons: readonly ComparisonRunRecord[];
  visuals: readonly VisualAssetRecord[];
  drafts: readonly ProductPageDraftRecord[];
  qaRuns: readonly QaRunRecord[];
  approvals: readonly ApprovalRecord[];
}>;
