export type ProductIntelligenceSyncEnvelope =
  Readonly<{
    schemaVersion: 1;
    productId: string;
    fingerprint: string;
    updatedAt: string;
    revisionNumber: number;
    payloadHash: string;
    snapshot: unknown;
  }>;

export type ProductIntelligenceRemoteResult =
  Readonly<{
    status:
      | "APPLIED"
      | "ALREADY_CURRENT"
      | "REMOTE_NEWER";
    remoteVersion?: string;
  }>;

export interface ProductIntelligenceRemoteStore {
  upsertSnapshot(
    envelope: ProductIntelligenceSyncEnvelope,
  ): Promise<ProductIntelligenceRemoteResult>;
}
