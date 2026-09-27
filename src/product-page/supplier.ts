import type { SupplierPlatform, SupplierUrlIntake } from "./types.js";

const trackingKeys = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "spm",
  "scm",
  "algo_pvid",
  "algo_exp_id",
  "srcsns",
]);

function isUnsafeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "[::1]") return true;
  if (/^127\./.test(host)) return true;
  if (/^0\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;

  return false;
}

function detectPlatform(hostname: string): SupplierPlatform {
  const host = hostname.toLowerCase();

  if (/(^|\.)aliexpress\.(com|us|ru)$/.test(host)) {
    return "aliexpress";
  }

  if (/(^|\.)alibaba\.com$/.test(host)) {
    return "alibaba";
  }

  return "other";
}

export function parseSupplierUrl(input: unknown): SupplierUrlIntake {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("supplier URL must be a non-empty string");
  }

  const originalUrl = input.trim();

  if (originalUrl.length > 4096) {
    throw new Error("supplier URL is too long");
  }

  let url: URL;

  try {
    url = new URL(originalUrl);
  } catch {
    throw new Error("supplier URL must be an absolute URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("supplier URL must use HTTPS");
  }

  if (url.username || url.password) {
    throw new Error("supplier URL must not contain embedded credentials");
  }

  if (isUnsafeHost(url.hostname)) {
    throw new Error("supplier URL must not target localhost or a private network address");
  }

  url.hash = "";

  for (const key of [...url.searchParams.keys()]) {
    if (trackingKeys.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();

  return {
    originalUrl,
    normalizedUrl: url.toString(),
    hostname: url.hostname.toLowerCase(),
    platform: detectPlatform(url.hostname),
  };
}
