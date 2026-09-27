import assert from "node:assert/strict";

import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  DatabaseSync,
} from "node:sqlite";

import test from "node:test";

import {
  ProductContentIntelligenceService,
  deriveContentIntelligenceRunId,
} from "../../scripts/content-intelligence-product-service.mjs";

import {
  validateContentIntelligenceDataset,
} from "../../dist/content-intelligence/index.js";

const fixture =
  JSON.parse(
    await readFile(
      new URL(
        "../../examples/content-intelligence/sample-content.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

async function createDatabase(
  productId = "product-1",
) {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "content-product-service-",
      ),
    );

  const databasePath =
    join(
      directory,
      "product.sqlite",
    );

  const database =
    new DatabaseSync(
      databasePath,
    );

  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE products (
      id TEXT PRIMARY KEY
    );
  `);

  database
    .prepare(`
      INSERT INTO products (id)
      VALUES (?)
    `)
    .run(
      productId,
    );

  database.close();

  return {
    directory,
    databasePath,
  };
}

test("product-bound service analyzes persists and reloads Content Intelligence", async () => {
  const {
    directory,
    databasePath,
  } =
    await createDatabase();

  try {
    const service =
      new ProductContentIntelligenceService(
        databasePath,
      );

    const result =
      service.analyzeAndPersist({
        productId:
          "product-1",

        input:
          structuredClone(
            fixture,
          ),

        createdAt:
          "2026-09-26T01:00:00Z",
      });

    assert.equal(
      result.itemCount,
      6,
    );

    assert.equal(
      result.briefCount,
      4,
    );

    assert.equal(
      result.snapshot.productId,
      "product-1",
    );

    assert.equal(
      result.snapshot.items.length,
      6,
    );

    service.close();
  } finally {
    await rm(
      directory,
      {
        recursive: true,
        force: true,
      },
    );
  }
});

test("automatic run IDs are deterministic for the same product and validated content", () => {
  const records =
    validateContentIntelligenceDataset(
      structuredClone(
        fixture,
      ),
    );

  const first =
    deriveContentIntelligenceRunId(
      "product-1",
      records,
    );

  const second =
    deriveContentIntelligenceRunId(
      "product-1",
      records,
    );

  assert.equal(
    first,
    second,
  );

  assert.match(
    first,
    /^content-[a-f0-9]{24}$/u,
  );
});

test("different products receive different deterministic run IDs", () => {
  const records =
    validateContentIntelligenceDataset(
      structuredClone(
        fixture,
      ),
    );

  assert.notEqual(
    deriveContentIntelligenceRunId(
      "product-1",
      records,
    ),

    deriveContentIntelligenceRunId(
      "product-2",
      records,
    ),
  );
});

test("explicit run ID is preserved", async () => {
  const {
    directory,
    databasePath,
  } =
    await createDatabase();

  try {
    const service =
      new ProductContentIntelligenceService(
        databasePath,
      );

    const result =
      service.analyzeAndPersist({
        productId:
          "product-1",

        runId:
          "manual-run-1",

        input:
          structuredClone(
            fixture,
          ),
      });

    assert.equal(
      result.runId,
      "manual-run-1",
    );

    assert.ok(
      service.getRun(
        "manual-run-1",
      ),
    );

    service.close();
  } finally {
    await rm(
      directory,
      {
        recursive: true,
        force: true,
      },
    );
  }
});

test("latest Product Intelligence content run is resolved by persisted run order", async () => {
  const {
    directory,
    databasePath,
  } =
    await createDatabase();

  try {
    const service =
      new ProductContentIntelligenceService(
        databasePath,
      );

    service.analyzeAndPersist({
      productId:
        "product-1",

      runId:
        "run-old",

      input:
        structuredClone(
          fixture,
        ),

      createdAt:
        "2026-09-25T00:00:00Z",
    });

    service.analyzeAndPersist({
      productId:
        "product-1",

      runId:
        "run-new",

      input:
        structuredClone(
          fixture,
        ),

      createdAt:
        "2026-09-26T00:00:00Z",
    });

    const latest =
      service.getLatestProductIntelligence(
        "product-1",
      );

    assert.ok(
      latest,
    );

    assert.equal(
      latest.runId,
      "run-new",
    );

    service.close();
  } finally {
    await rm(
      directory,
      {
        recursive: true,
        force: true,
      },
    );
  }
});

test("product-bound service remains draft-only and blocks publishing capability", async () => {
  const {
    directory,
    databasePath,
  } =
    await createDatabase();

  try {
    const service =
      new ProductContentIntelligenceService(
        databasePath,
      );

    const result =
      service.analyzeAndPersist({
        productId:
          "product-1",

        input:
          structuredClone(
            fixture,
        ),
      });

    assert.deepEqual(
      result.safety,
      {
        draftOnly:
          true,

        externalWrites:
          false,

        livePublishing:
          false,

        productFactPolicy:
          "verified_product_evidence_only",

        sourceContentPolicy:
          "messaging_signals_only",
      },
    );

    service.close();
  } finally {
    await rm(
      directory,
      {
        recursive: true,
        force: true,
      },
    );
  }
});

test("unknown Product Intelligence product fails closed", async () => {
  const {
    directory,
    databasePath,
  } =
    await createDatabase(
      "existing-product",
    );

  try {
    const service =
      new ProductContentIntelligenceService(
        databasePath,
      );

    assert.throws(
      () =>
        service.analyzeAndPersist({
          productId:
            "missing-product",

          input:
            structuredClone(
              fixture,
            ),
        }),
      /Unknown product/u,
    );

    service.close();
  } finally {
    await rm(
      directory,
      {
        recursive: true,
        force: true,
      },
    );
  }
});

test("quoted run IDs round-trip safely through prepared delete statements", async () => {
  const {
    directory,
    databasePath,
  } =
    await createDatabase();

  try {
    const service =
      new ProductContentIntelligenceService(
        databasePath,
      );

    const runId =
      "run-'quoted";

    service.analyzeAndPersist({
      productId:
        "product-1",

      runId,

      input:
        structuredClone(
          fixture,
        ),
    });

    service.analyzeAndPersist({
      productId:
        "product-1",

      runId,

      input:
        structuredClone(
          fixture,
        ),
    });

    const result =
      service.getRun(
        runId,
      );

    assert.ok(
      result,
    );

    assert.equal(
      result.runId,
      runId,
    );

    assert.equal(
      result.items.length,
      6,
    );

    service.close();
  } finally {
    await rm(
      directory,
      {
        recursive: true,
        force: true,
      },
    );
  }
});
