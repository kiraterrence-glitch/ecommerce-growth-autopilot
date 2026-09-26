
import type {
  ApprovalRecord,
  ComparisonRunRecord,
  CompetitorLinkRecord,
  EvidenceRecord,
  ProductIntelligenceSnapshot,
  ProductPageDraftRecord,
  ProductRecord,
  ProductRevisionRecord,
  ProductSourceRecord,
  ProductVariantRecord,
  QaRunRecord,
  VisualAssetRecord,
} from "./types.js";

export interface ProductIntelligenceRepository {
  createProduct(
    record: ProductRecord,
  ): void;

  getProduct(
    productId: string,
  ): ProductRecord | null;

  getProductByFingerprint(
    fingerprint: string,
  ): ProductRecord | null;

  listProducts(): readonly ProductRecord[];

  addRevision(
    record: ProductRevisionRecord,
  ): void;

  addVariant(
    record: ProductVariantRecord,
  ): void;

  addSource(
    record: ProductSourceRecord,
  ): void;

  addEvidence(
    record: EvidenceRecord,
  ): void;

  addCompetitorLink(
    record: CompetitorLinkRecord,
  ): void;

  addComparisonRun(
    record: ComparisonRunRecord,
  ): void;

  addVisualAsset(
    record: VisualAssetRecord,
  ): void;

  addProductPageDraft(
    record: ProductPageDraftRecord,
  ): void;

  addQaRun(
    record: QaRunRecord,
  ): void;

  addApproval(
    record: ApprovalRecord,
  ): void;

  getSnapshot(
    productId: string,
  ): ProductIntelligenceSnapshot | null;
}
