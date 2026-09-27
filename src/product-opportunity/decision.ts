import type {
  OpportunityGate,
  OpportunityGateStatus,
  ProductOpportunityDecision,
  ProductOpportunityInput,
} from "./types.js";

function requireCount(
  value: number,
  field: string,
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${field} must be a non-negative integer.`,
    );
  }
}

function requireFiniteOrNull(
  value: number | null,
  field: string,
): void {
  if (
    value !== null &&
    !Number.isFinite(value)
  ) {
    throw new Error(
      `${field} must be finite or null.`,
    );
  }
}

function validateInput(
  input: ProductOpportunityInput,
): void {
  if (
    typeof input.candidateId !== "string" ||
    !input.candidateId.trim()
  ) {
    throw new Error(
      "candidateId is required.",
    );
  }

  const counts = [
    ["demand.independentSourceCount", input.demand.independentSourceCount],
    ["competition.competitorCount", input.competition.competitorCount],
    ["competition.comparableCompetitorCount", input.competition.comparableCompetitorCount],
    ["customer.reviewCount", input.customer.reviewCount],
    ["customer.recurringPainPointCount", input.customer.recurringPainPointCount],
    ["supplier.supplierCount", input.supplier.supplierCount],
    ["supplier.verifiedSupplierCount", input.supplier.verifiedSupplierCount],
    ["supplier.criticalConflictCount", input.supplier.criticalConflictCount],
    ["evidence.totalSourceCount", input.evidence.totalSourceCount],
    ["evidence.verifiedSourceCount", input.evidence.verifiedSourceCount],
    ["evidence.criticalConflictCount", input.evidence.criticalConflictCount],
    ["evidence.unsupportedClaimCount", input.evidence.unsupportedClaimCount],
  ] as const;

  for (const [field, value] of counts) {
    requireCount(
      value,
      field,
    );
  }

  if (
    input.competition.comparableCompetitorCount >
    input.competition.competitorCount
  ) {
    throw new Error(
      "comparableCompetitorCount cannot exceed competitorCount.",
    );
  }

  if (
    input.supplier.verifiedSupplierCount >
    input.supplier.supplierCount
  ) {
    throw new Error(
      "verifiedSupplierCount cannot exceed supplierCount.",
    );
  }

  if (
    input.evidence.verifiedSourceCount >
    input.evidence.totalSourceCount
  ) {
    throw new Error(
      "verifiedSourceCount cannot exceed totalSourceCount.",
    );
  }

  const finiteFields = [
    ["demand.normalizedTrendIndex", input.demand.normalizedTrendIndex],
    ["demand.trendGrowthPercent", input.demand.trendGrowthPercent],
    ["competition.medianPrice", input.competition.medianPrice],
    ["competition.medianReviewCount", input.competition.medianReviewCount],
    ["economics.sellingPrice", input.economics.sellingPrice],
    ["economics.landedCost", input.economics.landedCost],
    ["economics.contributionBeforeAds", input.economics.contributionBeforeAds],
    ["economics.contributionAfterAds", input.economics.contributionAfterAds],
    ["economics.contributionMarginPercent", input.economics.contributionMarginPercent],
    ["economics.breakEvenCpa", input.economics.breakEvenCpa],
  ] as const;

  for (const [field, value] of finiteFields) {
    requireFiniteOrNull(
      value,
      field,
    );
  }

  if (
    input.demand.normalizedTrendIndex !== null &&
    (
      input.demand.normalizedTrendIndex < 0 ||
      input.demand.normalizedTrendIndex > 100
    )
  ) {
    throw new Error(
      "normalizedTrendIndex must be between 0 and 100.",
    );
  }
}

function gate(
  code: OpportunityGate["code"],
  status: OpportunityGateStatus,
  message: string,
): OpportunityGate {
  return {
    code,
    status,
    message,
  };
}

function deriveDecision(
  gates: readonly OpportunityGate[],
): ProductOpportunityDecision["decision"] {
  if (
    gates.some(
      (item) =>
        item.status === "REJECT",
    )
  ) {
    return "REJECT";
  }

  if (
    gates.some(
      (item) =>
        item.status === "HOLD",
    )
  ) {
    return "HOLD";
  }

  return "VALIDATE";
}

export function evaluateProductOpportunity(
  input: ProductOpportunityInput,
): ProductOpportunityDecision {
  validateInput(input);

  const gates: OpportunityGate[] = [];

  gates.push(
    input.demand.verified &&
      input.demand.independentSourceCount > 0
      ? gate(
          "DEMAND_VERIFIED",
          "PASS",
          "Independent demand evidence is present.",
        )
      : gate(
          "DEMAND_VERIFIED",
          "HOLD",
          "Independent demand evidence is missing or unverified.",
        ),
  );

  gates.push(
    input.competition.comparableCompetitorCount >= 5
      ? gate(
          "COMPETITOR_SAMPLE",
          "PASS",
          "At least five comparable competitors are available.",
        )
      : gate(
          "COMPETITOR_SAMPLE",
          "HOLD",
          "Fewer than five comparable competitors are available.",
        ),
  );

  gates.push(
    input.customer.reviewCount >= 10
      ? gate(
          "CUSTOMER_EVIDENCE",
          "PASS",
          "Customer review evidence is sufficient for initial thematic analysis.",
        )
      : gate(
          "CUSTOMER_EVIDENCE",
          "WARN",
          "Fewer than ten reviews are available; customer themes are directional only.",
        ),
  );

  const economicsComplete =
    input.economics.sellingPrice !== null &&
    input.economics.landedCost !== null &&
    input.economics.contributionBeforeAds !== null &&
    input.economics.contributionAfterAds !== null &&
    input.economics.contributionMarginPercent !== null &&
    input.economics.breakEvenCpa !== null;

  if (!economicsComplete) {
    gates.push(
      gate(
        "ECONOMICS",
        "HOLD",
        "Complete unit economics are required before validation.",
      ),
    );
  } else if (
    input.economics.contributionAfterAds! <= 0 ||
    input.economics.contributionMarginPercent! <= 0
  ) {
    gates.push(
      gate(
        "ECONOMICS",
        "REJECT",
        "Base-case economics are not contribution-positive after advertising.",
      ),
    );
  } else {
    gates.push(
      gate(
        "ECONOMICS",
        "PASS",
        "Base-case economics remain contribution-positive after advertising.",
      ),
    );
  }

  gates.push(
    input.supplier.verifiedSupplierCount > 0
      ? gate(
          "SUPPLIER_VERIFIED",
          "PASS",
          "At least one supplier record is verified.",
        )
      : gate(
          "SUPPLIER_VERIFIED",
          "HOLD",
          "No verified supplier record is available.",
        ),
  );

  gates.push(
    input.supplier.criticalConflictCount === 0
      ? gate(
          "SUPPLIER_CONFLICT",
          "PASS",
          "No unresolved critical supplier conflicts were found.",
        )
      : gate(
          "SUPPLIER_CONFLICT",
          "HOLD",
          "Critical supplier facts contain unresolved conflicts.",
        ),
  );

  gates.push(
    input.evidence.totalSourceCount > 0 &&
      input.evidence.verifiedSourceCount > 0
      ? gate(
          "EVIDENCE_PROVENANCE",
          "PASS",
          "Verified evidence provenance is available.",
        )
      : gate(
          "EVIDENCE_PROVENANCE",
          "HOLD",
          "Verified evidence provenance is insufficient.",
        ),
  );

  gates.push(
    input.evidence.criticalConflictCount === 0
      ? gate(
          "EVIDENCE_CONFLICT",
          "PASS",
          "No unresolved critical evidence conflicts were found.",
        )
      : gate(
          "EVIDENCE_CONFLICT",
          "HOLD",
          "Critical evidence conflicts must be resolved.",
        ),
  );

  gates.push(
    input.evidence.unsupportedClaimCount === 0
      ? gate(
          "UNSUPPORTED_CLAIMS",
          "PASS",
          "No unsupported product claims are present.",
        )
      : gate(
          "UNSUPPORTED_CLAIMS",
          "HOLD",
          "Unsupported product claims must be removed or verified.",
        ),
  );

  return {
    candidateId:
      input.candidateId,

    contractVersion:
      "1.0.0",

    decision:
      deriveDecision(gates),

    gates,

    policies: {
      normalizedTrendMeaning:
        "RELATIVE_INTEREST_ONLY",

      competitorPercentageMeaning:
        "SAMPLED_COMPETITOR_PENETRATION_ONLY",

      outcomeMeaning:
        "VALIDATION_GUIDANCE_NOT_GUARANTEE",
    },
  };
}
