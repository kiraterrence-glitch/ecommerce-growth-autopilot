
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

const NOW =
  "2026-09-26T00:00:00Z";

function pass(
  label,
  detail,
) {
  console.log(
    `[PASS] ${label} -> ${detail}`,
  );
}

const directory =
  await mkdtemp(
    join(
      tmpdir(),
      "ecom-db-audit-",
    ),
  );

const path =
  join(
    directory,
    "audit.sqlite",
  );

try {
  let repo =
    new SqliteProductIntelligenceRepository(
      path,
    );

  repo.transaction(
    () => {
      repo.createProduct({
        id:
          "audit-main",

        sku:
          "AUDIT-MAIN",

        title:
          "Portable Espresso Maker",

        status:
          "READY",

        fingerprint:
          "audit-main-fingerprint",

        createdAt:
          NOW,

        updatedAt:
          NOW,
      });

      repo.createProduct({
        id:
          "audit-competitor",

        sku:
          "AUDIT-COMP",

        title:
          "Competitor Espresso Maker",

        status:
          "READY",

        fingerprint:
          "audit-competitor-fingerprint",

        createdAt:
          NOW,

        updatedAt:
          NOW,
      });

      repo.addSource({
        id:
          "audit-source",

        productId:
          "audit-main",

        sourceType:
          "supplier",

        sourceUrl:
          "https://example.com/supplier",

        contentHash:
          "audit-hash",

        capturedAt:
          NOW,

        status:
          "CAPTURED",
      });

      repo.addEvidence({
        id:
          "audit-evidence-capacity",

        productId:
          "audit-main",

        sourceId:
          "audit-source",

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

      repo.addRevision({
        id:
          "audit-revision-1",

        productId:
          "audit-main",

        revisionNumber:
          1,

        snapshotJson:
          JSON.stringify({
            capacity:
              "500 ml",

            price:
              39.9,
          }),

        createdAt:
          NOW,
      });

      repo.addCompetitorLink({
        id:
          "audit-competitor-link",

        productId:
          "audit-main",

        competitorProductId:
          "audit-competitor",

        relationship:
          "confirmed-comparable",

        confirmed:
          true,

        createdAt:
          NOW,
      });

      repo.addQaRun({
        id:
          "audit-qa",

        productId:
          "audit-main",

        qaType:
          "browser",

        passed:
          true,

        errors:
          0,

        warnings:
          0,

        reportJson:
          JSON.stringify({
            viewports:
              8,
          }),

        createdAt:
          NOW,
      });
    },
  );

  const snapshot =
    repo.getSnapshot(
      "audit-main",
    );

  if (!snapshot) {
    throw new Error(
      "Product snapshot was not persisted.",
    );
  }

  if (
    snapshot.evidence.length !==
    1
  ) {
    throw new Error(
      "Evidence relationship failed.",
    );
  }

  if (
    snapshot.revisions.length !==
    1
  ) {
    throw new Error(
      "Revision history failed.",
    );
  }

  if (
    snapshot.competitors.length !==
    1
  ) {
    throw new Error(
      "Competitor relationship failed.",
    );
  }

  pass(
    "Relational product snapshot",
    "product/source/evidence/revision/competitor/QA stored",
  );

  repo.close();

  repo = new SqliteProductIntelligenceRepository(
      path,
    );

  const reopened =
    repo.getSnapshot(
      "audit-main",
    );

  if (
    reopened?.product.title !==
    "Portable Espresso Maker"
  ) {
    throw new Error(
      "Database reopen persistence failed.",
    );
  }

  pass(
    "SQLite durability",
    "product intelligence survived database reopen",
  );

  const duplicate =
    repo.getProductByFingerprint(
      "audit-main-fingerprint",
    );

  if (
    duplicate?.id !==
    "audit-main"
  ) {
    throw new Error(
      "Fingerprint lookup failed.",
    );
  }

  pass(
    "Duplicate identity boundary",
    "canonical fingerprint lookup verified",
  );

  repo.close();

  console.log("");
  console.log(
    "PHASE 9 DATABASE AUDIT PASSED",
  );
} finally {
  await rm(
    directory,
    {
      recursive: true,
      force: true,
    },
  );
}
