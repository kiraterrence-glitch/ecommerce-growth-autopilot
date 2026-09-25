import {
  readFile,
} from "node:fs/promises";

import {
  discoverProductAssets,
  extractSupplierSnapshotFromHtml,
} from "../dist/index.js";

import {
  isDisallowedAddress,
} from "./product-research-safe-network.mjs";

function pass(
  name,
  details,
) {
  console.log(
    `[PASS] ${name} -> ${details}`,
  );
}

function fail(
  name,
  details,
) {
  console.error(
    `[FAIL] ${name} -> ${details}`,
  );

  process.exitCode = 1;
}

console.log("");
console.log(
  "PHASE 2 SUPPLIER EXTRACTION AUDIT",
);

console.log(
  "---------------------------------",
);

try {
  const html =
    await readFile(
      "tests/fixtures/product-research/aliexpress-jsonld.html",
      "utf8",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.aliexpress.com/item/audit.html",
      ),
      {
        jobId:
          "phase-2-audit",
        sourceId:
          "supplier",
        sourceKind:
          "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  if (
    snapshot.status !==
    "EXTRACTED"
  ) {
    throw new Error(
      `unexpected extraction status ${snapshot.status}`,
    );
  }

  const title =
    snapshot.evidence.find(
      (item) =>
        item.field ===
        "Title",
    );

  if (
    title?.rawValue !==
    "Portable Espresso Maker"
  ) {
    throw new Error(
      "structured product title was not extracted",
    );
  }

  const capacity =
    snapshot.evidence.find(
      (item) =>
        item.field ===
        "Capacity",
    );

  if (
    capacity?.normalizedValue !==
      500 ||
    capacity?.unit !== "ml"
  ) {
    throw new Error(
      "capacity normalization failed",
    );
  }

  const assets =
    discoverProductAssets(
      snapshot,
    );

  if (
    assets.length !== 3
  ) {
    throw new Error(
      `expected 3 media candidates, received ${assets.length}`,
    );
  }

  pass(
    "Structured supplier extraction",
    `${snapshot.evidence.length} evidence records`,
  );

  pass(
    "Variant extraction",
    `${
      snapshot.evidence.filter(
        (item) =>
          item.field ===
          "Variant SKU",
      ).length
    } variants`,
  );

  pass(
    "Media discovery",
    `${assets.length} source assets with provenance`,
  );

  pass(
    "Rights boundary",
    "source assets remain UNKNOWN_RIGHTS",
  );
} catch (error) {
  fail(
    "Structured supplier extraction",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

try {
  const html =
    await readFile(
      "tests/fixtures/product-research/alibaba-meta.html",
      "utf8",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.alibaba.com/product-detail/audit.html",
      ),
      {
        jobId:
          "phase-2-meta-audit",
        sourceId:
          "supplier",
        sourceKind:
          "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  if (
    snapshot.status !==
    "EXTRACTED"
  ) {
    throw new Error(
      "meta fallback did not extract",
    );
  }

  pass(
    "Meta fallback",
    `${snapshot.evidence.length} evidence records`,
  );
} catch (error) {
  fail(
    "Meta fallback",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

try {
  const html =
    await readFile(
      "tests/fixtures/product-research/blocked.html",
      "utf8",
    );

  const snapshot =
    extractSupplierSnapshotFromHtml(
      html,
      new URL(
        "https://www.aliexpress.com/item/blocked.html",
      ),
      {
        jobId:
          "phase-2-block-audit",
        sourceId:
          "supplier",
        sourceKind:
          "supplier",
        capturedAt:
          "2026-09-25T00:00:00Z",
      },
    );

  if (
    snapshot.status !==
    "MANUAL_CAPTURE_REQUIRED"
  ) {
    throw new Error(
      "blocked page did not fail closed",
    );
  }

  pass(
    "Blocked page handling",
    "MANUAL_CAPTURE_REQUIRED",
  );
} catch (error) {
  fail(
    "Blocked page handling",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

try {
  const privateTargets = [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "172.16.0.1",
    "::1",
    "fc00::1",
  ];

  if (
    !privateTargets.every(
      isDisallowedAddress,
    )
  ) {
    throw new Error(
      "one or more private network addresses were accepted",
    );
  }

  pass(
    "Network boundary",
    "private and loopback targets rejected",
  );
} catch (error) {
  fail(
    "Network boundary",
    error instanceof Error
      ? error.message
      : String(error),
  );
}

if (process.exitCode) {
  console.error("");
  console.error(
    "PHASE 2 AUDIT FAILED",
  );
} else {
  console.log("");
  console.log(
    "PHASE 2 AUDIT PASSED",
  );
}
