import {
  classifyContentIntelligenceBatchDeterministically,
} from "./classifier.js";

import type {
  ContentIntelligenceClassification,
  ContentIntelligenceRecord,
} from "./types.js";

export type ContentPatternDimension =
  | "hookType"
  | "structure"
  | "topic"
  | "creativeFormat"
  | "ctaPresence";

export interface ContentPerformanceAnalysis {
  contentId: string;
  creator: string | null;
  views: number;
  engagementCount: number;
  engagementRateByViews: number | null;
  viewsPerFollower: number | null;
  creatorMedianViews: number | null;
  creatorMedianEngagementRateByViews: number | null;
  viewsVsCreatorMedianRatio: number | null;
  engagementVsCreatorMedianRatio: number | null;
}

export interface ContentPatternSummary {
  dimension: ContentPatternDimension;
  value: string;
  sampleSize: number;
  contentIds: string[];
  medianViews: number | null;
  medianEngagementRateByViews: number | null;
  medianViewsPerFollower: number | null;
}

export interface ContentSignalSummary {
  phrase: string;
  count: number;
  contentIds: string[];
}

export interface ContentCustomerIntelligence {
  audience: ContentSignalSummary[];
  painPoints: ContentSignalSummary[];
  benefits: ContentSignalSummary[];
  objections: ContentSignalSummary[];
  buyingTriggers: ContentSignalSummary[];
}

export interface ContentIntelligenceMethodology {
  scope: "descriptive_observational";
  causality: "correlation_not_causation";
  scoring: "no_opaque_viral_score";
  productClaims: "content_signals_are_not_product_facts";
  note: string;
}

export interface ContentIntelligenceAnalysisReport {
  methodology: ContentIntelligenceMethodology;
  classifications: ContentIntelligenceClassification[];
  performance: ContentPerformanceAnalysis[];
  patterns: ContentPatternSummary[];
  customerIntelligence: ContentCustomerIntelligence;
}

interface CreatorBaselineAccumulator {
  views: number[];
  engagementRates: number[];
}

interface CreatorBaseline {
  medianViews: number | null;
  medianEngagementRateByViews: number | null;
}

interface PatternAccumulator {
  dimension: ContentPatternDimension;
  value: string;
  contentIds: string[];
  views: number[];
  engagementRates: number[];
  viewsPerFollower: number[];
}

interface SignalAccumulator {
  phrase: string;
  count: number;
  contentIds: string[];
}

const DIMENSION_ORDER: Record<
  ContentPatternDimension,
  number
> = {
  hookType: 0,
  structure: 1,
  topic: 2,
  creativeFormat: 3,
  ctaPresence: 4,
};

function roundMetric(
  value: number,
): number {
  return Number(
    value.toFixed(6),
  );
}

function divide(
  numerator: number,
  denominator: number,
): number | null {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }

  return roundMetric(
    numerator / denominator,
  );
}

function median(
  values: readonly number[],
): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted =
    [...values].sort(
      (left, right) =>
        left - right,
    );

  const midpoint =
    Math.floor(
      sorted.length / 2,
    );

  const right =
    sorted[midpoint];

  if (right === undefined) {
    return null;
  }

  if (
    sorted.length % 2 === 1
  ) {
    return roundMetric(
      right,
    );
  }

  const left =
    sorted[midpoint - 1];

  if (left === undefined) {
    return roundMetric(
      right,
    );
  }

  return roundMetric(
    (left + right) / 2,
  );
}

function engagementCount(
  record: ContentIntelligenceRecord,
): number {
  return (
    record.metrics.likes +
    record.metrics.comments +
    record.metrics.shares +
    record.metrics.saves
  );
}

function engagementRateByViews(
  record: ContentIntelligenceRecord,
): number | null {
  return divide(
    engagementCount(record),
    record.metrics.views,
  );
}

function viewsPerFollower(
  record: ContentIntelligenceRecord,
): number | null {
  return divide(
    record.metrics.views,
    record.metrics.followers,
  );
}

