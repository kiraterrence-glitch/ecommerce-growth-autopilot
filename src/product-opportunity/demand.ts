import type {
  DemandFreshness,
  DemandFreshnessPolicy,
  DemandObservation,
  DemandObservationAssessment,
} from "./demand-types.js";

const DAY_MS =
  24 * 60 * 60 * 1000;

const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/u;

const DEMAND_SOURCE_TYPES =
  new Set([
    "GOOGLE_TRENDS",
    "MARKETPLACE",
    "FIRST_PARTY",
    "SOCIAL_PLATFORM",
    "OTHER",
  ]);

const DEMAND_ACQUISITION_METHODS =
  new Set([
    "AUTHORIZED_API",
    "AUTHORIZED_EXPORT",
    "CSV_IMPORT",
    "HTML_SNAPSHOT",
    "MANUAL_CAPTURE",
  ]);

const DEMAND_SIGNALS =
  new Set([
    "SEARCH_INTEREST_RELATIVE",
    "SEARCH_VOLUME_ABSOLUTE",
    "PURCHASE_COUNT",
    "UNITS_SOLD",
    "REVENUE",
    "CONVERSION_RATE",
    "RETURN_RATE",
    "SOCIAL_INTEREST_RELATIVE",
  ]);

const DEMAND_UNITS =
  new Set([
    "INDEX_0_100",
    "COUNT",
    "CURRENCY",
    "PERCENT",
  ]);

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
  const match =
    typeof value === "string"
      ? ISO_DATE_TIME.exec(value)
      : null;

  const year =
    Number(match?.[1]);

  const month =
    Number(match?.[2]);

  const day =
    Number(match?.[3]);

  const hour =
    Number(match?.[4]);

  const minute =
    Number(match?.[5]);

  const second =
    Number(match?.[6]);

  const offsetHour =
    Number(match?.[7] ?? 0);

  const offsetMinute =
    Number(match?.[8] ?? 0);

  const leapYear =
    year % 4 === 0 &&
    (
      year % 100 !== 0 ||
      year % 400 === 0
    );

  const daysInMonth =
    [
      31,
      leapYear ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ][month - 1] ?? 0;

  const parsed =
    Date.parse(value);

  if (
    !match ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59 ||
    !Number.isFinite(parsed)
  ) {
    throw new Error(
      `${field} must be a valid ISO date.`,
    );
  }

  return parsed;
}

function requireAllowed(
  value: unknown,
  allowed: ReadonlySet<string>,
  field: string,
): void {
  if (
    typeof value !== "string" ||
    !allowed.has(value)
  ) {
    throw new Error(
      `${field} must be one of the supported values.`,
    );
  }
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

  requireAllowed(
    observation.sourceType,
    DEMAND_SOURCE_TYPES,
    "sourceType",
  );

  requireAllowed(
    observation.acquisitionMethod,
    DEMAND_ACQUISITION_METHODS,
    "acquisitionMethod",
  );

  requireAllowed(
    observation.signal,
    DEMAND_SIGNALS,
    "signal",
  );

  requireAllowed(
    observation.unit,
    DEMAND_UNITS,
    "unit",
  );

  if (
    typeof observation.verified !==
    "boolean"
  ) {
    throw new Error(
      "verified must be a boolean.",
    );
  }

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
