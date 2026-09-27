import {
  readFile,
} from "node:fs/promises";

import {
  resolve,
} from "node:path";

import {
  MarketplaceEvidenceStore,
} from "./marketplace-evidence-store.mjs";

function argument(name) {
  const index =
    process.argv.indexOf(name);

  if (
    index === -1 ||
    !process.argv[index + 1]
  ) {
    throw new Error(
      `${name} is required.`,
    );
  }

  return process.argv[
    index + 1
  ];
}

const databasePath =
  resolve(
    argument("--db"),
  );

const csvPath =
  resolve(
    argument("--csv"),
  );

const csv =
  await readFile(
    csvPath,
    "utf8",
  );

const store =
  new MarketplaceEvidenceStore(
    databasePath,
  );

try {
  const result =
    store.ingestCsv(
      csv,
    );

  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
      },
      null,
      2,
    ),
  );
} finally {
  store.close();
}
