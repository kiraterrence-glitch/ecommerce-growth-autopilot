import {
  assessDemandObservation,
} from "./demand.js";

import type {
  DemandMeasurementUnit,
  DemandObservation,
  DemandObservationAssessment,
  DemandSignalKind,
  DemandSourceType,
} from "./demand-types.js";

export type DemandSeriesDirection =
  | "RISING"
  | "FALLING"
  | "FLAT"
  | "INSUFFICIENT_HISTORY";

export type DemandSeriesSummary =
  Readonly<{
    sourceId: string;
    sourceType: DemandSourceType;
    signal: DemandSignalKind;
    unit: DemandMeasurementUnit;
    currency: string | null;
    geography: string;

    observationCount: number;

    latestValue: number;
    previousValue: number | null;
    deltaInNativeUnit: number | null;

    direction:
      DemandSeriesDirection;

    latestPeriodEnd: string;
  }>;

export type DemandSourceDisagreement =
  Readonly<{
    signal: DemandSignalKind;
    unit: DemandMeasurementUnit;
    currency: string | null;
    geography: string;

    periodStart: string;
    periodEnd: string;

    observations:
      readonly Readonly<{
        sourceId: string;
        value: number;
      }>[];

    interpretation:
      "SOURCE_VALUES_DIFFER_REVIEW_REQUIRED";
  }>;

export type DemandProfile =
  Readonly<{
    candidateId: string;
    asOf: string;

    observationCount: number;
    verifiedObservationCount: number;

    usableVerifiedObservationCount:
      number;

    freshObservationCount: number;
    agingObservationCount: number;
    staleObservationCount: number;

    independentVerifiedSourceCount:
      number;

    independentVerifiedSourceIds:
      readonly string[];

    signalsPresent:
      readonly DemandSignalKind[];

    usableVerifiedSignals:
      readonly DemandSignalKind[];

    hasRelativeSearchEvidence:
      boolean;

    hasAbsoluteSearchEvidence:
      boolean;

    hasPurchaseEvidence:
      boolean;

    series:
      readonly DemandSeriesSummary[];

    disagreements:
      readonly DemandSourceDisagreement[];

    policies: Readonly<{
      relativeIndexNotSearchVolume:
        true;

      noCrossSourceAveraging:
        true;

      staleExcludedFromCurrentEvidence:
        true;

      disagreementIsNotAutomaticError:
        true;

      noOpaqueDemandScore:
        true;
    }>;
  }>;

function round(
  value: number,
): number {
  return (
    Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100
  );
}

function uniqueSorted<T extends string>(
  values: readonly T[],
): T[] {
  return [
    ...new Set(values),
  ].sort();
}

function seriesKey(
  assessment:
    DemandObservationAssessment,
): string {
  const item =
    assessment.observation;

  return JSON.stringify([
    item.sourceId,
    item.signal,
    item.unit,
    item.currency,
    item.geography,
  ]);
}

function comparablePeriodKey(
  assessment:
    DemandObservationAssessment,
): string {
  const item =
    assessment.observation;

  return JSON.stringify([
    item.signal,
    item.unit,
    item.currency,
    item.geography,
    item.periodStart,
    item.periodEnd,
  ]);
}

function direction(
  latest: number,
  previous: number | null,
): DemandSeriesDirection {
  if (previous === null) {
    return "INSUFFICIENT_HISTORY";
  }

  if (latest > previous) {
    return "RISING";
  }

  if (latest < previous) {
    return "FALLING";
  }

  return "FLAT";
}

function buildSeries(
  usable:
    readonly DemandObservationAssessment[],
): DemandSeriesSummary[] {
  const groups =
    new Map<
      string,
      DemandObservationAssessment[]
    >();

  for (const assessment of usable) {
    const key =
      seriesKey(
        assessment,
      );

    const group =
      groups.get(key) ?? [];

    group.push(
      assessment,
    );

    groups.set(
      key,
      group,
    );
  }

  const results:
    DemandSeriesSummary[] =
    [];

  for (
    const group
    of groups.values()
  ) {
    const ordered =
      [...group].sort(
        (left, right) => {
          const periodDifference =
            Date.parse(
              left.observation
                .periodEnd,
            ) -
            Date.parse(
              right.observation
                .periodEnd,
            );

          if (
            periodDifference !== 0
          ) {
            return periodDifference;
          }

          return (
            Date.parse(
              left.observation
                .capturedAt,
            ) -
            Date.parse(
              right.observation
                .capturedAt,
            )
          );
        },
      );

    const latest =
      ordered[
        ordered.length - 1
      ];

    if (!latest) {
      continue;
    }

    const previous =
      ordered.length >= 2
        ? ordered[
            ordered.length - 2
          ]
        : undefined;

    const latestValue =
      latest.observation.value;

    const previousValue =
      previous
        ? previous.observation.value
        : null;

    results.push({
      sourceId:
        latest.observation
          .sourceId,

      sourceType:
        latest.observation
          .sourceType,

      signal:
        latest.observation.signal,

      unit:
        latest.observation.unit,

      currency:
        latest.observation
          .currency,

      geography:
        latest.observation
          .geography,

      observationCount:
        ordered.length,

      latestValue,

      previousValue,

      deltaInNativeUnit:
        previousValue === null
          ? null
          : round(
              latestValue -
                previousValue,
            ),

      direction:
        direction(
          latestValue,
          previousValue,
        ),

      latestPeriodEnd:
        latest.observation
          .periodEnd,
    });
  }

  return results.sort(
    (left, right) =>
      [
        left.signal,
        left.sourceId,
        left.geography,
      ]
        .join("|")
        .localeCompare(
          [
            right.signal,
            right.sourceId,
            right.geography,
          ].join("|"),
        ),
  );
}

