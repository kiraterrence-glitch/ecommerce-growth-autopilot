export type ResearchSourceKind =
  | "supplier"
  | "competitor"
  | "manual_import"
  | "html_snapshot"
  | "csv_import";

export type EvidenceConfidence =
  | "direct"
  | "derived"
  | "user_confirmed";

export type ExtractionStatus =
  | "EXTRACTED"
  | "PARTIAL"
  | "MANUAL_CAPTURE_REQUIRED"
  | "BLOCKED";

export type RawEvidenceFormat =
  | "structured_data"
  | "dom"
  | "manual"
  | "html_snapshot"
  | "csv";

export type EvidenceRecord = Readonly<{
  evidenceId: string;
  jobId: string;
  sourceId: string;
  sourceKind: ResearchSourceKind;
  sourceUrl: string | null;
  field: string;
  rawValue: string;
  normalizedValue: string | number | boolean | null;
  unit: string | null;
  variantId: string | null;
  confidence: EvidenceConfidence;
  capturedAt: string;
  extractor: string;
  notes: readonly string[];
}>;

export type SourceSnapshot = Readonly<{
  sourceId: string;
  sourceKind: ResearchSourceKind;
  sourceUrl: string | null;
  capturedAt: string;
  adapterId: string;
  status: ExtractionStatus;
  rawFormat: RawEvidenceFormat;
  evidence: readonly EvidenceRecord[];
  warnings: readonly string[];
}>;

export type EvidenceConflict = Readonly<{
  field: string;
  variantId: string | null;
  values: readonly Readonly<{
    normalizedValue: string | number | boolean | null;
    unit: string | null;
    evidenceIds: readonly string[];
  }>[];
}>;

export type EvidenceLedger = Readonly<{
  jobId: string;
  createdAt: string;
  snapshots: readonly SourceSnapshot[];
  evidence: readonly EvidenceRecord[];
  conflicts: readonly EvidenceConflict[];
}>;

export type EvidenceAuditIssue = Readonly<{
  code: string;
  severity: "error" | "warning";
  message: string;
  evidenceId: string | null;
}>;

export type EvidenceAuditReport = Readonly<{
  passed: boolean;
  errors: number;
  warnings: number;
  evidenceCount: number;
  sourceCount: number;
  conflictCount: number;
  issues: readonly EvidenceAuditIssue[];
}>;

export type ManualEvidenceInput = Readonly<{
  field: string;
  value: string;
  unit?: string | null;
  variantId?: string | null;
  confidence?: EvidenceConfidence;
  notes?: readonly string[];
}>;

export type ProductSourceAdapterContext = Readonly<{
  jobId: string;
  sourceId: string;
  sourceKind: ResearchSourceKind;
  capturedAt?: string;
}>;

export interface ProductSourceAdapter {
  readonly id: string;

  canHandle(url: URL): boolean;

  extract(
    url: URL,
    context: ProductSourceAdapterContext,
  ): Promise<SourceSnapshot>;
}
export type ProductAssetKind =
  | "image"
  | "video";

export type ProductAssetRightsStatus =
  | "UNKNOWN_RIGHTS"
  | "USER_PROVIDED"
  | "APPROVED_FOR_DEMO"
  | "APPROVED_FOR_COMMERCIAL_USE";

export type ProductAssetCandidate = Readonly<{
  assetId: string;
  sourceEvidenceId: string;
  sourceId: string;
  kind: ProductAssetKind;
  sourceUrl: string;
  rightsStatus: ProductAssetRightsStatus;
}>;

export type StoredProductAsset = Readonly<{
  assetId: string;
  sourceEvidenceId: string;
  sourceUrl: string;
  kind: ProductAssetKind;
  mimeType: string;
  byteLength: number;
  sha256: string;
  localPath: string;
  rightsStatus: ProductAssetRightsStatus;
}>;
export type CompetitorRelationship =
  | "COMPARABLE"
  | "PARTIALLY_COMPARABLE"
  | "NOT_COMPARABLE";

export type ComparisonCellStatus =
  | "VERIFIED"
  | "CONFLICT"
  | "MISSING";

export type ComparisonCell = Readonly<{
  status: ComparisonCellStatus;
  rawValue: string | null;
  normalizedValue: string | number | boolean | null;
  unit: string | null;
  evidenceIds: readonly string[];
}>;

export type CompetitorComparisonInput = Readonly<{
  competitorId: string;
  label: string;
  snapshot: SourceSnapshot;
  userConfirmedComparable: boolean;
  comparisonBasis: readonly string[];
}>;

export type ComparisonCompetitor = Readonly<{
  competitorId: string;
  label: string;
  relationship: CompetitorRelationship;
  comparisonBasis: readonly string[];
  sharedFieldCount: number;
}>;

export type ComparisonRowCompetitor = Readonly<{
  competitorId: string;
  cell: ComparisonCell;
}>;

export type ComparisonRow = Readonly<{
  field: string;
  primary: ComparisonCell;
  competitors: readonly ComparisonRowCompetitor[];
}>;

export type ComparisonMatrix = Readonly<{
  primaryLabel: string;
  generatedAt: string;
  competitors: readonly ComparisonCompetitor[];
  rows: readonly ComparisonRow[];
  excludedCompetitors: readonly string[];
}>;

export type SafeComparisonClaim = Readonly<{
  claimId: string;
  competitorId: string;
  field: string;
  direction: "higher" | "lower" | "equal";
  text: string;
  evidenceIds: readonly string[];
}>;

export type ComparisonAuditIssue = Readonly<{
  code: string;
  severity: "error" | "warning";
  message: string;
}>;

export type ComparisonAuditReport = Readonly<{
  passed: boolean;
  errors: number;
  warnings: number;
  competitorCount: number;
  comparableCompetitorCount: number;
  rowCount: number;
  claimCount: number;
  issues: readonly ComparisonAuditIssue[];
}>;
