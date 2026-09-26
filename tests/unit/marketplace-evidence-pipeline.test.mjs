import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCsv,
  parseMarketplaceEvidenceCsv,
} from "../../scripts/marketplace-evidence-csv.mjs";

import {
  MarketplaceEvidenceLedger,
  buildMarketplaceEvidenceLedger,
} from "../../scripts/marketplace-evidence-ledger.mjs";

import {
  assessAutomatedFactClaim,
  auditClaimText,
  canUseMediaEvidence,
} from "../../scripts/marketplace-claim-safety.mjs";

const HEADER =
  "product_id,source_url,source_id,field,raw_value,normalized_value,unit,status,rights_status,captured_at";

const NOW =
  "2026-09-26T00:00:00Z";

function row({
  productId =
    "product-1",
  sourceUrl =
    "https://supplier.example.com/product",
  sourceId =
    "source-1",
  field =
    "capacity",
  rawValue =
    "500 ml",
  normalizedValue =
    "500",
  unit =
    "ml",
  status =
    "VERIFIED",
  rightsStatus =
    "UNKNOWN_RIGHTS",
  capturedAt =
    NOW,
} = {}) {
  return [
    productId,
    sourceUrl,
    sourceId,
    field,
    rawValue,
    normalizedValue,
    unit,
    status,
    rightsStatus,
    capturedAt,
  ].join(",");
}

function evidence(overrides = {}) {
  return {
    id:
      overrides.id ??
      "evidence-1",

    productId:
      overrides.productId ??
      "product-1",

    sourceUrl:
      overrides.sourceUrl ??
      "https://supplier.example.com/product",

    sourceId:
      overrides.sourceId ??
      "source-1",

    policyId:
      overrides.policyId ??
      "generic_supplier",

    captureMethod:
      "CSV_IMPORT",

    field:
      overrides.field ??
      "capacity",

    rawValue:
      overrides.rawValue ??
      "500 ml",

    normalizedValue:
      overrides.normalizedValue ??
      "500",

    unit:
      overrides.unit ??
      "ml",

    status:
      overrides.status ??
      "VERIFIED",

    rightsStatus:
      overrides.rightsStatus ??
      "UNKNOWN_RIGHTS",

    capturedAt:
      overrides.capturedAt ??
      NOW,

    automatedFetch:
      false,
  };
}

test("CSV parser accepts a normal evidence document", () => {
  const parsed =
    parseMarketplaceEvidenceCsv(
      `${HEADER}\n${row()}`,
    );

  assert.equal(
    parsed.length,
    1,
  );

  assert.equal(
    parsed[0].field,
    "capacity",
  );
});

test("CSV parser handles quoted commas", () => {
  const rows =
    parseCsv(
      'a,b\n"hello, world",x',
    );

  assert.deepEqual(
    rows[1],
    [
      "hello, world",
      "x",
    ],
  );
});

test("CSV importer rejects missing required headers", () => {
  assert.throws(
    () =>
      parseMarketplaceEvidenceCsv(
        "product_id,field\nx,capacity",
      ),
    /Missing CSV header/,
  );
});

test("CSV importer rejects invalid evidence status", () => {
  assert.throws(
    () =>
      parseMarketplaceEvidenceCsv(
        `${HEADER}\n${row({
          status:
            "TRUST_ME",
        })}`,
      ),
    /Invalid evidence status/,
  );
});

test("CSV importer rejects invalid captured dates", () => {
  assert.throws(
    () =>
      parseMarketplaceEvidenceCsv(
        `${HEADER}\n${row({
          capturedAt:
            "not-a-date",
        })}`,
      ),
    /Invalid captured_at/,
  );
});

test("CSV importer rejects unsafe HTTP source URLs", () => {
  assert.throws(
    () =>
      parseMarketplaceEvidenceCsv(
        `${HEADER}\n${row({
          sourceUrl:
            "http://supplier.example.com/product",
        })}`,
      ),
    /HTTPS/,
  );
});

test("CSV importer rejects exact duplicate evidence rows", () => {
  const one =
    row();

  assert.throws(
    () =>
      parseMarketplaceEvidenceCsv(
        `${HEADER}\n${one}\n${one}`,
      ),
    /Duplicate CSV evidence row/,
  );
});

test("CSV evidence IDs are deterministic", () => {
  const first =
    parseMarketplaceEvidenceCsv(
      `${HEADER}\n${row()}`,
    )[0];

  const second =
    parseMarketplaceEvidenceCsv(
      `${HEADER}\n${row()}`,
    )[0];

  assert.equal(
    first.id,
    second.id,
  );
});

test("ledger rejects duplicate evidence IDs", () => {
  const ledger =
    new MarketplaceEvidenceLedger();

  const record =
    evidence();

  ledger.add(
    record,
  );

  assert.throws(
    () =>
      ledger.add(
        record,
      ),
    (error) =>
      error.code ===
      "DUPLICATE_EVIDENCE_ID",
  );
});

