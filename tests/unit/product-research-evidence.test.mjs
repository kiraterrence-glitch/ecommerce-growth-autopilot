import assert from "node:assert/strict";
import test from "node:test";

import {
  auditEvidenceLedger,
  buildEvidenceLedger,
  buildManualSourceSnapshot,
  extractWithAdapters,
  normalizeMeasurement,
  validateAssetMetadata,
  validateResearchUrl,
} from "../../dist/index.js";

test("research URL validation blocks unsafe destinations", () => {
  assert.equal(
    validateResearchUrl(
      "https://www.aliexpress.com/item/123.html",
    ).hostname,
    "www.aliexpress.com",
  );

  assert.throws(
    () =>
      validateResearchUrl(
        "http://example.com/product",
      ),
    /HTTPS/i,
  );

  assert.throws(
    () =>
      validateResearchUrl(
        "https://127.0.0.1/product",
      ),
    /private network/i,
  );

  assert.throws(
    () =>
      validateResearchUrl(
        "https://user:password@example.com/product",
      ),
    /credentials/i,
  );
});

test("asset metadata safety rejects unsupported or oversized files", () => {
  assert.doesNotThrow(() =>
    validateAssetMetadata({
      mimeType: "image/jpeg",
      byteLength: 1_000_000,
      width: 1600,
      height: 1600,
    }),
  );

  assert.throws(
    () =>
      validateAssetMetadata({
        mimeType: "application/x-msdownload",
        byteLength: 1000,
      }),
    /MIME type/i,
  );

  assert.throws(
    () =>
      validateAssetMetadata({
        mimeType: "image/png",
        byteLength:
          51 * 1024 * 1024,
      }),
    /50 MB/i,
  );
});

test("measurement normalization converts equivalent units", () => {
  assert.deepEqual(
    normalizeMeasurement("0.5 L"),
    {
      normalizedValue: 500,
      unit: "ml",
    },
  );

  assert.deepEqual(
    normalizeMeasurement("500 ml"),
    {
      normalizedValue: 500,
      unit: "ml",
    },
  );

  assert.deepEqual(
    normalizeMeasurement("1 kg"),
    {
      normalizedValue: 1000,
      unit: "g",
    },
  );

  assert.deepEqual(
    normalizeMeasurement("100 cm"),
    {
      normalizedValue: 1000,
      unit: "mm",
    },
  );
});

test("manual evidence keeps provenance and normalized values", () => {
  const snapshot =
    buildManualSourceSnapshot(
      [
        {
          field: "Capacity",
          value: "0.5 L",
        },
        {
          field: "Material",
          value:
            "Stainless steel",
        },
      ],
      {
        jobId: "job-1",
        sourceId: "supplier-1",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
      "https://example.com/product",
    );

  assert.equal(
    snapshot.status,
    "EXTRACTED",
  );

  assert.equal(
    snapshot.evidence.length,
    2,
  );

  assert.equal(
    snapshot.evidence[0]
      .normalizedValue,
    500,
  );

  assert.equal(
    snapshot.evidence[0].unit,
    "ml",
  );

  assert.equal(
    snapshot.evidence[0]
      .sourceId,
    "supplier-1",
  );
});

test("unsupported source adapters fail closed to manual capture", async () => {
  const result =
    await extractWithAdapters(
      new URL(
        "https://example.com/product",
      ),
      {
        jobId: "job-2",
        sourceId: "source-2",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
      [],
    );

  assert.equal(
    result.status,
    "MANUAL_CAPTURE_REQUIRED",
  );

  assert.equal(
    result.evidence.length,
    0,
  );
});

test("evidence ledger detects real conflicts while equivalent units agree", () => {
  const supplier =
    buildManualSourceSnapshot(
      [
        {
          field: "Capacity",
          value: "0.5 L",
        },
        {
          field: "Material",
          value:
            "Stainless steel",
        },
      ],
      {
        jobId: "job-3",
        sourceId: "supplier",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const manual =
    buildManualSourceSnapshot(
      [
        {
          field: "Capacity",
          value: "500 ml",
        },
        {
          field: "Material",
          value: "Plastic",
        },
      ],
      {
        jobId: "job-3",
        sourceId: "manual-check",
        sourceKind:
          "manual_import",
        capturedAt:
          "2026-09-25T00:01:00Z",
      },
    );

  const ledger =
    buildEvidenceLedger(
      "job-3",
      [supplier, manual],
      "2026-09-25T00:02:00Z",
    );

  assert.equal(
    ledger.conflicts.length,
    1,
  );

  assert.equal(
    ledger.conflicts[0].field,
    "Material",
  );

  const report =
    auditEvidenceLedger(ledger);

  assert.equal(
    report.passed,
    true,
  );

  assert.equal(
    report.errors,
    0,
  );

  assert.equal(
    report.conflictCount,
    1,
  );
});

test("evidence ledger rejects duplicate evidence IDs", () => {
  const first =
    buildManualSourceSnapshot(
      [
        {
          field: "Color",
          value: "Black",
        },
      ],
      {
        jobId: "job-4",
        sourceId: "same-source",
        sourceKind: "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const second =
    buildManualSourceSnapshot(
      [
        {
          field: "Size",
          value: "Large",
        },
      ],
      {
        jobId: "job-4",
        sourceId: "same-source",
        sourceKind:
          "manual_import",
        capturedAt:
          "2026-09-25T00:01:00Z",
      },
    );

  assert.throws(
    () =>
      buildEvidenceLedger(
        "job-4",
        [first, second],
      ),
    /duplicate evidence IDs/i,
  );
});
