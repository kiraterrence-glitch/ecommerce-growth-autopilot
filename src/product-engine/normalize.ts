import type { Product } from "../domain/product.js";

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeList(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const item = normalizeText(value);
    if (!item) continue;
    const key = item.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(item);
  }

  return normalized;
}

export function normalizeProduct(product: Product): Product {
  return {
    ...product,
    sku: normalizeText(product.sku).toUpperCase(),
    title: normalizeText(product.title),
    description: normalizeText(product.description),
    features: normalizeList(product.features),
    benefits: normalizeList(product.benefits),
    audiences: normalizeList(product.audiences),
    imageUrls: normalizeList(product.imageUrls),
  };
}
