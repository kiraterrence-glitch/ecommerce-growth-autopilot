import type {
  DemandFreshness,
  DemandFreshnessPolicy,
  DemandObservation,
  DemandObservationAssessment,
} from "./demand-types.js";

const DAY_MS =
  24 * 60 * 60 * 1000;

export const DEFAULT_DEMAND_FRESHNESS_POLICY:
  DemandFreshnessPolicy =
{
  freshDays: 30,
  staleDays: 90,
};

function requireText(
  value: string,
  field: string,
): void {
  if (!value.trim()) {
    throw new Error(
      `${field} is required.`,
    );
  }
}

function parseDate(
  value: string,
  field: string,
): number {
  const parsed =
    Date.parse(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${field} must be a valid ISO date.`,
    );
  }

  return parsed;
}

function validateValueAndUnit(
  observation: DemandObservation,
): void {
  if (
    !Number.isFinite(
      observation.value,
    ) ||
    observation.value < 0
  ) {
    throw new Error(
      "Demand value must be a non-negative finite number.",
    );
  }

  const relativeSignals =
    new Set([
      "SEARCH_INTEREST_RELATIVE",
      "SOCIAL_INTEREST_RELATIVE",
    ]);

  const countSignals =
    new Set([
      "SEARCH_VOLUME_ABSOLUTE",
      "PURCHASE_COUNT",
      "UNITS_SOLD",
    ]);

  const percentSignals =
    new Set([
      "CONVERSION_RATE",
      "RETURN_RATE",
    ]);

  if (
    relativeSignals.has(
      observation.signal,
    )
  ) {
    if (
      observation.unit !==
      "INDEX_0_100"
    ) {
      throw new Error(
        "Relative-interest signals must use INDEX_0_100.",
      );
    }

    if (observation.value > 100) {
      throw new Error(
        "Relative-interest index must be between 0 and 100.",
      );
    }
  }

  if (
    countSignals.has(
      observation.signal,
    )
  ) {
    if (
      observation.unit !==
      "COUNT"
    ) {
      throw new Error(
        "Absolute count signals must use COUNT.",
      );
    }

    if (
      !Number.isInteger(
        observation.value,
      )
    ) {
      throw new Error(
        "Absolute count signals must contain an integer.",
      );
    }
  }

  if (
    percentSignals.has(
      observation.signal,
    )
  ) {
    if (
      observation.unit !==
      "PERCENT"
    ) {
      throw new Error(
        "Rate signals must use PERCENT.",
      );
    }

    if (observation.value > 100) {
      throw new Error(
        "Percentage demand signals must be between 0 and 100.",
      );
    }
  }

  if (
    observation.signal ===
    "REVENUE"
  ) {
    if (
      observation.unit !==
      "CURRENCY"
    ) {
      throw new Error(
        "Revenue must use CURRENCY.",
      );
    }

    if (
      !observation.currency ||
      !/^[A-Z]{3}$/u.test(
        observation.currency,
      )
    ) {
      throw new Error(
        "Revenue requires a three-letter uppercase currency code.",
      );
    }
  } else if (
    observation.currency !==
    null
  ) {
    throw new Error(
      "currency is only allowed for REVENUE.",
    );
  }
}

export function validateDemandObservation(
  observation: DemandObservation,
): DemandObservation {
  requireText(
    observation.id,
    "id",
  );

  requireText(
    observation.candidateId,
    "candidateId",
  );

  requireText(
    observation.sourceId,
    "sourceId",
  );

  requireText(
    observation.geography,
    "geography",
  );

  let url: URL;

  try {
    url =
      new URL(
        observation.sourceUrl,
      );
  } catch {
    throw new Error(
      "sourceUrl must be a valid URL.",
    );
  }

  if (
    url.protocol !== "https:"
  ) {
    throw new Error(
      "sourceUrl must use HTTPS.",
    );
  }

  const periodStart =
    parseDate(
      observation.periodStart,
      "periodStart",
    );

  const periodEnd =
    parseDate(
      observation.periodEnd,
      "periodEnd",
    );

  const capturedAt =
    parseDate(
      observation.capturedAt,
      "capturedAt",
    );

  if (
    periodStart >
    periodEnd
  ) {
    throw new Error(
      "periodStart cannot be after periodEnd.",
    );
  }

  if (
    capturedAt <
    periodEnd
  ) {
    throw new Error(
      "capturedAt cannot be before periodEnd.",
    );
  }

  validateValueAndUnit(
    observation,
  );

  return observation;
}

function validatePolicy(
  policy: DemandFreshnessPolicy,
): void {
  if (
    !Number.isInteger(
      policy.freshDays,
    ) ||
    policy.freshDays < 0
  ) {
    throw new Error(
      "freshDays must be a non-negative integer.",
    );
  }

  if (
    !Number.isInteger(
      policy.staleDays,
    ) ||
    policy.staleDays <=
      policy.freshDays
  ) {
    throw new Error(
      "staleDays must be greater than freshDays.",
    );
  }
}

export function assessDemandObservation(
  observation: DemandObservation,
  asOf: string,
  policy:
    DemandFreshnessPolicy =
      DEFAULT_DEMAND_FRESHNESS_POLICY,
): DemandObservationAssessment {
  validateDemandObservation(
    observation,
  );

  validatePolicy(
    policy,
  );

  const asOfTime =
    parseDate(
      asOf,
      "asOf",
    );

  const periodEnd =
    parseDate(
      observation.periodEnd,
      "periodEnd",
    );

  if (
    periodEnd >
    asOfTime
  ) {
    throw new Error(
      "Demand observation period cannot end in the future.",
    );
  }

  const ageDays =
    Math.floor(
      (
        asOfTime -
        periodEnd
      ) /
      DAY_MS,
    );

  let freshness:
    DemandFreshness;

  if (
    ageDays <=
    policy.freshDays
  ) {
    freshness =
      "FRESH";
  } else if (
    ageDays <
    policy.staleDays
  ) {
    freshness =
      "AGING";
  } else {
    freshness =
      "STALE";
  }

  return {
    observation,
    freshness,
    ageDays,
  };
}
