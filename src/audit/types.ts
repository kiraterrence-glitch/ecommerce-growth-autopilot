export type AuditStatus = "success" | "failure";

export type AuditEvent = Readonly<{
  eventId: string;
  timestamp: string;
  eventType: string;
  productId: string | null;
  provider: string | null;
  status: AuditStatus;
  durationMs: number;
  details: Readonly<Record<string, unknown>>;
}>;

export interface AuditStore {
  append(event: AuditEvent): Promise<void>;
}
