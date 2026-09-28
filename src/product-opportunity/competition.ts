import type {
  CompetitionFreshness,
  CompetitionFreshnessPolicy,
  CompetitionMarketObservation,
  CompetitionObservationAssessment,
} from "./competition-types.js";

const DAY_MS =
  24 * 60 * 60 * 1000;

export const DEFAULT_COMPETITION_FRESHNESS_POLICY:
  CompetitionFreshnessPolicy =
{
  freshDays: 30,
  staleDays: 90,
};

const COUNT_SIGNALS =
  new Set([
    "NICHE_PRODUCT_COUNT",
    "TOP_CLICK_PRODUCT_COUNT",
    "SELLER_COUNT",
  ]);

const PERCENT_SIGNALS =
  new Set([
    "SPONSORED_PRODUCT_SHARE",
    "PRIME_OFFER_SHARE",
    "OUT_OF_STOCK_RATE",
  ]);

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

export function validateCompetitionMarketObservation(
  observation:
    CompetitionMarketObservation,
): CompetitionMarketObservation {
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

  if (
    !Number.isFinite(
      observation.value,
    ) ||
    observation.value < 0
  ) {
    throw new Error(
      "Competition value must be a non-negative finite number.",
    );
  }

  if (
    COUNT_SIGNALS.has(
      observation.signal,
    )
  ) {
    if (
      observation.unit !==
      "COUNT"
    ) {
      throw new Error(
        "Competition count signals must use COUNT.",
      );
    }

    if (
      !Number.isInteger(
        observation.value,
      )
    ) {
      throw new Error(
        "Competition count signals must contain an integer.",
      );
    }
  }

  if (
    PERCENT_SIGNALS.has(
      observation.signal,
    )
  ) {
    if (
      observation.unit !==
      "PERCENT"
    ) {
      throw new Error(
        "Competition percentage signals must use PERCENT.",
      );
    }

    if (
      observation.value >
      100
    ) {
      throw new Error(
        "Competition percentage must be between 0 and 100.",
      );
    }
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

  const start =
    parseDate(
      observation.periodStart,
      "periodStart",
    );

  const end =
    parseDate(
      observation.periodEnd,
      "periodEnd",
    );

  const captured =
    parseDate(
      observation.capturedAt,
      "capturedAt",
    );

  if (start > end) {
    throw new Error(
      "periodStart cannot be after periodEnd.",
    );
  }

  if (captured < end) {
    throw new Error(
      "capturedAt cannot be before periodEnd.",
    );
  }

  return observation;
}

export function assessCompetitionMarketObservation(
  observation:
    CompetitionMarketObservation,

  asOf: string,

  policy:
    CompetitionFreshnessPolicy =
      DEFAULT_COMPETITION_FRESHNESS_POLICY,
): CompetitionObservationAssessment {
  validateCompetitionMarketObservation(
    observation,
  );

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
      "Competition observation period cannot end in the future.",
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
    CompetitionFreshness;

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
