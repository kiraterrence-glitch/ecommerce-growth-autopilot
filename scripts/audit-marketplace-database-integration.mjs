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

import {
  SqliteProductIntelligenceRepository,
} from "./product-intelligence-sqlite.mjs";

import {
  MarketplaceEvidenceStore,
} from "./marketplace-evidence-store.mjs";

import {
  buildMarketplaceLibraryPanel,
} from "./marketplace-library-view.mjs";

const directory =
  await mkdtemp(
    join(
      tmpdir(),
      "marketplace-db-audit-",
    ),
  );

const databasePath =
  join(
    directory,
    "audit.sqlite",
  );

const repository =
  new SqliteProductIntelligenceRepository(
    databasePath,
  );

const store =
  new MarketplaceEvidenceStore(
    databasePath,
  );

try {
  repository.createProduct({
    id:
      "audit-product",
    sku:
      "AUDIT-MARKET",
    title:
      "Audit Marketplace Product",
    status:
      "READY",
    fingerprint:
      "audit-marketplace-product",
    createdAt:
      "2026-09-26T00:00:00Z",
    updatedAt:
      "2026-09-26T00:00:00Z",
  });

  const csv = `product_id,source_url,source_id,field,raw_value,normalized_value,unit,status,rights_status,captured_at
audit-product,https://supplier-a.example.com/product,a,capacity,500 ml,500,ml,VERIFIED,UNKNOWN_RIGHTS,2026-09-26T00:00:00Z
audit-product,https://supplier-b.example.com/product,b,capacity,0.5 l,0.5,l,VERIFIED,UNKNOWN_RIGHTS,2026-09-26T00:01:00Z
audit-product,https://supplier-a.example.com/product,a,weight,400 g,400,g,VERIFIED,LICENSED,2026-09-26T00:02:00Z`;

  const result =
    store.ingestCsv(csv);

  if (
    result.insertedEvidence !==
    3
  ) {
    throw new Error(
      "Marketplace evidence persistence count mismatch.",
    );
  }

  console.log(
    "[PASS] marketplace evidence persisted",
  );

  const summary =
    store.getProductSummary(
      "audit-product",
    );

  if (
    summary.conflictCount !==
      0 ||
    summary.verifiedFieldCount !==
      2
  ) {
    throw new Error(
      "Marketplace evidence assessment mismatch.",
    );
  }

  console.log(
    "[PASS] normalized database evidence assessment",
  );

  const panel =
    buildMarketplaceLibraryPanel({
      product:
        repository.getProduct(
          "audit-product",
        ),
      marketplaceStore:
        store,
    });

  if (
    panel.status !==
    "READY"
  ) {
    throw new Error(
      "Product Library marketplace panel was not READY.",
    );
  }

  console.log(
    "[PASS] Product Library marketplace view-model",
  );

  store.close();

  const reopened =
    new MarketplaceEvidenceStore(
      databasePath,
    );

  try {
    if (
      reopened
        .listEvidence(
          "audit-product",
        )
        .length !==
      3
    ) {
      throw new Error(
        "Marketplace evidence did not survive database reopen.",
      );
    }
  } finally {
    reopened.close();
  }

  store.close = () => {};

  console.log(
    "[PASS] database restart durability",
  );

  console.log("");
  console.log(
    "PHASE 12A-3A MARKETPLACE DATABASE AUDIT PASSED",
  );
} finally {
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
}
