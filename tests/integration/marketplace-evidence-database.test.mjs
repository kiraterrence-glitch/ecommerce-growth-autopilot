import assert from "node:assert/strict";

import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import test from "node:test";

import {
  SqliteProductIntelligenceRepository,
} from "../../scripts/product-intelligence-sqlite.mjs";

import {
  MarketplaceEvidenceStore,
} from "../../scripts/marketplace-evidence-store.mjs";

import {
  buildMarketplaceLibraryPanel,
} from "../../scripts/marketplace-library-view.mjs";

const NOW =
  "2026-09-26T00:00:00Z";

async function fixture(context) {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "marketplace-db-",
      ),
    );

  const databasePath =
    join(
      directory,
      "products.sqlite",
    );

  const repository =
    new SqliteProductIntelligenceRepository(
      databasePath,
    );

  repository.createProduct({
    id:
      "product-1",
    sku:
      "MARKET-001",
    title:
      "Portable Espresso Maker",
    status:
      "READY",
    fingerprint:
      "marketplace-product-one",
    createdAt:
      NOW,
    updatedAt:
      NOW,
  });

  repository.createProduct({
    id:
      "product-2",
    sku:
      "MARKET-002",
    title:
      "Competitor Espresso Maker",
    status:
      "READY",
    fingerprint:
      "marketplace-product-two",
    createdAt:
      NOW,
    updatedAt:
      NOW,
  });

  const store =
    new MarketplaceEvidenceStore(
      databasePath,
    );

  context.after(
    async () => {
      store.close();
      repository.close();

      await rm(
        directory,
        {
          recursive:
            true,
          force:
            true,
        },
      );
    },
  );

  return {
    directory,
    databasePath,
    repository,
    store,
  };
}

function csv(...rows) {
  return [
    "product_id,source_url,source_id,field,raw_value,normalized_value,unit,status,rights_status,captured_at",
    ...rows,
  ].join("\n");
}

function row({
  productId =
    "product-1",
  sourceId =
    "supplier-a",
  sourceUrl =
    "https://supplier.example.com/product",
  field =
    "capacity",
  raw =
    "500 ml",
  normalized =
    "500",
  unit =
    "ml",
  status =
    "VERIFIED",
  rights =
    "UNKNOWN_RIGHTS",
  capturedAt =
    NOW,
} = {}) {
  return [
    productId,
    sourceUrl,
    sourceId,
    field,
    raw,
    normalized,
    unit,
    status,
    rights,
    capturedAt,
  ].join(",");
}

test("marketplace evidence persists in the Product Intelligence SQLite database", async (context) => {
  const fx =
    await fixture(context);

  const result =
    fx.store.ingestCsv(
      csv(row()),
    );

  assert.equal(
    result.insertedEvidence,
    1,
  );

  assert.equal(
    fx.store
      .listEvidence("product-1")
      .length,
    1,
  );
});

test("marketplace source metadata persists separately from evidence", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(row()),
  );

  const sources =
    fx.store.listSources(
      "product-1",
    );

  assert.equal(
    sources.length,
    1,
  );

  assert.equal(
    sources[0].sourceId,
    "supplier-a",
  );
});

test("reimporting the exact same evidence is idempotent", async (context) => {
  const fx =
    await fixture(context);

  const content =
    csv(row());

  fx.store.ingestCsv(content);

  const second =
    fx.store.ingestCsv(content);

  assert.equal(
    second.insertedEvidence,
    0,
  );

  assert.equal(
    second.skippedEvidence,
    1,
  );

  assert.equal(
    fx.store
      .listEvidence("product-1")
      .length,
    1,
  );
});

test("unknown products fail closed through the foreign-key boundary", async (context) => {
  const fx =
    await fixture(context);

  assert.throws(
    () =>
      fx.store.ingestCsv(
        csv(
          row({
            productId:
              "missing-product",
          }),
        ),
      ),
    (error) =>
      error.code ===
      "UNKNOWN_PRODUCT",
  );
});

test("same source may contain evidence with different rights states", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(
      row({
        sourceId:
          "mixed-rights-source",
        rights:
          "LICENSED",
      }),

      row({
        sourceId:
          "mixed-rights-source",
        field:
          "weight",
        raw:
          "400 g",
        normalized:
          "400",
        unit:
          "g",
        rights:
          "UNKNOWN_RIGHTS",
        capturedAt:
          "2026-09-26T00:01:00Z",
      }),
    ),
  );

  const sources =
    fx.store.listSources(
      "product-1",
    );

  const evidence =
    fx.store.listEvidence(
      "product-1",
    );

  assert.equal(
    sources.length,
    1,
  );

  assert.equal(
    evidence.length,
    2,
  );

  assert.equal(
    sources[0].rightsStatus,
    "UNKNOWN_RIGHTS",
  );

  assert.deepEqual(
    evidence
      .map(
        (record) =>
          record.rightsStatus,
      )
      .sort(),
    [
      "LICENSED",
      "UNKNOWN_RIGHTS",
    ],
  );
});
test("source ID collisions fail closed", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(row()),
  );

  assert.throws(
    () =>
      fx.store.ingestCsv(
        csv(
          row({
            sourceUrl:
              "https://different.example.com/product",
            field:
              "weight",
            raw:
              "400 g",
            normalized:
              "400",
            unit:
              "g",
          }),
        ),
      ),
    (error) =>
      error.code ===
      "SOURCE_ID_COLLISION",
  );
});

