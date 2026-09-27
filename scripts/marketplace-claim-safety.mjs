const BLOCKED_MARKETING_PATTERNS = [
  /\bbest\b/i,
  /\bnumber\s*1\b/i,
  /#\s*1\b/i,
  /\bsuperior\b/i,
  /\boutperform/i,
  /\bguarantee(?:d|s)?\b/i,
  /\bfastest\b/i,
  /\bcheapest\b/i,
  /\bultimate\b/i,
  /\bunbeatable\b/i,
];

function numericTokens(value) {
  return (
    String(value ?? "")
      .match(
        /-?\d+(?:\.\d+)?/g,
      ) ?? []
  );
}

export function auditClaimText({
  claimText,
  evidenceRecords,
}) {
  const text =
    String(
      claimText ?? "",
    ).trim();

  if (!text) {
    return {
      allowed:
        false,

      reason:
        "EMPTY_CLAIM",
    };
  }

  for (
    const pattern of
      BLOCKED_MARKETING_PATTERNS
  ) {
    if (
      pattern.test(
        text,
      )
    ) {
      return {
        allowed:
          false,

        reason:
          "UNSAFE_MARKETING_LANGUAGE",
      };
    }
  }

  const claimNumbers =
    numericTokens(
      text,
    );

  const evidenceNumbers =
    new Set(
      evidenceRecords.flatMap(
        (record) => [
          ...numericTokens(
            record.rawValue,
          ),
          ...numericTokens(
            record.normalizedValue,
          ),
        ],
      ),
    );

  for (
    const number of
      claimNumbers
  ) {
    if (
      !evidenceNumbers.has(
        number,
      )
    ) {
      return {
        allowed:
          false,

        reason:
          "UNSUPPORTED_NUMERIC_CLAIM",

        unsupportedNumber:
          number,
      };
    }
  }

  return {
    allowed:
      true,

    reason:
      "SUPPORTED",
  };
}

export function assessAutomatedFactClaim({
  ledger,
  productId,
  field,
  evidenceIds =
    null,
}) {
  const assessment =
    ledger.assessField(
      productId,
      field,
    );

  if (
    assessment.status ===
    "UNVERIFIED"
  ) {
    return {
      allowed:
        false,

      reason:
        "NO_VERIFIED_EVIDENCE",

      assessment,
    };
  }

  if (
    assessment.status ===
    "CONFLICT"
  ) {
    return {
      allowed:
        false,

      reason:
        "EVIDENCE_CONFLICT",

      assessment,
    };
  }

  let selected =
    assessment.verified;

  if (
    evidenceIds !== null
  ) {
    const requested =
      new Set(
        evidenceIds,
      );

    selected =
      evidenceIds.map(
        (id) =>
          ledger.get(id),
      );

    if (
      selected.some(
        (record) =>
          !record,
      )
    ) {
      return {
        allowed:
          false,

        reason:
          "UNKNOWN_EVIDENCE_ID",
      };
    }

    if (
      selected.some(
        (record) =>
          record.productId !==
            productId ||
          record.field !==
            field ||
          record.status !==
            "VERIFIED",
      )
    ) {
      return {
        allowed:
          false,

        reason:
          "MISMATCHED_EVIDENCE",
      };
    }

    selected =
      assessment.verified.filter(
        (record) =>
          requested.has(
            record.id,
          ),
      );
  }

  if (
    selected.length ===
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "NO_SELECTED_VERIFIED_EVIDENCE",
    };
  }

  return {
    allowed:
      true,

    reason:
      "VERIFIED_EVIDENCE",

    canonical:
      assessment
        .canonicalValues[0]
        .canonical,

    supportingEvidenceIds:
      selected.map(
        (record) =>
          record.id,
      ),
  };
}

export function canUseMediaEvidence(
  record,
) {
  return [
    "OWNED",
    "LICENSED",
    "AUTHORIZED",
  ].includes(
    record?.rightsStatus,
  );
}
