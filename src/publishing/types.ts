export type DeliveryChannel = "meta" | "shopify" | "google_ads" | "email";
export type DeliveryMode = "mock" | "draft";
export type DeliveryStatus = "MOCKED" | "DRAFT_CREATED_LOCAL";

export type DeliveryArtifact = Readonly<{
  assetId: string;
  label: string;
}>;

export type DeliveryRequest = Readonly<{
  campaignId: string;
  channel: DeliveryChannel;
  mode: DeliveryMode;
  artifacts: readonly DeliveryArtifact[];
  approvedAssetIds: readonly string[];
  payload: unknown;
}>;

export type DeliveryResult = Readonly<{
  campaignId: string;
  channel: DeliveryChannel;
  mode: DeliveryMode;
  status: DeliveryStatus;
  adapterId: string;
  externalWrite: false;
  artifactCount: number;
  payload: unknown;
}>;

export interface DeliveryAdapter {
  readonly channel: DeliveryChannel;
  readonly mode: DeliveryMode;
  readonly externalWrite: false;
  deliver(request: DeliveryRequest): DeliveryResult;
}