test("duplicate source facts under a different evidence ID remain blocked", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(row()),
  );

  assert.throws(
    () =>
      fx.store.ingestCsv(
        csv(
          row({
            capturedAt:
              "2026-09-26T01:00:00Z",
          }),
        ),
      ),
    (error) =>
      error.code ===
      "DUPLICATE_SOURCE_FACT",
  );
});

test("equivalent units persist without creating a conflict", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(
      row({
        sourceId:
          "supplier-a",
        raw:
          "500 ml",
        normalized:
          "500",
        unit:
          "ml",
      }),

      row({
        sourceId:
          "supplier-b",
        sourceUrl:
          "https://supplier-b.example.com/product",
        raw:
          "0.5 l",
        normalized:
          "0.5",
        unit:
          "l",
        capturedAt:
          "2026-09-26T00:01:00Z",
      }),
    ),
  );

  const summary =
    fx.store.getProductSummary(
      "product-1",
    );

  assert.equal(
    summary.conflictCount,
    0,
  );

  assert.equal(
    summary.verifiedFieldCount,
    1,
  );
});

test("conflicting verified facts persist as an explicit blocking conflict", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(
      row({
        sourceId:
          "supplier-a",
        normalized:
          "500",
      }),

      row({
        sourceId:
          "supplier-b",
        sourceUrl:
          "https://supplier-b.example.com/product",
        raw:
          "350 ml",
        normalized:
          "350",
        capturedAt:
          "2026-09-26T00:01:00Z",
      }),
    ),
  );

  const summary =
    fx.store.getProductSummary(
      "product-1",
    );

  assert.equal(
    summary.conflictCount,
    1,
  );

  assert.equal(
    summary.hasBlockingConflict,
    true,
  );
});

test("unverified evidence remains visible but does not become verified", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(
      row({
        status:
          "UNVERIFIED",
      }),
    ),
  );

  const summary =
    fx.store.getProductSummary(
      "product-1",
    );

  assert.equal(
    summary.unverifiedEvidenceCount,
    1,
  );

  assert.equal(
    summary.verifiedEvidenceCount,
    0,
  );
});

test("UNKNOWN_RIGHTS records are counted as downstream media blockers", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(row()),
  );

  assert.equal(
    fx.store
      .getProductSummary("product-1")
      .unknownRightsCount,
    1,
  );
});

test("marketplace evidence remains isolated between products", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(
      row(),
      row({
        productId:
          "product-2",
        sourceId:
          "competitor-source",
        sourceUrl:
          "https://competitor.example.com/product",
        normalized:
          "350",
      }),
    ),
  );

  assert.equal(
    fx.store
      .listEvidence("product-1")
      .length,
    1,
  );

  assert.equal(
    fx.store
      .listEvidence("product-2")
      .length,
    1,
  );
});

test("Product Library panel reports READY for stable evidence", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(row()),
  );

  const panel =
    buildMarketplaceLibraryPanel({
      product:
        fx.repository.getProduct(
          "product-1",
        ),

      marketplaceStore:
        fx.store,
    });

  assert.equal(
    panel.status,
    "READY",
  );

  assert.equal(
    panel.summary.evidenceCount,
    1,
  );
});

test("Product Library panel reports NEEDS_REVIEW for conflicts", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(
      row({
        sourceId:
          "a",
      }),

      row({
        sourceId:
          "b",
        sourceUrl:
          "https://b.example.com/product",
        raw:
          "350 ml",
        normalized:
          "350",
        capturedAt:
          "2026-09-26T00:01:00Z",
      }),
    ),
  );

  const panel =
    buildMarketplaceLibraryPanel({
      product:
        fx.repository.getProduct(
          "product-1",
        ),

      marketplaceStore:
        fx.store,
    });

  assert.equal(
    panel.status,
    "NEEDS_REVIEW",
  );

  assert.ok(
    panel.warnings.some(
      (warning) =>
        warning.includes(
          "unresolved conflicts",
        ),
    ),
  );
});

test("Product Library panel reports NO_MARKETPLACE_EVIDENCE for untouched products", async (context) => {
  const fx =
    await fixture(context);

  const panel =
    buildMarketplaceLibraryPanel({
      product:
        fx.repository.getProduct(
          "product-1",
        ),

      marketplaceStore:
        fx.store,
    });

  assert.equal(
    panel.status,
    "NO_MARKETPLACE_EVIDENCE",
  );
});

test("marketplace evidence survives database reopen", async (context) => {
  const fx =
    await fixture(context);

  fx.store.ingestCsv(
    csv(row()),
  );

  fx.store.close();

  const reopened =
    new MarketplaceEvidenceStore(
      fx.databasePath,
    );

  try {
    assert.equal(
      reopened
        .listEvidence("product-1")
        .length,
      1,
    );
  } finally {
    reopened.close();
  }

  fx.store.close = () => {};
});

test("multi-row ingest rolls back atomically when one product is invalid", async (context) => {
  const fx =
    await fixture(context);

  assert.throws(
    () =>
      fx.store.ingestCsv(
        csv(
          row({
            sourceId:
              "valid-first",
          }),

          row({
            productId:
              "missing",
            sourceId:
              "invalid-second",
            sourceUrl:
              "https://invalid.example.com/product",
          }),
        ),
      ),
    (error) =>
      error.code ===
      "UNKNOWN_PRODUCT",
  );

  assert.equal(
    fx.store
      .listEvidence("product-1")
      .length,
    0,
  );
});
