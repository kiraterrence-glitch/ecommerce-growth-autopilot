import type { CurrencyCode } from "../domain/product.js";
import type { CompetitorRecord, ResearchValidationIssue, ReviewEvidence } from "./types.js";

export type CompetitorImportRowResult =
  | Readonly<{ row: number; ok: true; competitor: CompetitorRecord }>
  | Readonly<{ row: number; ok: false; issues: readonly ResearchValidationIssue[] }>;

export type CompetitorCsvImportResult = Readonly<{
  rows: readonly CompetitorImportRowResult[];
  imported: readonly CompetitorRecord[];
  failed: number;
}>;

export type ReviewImportRowResult =
  | Readonly<{ row: number; ok: true; review: ReviewEvidence }>
  | Readonly<{ row: number; ok: false; issues: readonly ResearchValidationIssue[] }>;

export type ReviewCsvImportResult = Readonly<{
  rows: readonly ReviewImportRowResult[];
  imported: readonly ReviewEvidence[];
  failed: number;
}>;

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === undefined) continue;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function requireColumns(header: readonly string[], expected: readonly string[]): ResearchValidationIssue[] {
  return expected
    .filter((key) => !header.includes(key))
    .map((key) => ({ path: key, message: "missing CSV column" }));
}

function splitList(value: string): string[] {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function importCompetitorsFromCsv(
  text: string,
  options: Readonly<{ currency: CurrencyCode; sourceId: string; capturedAt: string }>,
): CompetitorCsvImportResult {
  const rows = parseCsvRows(text);
  const header = rows[0]?.map((value) => value.trim()) ?? [];
  const missing = requireColumns(header, ["id", "title", "price", "rating", "reviewCount", "features", "offer"]);
  if (missing.length > 0) return { rows: [{ row: 1, ok: false, issues: missing }], imported: [], failed: 1 };
  const indexOf = (name: string): number => header.indexOf(name);
  const valueAt = (values: readonly string[], name: string): string => values[indexOf(name)] ?? "";
  const results: CompetitorImportRowResult[] = [];
  const imported: CompetitorRecord[] = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const values = rows[rowIndex];
    if (!values || values.every((value) => value.trim() === "")) continue;
    const issues: ResearchValidationIssue[] = [];
    const id = valueAt(values, "id").trim();
    const title = valueAt(values, "title").trim();
    const price = Number(valueAt(values, "price"));
    const rating = parseOptionalNumber(valueAt(values, "rating"));
    const reviewCount = parseOptionalNumber(valueAt(values, "reviewCount"));
    if (!id) issues.push({ path: "id", message: "must be non-empty" });
    if (!title) issues.push({ path: "title", message: "must be non-empty" });
    if (!Number.isFinite(price) || price <= 0) issues.push({ path: "price", message: "must be a finite number greater than 0" });
    if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 5)) issues.push({ path: "rating", message: "must be blank or between 0 and 5" });
    if (reviewCount !== null && (!Number.isInteger(reviewCount) || reviewCount < 0)) issues.push({ path: "reviewCount", message: "must be blank or a non-negative integer" });
    const displayRow = rowIndex + 1;
    if (issues.length > 0) {
      results.push({ row: displayRow, ok: false, issues });
      continue;
    }
    const competitor: CompetitorRecord = {
      id,
      title,
      price,
      currency: options.currency,
      rating,
      reviewCount,
      features: splitList(valueAt(values, "features")),
      offer: valueAt(values, "offer").trim() || null,
      sourceId: options.sourceId,
      capturedAt: options.capturedAt,
    };
    results.push({ row: displayRow, ok: true, competitor });
    imported.push(competitor);
  }
  return { rows: results, imported, failed: results.filter((result) => !result.ok).length };
}

export function importReviewsFromCsv(
  text: string,
  options: Readonly<{ sourceId: string; capturedAt: string }>,
): ReviewCsvImportResult {
  const rows = parseCsvRows(text);
  const header = rows[0]?.map((value) => value.trim()) ?? [];
  const missing = requireColumns(header, ["id", "competitorId", "rating", "text"]);
  if (missing.length > 0) return { rows: [{ row: 1, ok: false, issues: missing }], imported: [], failed: 1 };
  const indexOf = (name: string): number => header.indexOf(name);
  const valueAt = (values: readonly string[], name: string): string => values[indexOf(name)] ?? "";
  const results: ReviewImportRowResult[] = [];
  const imported: ReviewEvidence[] = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const values = rows[rowIndex];
    if (!values || values.every((value) => value.trim() === "")) continue;
    const issues: ResearchValidationIssue[] = [];
    const id = valueAt(values, "id").trim();
    const textValue = valueAt(values, "text").trim();
    const rating = parseOptionalNumber(valueAt(values, "rating"));
    if (!id) issues.push({ path: "id", message: "must be non-empty" });
    if (!textValue) issues.push({ path: "text", message: "must be non-empty" });
    if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 5)) issues.push({ path: "rating", message: "must be blank or between 0 and 5" });
    const displayRow = rowIndex + 1;
    if (issues.length > 0) {
      results.push({ row: displayRow, ok: false, issues });
      continue;
    }
    const review: ReviewEvidence = {
      id,
      competitorId: valueAt(values, "competitorId").trim() || null,
      rating,
      text: textValue,
      sourceId: options.sourceId,
      capturedAt: options.capturedAt,
    };
    results.push({ row: displayRow, ok: true, review });
    imported.push(review);
  }
  return { rows: results, imported, failed: results.filter((result) => !result.ok).length };
}
