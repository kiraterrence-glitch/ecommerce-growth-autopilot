import type {
  ContentIntelligenceClassification,
  ContentIntelligenceCreativeFormat,
  ContentIntelligenceHookType,
  ContentIntelligenceRecord,
  ContentIntelligenceStructure,
} from "./types.js";

function segments(
  transcript: string,
): string[] {
  const lines =
    transcript
      .split(/\r?\n+/u)
      .map((line) => line.trim())
      .filter(Boolean);

  const output: string[] = [];

  for (const line of lines) {
    const matches =
      line.match(
        /[^.!?]+[.!?]?/gu,
      );

    for (
      const match of
      matches ?? [line]
    ) {
      const trimmed =
        match.trim();

      if (trimmed.length > 0) {
        output.push(trimmed);
      }
    }
  }

  return output;
}

function includesAny(
  value: string,
  terms: readonly string[],
): boolean {
  const lower =
    value.toLowerCase();

  return terms.some(
    (term) =>
      lower.includes(term),
  );
}

function classifyHook(
  hook: string,
): ContentIntelligenceHookType {
  const lower =
    hook.toLowerCase();

  if (
    hook.trim().endsWith("?") ||
    /^(why|how|what|when|where|who|want|ever|do|does|are|is|can)\b/u.test(
      lower,
    )
  ) {
    return "Question";
  }

  if (
    includesAny(
      lower,
      [
        "stop ",
        "don't ",
        "do not ",
        "myth",
        "unpopular",
        "wrong way",
        "instead of",
      ],
    )
  ) {
    return "Contrarian";
  }

  if (
    includesAny(
      lower,
      [
        "watch ",
        "here's how",
        "here is how",
        "let me show",
        "demo",
        "demonstrat",
      ],
    )
  ) {
    return "Demonstration";
  }

  if (
    includesAny(
      lower,
      [
        "years of",
        "clients",
        "expert",
        "specialist",
        "professional",
      ],
    )
  ) {
    return "Authority";
  }

  if (
    /(?:\d+%|\d+x|\bin \d+ (?:day|days|week|weeks|month|months)\b)/u.test(
      lower,
    ) ||
    includesAny(
      lower,
      [
        "result",
        "earned more",
        "increased",
        "grew ",
        "saved ",
      ],
    )
  ) {
    return "Result";
  }

  if (
    includesAny(
      lower,
      [
        "tired of",
        "struggling",
        "struggle",
        "problem",
        "frustrated",
        "mistake",
        "difficult",
        "hard to",
      ],
    )
  ) {
    return "Problem";
  }

  if (
    includesAny(
      lower,
      [
        "if you ",
        "you know when",
        "ever feel",
        "sound familiar",
      ],
    )
  ) {
    return "Recognition";
  }

  if (
    /^(when i|i used to|last year|last month|yesterday|i remember)\b/u.test(
      lower,
    )
  ) {
    return "Story";
  }

  if (
    includesAny(
      lower,
      [
        "secret",
        "surprising",
        "nobody tells",
        "what happened",
        "you might not know",
      ],
    )
  ) {
    return "Curiosity";
  }

  return "Unclassified";
}

function classifyStructure(
  transcript: string,
  hookType: ContentIntelligenceHookType,
): ContentIntelligenceStructure {
  const lower =
    transcript.toLowerCase();

  if (
    includesAny(
      lower,
      [
        "customer said",
        "customer says",
        "testimonial",
        "reviewer said",
      ],
    )
  ) {
    return "Testimonial";
  }

  if (
    /\b(?:\d+|one|two|three|four|five)\s+(?:ways|reasons|steps|tips|mistakes)\b/u.test(
      lower,
    ) ||
    /(?:^|\n)\s*(?:\d+[.)]|[-*])\s+/u.test(
      transcript,
    )
  ) {
    return "List";
  }

  if (
    lower.includes("before") &&
    lower.includes("after")
  ) {
    return "Before → After";
  }

  if (
    lower.includes("mistake") &&
    includesAny(
      lower,
      ["fix", "instead", "correct"],
    )
  ) {
    return "Mistake → Fix";
  }

  if (
    includesAny(
      lower,
      ["claim", "proof", "evidence"],
    ) &&
    includesAny(
      lower,
      ["proof", "evidence", "data"],
    )
  ) {
    return "Claim → Proof";
  }

  if (
    includesAny(
      lower,
      ["lesson", "learned"],
    ) &&
    (
      hookType === "Story" ||
      includesAny(
        lower,
        ["when i", "i used to"],
      )
    )
  ) {
    return "Story → Lesson";
  }

  if (
    hookType === "Demonstration" ||
    includesAny(
      lower,
      [
        "step by step",
        "watch how",
        "let me show",
      ],
    )
  ) {
    return "Demonstration";
  }

  if (
    includesAny(
      lower,
      [
        "problem",
        "tired of",
        "struggle",
        "frustrated",
      ],
    ) &&
    includesAny(
      lower,
      [
        "solution",
        "fix",
        "instead",
        "can help",
        "can keep",
      ],
    )
  ) {
    return "Problem → Solution";
  }

  return "Unclassified";
}

