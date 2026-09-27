import {
  CONTENT_INTELLIGENCE_PLATFORMS,
  type ContentIntelligenceMetrics,
  type ContentIntelligencePlatform,
  type ContentIntelligenceRecord,
} from "./types.js";

function objectValue(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function requiredString(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function optionalString(
  value: unknown,
  label: string,
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return requiredString(
    value,
    label,
  );
}

function metric(
  value: unknown,
  label: string,
  required = false,
): number {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      throw new Error(`${label} is required.`);
    }

    return 0;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} must be a finite non-negative number.`,
    );
  }

  return value;
}

function validateUrl(
  value: string | null,
): string | null {
  if (value === null) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "sourceUrl must be a valid URL.",
    );
  }

  if (
    parsed.protocol !== "https:" &&
    parsed.protocol !== "http:"
  ) {
    throw new Error(
      "sourceUrl must use http or https.",
    );
  }

  return parsed.toString();
}

function validateTimestamp(
  value: string | null,
): string | null {
  if (value === null) {
    return null;
  }

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(
      "publishedAt must be a valid timestamp.",
    );
  }

  return value;
}

function validateTags(
  value: unknown,
): string[] {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(
      "tags must be an array.",
    );
  }

  const tags =
    value.map(
      (item, index) =>
        requiredString(
          item,
          `tags[${index}]`,
        ),
    );

  return [...new Set(tags)];
}

function validateMetrics(
  value: unknown,
): ContentIntelligenceMetrics {
  const input =
    objectValue(
      value,
      "metrics",
    );

  return {
    views:
      metric(
        input.views,
        "metrics.views",
        true,
      ),

    likes:
      metric(
        input.likes,
        "metrics.likes",
      ),

    comments:
      metric(
        input.comments,
        "metrics.comments",
      ),

    shares:
      metric(
        input.shares,
        "metrics.shares",
      ),

    saves:
      metric(
        input.saves,
        "metrics.saves",
      ),

    followers:
      metric(
        input.followers,
        "metrics.followers",
      ),
  };
}

export function validateContentIntelligenceRecord(
  value: unknown,
): ContentIntelligenceRecord {
  const input =
    objectValue(
      value,
      "content",
    );

  const platform =
    requiredString(
      input.platform,
      "platform",
    );

  if (
    !CONTENT_INTELLIGENCE_PLATFORMS.includes(
      platform as ContentIntelligencePlatform,
    )
  ) {
    throw new Error(
      `Unsupported content platform: ${platform}`,
    );
  }

  return {
    id:
      requiredString(
        input.id,
        "id",
      ),

    platform:
      platform as ContentIntelligencePlatform,

    sourceUrl:
      validateUrl(
        optionalString(
          input.sourceUrl,
          "sourceUrl",
        ),
      ),

    creator:
      optionalString(
        input.creator,
        "creator",
      ),

    publishedAt:
      validateTimestamp(
        optionalString(
          input.publishedAt,
          "publishedAt",
        ),
      ),

    transcript:
      requiredString(
        input.transcript,
        "transcript",
      ),

    metrics:
      validateMetrics(
        input.metrics,
      ),

    tags:
      validateTags(
        input.tags,
      ),
  };
}

export function validateContentIntelligenceDataset(
  value: unknown,
): ContentIntelligenceRecord[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Content Intelligence dataset must be an array.",
    );
  }

  const records =
    value.map(
      (item) =>
        validateContentIntelligenceRecord(
          item,
        ),
    );

  const ids =
    new Set<string>();

  for (const record of records) {
    if (ids.has(record.id)) {
      throw new Error(
        `Duplicate content ID: ${record.id}`,
      );
    }

    ids.add(record.id);
  }

  return records;
}
