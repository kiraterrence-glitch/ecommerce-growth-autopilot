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
  buildProductSyncEnvelope,
  ProductIntelligenceSyncService,
  SqliteProductSyncOutbox,
} from "../../scripts/product-intelligence-sync.mjs";

const NOW =
  "2026-09-26T00:00:00Z";

async function fixture(
  context,
) {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "ecom-sync-",
      ),
    );

  const path =
    join(
      directory,
      "products.sqlite",
    );

  const repository =
    new SqliteProductIntelligenceRepository(
      path,
    );

  repository.createProduct({
    id:
      "product-1",

    sku:
      "SYNC-001",

    title:
      "Portable Espresso Maker",

    status:
      "READY",

    fingerprint:
      "sync-product-fingerprint",

    createdAt:
      NOW,

    updatedAt:
      NOW,
  });

  const outbox =
    new SqliteProductSyncOutbox(
      path,
    );

  context.after(
    async () => {
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
    },
  );

  return {
    directory,
    path,
    repository,
    outbox,
    snapshot:
      () =>
        repository.getSnapshot(
          "product-1",
        ),
  };
}

function remote(
  implementation,
) {
  return {
    calls:
      0,

    async upsertSnapshot(
      envelope,
    ) {
      this.calls +=
        1;

      return await implementation(
        envelope,
        this.calls,
      );
    },
  };
}

test("sync envelope is deterministic and contains no process secrets", async (context) => {
  const fx =
    await fixture(
      context,
    );

  process.env
    .SUPABASE_SECRET_KEY =
    "secret-must-never-appear";

  const first =
    buildProductSyncEnvelope(
      fx.snapshot(),
    );

  const second =
    buildProductSyncEnvelope(
      fx.snapshot(),
    );

  assert.equal(
    first.payloadHash,
    second.payloadHash,
  );

  assert.equal(
    JSON.stringify(
      first,
    ).includes(
      "secret-must-never-appear",
    ),
    false,
  );

  delete process.env
    .SUPABASE_SECRET_KEY;
});

test("identical snapshots enqueue idempotently", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const first =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  const second =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  assert.equal(
    first.id,
    second.id,
  );

  assert.equal(
    fx.outbox.listJobs().length,
    1,
  );
});

test("a new revision creates a new sync payload", async (context) => {
  const fx =
    await fixture(
      context,
    );

  fx.outbox.enqueueSnapshot(
    fx.snapshot(),
    NOW,
  );

  fx.repository.addRevision({
    id:
      "revision-1",

    productId:
      "product-1",

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

  fx.outbox.enqueueSnapshot(
    fx.snapshot(),
    "2026-09-26T00:01:00Z",
  );

  assert.equal(
    fx.outbox.listJobs().length,
    2,
  );
});

test("cloud synchronization is disabled by default", async (context) => {
  const fx =
    await fixture(
      context,
    );

  fx.outbox.enqueueSnapshot(
    fx.snapshot(),
    NOW,
  );

  const adapter =
    remote(
      async () => ({
        status:
          "APPLIED",
      }),
    );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,
      remoteStore:
        adapter,
    });

  const result =
    await service.runOnce({
      now:
        NOW,
    });

  assert.equal(
    result.status,
    "DISABLED",
  );

  assert.equal(
    adapter.calls,
    0,
  );
});

test("successful remote apply marks the outbox job succeeded", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const job =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => ({
            status:
              "APPLIED",

            remoteVersion:
              "remote-1",
          }),
        ),

      enabled:
        true,
    });

  await service.runOnce({
    now:
      NOW,
  });

  assert.equal(
    fx.outbox.getJob(
      job.id,
    ).status,
    "SUCCEEDED",
  );

  assert.equal(
    fx.outbox.getState(
      "product-1",
    ).remoteVersion,
    "remote-1",
  );
});

test("already-current remote state is treated as success", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const job =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => ({
            status:
              "ALREADY_CURRENT",
          }),
        ),

      enabled:
        true,
    });

  await service.runOnce({
    now:
      NOW,
  });

  assert.equal(
    fx.outbox.getJob(
      job.id,
    ).status,
    "SUCCEEDED",
  );
});