test("ledger rejects duplicate source facts even with different record IDs", () => {
  const ledger =
    new MarketplaceEvidenceLedger();

  ledger.add(
    evidence({
      id:
        "evidence-a",
    }),
  );

  assert.throws(
    () =>
      ledger.add(
        evidence({
          id:
            "evidence-b",
          capturedAt:
            "2026-09-26T01:00:00Z",
        }),
      ),
    (error) =>
      error.code ===
      "DUPLICATE_SOURCE_FACT",
  );
});

test("equivalent measurement units do not create conflicts", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence({
        id:
          "a",
        sourceId:
          "source-a",
        normalizedValue:
          "500",
        unit:
          "ml",
      }),

      evidence({
        id:
          "b",
        sourceId:
          "source-b",
        normalizedValue:
          "0.5",
        unit:
          "l",
      }),
    ]);

  assert.equal(
    ledger.assessField(
      "product-1",
      "capacity",
    ).status,
    "VERIFIED",
  );
});

test("different verified values create an explicit conflict", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence({
        id:
          "a",
        sourceId:
          "source-a",
        normalizedValue:
          "500",
      }),

      evidence({
        id:
          "b",
        sourceId:
          "source-b",
        normalizedValue:
          "350",
      }),
    ]);

  assert.equal(
    ledger.assessField(
      "product-1",
      "capacity",
    ).status,
    "CONFLICT",
  );
});

test("unverified disagreement does not override verified evidence", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence({
        id:
          "a",
        sourceId:
          "source-a",
        normalizedValue:
          "500",
      }),

      evidence({
        id:
          "b",
        sourceId:
          "source-b",
        normalizedValue:
          "350",
        status:
          "UNVERIFIED",
      }),
    ]);

  assert.equal(
    ledger.assessField(
      "product-1",
      "capacity",
    ).status,
    "VERIFIED",
  );
});

test("field with no verified evidence remains UNVERIFIED", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence({
        status:
          "UNVERIFIED",
      }),
    ]);

  assert.equal(
    ledger.assessField(
      "product-1",
      "capacity",
    ).status,
    "UNVERIFIED",
  );
});

test("claim gate allows a stable verified fact", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence(),
    ]);

  const result =
    assessAutomatedFactClaim({
      ledger,
      productId:
        "product-1",
      field:
        "capacity",
    });

  assert.equal(
    result.allowed,
    true,
  );
});

test("claim gate blocks conflicting evidence", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence({
        id:
          "a",
        sourceId:
          "source-a",
        normalizedValue:
          "500",
      }),

      evidence({
        id:
          "b",
        sourceId:
          "source-b",
        normalizedValue:
          "350",
      }),
    ]);

  assert.equal(
    assessAutomatedFactClaim({
      ledger,
      productId:
        "product-1",
      field:
        "capacity",
    }).reason,
    "EVIDENCE_CONFLICT",
  );
});

test("claim gate blocks unverified-only fields", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence({
        status:
          "UNVERIFIED",
      }),
    ]);

  assert.equal(
    assessAutomatedFactClaim({
      ledger,
      productId:
        "product-1",
      field:
        "capacity",
    }).reason,
    "NO_VERIFIED_EVIDENCE",
  );
});

test("claim gate blocks unknown evidence IDs", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence(),
    ]);

  assert.equal(
    assessAutomatedFactClaim({
      ledger,
      productId:
        "product-1",
      field:
        "capacity",
      evidenceIds:
        ["missing"],
    }).reason,
    "UNKNOWN_EVIDENCE_ID",
  );
});

test("claim gate blocks evidence from another product", () => {
  const ledger =
    buildMarketplaceEvidenceLedger([
      evidence({
        id:
          "other",
        productId:
          "product-2",
      }),

      evidence({
        id:
          "main",
      }),
    ]);

  assert.equal(
    assessAutomatedFactClaim({
      ledger,
      productId:
        "product-1",
      field:
        "capacity",
      evidenceIds:
        ["other"],
    }).reason,
    "MISMATCHED_EVIDENCE",
  );
});

test("claim text audit blocks winner-style language", () => {
  const result =
    auditClaimText({
      claimText:
        "The best portable espresso maker",

      evidenceRecords:
        [evidence()],
    });

  assert.equal(
    result.reason,
    "UNSAFE_MARKETING_LANGUAGE",
  );
});

test("claim text audit blocks unsupported numeric claims", () => {
  const result =
    auditClaimText({
      claimText:
        "Capacity: 700 ml",

      evidenceRecords:
        [evidence()],
    });

  assert.equal(
    result.reason,
    "UNSUPPORTED_NUMERIC_CLAIM",
  );
});

test("claim text audit permits numbers present in evidence", () => {
  const result =
    auditClaimText({
      claimText:
        "Listed capacity: 500 ml",

      evidenceRecords:
        [evidence()],
    });

  assert.equal(
    result.allowed,
    true,
  );
});

test("UNKNOWN_RIGHTS media cannot be reused automatically", () => {
  assert.equal(
    canUseMediaEvidence(
      evidence(),
    ),
    false,
  );
});

test("licensed media can be eligible for downstream use", () => {
  assert.equal(
    canUseMediaEvidence(
      evidence({
        rightsStatus:
          "LICENSED",
      }),
    ),
    true,
  );
});
