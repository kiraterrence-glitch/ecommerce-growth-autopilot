import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  discoverProductAssets,
  extractSupplierSnapshotFromHtml,
} from "../../dist/index.js";

const fixture = async (name) =>
  await readFile(
    new URL(
      `../fixtures/product-research/${name}`,
      import.meta.url,
    ),
    "utf8",
  );

test("supplier extractor reads Product JSON-LD with provenance", async () => {
  const html =
    await fixture(
      "aliexpress-jsonld.html",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.aliexpress.com/item/fixture.html",
      ),
      {
        jobId: "job-jsonld",
        sourceId: "supplier",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  assert.equal(
    snapshot.status,
    "EXTRACTED",
  );

  assert.equal(
    snapshot.rawFormat,
    "structured_data",
  );

  const title =
    snapshot.evidence.find(
      (item) =>
        item.field === "Title",
    );

  assert.equal(
    title?.rawValue,
    "Portable Espresso Maker",
  );

  assert.equal(
    title?.sourceId,
    "supplier",
  );
});

test("supplier extractor normalizes structured measurements", async () => {
  const html =
    await fixture(
      "aliexpress-jsonld.html",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.aliexpress.com/item/fixture.html",
      ),
      {
        jobId: "job-measurement",
        sourceId: "supplier",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const capacity =
    snapshot.evidence.find(
      (item) =>
        item.field ===
        "Capacity",
    );

  assert.equal(
    capacity?.normalizedValue,
    500,
  );

  assert.equal(
    capacity?.unit,
    "ml",
  );
});

test("supplier extractor captures JSON-LD variants", async () => {
  const html =
    await fixture(
      "aliexpress-jsonld.html",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.aliexpress.com/item/fixture.html",
      ),
      {
        jobId: "job-variants",
        sourceId: "supplier",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const variants =
    snapshot.evidence.filter(
      (item) =>
        item.field ===
        "Variant SKU",
    );

  assert.equal(
    variants.length,
    2,
  );

  assert.equal(
    variants.some(
      (item) =>
        item.rawValue ===
        "ESP-500-BLK",
    ),
    true,
  );
});

test("supplier extractor falls back to product meta tags", async () => {
  const html =
    await fixture(
      "alibaba-meta.html",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.alibaba.com/product-detail/fixture.html",
      ),
      {
        jobId: "job-meta",
        sourceId: "supplier",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  assert.equal(
    snapshot.status,
    "EXTRACTED",
  );

  assert.equal(
    snapshot.rawFormat,
    "dom",
  );

  assert.equal(
    snapshot.evidence.some(
      (item) =>
        item.field ===
          "Title" &&
        item.rawValue ===
          "Stainless Travel Bottle",
    ),
    true,
  );
});

test("supplier extractor fails closed on human-verification pages", async () => {
  const html =
    await fixture(
      "blocked.html",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.aliexpress.com/item/blocked.html",
      ),
      {
        jobId: "job-blocked",
        sourceId: "supplier",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  assert.equal(
    snapshot.status,
    "MANUAL_CAPTURE_REQUIRED",
  );

  assert.equal(
    snapshot.evidence.length,
    0,
  );
});

test("media discovery preserves source evidence and rights status", async () => {
  const html =
    await fixture(
      "aliexpress-jsonld.html",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.aliexpress.com/item/fixture.html",
      ),
      {
        jobId: "job-media",
        sourceId: "supplier",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const assets =
    discoverProductAssets(
      snapshot,
    );

  assert.equal(
    assets.length,
    3,
  );

  assert.equal(
    assets.every(
      (asset) =>
        asset.rightsStatus ===
        "UNKNOWN_RIGHTS",
    ),
    true,
  );

  assert.equal(
    assets.every(
      (asset) =>
        asset.sourceEvidenceId
          .startsWith(
            "supplier-e",
          ),
    ),
    true,
  );
});
