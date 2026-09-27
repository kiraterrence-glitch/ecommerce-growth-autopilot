
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

const NOW =
  "2026-09-26T00:00:00Z";

function product(
  id,
  fingerprint,
) {
  return {
    id,
    sku:
      `${id}-sku`,

    title:
      id === "product-main"
        ? "Portable Espresso Maker"
        : "Competitor Espresso Maker",

    status:
      "READY",

    fingerprint,

    createdAt:
      NOW,

    updatedAt:
      NOW,
  };
}

async function databaseFixture(
  context,
) {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "ecom-product-db-",
      ),
    );

  const path =
    join(
      directory,
      "products.sqlite",
    );

  context.after(
    async () =>
      await rm(
        directory,
        {
          recursive: true,
          force: true,
        },
      ),
  );

  return {
    directory,
    path,
  };
}

test("SQLite product repository creates and reads canonical products", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    assert.deepEqual(
      repo.getProduct(
        "product-main",
      ),
      product(
        "product-main",
        "fingerprint-main",
      ),
    );
  } finally {
    repo.close();
  }
});

test("product fingerprints enforce canonical duplicate protection", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "same-fingerprint",
      ),
    );

    assert.throws(
      () =>
        repo.createProduct(
          product(
            "product-copy",
            "same-fingerprint",
          ),
        ),
      /UNIQUE constraint failed/i,
    );
  } finally {
    repo.close();
  }
});

test("repository retrieves products by canonical fingerprint", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    const found =
      repo.getProductByFingerprint(
        "fingerprint-main",
      );

    assert.equal(
      found?.id,
      "product-main",
    );
  } finally {
    repo.close();
  }
});

test("product revisions are immutable numbered history", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    repo.addRevision({
      id:
        "revision-1",

      productId:
        "product-main",

      revisionNumber:
        1,

      snapshotJson:
        JSON.stringify({
          price:
            39.9,
        }),

      createdAt:
        NOW,
    });

    repo.addRevision({
      id:
        "revision-2",

      productId:
        "product-main",

      revisionNumber:
        2,

      snapshotJson:
        JSON.stringify({
          price:
            42.9,
        }),

      createdAt:
        "2026-10-03T00:00:00Z",
    });

    const snapshot =
      repo.getSnapshot(
        "product-main",
      );

    assert.equal(
      snapshot.revisions.length,
      2,
    );

    assert.equal(
      JSON.parse(
        snapshot.revisions[0].snapshotJson,
      ).price,
      39.9,
    );

    assert.equal(
      JSON.parse(
        snapshot.revisions[1].snapshotJson,
      ).price,
      42.9,
    );
  } finally {
    repo.close();
  }
});

test("evidence remains linked to a persisted source record", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    repo.addSource({
      id:
        "source-1",

      productId:
        "product-main",

      sourceType:
        "supplier",

      sourceUrl:
        "https://example.com/product",

      contentHash:
        "hash-1",

      capturedAt:
        NOW,

      status:
        "CAPTURED",
    });

    repo.addEvidence({
      id:
        "evidence-1",

      productId:
        "product-main",

      sourceId:
        "source-1",

      field:
        "capacity",

      rawValue:
        "500 ml",

      normalizedValue:
        "500",

      unit:
        "ml",

      status:
        "VERIFIED",

      capturedAt:
        NOW,
    });

    const snapshot =
      repo.getSnapshot(
        "product-main",
      );

    assert.equal(
      snapshot.sources.length,
      1,
    );

    assert.equal(
      snapshot.evidence.length,
      1,
    );

    assert.equal(
      snapshot.evidence[0].sourceId,
      "source-1",
    );
  } finally {
    repo.close();
  }
});

test("evidence cannot reference a nonexistent source", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    assert.throws(
      () =>
        repo.addEvidence({
          id:
            "evidence-invalid",

          productId:
            "product-main",

          sourceId:
            "missing-source",

          field:
            "capacity",

          rawValue:
            "500 ml",

          normalizedValue:
            "500",

          unit:
            "ml",

          status:
            "VERIFIED",

          capturedAt:
            NOW,
        }),
      /FOREIGN KEY constraint failed/i,
    );
  } finally {
    repo.close();
  }
});

test("confirmed competitor relationship stores both products without merging them", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    repo.createProduct(
      product(
        "product-competitor",
        "fingerprint-competitor",
      ),
    );

    repo.addCompetitorLink({
      id:
        "competitor-link-1",

      productId:
        "product-main",

      competitorProductId:
        "product-competitor",

      relationship:
        "confirmed-comparable",

      confirmed:
        true,

      createdAt:
        NOW,
    });

    const snapshot =
      repo.getSnapshot(
        "product-main",
      );

    assert.equal(
      snapshot.competitors.length,
      1,
    );

    assert.equal(
      snapshot.competitors[0].confirmed,
      true,
    );
  } finally {
    repo.close();
  }
});

