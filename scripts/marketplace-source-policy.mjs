import { isIP } from "node:net";

export const MARKETPLACE_POLICY_REVIEWED_AT =
  "2026-09-26";

const POLICIES = Object.freeze({
  amazon: Object.freeze({
    id: "amazon",
    label: "Amazon",
    officialApi: "SP_API",
    apiAccess: "AUTH_REQUIRED",
    pageCapture: "USER_PROVIDED_ONLY",
    mediaRightsDefault: "UNKNOWN_RIGHTS",
    officialDocs:
      "https://developer-docs.amazon.com/sp-api/docs/onboarding-overview",
  }),

  aliexpress: Object.freeze({
    id: "aliexpress",
    label: "AliExpress",
    officialApi: "ALIEXPRESS_OPEN_PLATFORM",
    apiAccess: "AUTH_REQUIRED",
    pageCapture: "USER_PROVIDED_ONLY",
    mediaRightsDefault: "UNKNOWN_RIGHTS",
    officialDocs:
      "https://developer.alibaba.com/docs/doc.htm?articleId=120672&docType=1&treeId=727",
  }),

  alibaba: Object.freeze({
    id: "alibaba",
    label: "Alibaba.com",
    officialApi: "ALIBABA_OPEN_PLATFORM",
    apiAccess: "AUTH_REQUIRED",
    pageCapture: "USER_PROVIDED_ONLY",
    mediaRightsDefault: "UNKNOWN_RIGHTS",
    officialDocs:
      "https://openapi.alibaba.com/doc/doc.htm",
  }),

  temu: Object.freeze({
    id: "temu",
    label: "Temu",
    officialApi: "TEMU_PARTNER_PLATFORM",
    apiAccess: "AUTH_REQUIRED",
    pageCapture: "USER_PROVIDED_ONLY",
    mediaRightsDefault: "UNKNOWN_RIGHTS",
    officialDocs:
      "https://partner.temu.com/documentation",
  }),

  generic_supplier: Object.freeze({
    id: "generic_supplier",
    label: "Generic supplier",
    officialApi: null,
    apiAccess: "UNKNOWN",
    pageCapture: "USER_PROVIDED_ONLY",
    mediaRightsDefault: "UNKNOWN_RIGHTS",
    officialDocs: null,
  }),
});

const AMAZON_ROOTS = new Set([
  "amazon.com",
  "amazon.ca",
  "amazon.com.mx",
  "amazon.com.br",
  "amazon.co.uk",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.nl",
  "amazon.se",
  "amazon.pl",
  "amazon.ie",
  "amazon.com.be",
  "amazon.co.jp",
  "amazon.sg",
  "amazon.com.au",
  "amazon.in",
  "amazon.ae",
  "amazon.sa",
  "amazon.com.tr",
  "amazon.co.za",
]);

function hostMatches(hostname, root) {
  return (
    hostname === root ||
    hostname.endsWith(`.${root}`)
  );
}

function privateIpv4(address) {
  const parts =
    address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function privateIpv6(address) {
  const value =
    address
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .toLowerCase();

  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    /^fe[89ab]/.test(value)
  );
}

export class ManualCaptureRequiredError extends Error {
  constructor(policyId) {
    super(
      `Automatic marketplace page fetching is disabled for ${policyId}.`,
    );

    this.name = "ManualCaptureRequiredError";
    this.code = "MANUAL_CAPTURE_REQUIRED";
    this.policyId = policyId;
  }
}

export function normalizeMarketplaceUrl(input) {
  const url = new URL(input);

  if (url.protocol !== "https:") {
    throw new Error(
      "Marketplace URLs must use HTTPS.",
    );
  }

  if (url.username || url.password) {
    throw new Error(
      "Embedded URL credentials are not allowed.",
    );
  }

  const hostname =
    url.hostname
      .toLowerCase()
      .replace(/\.$/, "");

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error(
      "Localhost is not a marketplace source.",
    );
  }

  const plainHost =
    hostname
      .replace(/^\[/, "")
      .replace(/\]$/, "");

  const ipKind = isIP(plainHost);

  if (
    ipKind === 4 &&
    privateIpv4(plainHost)
  ) {
    throw new Error(
      "Private IPv4 sources are blocked.",
    );
  }

  if (
    ipKind === 6 &&
    privateIpv6(plainHost)
  ) {
    throw new Error(
      "Private IPv6 sources are blocked.",
    );
  }

  url.hash = "";

  for (const key of [...url.searchParams.keys()]) {
    const normalized = key.toLowerCase();

    if (
      normalized.startsWith("utm_") ||
      ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(
        normalized,
      )
    ) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();

  return url;
}

export function classifyMarketplaceSource(input) {
  const url =
    normalizeMarketplaceUrl(input);

  const hostname =
    url.hostname.toLowerCase();

  let policyId = "generic_supplier";

  if (
    [...AMAZON_ROOTS].some(
      (root) => hostMatches(hostname, root),
    )
  ) {
    policyId = "amazon";
  } else if (
    hostMatches(hostname, "aliexpress.com")
  ) {
    policyId = "aliexpress";
  } else if (
    hostMatches(hostname, "alibaba.com")
  ) {
    policyId = "alibaba";
  } else if (
    hostMatches(hostname, "temu.com")
  ) {
    policyId = "temu";
  }

  return {
    url: url.toString(),
    hostname,
    policy: POLICIES[policyId],
    reviewedAt:
      MARKETPLACE_POLICY_REVIEWED_AT,
  };
}

export function getMarketplacePolicy(policyId) {
  const policy = POLICIES[policyId];

  if (!policy) {
    throw new Error(
      `Unknown marketplace policy: ${policyId}`,
    );
  }

  return policy;
}

export function listMarketplacePolicies() {
  return Object.values(POLICIES);
}

export function requireManualMarketplaceCapture(input) {
  const result =
    classifyMarketplaceSource(input);

  if (
    result.policy.pageCapture !==
    "AUTOMATED_ALLOWED"
  ) {
    throw new ManualCaptureRequiredError(
      result.policy.id,
    );
  }

  return result;
}
