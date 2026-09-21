import type { Product, ProductValidationIssue } from "../domain/product.js";
import { validateProduct } from "../validation/product.js";
import { normalizeProduct } from "./normalize.js";

export type ProductImportRowResult =
  | Readonly<{ row: number; ok: true; product: Product }>
  | Readonly<{ row: number; ok: false; issues: readonly ProductValidationIssue[] }>;

export type ProductCsvImportResult = Readonly<{
  rows: readonly ProductImportRowResult[];
  imported: readonly Product[];
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
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function splitList(value: string): string[] {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalNumber(value: string): number | null | string {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function parseBoolean(value: string): boolean | string {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return value;
}

export function importProductsFromCsv(text: string): ProductCsvImportResult {
  const rows = parseCsvRows(text);
  const header = rows[0]?.map((value) => value.trim()) ?? [];
  const expected = new Set([
    "sku", "title", "description", "price", "currency", "cost", "inventory",
    "features", "benefits", "audiences", "imageUrls", "offerType", "offerValue",
    "shopify", "amazon",
  ]);

  const missing = [...expected].filter((key) => !header.includes(key));
  if (missing.length > 0) {
    return {
      rows: [{ row: 1, ok: false, issues: missing.map((key) => ({ path: key, message: "missing CSV column" })) }],
      imported: [],
      failed: 1,
    };
  }

  const indexOf = (name: string): number => header.indexOf(name);
  const valueAt = (values: readonly string[], name: string): string => values[indexOf(name)] ?? "";
  const results: ProductImportRowResult[] = [];
  const imported: Product[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const values = rows[rowIndex];
    if (!values || values.every((value) => value.trim() === "")) continue;

    const raw = {
      sku: valueAt(values, "sku"),
      title: valueAt(values, "title"),
      description: valueAt(values, "description"),
      price: Number(valueAt(values, "price")),
      currency: valueAt(values, "currency"),
      cost: optionalNumber(valueAt(values, "cost")),
      inventory: optionalNumber(valueAt(values, "inventory")),
      features: splitList(valueAt(values, "features")),
      benefits: splitList(valueAt(values, "benefits")),
      audiences: splitList(valueAt(values, "audiences")),
      imageUrls: splitList(valueAt(values, "imageUrls")),
      offer: {
        type: valueAt(values, "offerType"),
        value: Number(valueAt(values, "offerValue")),
      },
      channels: {
        shopify: parseBoolean(valueAt(values, "shopify")),
        amazon: parseBoolean(valueAt(values, "amazon")),
      },
    };

    const validation = validateProduct(raw);
    const displayRow = rowIndex + 1;
    if (!validation.ok) {
      results.push({ row: displayRow, ok: false, issues: validation.issues });
      continue;
    }

    const product = normalizeProduct(validation.product);
    imported.push(product);
    results.push({ row: displayRow, ok: true, product });
  }

  return {
    rows: results,
    imported,
    failed: results.filter((result) => !result.ok).length,
  };
}
