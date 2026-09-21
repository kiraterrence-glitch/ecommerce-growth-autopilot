import type {
  CurrencyCode,
  ProductValidationIssue,
  ProductValidationResult,
} from "../domain/product.js";

const allowedCurrencies = new Set<CurrencyCode>([
  "USD",
  "AUD",
  "PHP",
  "GBP",
  "EUR",
  "CAD",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function readNonEmptyString(
  source: Record<string, unknown>,
  key: string,
  issues: ProductValidationIssue[],
): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path: key, message: "must be a non-empty string" });
    return "";
  }
  return value.trim();
}

function readOptionalNonNegativeNumber(
  source: Record<string, unknown>,
  key: string,
  issues: ProductValidationIssue[],
): number | null {
  const value = source[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push({ path: key, message: "must be null or a finite non-negative number" });
    return null;
  }
  return value;
}

export function validateProduct(input: unknown): ProductValidationResult {
  const issues: ProductValidationIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: "$", message: "must be an object" }] };
  }

  const sku = readNonEmptyString(input, "sku", issues);
  const title = readNonEmptyString(input, "title", issues);
  const description = readNonEmptyString(input, "description", issues);

  const price = input.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    issues.push({ path: "price", message: "must be a finite number greater than 0" });
  }

  const currency = input.currency;
  if (typeof currency !== "string" || !allowedCurrencies.has(currency as CurrencyCode)) {
    issues.push({ path: "currency", message: "must be a supported currency code" });
  }

  const cost = readOptionalNonNegativeNumber(input, "cost", issues);
  const inventory = readOptionalNonNegativeNumber(input, "inventory", issues);
  if (inventory !== null && !Number.isInteger(inventory)) {
    issues.push({ path: "inventory", message: "must be an integer when provided" });
  }

  const features = input.features;
  if (!isStringArray(features)) {
    issues.push({ path: "features", message: "must be an array of strings" });
  }

  const benefits = input.benefits;
  if (!isStringArray(benefits)) {
    issues.push({ path: "benefits", message: "must be an array of strings" });
  }

  const audiences = input.audiences;
  if (!isStringArray(audiences) || audiences.length === 0) {
    issues.push({ path: "audiences", message: "must contain at least one audience" });
  }

  const imageUrls = input.imageUrls;
  if (!isStringArray(imageUrls)) {
    issues.push({ path: "imageUrls", message: "must be an array of strings" });
  }

  const offer = input.offer;
  let offerType: "percentage" | "fixed" | "none" = "none";
  let offerValue = 0;
  if (!isRecord(offer)) {
    issues.push({ path: "offer", message: "must be an object" });
  } else {
    if (offer.type !== "percentage" && offer.type !== "fixed" && offer.type !== "none") {
      issues.push({ path: "offer.type", message: "must be percentage, fixed, or none" });
    } else {
      offerType = offer.type;
    }
    if (typeof offer.value !== "number" || !Number.isFinite(offer.value) || offer.value < 0) {
      issues.push({ path: "offer.value", message: "must be a finite non-negative number" });
    } else {
      offerValue = offer.value;
    }
    if (offerType === "percentage" && offerValue > 100) {
      issues.push({ path: "offer.value", message: "percentage discounts cannot exceed 100" });
    }
    if (offerType === "none" && offerValue !== 0) {
      issues.push({ path: "offer.value", message: "must be 0 when offer type is none" });
    }
  }

  const channels = input.channels;
  let shopify = false;
  let amazon = false;
  if (!isRecord(channels)) {
    issues.push({ path: "channels", message: "must be an object" });
  } else {
    if (typeof channels.shopify !== "boolean") {
      issues.push({ path: "channels.shopify", message: "must be boolean" });
    } else {
      shopify = channels.shopify;
    }
    if (typeof channels.amazon !== "boolean") {
      issues.push({ path: "channels.amazon", message: "must be boolean" });
    } else {
      amazon = channels.amazon;
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    product: {
      sku,
      title,
      description,
      price: price as number,
      currency: currency as CurrencyCode,
      cost,
      inventory,
      features: (features as string[]).map((value) => value.trim()).filter(Boolean),
      benefits: (benefits as string[]).map((value) => value.trim()).filter(Boolean),
      audiences: (audiences as string[]).map((value) => value.trim()).filter(Boolean),
      imageUrls: (imageUrls as string[]).map((value) => value.trim()).filter(Boolean),
      offer: { type: offerType, value: offerValue },
      channels: { shopify, amazon },
    },
  };
}
