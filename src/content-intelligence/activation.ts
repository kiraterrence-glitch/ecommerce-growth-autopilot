import {
  analyzeContentIntelligence,
  type ContentIntelligenceAnalysisReport,
  type ContentPatternDimension,
  type ContentPatternSummary,
} from "./analysis.js";

import type {
  ContentIntelligenceRecord,
} from "./types.js";

export type ContentActivationChannel =
  | "meta_ad"
  | "email"
  | "landing_page"
  | "creative_brief";

export interface ContentActivationPatternBasis {
  dimension: ContentPatternDimension;
  value: string;
  sampleSize: number;
  contentIds: string[];
  observation: string;
}

export interface ContentActivationSignalCounts {
  audience: number;
  painPoints: number;
  benefits: number;
  objections: number;
  buyingTriggers: number;
}

export interface ContentActivationSafety {
  draftOnly: true;
  externalWrites: false;
  livePublishing: false;
  sourceContentPolicy: "messaging_signals_only";
  productFactPolicy: "verified_product_evidence_only";
  causality: "correlation_not_causation";
}

export interface ContentActivationBrief {
  briefId: string;
  channel: ContentActivationChannel;
  title: string;
  objective: string;
  sourceContentIds: string[];
  patternBasis: ContentActivationPatternBasis[];
  signalCounts: ContentActivationSignalCounts;
  originalConcept: string;
  hookDirection: string;
  bodyDirection: string;
  ctaDirection: string;
  proofRequirement: string;
  guardrails: string[];
  safety: ContentActivationSafety;
}

export class ContentActivationOriginalityError
  extends Error {
  public readonly issues: readonly string[];

  public constructor(
    issues: readonly string[],
  ) {
    super(
      `Content activation originality check failed: ${issues.join("; ")}`,
    );

    this.name =
      "ContentActivationOriginalityError";

    this.issues =
      [...issues];
  }
}

export class ContentActivationSafetyError
  extends Error {
  public readonly issues: readonly string[];

  public constructor(
    issues: readonly string[],
  ) {
    super(
      `Content activation safety check failed: ${issues.join("; ")}`,
    );

    this.name =
      "ContentActivationSafetyError";

    this.issues =
      [...issues];
  }
}

function selectedPattern(
  report: ContentIntelligenceAnalysisReport,
  dimension: ContentPatternDimension,
): ContentActivationPatternBasis {
  const candidates =
    report.patterns
      .filter(
        (pattern) =>
          pattern.dimension === dimension &&
          pattern.value !== "Unclassified",
      )
      .sort(
        (
          left: ContentPatternSummary,
          right: ContentPatternSummary,
        ) => {
          const sampleDifference =
            right.sampleSize -
            left.sampleSize;

          if (sampleDifference !== 0) {
            return sampleDifference;
          }

          return left.value.localeCompare(
            right.value,
          );
        },
      );

  const pattern =
    candidates[0];

  if (pattern === undefined) {
    return {
      dimension,
      value:
        "No recurring pattern captured",
      sampleSize:
        0,
      contentIds:
        [],
      observation:
        `No recurring ${dimension} pattern was captured. Do not invent one.`,
    };
  }

  return {
    dimension:
      pattern.dimension,

    value:
      pattern.value,

    sampleSize:
      pattern.sampleSize,

    contentIds:
      [...pattern.contentIds],

    observation:
      `Observed ${pattern.sampleSize} captured item(s) using ${pattern.value} for ${pattern.dimension}. Treat this as a messaging pattern, not causal proof.`,
  };
}

function uniqueStrings(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values,
    ),
  ];
}

function signalCounts(
  report: ContentIntelligenceAnalysisReport,
): ContentActivationSignalCounts {
  return {
    audience:
      report.customerIntelligence.audience.length,

    painPoints:
      report.customerIntelligence.painPoints.length,

    benefits:
      report.customerIntelligence.benefits.length,

    objections:
      report.customerIntelligence.objections.length,

    buyingTriggers:
      report.customerIntelligence.buyingTriggers.length,
  };
}

function sourceIds(
  patterns: readonly ContentActivationPatternBasis[],
  records: readonly ContentIntelligenceRecord[],
): string[] {
  const fromPatterns =
    uniqueStrings(
      patterns.flatMap(
        (pattern) =>
          pattern.contentIds,
      ),
    );

  if (fromPatterns.length > 0) {
    return fromPatterns;
  }

  return records.map(
    (record) =>
      record.id,
  );
}