function classifyTopic(
  transcript: string,
): string {
  const lower =
    transcript.toLowerCase();

  const topics: ReadonlyArray<
    readonly [string, readonly string[]]
  > = [
    [
      "product research",
      [
        "supplier",
        "product research",
        "competitor",
        "source record",
      ],
    ],

    [
      "product page",
      [
        "product page",
        "landing page",
        "cta",
        "specification",
      ],
    ],

    [
      "paid advertising",
      [
        "meta ad",
        "facebook ad",
        "google ad",
        "ad creative",
      ],
    ],

    [
      "email marketing",
      [
        "email",
        "subject line",
        "newsletter",
      ],
    ],

    [
      "ecommerce operations",
      [
        "shopify",
        "checkout",
        "inventory",
        "order",
      ],
    ],

    [
      "customer experience",
      [
        "customer",
        "support",
        "refund",
        "shipping",
      ],
    ],
  ];

  for (
    const [topic, keywords]
    of topics
  ) {
    if (
      includesAny(
        lower,
        keywords,
      )
    ) {
      return topic;
    }
  }

  return "general ecommerce content";
}

function groundedSignals(
  values: readonly string[],
  terms: readonly string[],
  maximum = 3,
): string[] {
  return values
    .filter(
      (value) =>
        includesAny(
          value,
          terms,
        ),
    )
    .slice(
      0,
      maximum,
    );
}

function firstMatching(
  values: readonly string[],
  terms: readonly string[],
): string | null {
  return (
    values.find(
      (value) =>
        includesAny(
          value,
          terms,
        ),
    ) ?? null
  );
}

function creativeFormat(
  transcript: string,
  hookType: ContentIntelligenceHookType,
  structure: ContentIntelligenceStructure,
): ContentIntelligenceCreativeFormat {
  const lower =
    transcript.toLowerCase();

  if (
    structure === "Testimonial"
  ) {
    return "Testimonial";
  }

  if (
    includesAny(
      lower,
      [
        "screen recording",
        "on screen",
        "screen share",
      ],
    )
  ) {
    return "Screen Recording";
  }

  if (
    hookType === "Demonstration" ||
    structure === "Demonstration"
  ) {
    return "Demonstration";
  }

  if (
    structure === "List"
  ) {
    return "Listicle";
  }

  if (
    includesAny(
      lower,
      [
        "ugc",
        "user generated",
      ],
    )
  ) {
    return "UGC";
  }

  if (
    includesAny(
      lower,
      [
        "static image",
        "graphic",
      ],
    )
  ) {
    return "Static";
  }

  return "Talking Head";
}

export function classifyContentIntelligenceDeterministically(
  content: ContentIntelligenceRecord,
): ContentIntelligenceClassification {
  const transcriptSegments =
    segments(
      content.transcript,
    );

  const hookText =
    transcriptSegments[0] ??
    content.transcript;

  const hookType =
    classifyHook(
      hookText,
    );

  const structure =
    classifyStructure(
      content.transcript,
      hookType,
    );

  return {
    contentId:
      content.id,

    topic:
      classifyTopic(
        content.transcript,
      ),

    hookText,

    hookType,

    structure,

    audience:
      groundedSignals(
        transcriptSegments,
        [
          "traveler",
          "travel",
          "shopper",
          "customer",
          "creator",
          "seller",
          "owner",
          "team",
        ],
      ),

    painPoints:
      groundedSignals(
        transcriptSegments,
        [
          "tired",
          "struggle",
          "problem",
          "mistake",
          "frustrated",
          "difficult",
          "hard",
          "buried",
        ],
      ),

    benefits:
      groundedSignals(
        transcriptSegments,
        [
          "easier",
          "faster",
          "simple",
          "save",
          "improve",
          "increase",
          "compact",
          "without",
        ],
      ),

    objections:
      groundedSignals(
        transcriptSegments,
        [
          "concern",
          "worried",
          "expensive",
          "not sure",
          "too much",
          "objection",
        ],
      ),

    buyingTriggers:
      groundedSignals(
        transcriptSegments,
        [
          "before",
          "today",
          "now",
          "next trip",
          "when you need",
          "start with",
        ],
      ),

    cta:
      firstMatching(
        transcriptSegments,
        [
          "buy ",
          "shop ",
          "click ",
          "try ",
          "start ",
          "download",
          "learn more",
          "comment ",
          "review the",
        ],
      ),

    offerPositioning:
      firstMatching(
        transcriptSegments,
        [
          "free",
          "discount",
          "bundle",
          "guarantee",
          "offer",
          "price",
        ],
      ),

    creativeFormat:
      creativeFormat(
        content.transcript,
        hookType,
        structure,
      ),

    evidenceQuotes:
      transcriptSegments.slice(
        0,
        3,
      ),

    classifier:
      "deterministic",
  };
}

export function classifyContentIntelligenceBatchDeterministically(
  records: readonly ContentIntelligenceRecord[],
): ContentIntelligenceClassification[] {
  return records.map(
    (record) =>
      classifyContentIntelligenceDeterministically(
        record,
      ),
  );
}
