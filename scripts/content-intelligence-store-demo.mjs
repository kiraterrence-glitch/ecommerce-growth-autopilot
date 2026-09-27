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
  ContentIntelligenceStore,
} from "./content-intelligence-store.mjs";

import {
  analyzeContentIntelligence,
  generateContentActivationBriefs,
  validateContentIntelligenceDataset,
} from "../dist/content-intelligence/index.js";

const directory =
  await mkdtemp(
    join(
      tmpdir(),
      "content-intelligence-demo-",
    ),
  );

const databasePath =
  join(
    directory,
    "demo.sqlite",
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

    INSERT INTO products (id)
    VALUES ('demo-product');
  `);

  database.close();

  const raw =
    JSON.parse(
      await readFile(
        new URL(
          "../examples/content-intelligence/sample-content.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );

  const records =
    validateContentIntelligenceDataset(
      raw,
    );

  const report =
    analyzeContentIntelligence(
      records,
    );

  const briefs =
    generateContentActivationBriefs(
      records,
    );

  const store =
    new ContentIntelligenceStore(
      databasePath,
    );

  const persisted =
    store.persistSnapshot({
      runId:
        "demo-run",

      productId:
        "demo-product",

      records,

      report,

      briefs,

      createdAt:
        "2026-09-26T00:00:00Z",
    });

  const roundTrip =
    store.getRun(
      "demo-run",
    );

  console.log(
    JSON.stringify(
      {
        persisted,
        roundTrip: {
          productId:
            roundTrip.productId,

          itemCount:
            roundTrip.items.length,

          patternCount:
            roundTrip.patterns.length,

          customerSignalCount:
            roundTrip.customerSignals.length,

          activationBriefCount:
            roundTrip.activationBriefs.length,

          externalWrites:
            roundTrip.activationBriefs.some(
              (item) =>
                item.externalWrites,
            ),

          livePublishing:
            roundTrip.activationBriefs.some(
              (item) =>
                item.livePublishing,
            ),
        },
      },
      null,
      2,
    ),
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
