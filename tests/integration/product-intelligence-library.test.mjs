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
  DEMO_PRODUCT_ID,
  ensureDemoProductIntelligence,
} from "../../scripts/product-intelligence-demo-seed.mjs";

import {
  persistProductIntelligenceBundle,
} from "../../scripts/product-intelligence-ingest.mjs";

import {
  renderProductDetail,
  renderProductLibrary,
} from "../../scripts/product-library-renderer.mjs";

test("research bundle persists product source and evidence atomically", () => {
  const repository =
    new SqliteProductIntelligenceRepository(":memory:");

  try {
    const result = persistProductIntelligenceBundle(
      repository,
      {
        product: {
          id: "bundle-product",
          sku: "BUNDLE-001",
          title: "Bundle Product",
          status: "RESEARCHING",
          fingerprint: "bundle-product-fingerprint",
          createdAt: "2026-09-26T00:00:00Z",
          updatedAt: "2026-09-26T00:00:00Z",
        },

        sources: [
          {
            id: "bundle-source",
            productId: "bundle-product",
            sourceType: "supplier",
            sourceUrl: "https://example.com/product",
            contentHash: "bundle-source-hash",
            capturedAt: "2026-09-26T00:00:00Z",
            status: "CAPTURED",
          },
        ],

        evidence: [
          {
            id: "bundle-evidence",
            productId: "bundle-product",
            sourceId: "bundle-source",
            field: "capacity",
            rawValue: "500 ml",
            normalizedValue: "500",
            unit: "ml",
            status: "VERIFIED",
            capturedAt: "2026-09-26T00:00:00Z",
          },
        ],
      },
    );

    assert.equal(result.created, true);
    assert.equal(result.snapshot.sources.length, 1);
    assert.equal(result.snapshot.evidence.length, 1);
  } finally {
    repository.close();
  }
});

test("failed evidence persistence rolls back the whole bundle", () => {
  const repository =
    new SqliteProductIntelligenceRepository(":memory:");

  try {
    assert.throws(
      () =>
        persistProductIntelligenceBundle(repository, {
          product: {
            id: "rollback-product",
            sku: "ROLLBACK-001",
            title: "Rollback Product",
            status: "RESEARCHING",
            fingerprint: "rollback-product-fingerprint",
            createdAt: "2026-09-26T00:00:00Z",
            updatedAt: "2026-09-26T00:00:00Z",
          },

          evidence: [
            {
              id: "rollback-evidence",
              productId: "rollback-product",
              sourceId: "missing-source",
              field: "capacity",
              rawValue: "500 ml",
              normalizedValue: "500",
              unit: "ml",
              status: "VERIFIED",
              capturedAt: "2026-09-26T00:00:00Z",
            },
          ],
        }),
      /FOREIGN KEY constraint failed/i,
    );

    assert.equal(
      repository.getProduct("rollback-product"),
      null,
    );
  } finally {
    repository.close();
  }
});

test("duplicate fingerprint import is idempotent", () => {
  const repository =
    new SqliteProductIntelligenceRepository(":memory:");

  const bundle = {
    product: {
      id: "duplicate-product",
      sku: "DUP-001",
      title: "Duplicate Product",
      status: "READY",
      fingerprint: "duplicate-fingerprint",
      createdAt: "2026-09-26T00:00:00Z",
      updatedAt: "2026-09-26T00:00:00Z",
    },
  };

  try {
    const first =
      persistProductIntelligenceBundle(repository, bundle);

    const second =
      persistProductIntelligenceBundle(repository, bundle);

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(repository.listProducts().length, 1);
  } finally {
    repository.close();
  }
});

test("demo product intelligence includes full portfolio history", () => {
  const repository =
    new SqliteProductIntelligenceRepository(":memory:");

  try {
    const snapshot =
      ensureDemoProductIntelligence(repository);

    assert.equal(snapshot.product.id, DEMO_PRODUCT_ID);
    assert.ok(snapshot.evidence.length >= 5);
    assert.equal(snapshot.revisions.length, 1);
    assert.equal(snapshot.competitors.length, 1);
    assert.equal(snapshot.comparisons.length, 1);
    assert.equal(snapshot.visuals.length, 5);
    assert.equal(snapshot.drafts.length, 1);
    assert.equal(snapshot.qaRuns.length, 1);
    assert.equal(snapshot.approvals.length, 1);
  } finally {
    repository.close();
  }
});

test("demo seed is safe to run repeatedly", () => {
  const repository =
    new SqliteProductIntelligenceRepository(":memory:");

  try {
    ensureDemoProductIntelligence(repository);
    ensureDemoProductIntelligence(repository);

    const snapshot =
      repository.getSnapshot(DEMO_PRODUCT_ID);

    assert.equal(snapshot.competitors.length, 1);
    assert.equal(snapshot.comparisons.length, 1);
  } finally {
    repository.close();
  }
});

test("product library renders persistent products without client JavaScript", () => {
  const repository =
    new SqliteProductIntelligenceRepository(":memory:");

  try {
    ensureDemoProductIntelligence(repository);

    const html =
      renderProductLibrary(repository);

    assert.match(
      html,
      /Product Intelligence Library/,
    );

    assert.match(
      html,
      /Portable Espresso Maker/,
    );

    assert.doesNotMatch(
      html,
      /<script\b/i,
    );
  } finally {
    repository.close();
  }
});

test("product detail exposes evidence revisions competitors QA and approvals", () => {
  const repository =
    new SqliteProductIntelligenceRepository(":memory:");

  try {
    const snapshot =
      ensureDemoProductIntelligence(repository);

    const html =
      renderProductDetail(snapshot);

    for (const heading of [
      "Sources",
      "Evidence",
      "Revision history",
      "Competitors",
      "Comparison history",
      "Visual assets",
      "Product-page drafts",
      "QA history",
      "Approvals",
    ]) {
      assert.match(
        html,
        new RegExp(heading),
      );
    }

    assert.doesNotMatch(
      html,
      /<script\b/i,
    );
  } finally {
    repository.close();
  }
});

test("product intelligence survives database restart and still renders", async (context) => {
  const directory = await mkdtemp(
    join(
      tmpdir(),
      "ecom-library-restart-",
    ),
  );

  context.after(
    async () =>
      await rm(directory, {
        recursive: true,
        force: true,
      }),
  );

  const databasePath =
    join(directory, "library.sqlite");

  const first =
    new SqliteProductIntelligenceRepository(databasePath);

  ensureDemoProductIntelligence(first);
  first.close();

  const second =
    new SqliteProductIntelligenceRepository(databasePath);

  try {
    const snapshot =
      second.getSnapshot(DEMO_PRODUCT_ID);

    assert.equal(
      snapshot.product.title,
      "Portable Espresso Maker",
    );

    assert.match(
      renderProductDetail(snapshot),
      /QA history/,
    );
  } finally {
    second.close();
  }
});
