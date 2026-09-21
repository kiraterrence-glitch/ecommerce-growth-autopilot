import type { Product } from "../domain/product.js";
import { normalizeProduct } from "./normalize.js";

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function identityPayload(product: Product): string {
  const normalized = normalizeProduct(product);
  return JSON.stringify({
    sku: normalized.sku,
    title: normalized.title.toLocaleLowerCase("en-US"),
    currency: normalized.currency,
    price: normalized.price,
    channels: normalized.channels,
  });
}

export function getProductFingerprint(product: Product): string {
  return fnv1a32(identityPayload(product));
}

export function getProductId(product: Product): string {
  const normalized = normalizeProduct(product);
  const safeSku = normalized.sku.replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "SKU";
  return `prd_${safeSku.toLocaleLowerCase("en-US")}_${getProductFingerprint(normalized)}`;
}
