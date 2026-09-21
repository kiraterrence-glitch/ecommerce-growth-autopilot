import type { Product } from "../domain/product.js";
import { getProductFingerprint, getProductId } from "./identity.js";
import { normalizeProduct } from "./normalize.js";

export type ProductRecord = Readonly<{
  productId: string;
  fingerprint: string;
  product: Product;
}>;

export type RegisterProductResult =
  | Readonly<{ status: "added"; record: ProductRecord }>
  | Readonly<{ status: "duplicate"; record: ProductRecord }>;

export class ProductRegistry {
  readonly #byFingerprint = new Map<string, ProductRecord>();

  register(product: Product): RegisterProductResult {
    const normalized = normalizeProduct(product);
    const fingerprint = getProductFingerprint(normalized);
    const existing = this.#byFingerprint.get(fingerprint);
    if (existing) {
      return { status: "duplicate", record: existing };
    }

    const record: ProductRecord = {
      productId: getProductId(normalized),
      fingerprint,
      product: normalized,
    };
    this.#byFingerprint.set(fingerprint, record);
    return { status: "added", record };
  }

  get size(): number {
    return this.#byFingerprint.size;
  }
}