function buildCreatorBaselines(
  records: readonly ContentIntelligenceRecord[],
): Map<string, CreatorBaseline> {
  const accumulators =
    new Map<
      string,
      CreatorBaselineAccumulator
    >();

  for (const record of records) {
    if (record.creator === null) {
      continue;
    }

    let accumulator =
      accumulators.get(
        record.creator,
      );

    if (accumulator === undefined) {
      accumulator = {
        views: [],
        engagementRates: [],
      };

      accumulators.set(
        record.creator,
        accumulator,
      );
    }

    accumulator.views.push(
      record.metrics.views,
    );

    const rate =
      engagementRateByViews(
        record,
      );

    if (rate !== null) {
      accumulator.engagementRates.push(
        rate,
      );
    }
  }

  const baselines =
    new Map<
      string,
      CreatorBaseline
    >();

  for (
    const [
      creator,
      accumulator,
    ]
    of accumulators
  ) {
    baselines.set(
      creator,
      {
        medianViews:
          median(
            accumulator.views,
          ),

        medianEngagementRateByViews:
          median(
            accumulator.engagementRates,
          ),
      },
    );
  }

  return baselines;
}

function optionalRatio(
  numerator: number | null,
  denominator: number | null,
): number | null {
  if (
    numerator === null ||
    denominator === null
  ) {
    return null;
  }

  return divide(
    numerator,
    denominator,
  );
}

export function analyzeContentPerformance(
  records: readonly ContentIntelligenceRecord[],
): ContentPerformanceAnalysis[] {
  const creatorBaselines =
    buildCreatorBaselines(
      records,
    );

  return records.map(
    (record) => {
      const count =
        engagementCount(
          record,
        );

      const engagementRate =
        engagementRateByViews(
          record,
        );

      const followerRate =
        viewsPerFollower(
          record,
        );

      const baseline =
        record.creator === null
          ? undefined
          : creatorBaselines.get(
              record.creator,
            );

      const creatorMedianViews =
        baseline?.medianViews ??
        null;

      const creatorMedianEngagement =
        baseline?.medianEngagementRateByViews ??
        null;

      return {
        contentId:
          record.id,

        creator:
          record.creator,

        views:
          record.metrics.views,

        engagementCount:
          count,

        engagementRateByViews:
          engagementRate,

        viewsPerFollower:
          followerRate,

        creatorMedianViews,

        creatorMedianEngagementRateByViews:
          creatorMedianEngagement,

        viewsVsCreatorMedianRatio:
          optionalRatio(
            record.metrics.views,
            creatorMedianViews,
          ),

        engagementVsCreatorMedianRatio:
          optionalRatio(
            engagementRate,
            creatorMedianEngagement,
          ),
      };
    },
  );
}

function patternRows(
  classification: ContentIntelligenceClassification,
): ReadonlyArray<
  readonly [
    ContentPatternDimension,
    string,
  ]
> {
  return [
    [
      "hookType",
      classification.hookType,
    ],

    [
      "structure",
      classification.structure,
    ],

    [
      "topic",
      classification.topic,
    ],

    [
      "creativeFormat",
      classification.creativeFormat,
    ],

    [
      "ctaPresence",
      classification.cta === null
        ? "absent"
        : "present",
    ],
  ];
}

export function summarizeContentPatterns(
  records: readonly ContentIntelligenceRecord[],
  classifications: readonly ContentIntelligenceClassification[],
): ContentPatternSummary[] {
  if (
    records.length !==
    classifications.length
  ) {
    throw new Error(
      "Content records and classifications must have equal length.",
    );
  }

  const performance =
    analyzeContentPerformance(
      records,
    );

  const performanceById =
    new Map(
      performance.map(
        (item) =>
          [
            item.contentId,
            item,
          ] as const,
      ),
    );

  const groups =
    new Map<
      string,
      PatternAccumulator
    >();

  for (
    const classification
    of classifications
  ) {
    const metrics =
      performanceById.get(
        classification.contentId,
      );

    if (metrics === undefined) {
      throw new Error(
        `Missing performance record for ${classification.contentId}`,
      );
    }

    for (
      const [
        dimension,
        value,
      ]
      of patternRows(
        classification,
      )
    ) {
      const key =
        `${dimension}\u0000${value}`;

      let group =
        groups.get(
          key,
        );

      if (group === undefined) {
        group = {
          dimension,
          value,
          contentIds: [],
          views: [],
          engagementRates: [],
          viewsPerFollower: [],
        };

        groups.set(
          key,
          group,
        );
      }

      group.contentIds.push(
        classification.contentId,
      );

      group.views.push(
        metrics.views,
      );

      if (
        metrics.engagementRateByViews !==
        null
      ) {
        group.engagementRates.push(
          metrics.engagementRateByViews,
        );
      }

      if (
        metrics.viewsPerFollower !==
        null
      ) {
        group.viewsPerFollower.push(
          metrics.viewsPerFollower,
        );
      }
    }
  }

  return [...groups.values()]
    .map(
      (
        group,
      ): ContentPatternSummary => ({
        dimension:
          group.dimension,

        value:
          group.value,

        sampleSize:
          group.contentIds.length,

        contentIds:
          [...group.contentIds],

        medianViews:
          median(
            group.views,
          ),

        medianEngagementRateByViews:
          median(
            group.engagementRates,
          ),

        medianViewsPerFollower:
          median(
            group.viewsPerFollower,
          ),
      }),
    )
    .sort(
      (left, right) => {
        const dimensionDifference =
          DIMENSION_ORDER[
            left.dimension
          ] -
          DIMENSION_ORDER[
            right.dimension
          ];

        if (
          dimensionDifference !== 0
        ) {
          return dimensionDifference;
        }

        const sizeDifference =
          right.sampleSize -
          left.sampleSize;

        if (
          sizeDifference !== 0
        ) {
          return sizeDifference;
        }

        return left.value.localeCompare(
          right.value,
        );
      },
    );
}

