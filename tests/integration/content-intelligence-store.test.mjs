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
  ContentIntelligenceStore,
} from "../../scripts/content-intelligence-store.mjs";

import {
  SqliteProductIntelligenceRepository,
} from "../../scripts/product-intelligence-sqlite.mjs";

import {
  analyzeContentIntelligence,
  generateContentActivationBriefs,
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

function prepareMinimalProductDatabase(
  databasePath,
  productId = "product-1",
) {
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
}

function analysisFixture() {
  const records =
    validateContentIntelligenceDataset(
      structuredClone(
        fixture,
      ),
    );

  const report =
    analyzeContentIntelligence(
      records,
    );

  const briefs =
    generateContentActivationBriefs(
      records,
    );

  return {
    records,
    report,
    briefs,
  };
}

async function temporaryDatabase() {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "content-intelligence-store-",
      ),
    );

  return {
    directory,
    databasePath:
      join(
        directory,
        "content.sqlite",
      ),
  };
}

test("Content Intelligence store can coexist with Product Intelligence schema", async () => {
  const {
    directory,
    databasePath,
  } =
    await temporaryDatabase();

  try {
    const repository =
      new SqliteProductIntelligenceRepository(
        databasePath,
      );

    repository.close();

    const store =
      new ContentIntelligenceStore(
        databasePath,
      );

    assert.deepEqual(
      store.listRuns(
        "missing-product",
      ),
      [],
    );

    store.close();
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

test("Content Intelligence snapshot persists and round-trips", async () => {
  const {
    directory,
    databasePath,
  } =
    await temporaryDatabase();

  try {
    prepareMinimalProductDatabase(
      databasePath,
    );

    const store =
      new ContentIntelligenceStore(
        databasePath,
      );

    const {
      records,
      report,
      briefs,
    } =
      analysisFixture();

    const result =
      store.persistSnapshot({
        runId:
          "run-1",

        productId:
          "product-1",

        records,

        report,

        briefs,

        createdAt:
          "2026-09-26T00:00:00Z",
      });

    assert.equal(
      result.itemCount,
      6,
    );

    assert.equal(
      result.briefCount,
      4,
    );

    const persisted =
      store.getRun(
        "run-1",
      );

    assert.ok(
      persisted,
    );

    assert.equal(
      persisted.productId,
      "product-1",
    );

    assert.equal(
      persisted.items.length,
      6,
    );

    assert.equal(
      persisted.activationBriefs.length,
      4,
    );

    store.close();
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

test("persisted content retains classification and performance analysis", async () => {
  const {
    directory,
    databasePath,
  } =
    await temporaryDatabase();

  try {
    prepareMinimalProductDatabase(
      databasePath,
    );

    const store =
      new ContentIntelligenceStore(
        databasePath,
      );

    const {
      records,
      report,
      briefs,
    } =
      analysisFixture();

    store.persistSnapshot({
      runId:
        "run-analysis",

      productId:
        "product-1",

      records,

      report,

      briefs,

      createdAt:
        "2026-09-26T00:00:00Z",
    });

    const persisted =
      store.getRun(
        "run-analysis",
      );

    assert.ok(
      persisted,
    );

    const first =
      persisted.items[0];

    assert.ok(
      first,
    );

    assert.equal(
      first.classification.contentId,
      first.contentId,
    );

    assert.equal(
      first.performance.contentId,
      first.contentId,
    );

    assert.equal(
      typeof first.transcript,
      "string",
    );

    store.close();
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

test("patterns and customer signals persist with provenance", async () => {
  const {
    directory,
    databasePath,
  } =
    await temporaryDatabase();

  try {
    prepareMinimalProductDatabase(
      databasePath,
    );

    const store =
      new ContentIntelligenceStore(
        databasePath,
      );

    const {
      records,
      report,
      briefs,
    } =
      analysisFixture();

    store.persistSnapshot({
      runId:
        "run-patterns",

      productId:
        "product-1",

      records,

      report,

      briefs,
    });

    const persisted =
      store.getRun(
        "run-patterns",
      );

    assert.ok(
      persisted,
    );

    assert.ok(
      persisted.patterns.length >
      0,
    );

    assert.ok(
      persisted.customerSignals.length >
      0,
    );

    for (
      const pattern
      of persisted.patterns
    ) {
      assert.ok(
        Array.isArray(
          pattern.contentIds,
        ),
      );
    }

    for (
      const signal
      of persisted.customerSignals
    ) {
      assert.ok(
        Array.isArray(
          signal.contentIds,
        ),
      );
    }

    store.close();
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

test("re-persisting the same run is idempotent", async () => {
  const {
    directory,
    databasePath,
  } =
    await temporaryDatabase();

  try {
    prepareMinimalProductDatabase(
      databasePath,
    );

    const store =
      new ContentIntelligenceStore(
        databasePath,
      );

    const snapshot =
      analysisFixture();

    const input = {
      runId:
        "run-repeat",

      productId:
        "product-1",

      ...snapshot,

      createdAt:
        "2026-09-26T00:00:00Z",
    };

    store.persistSnapshot(
      input,
    );

    const first =
      store.getRun(
        "run-repeat",
      );

    store.persistSnapshot(
      input,
    );

    const second =
      store.getRun(
        "run-repeat",
      );

    assert.deepEqual(
      second,
      first,
    );

    store.close();
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

test("replacing a run removes stale child rows", async () => {
  const {
    directory,
    databasePath,
  } =
    await temporaryDatabase();

  try {
    prepareMinimalProductDatabase(
      databasePath,
    );

    const store =
      new ContentIntelligenceStore(
        databasePath,
      );

    const initial =
      analysisFixture();

    store.persistSnapshot({
      runId:
        "run-replace",

      productId:
        "product-1",

      ...initial,
    });

    const records =
      initial.records.slice(
        0,
        2,
      );

    const report =
      analyzeContentIntelligence(
        records,
      );

    const briefs =
      generateContentActivationBriefs(
        records,
      );

    store.persistSnapshot({
      runId:
        "run-replace",

      productId:
        "product-1",

      records,

      report,

      briefs,
    });

    const persisted =
      store.getRun(
        "run-replace",
      );

    assert.ok(
      persisted,
    );

    assert.equal(
      persisted.items.length,
      2,
    );

    assert.equal(
      persisted.activationBriefs.length,
      4,
    );

    store.close();
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

test("unknown products cannot receive Content Intelligence runs", async () => {
  const {
    directory,
    databasePath,
  } =
    await temporaryDatabase();

  try {
    prepareMinimalProductDatabase(
      databasePath,
      "existing-product",
    );

    const store =
      new ContentIntelligenceStore(
        databasePath,
      );

    const snapshot =
      analysisFixture();

    assert.throws(
      () =>
        store.persistSnapshot({
          runId:
            "run-invalid",

          productId:
            "missing-product",

          ...snapshot,
        }),
      /Unknown product/u,
    );

    store.close();
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

test("unsafe activation briefs are rejected before persistence", async () => {
  const {
    directory,
    databasePath,
  } =
    await temporaryDatabase();

  try {
    prepareMinimalProductDatabase(
      databasePath,
    );

    const store =
      new ContentIntelligenceStore(
        databasePath,
      );

    const snapshot =
      analysisFixture();

    const first =
      snapshot.briefs[0];

    assert.ok(
      first,
    );

    const briefs = [
      {
        ...first,

        safety: {
          ...first.safety,
          externalWrites:
            true,
        },
      },

      ...snapshot.briefs.slice(
        1,
      ),
    ];

    assert.throws(
      () =>
        store.persistSnapshot({
          runId:
            "run-unsafe",

          productId:
            "product-1",

          records:
            snapshot.records,

          report:
            snapshot.report,

          briefs,
        }),
      /draft-only safety/u,
    );

    assert.equal(
      store.getRun(
        "run-unsafe",
      ),
      null,
    );

    store.close();
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