test("a product cannot be linked as its own competitor", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    assert.throws(
      () =>
        repo.addCompetitorLink({
          id:
            "bad-link",

          productId:
            "product-main",

          competitorProductId:
            "product-main",

          relationship:
            "confirmed-comparable",

          confirmed:
            true,

          createdAt:
            NOW,
        }),
      /cannot be its own competitor/i,
    );
  } finally {
    repo.close();
  }
});

test("complete product intelligence snapshot includes generated artifacts and QA", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    repo.addVariant({
      id:
        "variant-1",

      productId:
        "product-main",

      variantKey:
        "default",

      title:
        "Default",

      sku:
        "ESP-DEFAULT",

      price:
        39.9,

      currency:
        "USD",

      createdAt:
        NOW,
    });

    repo.addVisualAsset({
      id:
        "visual-1",

      productId:
        "product-main",

      kind:
        "hero",

      filePath:
        "visuals/hero.svg",

      rightsStatus:
        null,

      evidenceIdsJson:
        JSON.stringify([
          "evidence-1",
        ]),

      createdAt:
        NOW,
    });

    repo.addProductPageDraft({
      id:
        "draft-1",

      productId:
        "product-main",

      version:
        1,

      htmlPath:
        "preview/index.html",

      status:
        "DRAFT",

      createdAt:
        NOW,
    });

    repo.addQaRun({
      id:
        "qa-1",

      productId:
        "product-main",

      qaType:
        "browser",

      passed:
        true,

      errors:
        0,

      warnings:
        1,

      reportJson:
        JSON.stringify({
          viewports:
            8,
        }),

      createdAt:
        NOW,
    });

    repo.addApproval({
      id:
        "approval-1",

      productId:
        "product-main",

      artifactType:
        "product_page",

      artifactId:
        "draft-1",

      status:
        "PENDING",

      approvedAt:
        null,

      createdAt:
        NOW,
    });

    const snapshot =
      repo.getSnapshot(
        "product-main",
      );

    assert.equal(
      snapshot.variants.length,
      1,
    );

    assert.equal(
      snapshot.visuals.length,
      1,
    );

    assert.equal(
      snapshot.drafts.length,
      1,
    );

    assert.equal(
      snapshot.qaRuns.length,
      1,
    );

    assert.equal(
      snapshot.approvals.length,
      1,
    );
  } finally {
    repo.close();
  }
});

test("SQLite product intelligence survives close and reopen", async (context) => {
  const {
    path,
  } =
    await databaseFixture(
      context,
    );

  const first =
    new SqliteProductIntelligenceRepository(
      path,
    );

  first.createProduct(
    product(
      "product-main",
      "fingerprint-main",
    ),
  );

  first.addRevision({
    id:
      "revision-1",

    productId:
      "product-main",

    revisionNumber:
      1,

    snapshotJson:
      JSON.stringify({
        price:
          39.9,
      }),

    createdAt:
      NOW,
  });

  first.close();

  const second =
    new SqliteProductIntelligenceRepository(
      path,
    );

  try {
    const snapshot =
      second.getSnapshot(
        "product-main",
      );

    assert.equal(
      snapshot.product.title,
      "Portable Espresso Maker",
    );

    assert.equal(
      snapshot.revisions.length,
      1,
    );
  } finally {
    second.close();
  }
});

test("invalid JSON payloads fail before persistence", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    repo.createProduct(
      product(
        "product-main",
        "fingerprint-main",
      ),
    );

    assert.throws(
      () =>
        repo.addRevision({
          id:
            "revision-invalid",

          productId:
            "product-main",

          revisionNumber:
            1,

          snapshotJson:
            "{not-json",

          createdAt:
            NOW,
        }),
      /JSON/,
    );
  } finally {
    repo.close();
  }
});

test("database transactions roll back partial product writes on failure", () => {
  const repo =
    new SqliteProductIntelligenceRepository(
      ":memory:",
    );

  try {
    assert.throws(
      () =>
        repo.transaction(
          () => {
            repo.createProduct(
              product(
                "product-main",
                "fingerprint-main",
              ),
            );

            repo.createProduct(
              product(
                "product-copy",
                "fingerprint-main",
              ),
            );
          },
        ),
      /UNIQUE constraint failed/i,
    );

    assert.equal(
      repo.listProducts().length,
      0,
    );
  } finally {
    repo.close();
  }
});
