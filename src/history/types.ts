export type ProjectHistoryEventType =
  | "research.analyzed"
  | "campaign.generated"
  | "approval.transition"
  | "delivery.created";

export type ProjectHistoryEvent = Readonly<{
  eventId: string;
  eventType: ProjectHistoryEventType;
  timestamp: string;
  campaignId: string | null;
  productId: string | null;
  researchProjectId: string | null;
  assetId: string | null;
  payload: Readonly<Record<string, unknown>>;
}>;

export type CampaignHistorySummary = Readonly<{
  campaignId: string;
  productId: string;
  productTitle: string;
  aiProvider: string;
  researchUsed: boolean;
  qualityPassed: boolean;
  createdAt: string;
}>;