function buildDisagreements(
  usable:
    readonly DemandObservationAssessment[],
): DemandSourceDisagreement[] {
  const groups =
    new Map<
      string,
      DemandObservationAssessment[]
    >();

  for (const assessment of usable) {
    const key =
      comparablePeriodKey(
        assessment,
      );

    const group =
      groups.get(key) ?? [];

    group.push(
      assessment,
    );

    groups.set(
      key,
      group,
    );
  }

  const disagreements:
    DemandSourceDisagreement[] =
    [];

  for (
    const group
    of groups.values()
  ) {
    const latestBySource =
      new Map<
        string,
        DemandObservationAssessment
      >();

    for (
      const assessment
      of group
    ) {
      const current =
        latestBySource.get(
          assessment.observation
            .sourceId,
        );

      if (
        !current ||
        Date.parse(
          assessment.observation
            .capturedAt,
        ) >
          Date.parse(
            current.observation
              .capturedAt,
          )
      ) {
        latestBySource.set(
          assessment.observation
            .sourceId,
          assessment,
        );
      }
    }

    if (
      latestBySource.size < 2
    ) {
      continue;
    }

    const observations =
      [...latestBySource.values()]
        .map(
          (assessment) => ({
            sourceId:
              assessment
                .observation
                .sourceId,

            value:
              assessment
                .observation
                .value,
          }),
        )
        .sort(
          (left, right) =>
            left.sourceId.localeCompare(
              right.sourceId,
            ),
        );

    const distinctValues =
      new Set(
        observations.map(
          (item) =>
            item.value,
        ),
      );

    if (
      distinctValues.size <= 1
    ) {
      continue;
    }

    const first =
      [...latestBySource.values()][0];

    if (!first) {
      continue;
    }

    disagreements.push({
      signal:
        first.observation.signal,

      unit:
        first.observation.unit,

      currency:
        first.observation
          .currency,

      geography:
        first.observation
          .geography,

      periodStart:
        first.observation
          .periodStart,

      periodEnd:
        first.observation
          .periodEnd,

      observations,

      interpretation:
        "SOURCE_VALUES_DIFFER_REVIEW_REQUIRED",
    });
  }

  return disagreements.sort(
    (left, right) =>
      [
        left.signal,
        left.geography,
        left.periodStart,
      ]
        .join("|")
        .localeCompare(
          [
            right.signal,
            right.geography,
            right.periodStart,
          ].join("|"),
        ),
  );
}

export function buildDemandProfile(
  candidateId: string,
  observations:
    readonly DemandObservation[],
  asOf: string,
): DemandProfile {
  if (!candidateId.trim()) {
    throw new Error(
      "candidateId is required.",
    );
  }

  const assessments =
    observations.map(
      (observation) => {
        if (
          observation.candidateId !==
          candidateId
        ) {
          throw new Error(
            `Demand observation ${observation.id} belongs to another candidate.`,
          );
        }

        return assessDemandObservation(
          observation,
          asOf,
        );
      },
    );

  const verified =
    assessments.filter(
      (assessment) =>
        assessment.observation
          .verified,
    );

  const usable =
    verified.filter(
      (assessment) =>
        assessment.freshness !==
        "STALE",
    );

  const independentSourceIds =
    uniqueSorted(
      usable.map(
        (assessment) =>
          assessment.observation
            .sourceId,
      ),
    );

  const signalsPresent =
    uniqueSorted(
      assessments.map(
        (assessment) =>
          assessment.observation
            .signal,
      ),
    );

  const usableVerifiedSignals =
    uniqueSorted(
      usable.map(
        (assessment) =>
          assessment.observation
            .signal,
      ),
    );

  const purchaseSignals =
    new Set<DemandSignalKind>([
      "PURCHASE_COUNT",
      "UNITS_SOLD",
      "REVENUE",
      "CONVERSION_RATE",
    ]);

  return {
    candidateId,
    asOf,

    observationCount:
      assessments.length,

    verifiedObservationCount:
      verified.length,

    usableVerifiedObservationCount:
      usable.length,

    freshObservationCount:
      assessments.filter(
        (assessment) =>
          assessment.freshness ===
          "FRESH",
      ).length,

    agingObservationCount:
      assessments.filter(
        (assessment) =>
          assessment.freshness ===
          "AGING",
      ).length,

    staleObservationCount:
      assessments.filter(
        (assessment) =>
          assessment.freshness ===
          "STALE",
      ).length,

    independentVerifiedSourceCount:
      independentSourceIds.length,

    independentVerifiedSourceIds:
      independentSourceIds,

    signalsPresent,

    usableVerifiedSignals,

    hasRelativeSearchEvidence:
      usableVerifiedSignals.includes(
        "SEARCH_INTEREST_RELATIVE",
      ),

    hasAbsoluteSearchEvidence:
      usableVerifiedSignals.includes(
        "SEARCH_VOLUME_ABSOLUTE",
      ),

    hasPurchaseEvidence:
      usableVerifiedSignals.some(
        (signal) =>
          purchaseSignals.has(
            signal,
          ),
      ),

    series:
      buildSeries(
        usable,
      ),

    disagreements:
      buildDisagreements(
        usable,
      ),

    policies: {
      relativeIndexNotSearchVolume:
        true,

      noCrossSourceAveraging:
        true,

      staleExcludedFromCurrentEvidence:
        true,

      disagreementIsNotAutomaticError:
        true,

      noOpaqueDemandScore:
        true,
    },
  };
}
