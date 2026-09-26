import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyMarketplaceSource,
  getMarketplacePolicy,
  listMarketplacePolicies,
  normalizeMarketplaceUrl,
  requireManualMarketplaceCapture,
} from "../../scripts/marketplace-source-policy.mjs";

import {
  captureUserProvidedHtml,
  captureUserProvidedText,
  detectHumanVerificationPage,
} from "../../scripts/marketplace-manual-capture.mjs";

const NOW =
  "2026-09-26T00:00:00Z";

test("Amazon URLs classify correctly", () => {
  assert.equal(
    classifyMarketplaceSource(
      "https://www.amazon.com/dp/B000000000",
    ).policy.id,
    "amazon",
  );
});

test("AliExpress URLs classify correctly", () => {
  assert.equal(
    classifyMarketplaceSource(
      "https://www.aliexpress.com/item/1005000000000.html",
    ).policy.id,
    "aliexpress",
  );
});

test("Alibaba URLs classify correctly", () => {
  assert.equal(
    classifyMarketplaceSource(
      "https://www.alibaba.com/product-detail/example.html",
    ).policy.id,
    "alibaba",
  );
});

test("Temu URLs classify correctly", () => {
  assert.equal(
    classifyMarketplaceSource(
      "https://www.temu.com/example.html",
    ).policy.id,
    "temu",
  );
});

test("unknown HTTPS sites become generic suppliers", () => {
  assert.equal(
    classifyMarketplaceSource(
      "https://supplier.example.com/product",
    ).policy.id,
    "generic_supplier",
  );
});

test("HTTP sources are rejected", () => {
  assert.throws(
    () =>
      normalizeMarketplaceUrl(
        "http://example.com/product",
      ),
    /HTTPS/,
  );
});

test("embedded credentials are rejected", () => {
  assert.throws(
    () =>
      normalizeMarketplaceUrl(
        "https://user:pass@example.com/product",
      ),
    /credentials/,
  );
});

test("localhost and private IPv4 sources are rejected", () => {
  assert.throws(
    () =>
      normalizeMarketplaceUrl(
        "https://localhost/product",
      ),
    /Localhost/,
  );

  assert.throws(
    () =>
      normalizeMarketplaceUrl(
        "https://192.168.1.4/product",
      ),
    /Private IPv4/,
  );
});

test("tracking parameters are removed from provenance URLs", () => {
  assert.equal(
    normalizeMarketplaceUrl(
      "https://example.com/product?utm_source=x&variant=2&fbclid=y",
    ).toString(),
    "https://example.com/product?variant=2",
  );
});

test("all four marketplace APIs are authorization-gated", () => {
  for (
    const id of [
      "amazon",
      "aliexpress",
      "alibaba",
      "temu",
    ]
  ) {
    assert.equal(
      getMarketplacePolicy(id).apiAccess,
      "AUTH_REQUIRED",
    );
  }
});

test("automatic marketplace page fetching fails closed", () => {
  assert.throws(
    () =>
      requireManualMarketplaceCapture(
        "https://www.amazon.com/dp/example",
      ),
    (error) =>
      error.code ===
      "MANUAL_CAPTURE_REQUIRED",
  );
});

test("all source policies default media to UNKNOWN_RIGHTS", () => {
  for (const policy of listMarketplacePolicies()) {
    assert.equal(
      policy.mediaRightsDefault,
      "UNKNOWN_RIGHTS",
    );
  }
});

test("user-provided HTML preserves provenance", () => {
  const captured =
    captureUserProvidedHtml({
      sourceUrl:
        "https://www.alibaba.com/product-detail/example.html",
      html:
        "<html><title>Example</title></html>",
      capturedAt:
        NOW,
    });

  assert.equal(
    captured.policyId,
    "alibaba",
  );

  assert.equal(
    captured.automatedFetch,
    false,
  );

  assert.equal(
    captured.rightsStatus,
    "UNKNOWN_RIGHTS",
  );

  assert.match(
    captured.contentHash,
    /^[a-f0-9]{64}$/,
  );
});

test("identical user-provided content has deterministic source identity", () => {
  const first =
    captureUserProvidedText({
      sourceUrl:
        "https://supplier.example.com/product",
      text:
        "Capacity 500 ml",
      capturedAt:
        NOW,
    });

  const second =
    captureUserProvidedText({
      sourceUrl:
        "https://supplier.example.com/product",
      text:
        "Capacity 500 ml",
      capturedAt:
        NOW,
    });

  assert.equal(
    first.sourceId,
    second.sourceId,
  );

  assert.equal(
    first.contentHash,
    second.contentHash,
  );
});

test("different captured content produces a different content hash", () => {
  const first =
    captureUserProvidedText({
      sourceUrl:
        "https://supplier.example.com/product",
      text:
        "Capacity 500 ml",
      capturedAt:
        NOW,
    });

  const second =
    captureUserProvidedText({
      sourceUrl:
        "https://supplier.example.com/product",
      text:
        "Capacity 350 ml",
      capturedAt:
        NOW,
    });

  assert.notEqual(
    first.contentHash,
    second.contentHash,
  );
});

test("human-verification pages fail closed", () => {
  assert.equal(
    detectHumanVerificationPage(
      "<html>Verify you are human CAPTCHA</html>",
    ),
    true,
  );

  assert.throws(
    () =>
      captureUserProvidedHtml({
        sourceUrl:
          "https://www.aliexpress.com/item/example.html",
        html:
          "<html>Verify you are human CAPTCHA</html>",
        capturedAt:
          NOW,
      }),
    (error) =>
      error.code ===
      "HUMAN_VERIFICATION_REQUIRED",
  );
});
