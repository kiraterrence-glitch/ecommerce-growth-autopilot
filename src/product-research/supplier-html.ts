import {
  normalizeEvidenceText,
  normalizeMeasurement,
} from "./normalization.js";

import type {
  EvidenceRecord,
  ProductSourceAdapterContext,
  SourceSnapshot,
} from "./types.js";

type JsonRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function decodeHtml(
  value: string,
): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function stripTags(
  value: string,
): string {
  return normalizeEvidenceText(
    decodeHtml(
      value.replace(
        /<[^>]+>/g,
        " ",
      ),
    ),
  );
}

function attribute(
  tag: string,
  name: string,
): string | null {
  const escaped =
    name.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const quoted =
    new RegExp(
      `\\b${escaped}\\s*=\\s*(["'])(.*?)\\1`,
      "i",
    ).exec(tag);

  if (quoted?.[2]) {
    return decodeHtml(
      quoted[2],
    ).trim();
  }

  const unquoted =
    new RegExp(
      `\\b${escaped}\\s*=\\s*([^\\s>]+)`,
      "i",
    ).exec(tag);

  return unquoted?.[1]
    ? decodeHtml(
        unquoted[1],
      ).trim()
    : null;
}

function collectMeta(
  html: string,
): Map<string, string[]> {
  const values =
    new Map<string, string[]>();

  const tags =
    html.match(
      /<meta\b[^>]*>/gi,
    ) ?? [];

  for (const tag of tags) {
    const key =
      attribute(tag, "property") ??
      attribute(tag, "name");

    const content =
      attribute(tag, "content");

    if (!key || !content) {
      continue;
    }

    const normalizedKey =
      key.toLowerCase();

    const current =
      values.get(
        normalizedKey,
      ) ?? [];

    current.push(content);

    values.set(
      normalizedKey,
      current,
    );
  }

  return values;
}

function firstMeta(
  meta: Map<string, string[]>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value =
      meta.get(
        key.toLowerCase(),
      )?.[0];

    if (value) return value;
  }

  return null;
}

function allMeta(
  meta: Map<string, string[]>,
  ...keys: string[]
): string[] {
  const values: string[] = [];

  for (const key of keys) {
    values.push(
      ...(
        meta.get(
          key.toLowerCase(),
        ) ?? []
      ),
    );
  }

  return values;
}

function findJsonLdScripts(
  html: string,
): unknown[] {
  const values: unknown[] = [];

  const pattern =
    /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;

  for (
    const match of
    html.matchAll(pattern)
  ) {
    const raw =
      match[2]?.trim();

    if (!raw) continue;

    const candidates = [
      raw,
      decodeHtml(raw),
    ];

    for (const candidate of candidates) {
      try {
        values.push(
          JSON.parse(candidate),
        );

        break;
      } catch {
        // Try decoded form next.
      }
    }
  }

  return values;
}

function typeIncludesProduct(
  value: unknown,
): boolean {
  if (typeof value === "string") {
    return (
      value.toLowerCase() ===
      "product"
    );
  }

  if (Array.isArray(value)) {
    return value.some(
      typeIncludesProduct,
    );
  }

  return false;
}

function findProducts(
  input: unknown,
  results: JsonRecord[] = [],
): JsonRecord[] {
  if (Array.isArray(input)) {
    for (const item of input) {
      findProducts(
        item,
        results,
      );
    }

    return results;
  }

  if (!isRecord(input)) {
    return results;
  }

  if (
    typeIncludesProduct(
      input["@type"],
    )
  ) {
    results.push(input);
  }

  const graph =
    input["@graph"];

  if (Array.isArray(graph)) {
    findProducts(
      graph,
      results,
    );
  }

  return results;
}

function textValue(
  value: unknown,
): string | null {
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const normalized =
      normalizeEvidenceText(
        String(value),
      );

    return normalized || null;
  }

  return null;
}

function brandValue(
  value: unknown,
): string | null {
  const direct =
    textValue(value);

  if (direct) return direct;

  if (isRecord(value)) {
    return textValue(
      value.name,
    );
  }

  return null;
}

function collectImages(
  value: unknown,
): string[] {
  const images: string[] = [];

  const visit = (
    current: unknown,
  ): void => {
    if (
      typeof current === "string"
    ) {
      if (
        /^https:\/\//i.test(
          current,
        )
      ) {
        images.push(
          current,
        );
      }

      return;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item);
      }

      return;
    }

    if (isRecord(current)) {
      visit(current.url);
      visit(
        current.contentUrl,
      );
    }
  };

  visit(value);

  return [
    ...new Set(images),
  ];
}

