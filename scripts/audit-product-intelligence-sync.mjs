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
  ProductIntelligenceSyncService,
  SqliteProductSyncOutbox,
} from "./product-intelligence-sync.mjs";

const directory =
  await mkdtemp(
    join(
      tmpdir(),
      "ecom-sync-audit-",
    ),
  );

const path =
  join(
    directory,
    "audit.sqlite",
  );

const repository =
  new SqliteProductIntelligenceRepository(
    path,
  );

const outbox =
  new SqliteProductSyncOutbox(
    path,
  );

try {
  repository.createProduct({
    id:
      "audit-product",

    sku:
      "AUDIT-SYNC",

    title:
      "Audit Product",

    status:
      "READY",

    fingerprint:
      "audit-sync-fingerprint",

    createdAt:
      "2026-09-26T00:00:00Z",

    updatedAt:
      "2026-09-26T00:00:00Z",
  });

  const snapshot =
    repository.getSnapshot(
      "audit-product",
    );

  const job =
    outbox.enqueueSnapshot(
      snapshot,
      "2026-09-26T00:00:00Z",
    );

  let calls =
    0;

  const remoteStore = {
    async upsertSnapshot() {
      calls +=
        1;

      if (
        calls ===
        1
      ) {
        const error =
          new Error(
            "rate limited",
          );

        error.status =
          429;

        throw error;
      }

      return {
        status:
          "APPLIED",

        remoteVersion:
          "audit-remote-1",
      };
    },
  };

  const service =
    new ProductIntelligenceSyncService({
      outbox,
      remoteStore,
      enabled:
        true,
      baseDelayMs:
        1,
    });

  const first =
    await service.runOnce({
      now:
        "2026-09-26T00:00:00Z",
    });

  if (
    first.retried !==
    1
  ) {
    throw new Error(
      "Expected first sync attempt to be retained for retry.",
    );
  }

  console.log(
    "[PASS] retryable cloud failure preserved",
  );

  const second =
    await service.runOnce({
      now:
        "2026-09-26T00:00:01Z",
    });

  if (
    second.succeeded !==
    1
  ) {
    throw new Error(
      "Expected retry to synchronize successfully.",
    );
  }

  if (
    outbox.getJob(
      job.id,
    ).status !==
    "SUCCEEDED"
  ) {
    throw new Error(
      "Outbox job did not reach SUCCEEDED.",
    );
  }

  console.log(
    "[PASS] durable retry eventually synchronized",
  );

  const state =
    outbox.getState(
      "audit-product",
    );

  if (
    state?.remoteVersion !==
    "audit-remote-1"
  ) {
    throw new Error(
      "Remote sync state was not persisted.",
    );
  }

  console.log(
    "[PASS] remote synchronization state persisted",
  );

  if (
    repository
      .getProduct(
        "audit-product",
      )
      ?.title !==
    "Audit Product"
  ) {
    throw new Error(
      "Local repository was damaged by cloud synchronization.",
    );
  }

  console.log(
    "[PASS] SQLite remains authoritative and available",
  );

  console.log("");
  console.log(
    "PHASE 11A CLOUD SYNC AUDIT PASSED",
  );
} finally {
  outbox.close();
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
