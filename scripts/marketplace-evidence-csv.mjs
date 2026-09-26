import { createHash } from "node:crypto";

import {
  classifyMarketplaceSource,
} from "./marketplace-source-policy.mjs";

const REQUIRED_HEADERS = [
  "product_id",
  "source_url",
  "source_id",
  "field",
  "raw_value",
  "normalized_value",
  "unit",
  "status",
  "rights_status",
  "captured_at",
];

const EVIDENCE_STATUSES =
  new Set([
    "VERIFIED",
    "UNVERIFIED",
  ]);

const RIGHTS_STATUSES =
  new Set([
    "UNKNOWN_RIGHTS",
    "OWNED",
    "LICENSED",
    "AUTHORIZED",
  ]);

function sha256(value) {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function required(value, field) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${field} is required.`,
    );
  }

  return value.trim();
}

function validDate(value) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value))
  );
}

export function parseCsv(text) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    throw new Error(
      "CSV content is required.",
    );
  }

  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    const character =
      text[index];

    if (quoted) {
      if (
        character === '"' &&
        text[index + 1] === '"'
      ) {
        field += '"';
        index += 1;
        continue;
      }

      if (character === '"') {
        quoted = false;
        continue;
      }

      field += character;
      continue;
    }

    if (character === '"') {
      quoted = true;
      continue;
    }

    if (character === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (
      character === "\n" ||
      character === "\r"
    ) {
      if (
        character === "\r" &&
        text[index + 1] === "\n"
      ) {
        index += 1;
      }

      row.push(field);
      field = "";

      if (
        row.some(
          (value) => value.length > 0,
        )
      ) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += character;
  }

  if (quoted) {
    throw new Error(
      "CSV contains an unterminated quoted field.",
    );
  }

  row.push(field);

  if (
    row.some(
      (value) => value.length > 0,
    )
  ) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function validateHeaders(headers) {
  const normalized =
    headers.map(
      normalizeHeader,
    );

  for (
    const requiredHeader of
      REQUIRED_HEADERS
  ) {
    if (
      !normalized.includes(
        requiredHeader,
      )
    ) {
      throw new Error(
        `Missing CSV header: ${requiredHeader}`,
      );
    }
  }

  return normalized;
}

function rowObject(
  headers,
  values,
) {
  if (
    values.length >
    headers.length
  ) {
    throw new Error(
      "CSV row has more fields than the header.",
    );
  }

  return Object.fromEntries(
    headers.map(
      (header, index) => [
        header,
        values[index] ?? "",
      ],
    ),
  );
}

function normalizeUnit(value) {
  const normalized =
    String(value ?? "")
      .trim()
      .toLowerCase();

  return normalized || null;
}

function buildEvidenceId(record) {
  const identity =
    [
      record.productId,
      record.sourceId,
      record.field,
      record.rawValue,
      record.normalizedValue,
      record.unit ?? "",
      record.status,
      record.rightsStatus,
      record.capturedAt,
    ].join("|");

  return `evidence-${sha256(identity).slice(0, 24)}`;
}

export function parseMarketplaceEvidenceCsv(text) {
  const rows =
    parseCsv(text);

  if (rows.length < 2) {
    throw new Error(
      "CSV must include a header and at least one evidence row.",
    );
  }

  const headers =
    validateHeaders(
      rows[0],
    );

  const evidence = [];
  const ids = new Set();

  for (
    let index = 1;
    index < rows.length;
    index += 1
  ) {
    const lineNumber =
      index + 1;

    const source =
      rowObject(
        headers,
        rows[index],
      );

    const productId =
      required(
        source.product_id,
        `product_id at line ${lineNumber}`,
      );

    const sourceUrl =
      required(
        source.source_url,
        `source_url at line ${lineNumber}`,
      );

    const sourceId =
      required(
        source.source_id,
        `source_id at line ${lineNumber}`,
      );

    const field =
      required(
        source.field,
        `field at line ${lineNumber}`,
      ).toLowerCase();

    const rawValue =
      required(
        source.raw_value,
        `raw_value at line ${lineNumber}`,
      );

    const normalizedValue =
      required(
        source.normalized_value,
        `normalized_value at line ${lineNumber}`,
      );

    const status =
      required(
        source.status,
        `status at line ${lineNumber}`,
      ).toUpperCase();

    const rightsStatus =
      required(
        source.rights_status,
        `rights_status at line ${lineNumber}`,
      ).toUpperCase();

    const capturedAt =
      required(
        source.captured_at,
        `captured_at at line ${lineNumber}`,
      );

    if (
      !EVIDENCE_STATUSES.has(
        status,
      )
    ) {
      throw new Error(
        `Invalid evidence status at line ${lineNumber}: ${status}`,
      );
    }

    if (
      !RIGHTS_STATUSES.has(
        rightsStatus,
      )
    ) {
      throw new Error(
        `Invalid rights status at line ${lineNumber}: ${rightsStatus}`,
      );
    }

    if (
      !validDate(
        capturedAt,
      )
    ) {
      throw new Error(
        `Invalid captured_at at line ${lineNumber}.`,
      );
    }

    const classified =
      classifyMarketplaceSource(
        sourceUrl,
      );

    const record = {
      productId,
      sourceUrl:
        classified.url,

      sourceId,

      policyId:
        classified.policy.id,

      captureMethod:
        "CSV_IMPORT",

      field,

      rawValue,

      normalizedValue,

      unit:
        normalizeUnit(
          source.unit,
        ),

      status,

      rightsStatus,

      capturedAt,

      automatedFetch:
        false,
    };

    const id =
      buildEvidenceId(
        record,
      );

    if (ids.has(id)) {
      throw new Error(
        `Duplicate CSV evidence row at line ${lineNumber}.`,
      );
    }

    ids.add(id);

    evidence.push({
      id,
      ...record,
    });
  }

  return evidence;
}