function collectVideos(
  value: unknown,
): string[] {
  const videos: string[] = [];

  const visit = (
    current: unknown,
  ): void => {
    if (
      typeof current === "string"
    ) {
      if (
        /^https:\/\//i.test(
          current,
        )
      ) {
        videos.push(
          current,
        );
      }

      return;
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item);
      }

      return;
    }

    if (isRecord(current)) {
      visit(
        current.contentUrl,
      );

      visit(
        current.embedUrl,
      );

      visit(current.url);
    }
  };

  visit(value);

  return [
    ...new Set(videos),
  ];
}

function firstOffer(
  value: unknown,
): JsonRecord | null {
  if (isRecord(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return (
      value.find(isRecord) ??
      null
    );
  }

  return null;
}

function pageBlocked(
  html: string,
): boolean {
  const sample =
    html
      .slice(0, 250_000)
      .toLowerCase();

  return [
    "verify you are human",
    "unusual traffic",
    "access denied",
    "captcha",
    "security verification",
    "robot check",
  ].some(
    (marker) =>
      sample.includes(marker),
  );
}

function normalizeValue(
  rawValue: string,
): Readonly<{
  normalizedValue:
    | string
    | number;
  unit: string | null;
}> {
  const measurement =
    normalizeMeasurement(
      rawValue,
    );

  if (measurement) {
    return measurement;
  }

  return {
    normalizedValue:
      normalizeEvidenceText(
        rawValue,
      ),
    unit: null,
  };
}

function makeEvidenceFactory(
  context: ProductSourceAdapterContext,
  sourceUrl: string,
) {
  let sequence = 0;

  const capturedAt =
    context.capturedAt ??
    new Date().toISOString();

  const seen =
    new Set<string>();

  const records:
    EvidenceRecord[] = [];

  const add = (
    field: string,
    value: string | null,
    variantId: string | null = null,
    notes: readonly string[] = [],
  ): void => {
    if (!value) return;

    const rawValue =
      stripTags(value);

    if (!rawValue) return;

    const key =
      [
        field.toLowerCase(),
        rawValue.toLowerCase(),
        variantId ?? "",
      ].join("::");

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    const normalized =
      normalizeValue(
        rawValue,
      );

    sequence += 1;

    records.push({
      evidenceId:
        `${context.sourceId}-e${String(sequence).padStart(4, "0")}`,
      jobId:
        context.jobId,
      sourceId:
        context.sourceId,
      sourceKind:
        context.sourceKind,
      sourceUrl,
      field,
      rawValue,
      normalizedValue:
        normalized.normalizedValue,
      unit:
        normalized.unit,
      variantId,
      confidence:
        "direct",
      capturedAt,
      extractor:
        "supplier-html-v1",
      notes,
    });
  };

  return {
    records,
    add,
    capturedAt,
  };
}

function extractAdditionalProperties(
  product: JsonRecord,
  add: (
    field: string,
    value: string | null,
    variantId?: string | null,
    notes?: readonly string[],
  ) => void,
): void {
  const additional =
    product.additionalProperty;

  if (!Array.isArray(additional)) {
    return;
  }

  for (const item of additional) {
    if (!isRecord(item)) {
      continue;
    }

    const name =
      textValue(item.name);

    const value =
      textValue(item.value);

    if (name && value) {
      add(
        name,
        value,
        null,
        [
          "json-ld additionalProperty",
        ],
      );
    }
  }
}

function extractVariants(
  product: JsonRecord,
  add: (
    field: string,
    value: string | null,
    variantId?: string | null,
    notes?: readonly string[],
  ) => void,
): void {
  const variants =
    product.hasVariant;

  if (!Array.isArray(variants)) {
    return;
  }

  for (
    const variant of
    variants
  ) {
    if (!isRecord(variant)) {
      continue;
    }

    const variantId =
      textValue(variant.sku) ??
      textValue(
        variant.name,
      );

    add(
      "Variant name",
      textValue(
        variant.name,
      ),
      variantId,
      [
        "json-ld hasVariant",
      ],
    );

    add(
      "Variant SKU",
      textValue(
        variant.sku,
      ),
      variantId,
      [
        "json-ld hasVariant",
      ],
    );

    const offers =
      firstOffer(
        variant.offers,
      );

    if (offers) {
      add(
        "Variant price",
        textValue(
          offers.price,
        ),
        variantId,
        [
          "json-ld variant offer",
        ],
      );

      add(
        "Variant currency",
        textValue(
          offers.priceCurrency,
        ),
        variantId,
        [
          "json-ld variant offer",
        ],
      );
    }
  }
}

export function extractSupplierSnapshotFromHtml(
  html: string,
  url: URL,
  context: ProductSourceAdapterContext,
): SourceSnapshot {
  if (!html.trim()) {
    return {
      sourceId:
        context.sourceId,
      sourceKind:
        context.sourceKind,
      sourceUrl:
        url.toString(),
      capturedAt:
        context.capturedAt ??
        new Date().toISOString(),
      adapterId:
        "supplier-html-v1",
      status:
        "MANUAL_CAPTURE_REQUIRED",
      rawFormat:
        "html_snapshot",
      evidence: [],
      warnings: [
        "Supplier HTML was empty.",
      ],
    };
  }

  if (pageBlocked(html)) {
    return {
      sourceId:
        context.sourceId,
      sourceKind:
        context.sourceKind,
      sourceUrl:
        url.toString(),
      capturedAt:
        context.capturedAt ??
        new Date().toISOString(),
      adapterId:
        "supplier-html-v1",
      status:
        "MANUAL_CAPTURE_REQUIRED",
      rawFormat:
        "html_snapshot",
      evidence: [],
      warnings: [
        "Supplier page appears to require human verification or blocks automated access.",
      ],
    };
  }

  const factory =
    makeEvidenceFactory(
      context,
      url.toString(),
    );

  const jsonLdProducts =
    findJsonLdScripts(html)
      .flatMap(
        (value) =>
          findProducts(value),
      );

  const product =
    jsonLdProducts[0];

  if (product) {
    factory.add(
      "Title",
      textValue(
        product.name,
      ),
      null,
      [
        "json-ld Product",
      ],
    );

    factory.add(
      "Description",
      textValue(
        product.description,
      ),
      null,
      [
        "json-ld Product",
      ],
    );

    factory.add(
      "SKU",
      textValue(
        product.sku,
      ),
      null,
      [
        "json-ld Product",
      ],
    );

    factory.add(
      "Brand",
      brandValue(
        product.brand,
      ),
      null,
      [
        "json-ld Product",
      ],
    );

    const offer =
      firstOffer(
        product.offers,
      );

    if (offer) {
      factory.add(
        "Price",
        textValue(
          offer.price,
        ),
        null,
        [
          "json-ld Offer",
        ],
      );

      factory.add(
        "Currency",
        textValue(
          offer.priceCurrency,
        ),
        null,
        [
          "json-ld Offer",
        ],
      );
    }

    for (
      const image of
      collectImages(
        product.image,
      )
    ) {
      factory.add(
        "Image URL",
        image,
        null,
        [
          "json-ld Product.image",
        ],
      );
    }

    for (
      const video of
      collectVideos(
        product.video,
      )
    ) {
      factory.add(
        "Video URL",
        video,
        null,
        [
          "json-ld Product.video",
        ],
      );
    }

    extractAdditionalProperties(
      product,
      factory.add,
    );

    extractVariants(
      product,
      factory.add,
    );
  }

  const meta =
    collectMeta(html);

  factory.add(
    "Title",
    firstMeta(
      meta,
      "og:title",
      "twitter:title",
    ),
    null,
    [
      "meta fallback",
    ],
  );

  factory.add(
    "Description",
    firstMeta(
      meta,
      "og:description",
      "description",
      "twitter:description",
    ),
    null,
    [
      "meta fallback",
    ],
  );

  factory.add(
    "Price",
    firstMeta(
      meta,
      "product:price:amount",
      "og:price:amount",
    ),
    null,
    [
      "meta fallback",
    ],
  );

  factory.add(
    "Currency",
    firstMeta(
      meta,
      "product:price:currency",
      "og:price:currency",
    ),
    null,
    [
      "meta fallback",
    ],
  );

  for (
    const image of
    allMeta(
      meta,
      "og:image",
      "twitter:image",
    )
  ) {
    factory.add(
      "Image URL",
      image,
      null,
      [
        "meta fallback",
      ],
    );
  }

  for (
    const video of
    allMeta(
      meta,
      "og:video",
      "og:video:url",
      "og:video:secure_url",
    )
  ) {
    factory.add(
      "Video URL",
      video,
      null,
      [
        "meta fallback",
      ],
    );
  }

  const evidence =
    factory.records;

  const hasTitle =
    evidence.some(
      (item) =>
        item.field ===
        "Title",
    );

  const status =
    evidence.length === 0
      ? "MANUAL_CAPTURE_REQUIRED"
      : hasTitle
        ? "EXTRACTED"
        : "PARTIAL";

  return {
    sourceId:
      context.sourceId,
    sourceKind:
      context.sourceKind,
    sourceUrl:
      url.toString(),
    capturedAt:
      factory.capturedAt,
    adapterId:
      "supplier-html-v1",
    status,
    rawFormat:
      product
        ? "structured_data"
        : "dom",
    evidence,
    warnings:
      evidence.length === 0
        ? [
            "No usable structured product evidence was found in the supplied HTML.",
          ]
        : [],
  };
}
