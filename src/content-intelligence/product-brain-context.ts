import type {
  ContentIntelligenceAnalysisReport,
  ContentPatternDimension,
} from "./analysis.js";

export type ContentIntelligenceProductBrainContext =
  Readonly<{
    policy: "messaging_signals_only";
    productFactPolicy: "verified_product_evidence_only";
    causality: "correlation_not_causation";

    sourceContentIds: readonly string[];

    audienceLanguage: readonly string[];
    painPointLanguage: readonly string[];
    objectionLanguage: readonly string[];
    buyingTriggerLanguage: readonly string[];

    hookPatterns: readonly string[];
    structurePatterns: readonly string[];
    topicPatterns: readonly string[];
    creativeFormatPatterns: readonly string[];
    ctaPatterns: readonly string[];
  }>;

function topSignalPhrases(
  signals: readonly {
    phrase: string;
    count: number;
  }[],
): string[] {
  return signals
    .slice(0, 5)
    .map(
      (signal) =>
        signal.phrase,
    );
}

function patternValues(
  report: ContentIntelligenceAnalysisReport,
  dimension: ContentPatternDimension,
): string[] {
  return report.patterns
    .filter(
      (pattern) =>
        pattern.dimension === dimension &&
        pattern.value !== "Unclassified",
    )
    .slice(0, 3)
    .map(
      (pattern) =>
        pattern.value,
    );
}

export function createContentIntelligenceProductBrainContext(
  report: ContentIntelligenceAnalysisReport,
): ContentIntelligenceProductBrainContext {
  return {
    policy:
      "messaging_signals_only",

    productFactPolicy:
      "verified_product_evidence_only",

    causality:
      "correlation_not_causation",

    sourceContentIds:
      report.classifications.map(
        (classification) =>
          classification.contentId,
      ),

    audienceLanguage:
      topSignalPhrases(
        report.customerIntelligence.audience,
      ),

    painPointLanguage:
      topSignalPhrases(
        report.customerIntelligence.painPoints,
      ),

    objectionLanguage:
      topSignalPhrases(
        report.customerIntelligence.objections,
      ),

    buyingTriggerLanguage:
      topSignalPhrases(
        report.customerIntelligence.buyingTriggers,
      ),

    hookPatterns:
      patternValues(
        report,
        "hookType",
      ),

    structurePatterns:
      patternValues(
        report,
        "structure",
      ),

    topicPatterns:
      patternValues(
        report,
        "topic",
      ),

    creativeFormatPatterns:
      patternValues(
        report,
        "creativeFormat",
      ),

    ctaPatterns:
      patternValues(
        report,
        "ctaPresence",
      ),
  };
}
