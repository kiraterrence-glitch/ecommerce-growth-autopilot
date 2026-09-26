import type {
  ContentIntelligenceClassification,
  ContentIntelligenceRecord,
} from "./types.js";

function normalize(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function grounded(
  transcript: string,
  phrase: string,
): boolean {
  const normalizedPhrase =
    normalize(
      phrase,
    );

  if (
    normalizedPhrase.length === 0
  ) {
    return false;
  }

  return normalize(
    transcript,
  ).includes(
    normalizedPhrase,
  );
}

export class ContentIntelligenceGroundingError
  extends Error {
  public readonly issues: readonly string[];

  public constructor(
    issues: readonly string[],
  ) {
    super(
      `Content Intelligence grounding failed: ${issues.join("; ")}`,
    );

    this.name =
      "ContentIntelligenceGroundingError";

    this.issues =
      [...issues];
  }
}

export function checkContentIntelligenceGrounding(
  content: ContentIntelligenceRecord,
  classification: ContentIntelligenceClassification,
): string[] {
  const issues: string[] = [];

  if (
    classification.contentId !==
    content.id
  ) {
    issues.push(
      "classification contentId does not match source content",
    );
  }

  const fields: Array<
    readonly [string, string]
  > = [
    [
      "hookText",
      classification.hookText,
    ],

    ...classification.evidenceQuotes.map(
      (value) =>
        [
          "evidenceQuote",
          value,
        ] as const,
    ),

    ...classification.painPoints.map(
      (value) =>
        [
          "painPoint",
          value,
        ] as const,
    ),

    ...classification.benefits.map(
      (value) =>
        [
          "benefit",
          value,
        ] as const,
    ),

    ...classification.objections.map(
      (value) =>
        [
          "objection",
          value,
        ] as const,
    ),

    ...classification.buyingTriggers.map(
      (value) =>
        [
          "buyingTrigger",
          value,
        ] as const,
    ),
  ];

  if (
    classification.cta !== null
  ) {
    fields.push([
      "cta",
      classification.cta,
    ]);
  }

  if (
    classification.offerPositioning !==
    null
  ) {
    fields.push([
      "offerPositioning",
      classification.offerPositioning,
    ]);
  }

  for (
    const [label, phrase]
    of fields
  ) {
    if (
      !grounded(
        content.transcript,
        phrase,
      )
    ) {
      issues.push(
        `${label} is not grounded in transcript`,
      );
    }
  }

  return issues;
}

export function assertContentIntelligenceGrounding(
  content: ContentIntelligenceRecord,
  classification: ContentIntelligenceClassification,
): void {
  const issues =
    checkContentIntelligenceGrounding(
      content,
      classification,
    );

  if (
    issues.length > 0
  ) {
    throw new ContentIntelligenceGroundingError(
      issues,
    );
  }
}