function safety():
  ContentActivationSafety {
  return {
    draftOnly: true,
    externalWrites: false,
    livePublishing: false,
    sourceContentPolicy:
      "messaging_signals_only",
    productFactPolicy:
      "verified_product_evidence_only",
    causality:
      "correlation_not_causation",
  };
}

function guardrails(): string[] {
  return [
    "Write original wording rather than reproducing creator copy.",
    "Use observed content only as messaging inspiration.",
    "Do not convert competitor or creator statements into product facts.",
    "Require separately verified product evidence before using factual product claims.",
    "Treat performance associations as descriptive rather than causal.",
    "Keep the output draft-only until human review and approval.",
  ];
}

function makeBrief(
  channel: ContentActivationChannel,
  title: string,
  objective: string,
  patterns: ContentActivationPatternBasis[],
  report: ContentIntelligenceAnalysisReport,
  records: readonly ContentIntelligenceRecord[],
  originalConcept: string,
  hookDirection: string,
  bodyDirection: string,
  ctaDirection: string,
): ContentActivationBrief {
  return {
    briefId:
      `activation-${channel}`,

    channel,

    title,

    objective,

    sourceContentIds:
      sourceIds(
        patterns,
        records,
      ),

    patternBasis:
      patterns,

    signalCounts:
      signalCounts(
        report,
      ),

    originalConcept,

    hookDirection,

    bodyDirection,

    ctaDirection,

    proofRequirement:
      "Any factual statement about the product must come from separately verified product evidence. Content Intelligence observations alone are not product proof.",

    guardrails:
      guardrails(),

    safety:
      safety(),
  };
}

function normalizedWords(
  value: string,
): string[] {
  return value
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    )
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function ngrams(
  words: readonly string[],
  size: number,
): Set<string> {
  const result =
    new Set<string>();

  if (words.length < size) {
    return result;
  }

  for (
    let index = 0;
    index <=
    words.length - size;
    index += 1
  ) {
    result.add(
      words
        .slice(
          index,
          index + size,
        )
        .join(" "),
    );
  }

  return result;
}

function briefCopyFields(
  brief: ContentActivationBrief,
): string[] {
  return [
    brief.title,
    brief.objective,
    brief.originalConcept,
    brief.hookDirection,
    brief.bodyDirection,
    brief.ctaDirection,
    brief.proofRequirement,
  ];
}

export function checkContentActivationOriginality(
  records: readonly ContentIntelligenceRecord[],
  briefs: readonly ContentActivationBrief[],
  minimumCopiedWords = 9,
): string[] {
  const issues: string[] = [];

  const sourceNgrams =
    new Map<
      string,
      Set<string>
    >();

  for (const record of records) {
    sourceNgrams.set(
      record.id,
      ngrams(
        normalizedWords(
          record.transcript,
        ),
        minimumCopiedWords,
      ),
    );
  }

  for (const brief of briefs) {
    const copyWords =
      normalizedWords(
        briefCopyFields(
          brief,
        ).join(" "),
      );

    const copyNgrams =
      ngrams(
        copyWords,
        minimumCopiedWords,
      );

    for (const record of records) {
      const recordNgrams =
        sourceNgrams.get(
          record.id,
        );

      if (recordNgrams === undefined) {
        continue;
      }

      const copied =
        [...copyNgrams].find(
          (value) =>
            recordNgrams.has(
              value,
            ),
        );

      if (copied !== undefined) {
        issues.push(
          `${brief.briefId} contains a ${minimumCopiedWords}-word sequence from ${record.id}: "${copied}"`,
        );
      }
    }
  }

  return issues;
}

export function assertContentActivationOriginality(
  records: readonly ContentIntelligenceRecord[],
  briefs: readonly ContentActivationBrief[],
): void {
  const issues =
    checkContentActivationOriginality(
      records,
      briefs,
    );

  if (issues.length > 0) {
    throw new ContentActivationOriginalityError(
      issues,
    );
  }
}