test("remote-newer result becomes an explicit conflict", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const job =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => ({
            status:
              "REMOTE_NEWER",

            remoteVersion:
              "remote-newer",
          }),
        ),

      enabled:
        true,
    });

  await service.runOnce({
    now:
      NOW,
  });

  assert.equal(
    fx.outbox.getJob(
      job.id,
    ).status,
    "CONFLICT",
  );
});

test("HTTP 429 creates a delayed retry instead of losing the job", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const job =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => {
            const error =
              new Error(
                "rate limited",
              );

            error.status =
              429;

            throw error;
          },
        ),

      enabled:
        true,
    });

  await service.runOnce({
    now:
      NOW,
  });

  const updated =
    fx.outbox.getJob(
      job.id,
    );

  assert.equal(
    updated.status,
    "RETRY",
  );

  assert.equal(
    updated.lastErrorCode,
    "RATE_LIMIT",
  );

  assert.ok(
    updated.nextAttemptAt >
      NOW,
  );
});

test("HTTP 401 blocks the job and fails closed", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const job =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => {
            const error =
              new Error(
                "unauthorized",
              );

            error.status =
              401;

            throw error;
          },
        ),

      enabled:
        true,
    });

  await service.runOnce({
    now:
      NOW,
  });

  assert.equal(
    fx.outbox.getJob(
      job.id,
    ).status,
    "BLOCKED",
  );

  assert.equal(
    fx.outbox.getJob(
      job.id,
    ).lastErrorCode,
    "AUTH",
  );
});

test("network failure stays retryable without breaking local data", async (context) => {
  const fx =
    await fixture(
      context,
    );

  fx.outbox.enqueueSnapshot(
    fx.snapshot(),
    NOW,
  );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => {
            throw new Error(
              "offline",
            );
          },
        ),

      enabled:
        true,
    });

  const result =
    await service.runOnce({
      now:
        NOW,
    });

  assert.equal(
    result.retried,
    1,
  );

  assert.equal(
    fx.repository
      .getProduct(
        "product-1",
      )
      .title,
    "Portable Espresso Maker",
  );
});

test("malformed remote response fails closed into retry state", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const job =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => ({}),
        ),

      enabled:
        true,
    });

  await service.runOnce({
    now:
      NOW,
  });

  assert.equal(
    fx.outbox.getJob(
      job.id,
    ).status,
    "RETRY",
  );
});

test("retry limit eventually moves a permanently failing job to blocked", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const job =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => {
            throw new Error(
              "offline",
            );
          },
        ),

      enabled:
        true,

      maxAttempts:
        2,

      baseDelayMs:
        1,
    });

  await service.runOnce({
    now:
      NOW,
  });

  await service.runOnce({
    now:
      "2026-09-26T00:00:01Z",
  });

  assert.equal(
    fx.outbox.getJob(
      job.id,
    ).status,
    "BLOCKED",
  );

  assert.equal(
    fx.outbox.getJob(
      job.id,
    ).lastErrorCode,
    "MAX_ATTEMPTS",
  );
});

test("outbox state survives database reopen", async (context) => {
  const fx =
    await fixture(
      context,
    );

  const job =
    fx.outbox.enqueueSnapshot(
      fx.snapshot(),
      NOW,
    );

  fx.outbox.close();

  const reopened =
    new SqliteProductSyncOutbox(
      fx.path,
    );

  try {
    assert.equal(
      reopened.getJob(
        job.id,
      ).status,
      "PENDING",
    );
  } finally {
    reopened.close();
  }

  fx.outbox.close = () => {};
});

test("cloud failure cannot prevent normal local Product Library reads", async (context) => {
  const fx =
    await fixture(
      context,
    );

  fx.outbox.enqueueSnapshot(
    fx.snapshot(),
    NOW,
  );

  const service =
    new ProductIntelligenceSyncService({
      outbox:
        fx.outbox,

      remoteStore:
        remote(
          async () => {
            throw new Error(
              "Supabase unavailable",
            );
          },
        ),

      enabled:
        true,
    });

  await service.runOnce({
    now:
      NOW,
  });

  const snapshot =
    fx.repository.getSnapshot(
      "product-1",
    );

  assert.equal(
    snapshot.product.id,
    "product-1",
  );

  assert.equal(
    snapshot.product.status,
    "READY",
  );
});
