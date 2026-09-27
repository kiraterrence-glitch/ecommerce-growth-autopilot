import {
  auditEvidenceLedger,
  buildEvidenceLedger,
  buildManualSourceSnapshot,
  extractWithAdapters,
  normalizeMeasurement,
  validateResearchUrl,
} from "../dist/index.js";

function pass(name, detail) {
  console.log(`[PASS] ${name} -> ${detail}`);
}

function fail(name, detail) {
  console.error(`[FAIL] ${name} -> ${detail}`);
  process.exitCode = 1;
}

console.log("");
console.log("PHASE 1 EVIDENCE FOUNDATION AUDIT");
console.log("---------------------------------");

try {
  validateResearchUrl(
    "https://www.aliexpress.com/item/123456.html",
  );

  pass(
    "URL boundary",
    "HTTPS external supplier URL accepted",
  );
} catch (error) {
  fail(
    "URL boundary",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

try {
  let blocked = false;

  try {
    validateResearchUrl(
      "https://127.0.0.1/product",
    );
  } catch {
    blocked = true;
  }

  if (!blocked) {
    throw new Error(
      "private-network URL was not rejected",
    );
  }

  pass(
    "SSRF boundary",
    "private-network target rejected",
  );
} catch (error) {
  fail(
    "SSRF boundary",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

try {
  const measurement =
    normalizeMeasurement("0.5 L");

  if (
    !measurement ||
    measurement.normalizedValue !== 500 ||
    measurement.unit !== "ml"
  ) {
    throw new Error(
      "0.5 L did not normalize to 500 ml",
    );
  }

  pass(
    "Measurement normalization",
    "0.5 L == 500 ml",
  );
} catch (error) {
  fail(
    "Measurement normalization",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

try {
  const unsupported =
    await extractWithAdapters(
      new URL(
        "https://example.com/product",
      ),
      {
        jobId:
          "phase-1-audit",
        sourceId:
          "unsupported-source",
        sourceKind:
          "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
      [],
    );

  if (
    unsupported.status !==
    "MANUAL_CAPTURE_REQUIRED"
  ) {
    throw new Error(
      `expected MANUAL_CAPTURE_REQUIRED, received ${unsupported.status}`,
    );
  }

  pass(
    "Fail-closed extraction",
    "unsupported source requires manual capture",
  );
} catch (error) {
  fail(
    "Fail-closed extraction",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

try {
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
        jobId:
          "phase-1-audit",
        sourceId:
          "supplier",
        sourceKind:
          "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  const verification =
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
        jobId:
          "phase-1-audit",
        sourceId:
          "manual-check",
        sourceKind:
          "manual_import",
        capturedAt:
          "2026-09-25T00:01:00Z",
      },
    );

  const ledger =
    buildEvidenceLedger(
      "phase-1-audit",
      [
        supplier,
        verification,
      ],
      "2026-09-25T00:02:00Z",
    );

  const report =
    auditEvidenceLedger(
      ledger,
    );

  if (!report.passed) {
    throw new Error(
      "evidence audit returned errors",
    );
  }

  if (
    report.conflictCount !== 1
  ) {
    throw new Error(
      `expected one material conflict, received ${report.conflictCount}`,
    );
  }

  pass(
    "Evidence provenance",
    `${report.evidenceCount} evidence items across ${report.sourceCount} sources`,
  );

  pass(
    "Conflict detection",
    "equivalent capacity agrees; material conflict detected",
  );
} catch (error) {
  fail(
    "Evidence ledger",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

if (process.exitCode) {
  console.error("");
  console.error(
    "PHASE 1 AUDIT FAILED",
  );
} else {
  console.log("");
  console.log(
    "PHASE 1 AUDIT PASSED",
  );
}
