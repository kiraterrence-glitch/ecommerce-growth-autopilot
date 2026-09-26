import {
  classifyMarketplaceSource,
  listMarketplacePolicies,
  requireManualMarketplaceCapture,
} from "./marketplace-source-policy.mjs";

import {
  captureUserProvidedText,
} from "./marketplace-manual-capture.mjs";

const sources = new Map([
  [
    "https://www.amazon.com/dp/example",
    "amazon",
  ],
  [
    "https://www.aliexpress.com/item/example.html",
    "aliexpress",
  ],
  [
    "https://www.alibaba.com/product-detail/example.html",
    "alibaba",
  ],
  [
    "https://www.temu.com/example.html",
    "temu",
  ],
]);

for (const [url, expected] of sources) {
  const actual =
    classifyMarketplaceSource(url)
      .policy.id;

  if (actual !== expected) {
    throw new Error(
      `Expected ${expected}, got ${actual}.`,
    );
  }

  try {
    requireManualMarketplaceCapture(url);

    throw new Error(
      `Automated fetch was unexpectedly allowed for ${expected}.`,
    );
  } catch (error) {
    if (
      error.code !==
      "MANUAL_CAPTURE_REQUIRED"
    ) {
      throw error;
    }
  }
}

console.log(
  "[PASS] marketplace classification + manual-capture boundary",
);

for (const policy of listMarketplacePolicies()) {
  if (
    policy.mediaRightsDefault !==
    "UNKNOWN_RIGHTS"
  ) {
    throw new Error(
      `Unsafe rights default: ${policy.id}`,
    );
  }
}

console.log(
  "[PASS] media rights default UNKNOWN_RIGHTS",
);

const captured =
  captureUserProvidedText({
    sourceUrl:
      "https://supplier.example.com/product",
    text:
      "Capacity 500 ml",
    capturedAt:
      "2026-09-26T00:00:00Z",
  });

if (
  captured.automatedFetch !==
    false ||
  !captured.contentHash
) {
  throw new Error(
    "Provenance capture failed.",
  );
}

console.log(
  "[PASS] deterministic provenance capture",
);

console.log("");
console.log(
  "PHASE 12A-1 MARKETPLACE SOURCE SAFETY AUDIT PASSED",
);
