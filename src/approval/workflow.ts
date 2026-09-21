export type ApprovalStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";
export type ApprovalRecord = Readonly<{
  assetId: string;
  status: ApprovalStatus;
  note: string | null;
}>;

const allowed: Readonly<Record<ApprovalStatus, readonly ApprovalStatus[]>> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["IN_REVIEW"],
  REJECTED: ["IN_REVIEW"],
};

export function transitionApproval(record: ApprovalRecord, next: ApprovalStatus, note: string | null = null): ApprovalRecord {
  if (!allowed[record.status].includes(next)) throw new Error(`Invalid approval transition: ${record.status} -> ${next}`);
  if (next === "REJECTED" && !note?.trim()) throw new Error("A rejection note is required");
  return { assetId: record.assetId, status: next, note: note?.trim() || null };
}

export function canPublish(record: ApprovalRecord): boolean {
  return record.status === "APPROVED";
}