export function checkContentActivationSafety(
  briefs: readonly ContentActivationBrief[],
): string[] {
  const issues: string[] = [];

  for (const brief of briefs) {
    if (
      brief.safety.draftOnly !== true
    ) {
      issues.push(
        `${brief.briefId} must remain draft-only`,
      );
    }

    if (
      brief.safety.externalWrites !== false
    ) {
      issues.push(
        `${brief.briefId} cannot allow external writes`,
      );
    }

    if (
      brief.safety.livePublishing !== false
    ) {
      issues.push(
        `${brief.briefId} cannot allow live publishing`,
      );
    }

    if (
      brief.safety.sourceContentPolicy !==
      "messaging_signals_only"
    ) {
      issues.push(
        `${brief.briefId} has an invalid source-content policy`,
      );
    }

    if (
      brief.safety.productFactPolicy !==
      "verified_product_evidence_only"
    ) {
      issues.push(
        `${brief.briefId} has an invalid product-fact policy`,
      );
    }

    if (
      brief.safety.causality !==
      "correlation_not_causation"
    ) {
      issues.push(
        `${brief.briefId} must preserve correlation-not-causation`,
      );
    }
  }

  return issues;
}

export function assertContentActivationSafety(
  briefs: readonly ContentActivationBrief[],
): void {
  const issues =
    checkContentActivationSafety(
      briefs,
    );

  if (issues.length > 0) {
    throw new ContentActivationSafetyError(
      issues,
    );
  }
}

export function generateContentActivationBriefs(
  records: readonly ContentIntelligenceRecord[],
): ContentActivationBrief[] {
  const report =
    analyzeContentIntelligence(
      records,
    );

  const hook =
    selectedPattern(
      report,
      "hookType",
    );

  const structure =
    selectedPattern(
      report,
      "structure",
    );

  const topic =
    selectedPattern(
      report,
      "topic",
    );

  const format =
    selectedPattern(
      report,
      "creativeFormat",
    );

  const cta =
    selectedPattern(
      report,
      "ctaPresence",
    );

  const briefs: ContentActivationBrief[] = [
    makeBrief(
      "meta_ad",
      "Original Meta ad concept",
      "Develop an original paid-social concept informed by recurring content patterns without copying source wording.",
      [
        hook,
        structure,
        format,
      ],
      report,
      records,
      `Use the observed ${hook.value} hook style and ${structure.value} structure as structural inspiration only. Build a new concept around the verified product proposition rather than recreating captured creator execution.`,
      "Open with newly written language that follows the observed hook category while avoiding source phrasing.",
      "Move from customer context to independently verified product proof, then resolve the relevant buying concern in original wording.",
      "Use a simple human-reviewed action prompt appropriate to the campaign. Do not manufacture urgency or unsupported outcomes.",
    ),

    makeBrief(
      "email",
      "Original lifecycle email concept",
      "Create an original email direction from observed customer and topic signals while keeping factual product claims evidence-bound.",
      [
        topic,
        structure,
        cta,
      ],
      report,
      records,
      `Build an original lifecycle email around the observed ${topic.value} theme and ${structure.value} information flow. Use the pattern as a planning cue rather than a template to copy.`,
      "Write a new subject and opening that establish customer relevance without repeating creator language.",
      "Explain the customer situation first, introduce verified product evidence second, and answer objections before the action prompt.",
      "Invite the reader to review or explore the verified offer without implying that observed content performance predicts their outcome.",
    ),

    makeBrief(
      "landing_page",
      "Original landing-page concept",
      "Translate content observations into an original product-page information architecture while preserving claim safety.",
      [
        structure,
        topic,
        cta,
      ],
      report,
      records,
      `Use ${structure.value} only as an information-architecture reference. Create a new page narrative grounded in verified product facts and customer questions rather than competitor copy.`,
      "Create an original hero direction focused on customer context plus one independently verified product proposition.",
      "Organize proof, benefits, objections, specifications, and trust information so every factual product statement can be traced to product evidence.",
      "Use a clear draft CTA whose wording matches the verified offer and requires human approval before publishing.",
    ),

    makeBrief(
      "creative_brief",
      "Original creative production brief",
      "Turn descriptive Content Intelligence into a new creative direction for human production and review.",
      [
        format,
        hook,
        structure,
      ],
      report,
      records,
      `Develop a new ${format.value} execution using the observed ${hook.value} opening category and ${structure.value} narrative pattern. The production concept must be independently written and visually distinct from the captured sources.`,
      "Define a fresh opening scene and hook rather than recreating a creator's first line or shot sequence.",
      "Show only product behavior or benefits supported by verified product evidence, and use customer signals to frame the problem rather than invent claims.",
      "End with a draft action direction for human review; do not publish, schedule, or send automatically.",
    ),
  ];

  assertContentActivationSafety(
    briefs,
  );

  assertContentActivationOriginality(
    records,
    briefs,
  );

  return briefs;
}