function normalizeSignal(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function aggregateSignals(
  classifications: readonly ContentIntelligenceClassification[],
  selector: (
    classification: ContentIntelligenceClassification,
  ) => readonly string[],
): ContentSignalSummary[] {
  const groups =
    new Map<
      string,
      SignalAccumulator
    >();

  for (
    const classification
    of classifications
  ) {
    const seenInContent =
      new Set<string>();

    for (
      const phrase
      of selector(
        classification,
      )
    ) {
      const key =
        normalizeSignal(
          phrase,
        );

      if (
        key.length === 0 ||
        seenInContent.has(key)
      ) {
        continue;
      }

      seenInContent.add(
        key,
      );

      let group =
        groups.get(
          key,
        );

      if (
        group === undefined
      ) {
        group = {
          phrase:
            phrase.trim(),

          count:
            0,

          contentIds:
            [],
        };

        groups.set(
          key,
          group,
        );
      }

      group.count += 1;

      group.contentIds.push(
        classification.contentId,
      );
    }
  }

  return [...groups.values()]
    .map(
      (
        group,
      ): ContentSignalSummary => ({
        phrase:
          group.phrase,

        count:
          group.count,

        contentIds:
          [...group.contentIds],
      }),
    )
    .sort(
      (left, right) => {
        const countDifference =
          right.count -
          left.count;

        if (
          countDifference !== 0
        ) {
          return countDifference;
        }

        return left.phrase.localeCompare(
          right.phrase,
        );
      },
    );
}

export function summarizeCustomerIntelligence(
  classifications: readonly ContentIntelligenceClassification[],
): ContentCustomerIntelligence {
  return {
    audience:
      aggregateSignals(
        classifications,
        (classification) =>
          classification.audience,
      ),

    painPoints:
      aggregateSignals(
        classifications,
        (classification) =>
          classification.painPoints,
      ),

    benefits:
      aggregateSignals(
        classifications,
        (classification) =>
          classification.benefits,
      ),

    objections:
      aggregateSignals(
        classifications,
        (classification) =>
          classification.objections,
      ),

    buyingTriggers:
      aggregateSignals(
        classifications,
        (classification) =>
          classification.buyingTriggers,
      ),
  };
}

export function analyzeContentIntelligence(
  records: readonly ContentIntelligenceRecord[],
): ContentIntelligenceAnalysisReport {
  const classifications =
    classifyContentIntelligenceBatchDeterministically(
      records,
    );

  return {
    methodology: {
      scope:
        "descriptive_observational",

      causality:
        "correlation_not_causation",

      scoring:
        "no_opaque_viral_score",

      productClaims:
        "content_signals_are_not_product_facts",

      note:
        "Observed performance associations describe the captured content set only. They do not establish that a hook, structure, topic, CTA, creator pattern, or other content characteristic caused performance.",
    },

    classifications,

    performance:
      analyzeContentPerformance(
        records,
      ),

    patterns:
      summarizeContentPatterns(
        records,
        classifications,
      ),

    customerIntelligence:
      summarizeCustomerIntelligence(
        classifications,
      ),
  };
}
