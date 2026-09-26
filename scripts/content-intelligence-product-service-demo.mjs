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

import {
  ProductContentIntelligenceService,
} from "./content-intelligence-product-service.mjs";

const directory =
  await mkdtemp(
    join(
      tmpdir(),
      "content-product-demo-",
    ),
  );

const databasePath =
  join(
    directory,
    "product.sqlite",
  );

try {
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
      "demo-product",
    );

  database.close();

  const input =
    JSON.parse(
      await readFile(
        new URL(
          "../examples/content-intelligence/sample-content.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );

  const service =
    new ProductContentIntelligenceService(
      databasePath,
    );

  const result =
    service.analyzeAndPersist({
      productId:
        "demo-product",

      input,

      createdAt:
        "2026-09-26T00:00:00Z",
    });

  console.log(
    JSON.stringify(
      {
        productId:
          result.productId,

        runId:
          result.runId,

        itemCount:
          result.itemCount,

        patternCount:
          result.patternCount,

        signalCount:
          result.signalCount,

        briefCount:
          result.briefCount,

        safety:
          result.safety,

        latestRunId:
          service
            .getLatestProductIntelligence(
              "demo-product",
            )
            ?.runId ??
          null,
      },
      null,
      2,
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
