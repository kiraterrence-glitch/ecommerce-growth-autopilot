function normalizedText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const UNIT_CONVERSIONS =
  Object.freeze({
    ml: {
      canonicalUnit:
        "ml",
      multiplier:
        1,
    },

    l: {
      canonicalUnit:
        "ml",
      multiplier:
        1000,
    },

    g: {
      canonicalUnit:
        "g",
      multiplier:
        1,
    },

    kg: {
      canonicalUnit:
        "g",
      multiplier:
        1000,
    },

    mm: {
      canonicalUnit:
        "mm",
      multiplier:
        1,
    },

    cm: {
      canonicalUnit:
        "mm",
      multiplier:
        10,
    },

    m: {
      canonicalUnit:
        "mm",
      multiplier:
        1000,
    },
  });

function numericValue(value) {
  const trimmed =
    String(value ?? "")
      .trim();

  if (
    !/^-?\d+(?:\.\d+)?$/.test(
      trimmed,
    )
  ) {
    return null;
  }

  const numeric =
    Number(trimmed);

  return Number.isFinite(
    numeric,
  )
    ? numeric
    : null;
}

export function canonicalEvidenceValue(record) {
  const numeric =
    numericValue(
      record.normalizedValue,
    );

  const unit =
    normalizedText(
      record.unit,
    );

  if (
    numeric !== null &&
    unit &&
    UNIT_CONVERSIONS[unit]
  ) {
    const conversion =
      UNIT_CONVERSIONS[unit];

    return {
      kind:
        "MEASUREMENT",

      value:
        numeric *
        conversion.multiplier,

      unit:
        conversion.canonicalUnit,

      key:
        `${numeric * conversion.multiplier}:${conversion.canonicalUnit}`,
    };
  }

  if (
    numeric !== null &&
    !unit
  ) {
    return {
      kind:
        "NUMBER",

      value:
        numeric,

      unit:
        null,

      key:
        String(numeric),
    };
  }

  const text =
    normalizedText(
      record.normalizedValue,
    );

  return {
    kind:
      "TEXT",

    value:
      text,

    unit:
      unit || null,

    key:
      `${text}:${unit}`,
  };
}

function sourceFactKey(record) {
  return [
    record.sourceId,
    record.productId,
    record.field,
    canonicalEvidenceValue(
      record,
    ).key,
  ].join("|");
}

export class MarketplaceEvidenceLedger {
  constructor() {
    this.records =
      new Map();

    this.sourceFacts =
      new Map();
  }

  add(record) {
    if (
      !record ||
      typeof record !== "object"
    ) {
      throw new Error(
        "Evidence record is required.",
      );
    }

    if (!record.id) {
      throw new Error(
        "Evidence record ID is required.",
      );
    }

    if (
      this.records.has(
        record.id,
      )
    ) {
      const error =
        new Error(
          `Duplicate evidence ID: ${record.id}`,
        );

      error.code =
        "DUPLICATE_EVIDENCE_ID";

      throw error;
    }

    const factKey =
      sourceFactKey(
        record,
      );

    if (
      this.sourceFacts.has(
        factKey,
      )
    ) {
      const error =
        new Error(
          "Duplicate source fact detected.",
        );

      error.code =
        "DUPLICATE_SOURCE_FACT";

      throw error;
    }

    this.records.set(
      record.id,
      Object.freeze({
        ...record,
      }),
    );

    this.sourceFacts.set(
      factKey,
      record.id,
    );

    return record;
  }

  addMany(records) {
    for (
      const record of records
    ) {
      this.add(
        record,
      );
    }

    return this;
  }

  get(id) {
    return (
      this.records.get(id) ??
      null
    );
  }

  list() {
    return [
      ...this.records.values(),
    ];
  }

  forField(
    productId,
    field,
  ) {
    const normalizedField =
      normalizedText(
        field,
      );

    return this
      .list()
      .filter(
        (record) =>
          record.productId ===
            productId &&
          normalizedText(
            record.field,
          ) ===
            normalizedField,
      );
  }

  assessField(
    productId,
    field,
  ) {
    const records =
      this.forField(
        productId,
        field,
      );

    const verified =
      records.filter(
        (record) =>
          record.status ===
          "VERIFIED",
      );

    const unverified =
      records.filter(
        (record) =>
          record.status !==
          "VERIFIED",
      );

    if (
      verified.length ===
      0
    ) {
      return {
        status:
          "UNVERIFIED",

        productId,

        field,

        records,

        verified,

        unverified,

        canonicalValues:
          [],
      };
    }

    const grouped =
      new Map();

    for (
      const record of
        verified
    ) {
      const canonical =
        canonicalEvidenceValue(
          record,
        );

      if (
        !grouped.has(
          canonical.key,
        )
      ) {
        grouped.set(
          canonical.key,
          {
            canonical,
            evidenceIds:
              [],
          },
        );
      }

      grouped
        .get(
          canonical.key,
        )
        .evidenceIds
        .push(
          record.id,
        );
    }

    const canonicalValues =
      [...grouped.values()];

    return {
      status:
        canonicalValues.length ===
        1
          ? "VERIFIED"
          : "CONFLICT",

      productId,

      field,

      records,

      verified,

      unverified,

      canonicalValues,
    };
  }
}

export function buildMarketplaceEvidenceLedger(
  records,
) {
  return new MarketplaceEvidenceLedger()
    .addMany(
      records,
    );
}
