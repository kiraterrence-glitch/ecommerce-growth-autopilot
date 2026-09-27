import type {
  ProductAssetRightsStatus,
  SafeComparisonClaim,
} from "../product-research/types.js";

export type ProductVisualKind =
  | "hero"
  | "benefit"
  | "feature"
  | "comparison"
  | "offer";

export type GroundedVisualStatement = Readonly<{
  text: string;
  evidenceIds: readonly string[];
}>;

export type ProductVisualSourceImage = Readonly<{
  url: string;
  evidenceId: string;
  rightsStatus: ProductAssetRightsStatus;
}>;

export type ProductVisualInput = Readonly<{
  jobId: string;
  productTitle: string;
  subtitle: string;
  titleEvidenceIds: readonly string[];
  knownEvidenceIds: readonly string[];
  sourceImage: ProductVisualSourceImage | null;
  benefits: readonly GroundedVisualStatement[];
  features: readonly GroundedVisualStatement[];
  offer: GroundedVisualStatement;
  comparisonClaims: readonly SafeComparisonClaim[];
}>;

export type ProductVisualAssetStatus =
  | "READY"
  | "NEEDS_SOURCE";

export type ProductVisualAsset = Readonly<{
  assetId: string;
  kind: ProductVisualKind;
  filename: string;
  width: number;
  height: number;
  status: ProductVisualAssetStatus;
  svg: string;
  evidenceIds: readonly string[];
  sourceImageUrl: string | null;
  rightsStatus: ProductAssetRightsStatus | null;
}>;

export type ProductVisualQaIssue = Readonly<{
  code: string;
  severity: "error" | "warning";
  message: string;
  assetId: string | null;
}>;

export type ProductVisualQaReport = Readonly<{
  passed: boolean;
  errors: number;
  warnings: number;
  readyAssetCount: number;
  needsSourceCount: number;
  issues: readonly ProductVisualQaIssue[];
}>;

export type ProductVisualPack = Readonly<{
  jobId: string;
  generatedAt: string;
  assets: readonly ProductVisualAsset[];
  qa: ProductVisualQaReport;
}>;
