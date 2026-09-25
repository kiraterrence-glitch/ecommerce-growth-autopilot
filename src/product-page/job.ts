import type {
  GemPagesManifest,
  ProductPageBrief,
  ProductPageJob,
  ProductPageMediaAsset,
  ProductPageQualityReport,
  ProductPageShopifyDraft,
  SpecificationVerification,
  SupplierUrlIntake,
} from "./types.js";

function validTimestamp(value: string): string {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error("job timestamp must be ISO-like");
  }

  return value;
}

export function createProductPageJob(
  jobId: string,
  supplier: SupplierUrlIntake,
  timestamp = new Date().toISOString(),
): ProductPageJob {
  if (!jobId.trim()) {
    throw new Error("jobId is required");
  }

  const now = validTimestamp(timestamp);

  return {
    jobId: jobId.trim(),
    supplier,
    status: "RESEARCH_REQUIRED",
    createdAt: now,
    updatedAt: now,
    productId: null,
    researchProjectId: null,
    verification: null,
    brief: null,
    mediaPlan: null,
    shopifyDraft: null,
    gemPagesManifest: null,
    quality: null,
    approval: {
      status: "WAITING",
      reviewedAt: null,
      note: null,
    },
    safety: {
      externalWrites: false,
      livePublishing: false,
      humanApprovalRequired: true,
    },
  };
}

export function updateProductPageJobVerification(
  job: ProductPageJob,
  verification: SpecificationVerification,
  timestamp = new Date().toISOString(),
): ProductPageJob {
  const status =
    verification.unresolvedCriticalFields.length > 0
      ? "NEEDS_VERIFICATION"
      : verification.specifications.length > 0
        ? "READY_FOR_BRIEF"
        : "RESEARCH_REQUIRED";

  return {
    ...job,
    status,
    updatedAt: validTimestamp(timestamp),
    verification,
  };
}

export function updateProductPageJobBuild(
  job: ProductPageJob,
  input: Readonly<{
    productId: string;
    researchProjectId: string | null;
    verification: SpecificationVerification;
    brief: ProductPageBrief;
    mediaPlan: readonly ProductPageMediaAsset[];
    shopifyDraft: ProductPageShopifyDraft;
    gemPagesManifest: GemPagesManifest;
    quality: ProductPageQualityReport;
  }>,
  timestamp = new Date().toISOString(),
): ProductPageJob {
  return {
    ...job,
    status: input.quality.passed ? "WAITING_APPROVAL" : "BRIEF_READY",
    updatedAt: validTimestamp(timestamp),
    productId: input.productId,
    researchProjectId: input.researchProjectId,
    verification: input.verification,
    brief: input.brief,
    mediaPlan: input.mediaPlan,
    shopifyDraft: input.shopifyDraft,
    gemPagesManifest: input.gemPagesManifest,
    quality: input.quality,
    approval: {
      status: "WAITING",
      reviewedAt: null,
      note: null,
    },
  };
}

export function transitionProductPageApproval(
  job: ProductPageJob,
  next: "APPROVED" | "REJECTED",
  note: string | null,
  timestamp = new Date().toISOString(),
): ProductPageJob {
  if (job.status !== "WAITING_APPROVAL") {
    throw new Error("product page must pass QA before approval");
  }

  const now = validTimestamp(timestamp);

  return {
    ...job,
    status: next === "APPROVED" ? "APPROVED_LOCAL" : "BRIEF_READY",
    updatedAt: now,
    approval: {
      status: next,
      reviewedAt: now,
      note,
    },
  };
}
