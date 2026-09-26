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

import test from "node:test";

import {
  ProductIntelligenceSyncService,
  SqliteProductSyncOutbox,
} from "../../scripts/product-intelligence-sync.mjs";

import {
  readSupabaseSyncConfig,
  SupabaseProductIntelligenceRemoteStore,
} from "../../scripts/supabase-product-intelligence.mjs";

import {
  SqliteProductIntelligenceRepository,
} from "../../scripts/product-intelligence-sqlite.mjs";

function jsonResponse(
  status,
  value,
) {
  return new Response(
    JSON.stringify(
      value,
    ),
    {
      status,

      headers: {
        "content-type":
          "application/json",
      },
    },
  );
}

function emptyResponse(
  status =
    204,
) {
  return new Response(
    null,
    {
      status,
    },
  );
}

function envelope(
  overrides =
    {},
) {
  return {
    schemaVersion:
      1,

    productId:
      "product-1",

    fingerprint:
      "fingerprint-1",

    updatedAt:
      "2026-09-26T00:00:00Z",

    revisionNumber:
      1,

    payloadHash:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

    snapshot: {
      product: {
        id:
          "product-1",

        title:
          "Portable Espresso Maker",
      },
    },

    ...overrides,
  };
}

function storeWith(
  fetchImpl,
) {
  return new SupabaseProductIntelligenceRemoteStore({
    url:
      "https://demo.supabase.co",

    secretKey:
      "sb_secret_abcdefghijklmnopqrstuvwxyz",

    fetchImpl,
  });
}

test("Supabase sync is disabled by default without credentials", () => {
  assert.deepEqual(
    readSupabaseSyncConfig(
      {},
    ),
    {
      enabled:
        false,

      table:
        "product_intelligence_snapshots",
    },
  );
});

test("enabled Supabase sync requires a project URL", () => {
  assert.throws(
    () =>
      readSupabaseSyncConfig({
        SUPABASE_ENABLED:
          "true",

        SUPABASE_SECRET_KEY:
          "sb_secret_abcdefghijklmnopqrstuvwxyz",
      }),
    /SUPABASE_URL is required/,
  );
});

test("enabled Supabase sync requires a secret key", () => {
  assert.throws(
    () =>
      readSupabaseSyncConfig({
        SUPABASE_ENABLED:
          "true",

        SUPABASE_URL:
          "https://demo.supabase.co",
      }),
    /SUPABASE_SECRET_KEY is required/,
  );
});

test("Supabase URL must use HTTPS", () => {
  assert.throws(
    () =>
      readSupabaseSyncConfig({
        SUPABASE_ENABLED:
          "true",

        SUPABASE_URL:
          "http://demo.supabase.co",

        SUPABASE_SECRET_KEY:
          "sb_secret_abcdefghijklmnopqrstuvwxyz",
      }),
    /must use HTTPS/,
  );
});

test("legacy or malformed server keys are rejected", () => {
  assert.throws(
    () =>
      readSupabaseSyncConfig({
        SUPABASE_ENABLED:
          "true",

        SUPABASE_URL:
          "https://demo.supabase.co",

        SUPABASE_SECRET_KEY:
          "eyJlegacy-service-role",
      }),
    /sb_secret_/,
  );
});

test("custom table names must be identifier-safe", () => {
  assert.throws(
    () =>
      readSupabaseSyncConfig({
        SUPABASE_ENABLED:
          "true",

        SUPABASE_URL:
          "https://demo.supabase.co",

        SUPABASE_SECRET_KEY:
          "sb_secret_abcdefghijklmnopqrstuvwxyz",

        SUPABASE_PRODUCT_INTELLIGENCE_TABLE:
          "table;drop table users",
      }),
    /Invalid Supabase table name/,
  );
});

test("matching remote payload hash is already current", async () => {
  const store =
    storeWith(
      async () =>
        jsonResponse(
          200,
          [
            {
              product_id:
                "product-1",

              payload_hash:
                envelope().payloadHash,

              revision_number:
                1,

              product_updated_at:
                "2026-09-26T00:00:00Z",

              schema_version:
                1,
            },
          ],
        ),
    );

  const result =
    await store.upsertSnapshot(
      envelope(),
    );

  assert.equal(
    result.status,
    "ALREADY_CURRENT",
  );
});

test("higher remote revision becomes REMOTE_NEWER without writing", async () => {
  let calls =
    0;

  const store =
    storeWith(
      async () => {
        calls +=
          1;

        return jsonResponse(
          200,
          [
            {
              product_id:
                "product-1",

              payload_hash:
                "remote-hash",

              revision_number:
                2,

              product_updated_at:
                "2026-09-26T00:00:00Z",

              schema_version:
                1,
            },
          ],
        );
      },
    );

  const result =
    await store.upsertSnapshot(
      envelope(),
    );

  assert.equal(
    result.status,
    "REMOTE_NEWER",
  );

  assert.equal(
    calls,
    1,
  );
});

test("newer remote timestamp at the same revision becomes REMOTE_NEWER", async () => {
  const store =
    storeWith(
      async () =>
        jsonResponse(
          200,
          [
            {
              product_id:
                "product-1",

              payload_hash:
                "remote-hash",

              revision_number:
                1,

              product_updated_at:
                "2026-09-26T00:05:00Z",

              schema_version:
                1,
            },
          ],
        ),
    );

  const result =
    await store.upsertSnapshot(
      envelope(),
    );

  assert.equal(
    result.status,
    "REMOTE_NEWER",
  );
});

test("local-newer snapshot is upserted with apikey only", async () => {
  const calls =
    [];

  const store =
    storeWith(
      async (
        url,
        init,
      ) => {
        calls.push({
          url:
            String(
              url,
            ),

          init,
        });

        if (
          init.method ===
          "GET"
        ) {
          return jsonResponse(
            200,
            [],
          );
        }

        return emptyResponse(
          204,
        );
      },
    );

  const result =
    await store.upsertSnapshot(
      envelope(),
    );

  assert.equal(
    result.status,
    "APPLIED",
  );

  assert.equal(
    calls.length,
    2,
  );

  const headers =
    new Headers(
      calls[1].init.headers,
    );

  assert.equal(
    headers.get(
      "apikey",
    ),
    "sb_secret_abcdefghijklmnopqrstuvwxyz",
  );

  assert.equal(
    headers.has(
      "authorization",
    ),
    false,
  );

  assert.match(
    headers.get(
      "prefer",
    ),
    /resolution=merge-duplicates/,
  );

  assert.match(
    calls[1].url,
    /on_conflict=product_id/,
  );
});

test("HTTP 401 is surfaced with status for fail-closed handling", async () => {
  const store =
    storeWith(
      async () =>
        new Response(
          "unauthorized",
          {
            status:
              401,
          },
        ),
    );

  await assert.rejects(
    async () =>
      await store.upsertSnapshot(
        envelope(),
      ),
    (error) => {
      assert.equal(
        error.status,
        401,
      );

      assert.doesNotMatch(
        error.message,
        /sb_secret_/,
      );

      return true;
    },
  );
});

test("HTTP 429 is surfaced with status for retry/backoff handling", async () => {
  const store =
    storeWith(
      async () =>
        new Response(
          "rate limited",
          {
            status:
              429,
          },
        ),
    );

  await assert.rejects(
    async () =>
      await store.upsertSnapshot(
        envelope(),
      ),
    (error) => {
      assert.equal(
        error.status,
        429,
      );

      return true;
    },
  );
});

test("malformed select response fails permanently instead of being trusted", async () => {
  const store =
    storeWith(
      async () =>
        jsonResponse(
          200,
          {
            unexpected:
              true,
          },
        ),
    );

  await assert.rejects(
    async () =>
      await store.upsertSnapshot(
        envelope(),
      ),
    (error) => {
      assert.equal(
        error.permanent,
        true,
      );

      assert.equal(
        error.syncCode,
        "REMOTE_PAYLOAD",
      );

      return true;
    },
  );
});

test("unsupported remote schema version fails permanently", async () => {
  const store =
    storeWith(
      async () =>
        jsonResponse(
          200,
          [
            {
              product_id:
                "product-1",

              payload_hash:
                "remote-hash",

              revision_number:
                1,

              product_updated_at:
                "2026-09-26T00:00:00Z",

              schema_version:
                2,
            },
          ],
        ),
    );

  await assert.rejects(
    async () =>
      await store.upsertSnapshot(
        envelope(),
      ),
    (error) => {
      assert.equal(
        error.permanent,
        true,
      );

      assert.equal(
        error.syncCode,
        "REMOTE_SCHEMA",
      );

      return true;
    },
  );
});

test("generic sync service blocks permanent remote schema errors", async (context) => {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "ecom-supabase-sync-",
      ),
    );

  context.after(
    async () =>
      await rm(
        directory,
        {
          recursive:
            true,
          force:
            true,
        },
      ),
  );

  const databasePath =
    join(
      directory,
      "sync.sqlite",
    );

  const repository =
    new SqliteProductIntelligenceRepository(
      databasePath,
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
      "fingerprint-1",

    createdAt:
      "2026-09-26T00:00:00Z",

    updatedAt:
      "2026-09-26T00:00:00Z",
  });

  const outbox =
    new SqliteProductSyncOutbox(
      databasePath,
    );

  try {
    const job =
      outbox.enqueueSnapshot(
        repository.getSnapshot(
          "product-1",
        ),
        "2026-09-26T00:00:00Z",
      );

    const remoteStore = {
      async upsertSnapshot() {
        const error =
          new Error(
            "schema mismatch",
          );

        error.permanent =
          true;

        error.syncCode =
          "REMOTE_SCHEMA";

        throw error;
      },
    };

    const service =
      new ProductIntelligenceSyncService({
        outbox,
        remoteStore,
        enabled:
          true,
      });

    await service.runOnce({
      now:
        "2026-09-26T00:00:00Z",
    });

    const updated =
      outbox.getJob(
        job.id,
      );

    assert.equal(
      updated.status,
      "BLOCKED",
    );

    assert.equal(
      updated.lastErrorCode,
      "REMOTE_SCHEMA",
    );
  } finally {
    outbox.close();
    repository.close();
  }
});

test("migration enables RLS and removes anon/authenticated table grants", async () => {
  const sql =
    await readFile(
      new URL(
        "../../supabase/migrations/20260926030000_product_intelligence_cloud_mirror.sql",
        import.meta.url,
      ),
      "utf8",
    );

  assert.match(
    sql,
    /enable row level security/i,
  );

  assert.match(
    sql,
    /revoke all[\s\S]*from anon/i,
  );

  assert.match(
    sql,
    /revoke all[\s\S]*from authenticated/i,
  );

  assert.match(
    sql,
    /grant select,\s*insert,\s*update,\s*delete[\s\S]*to service_role/i,
  );

  assert.match(
    sql,
    /check\s*\(\s*schema_version\s*=\s*1\s*\)/i,
  );
});

test("live smoke cleanup DELETE also uses apikey without Authorization", async () => {
  const calls =
    [];

  const store =
    storeWith(
      async (
        url,
        init,
      ) => {
        calls.push({
          url:
            String(
              url,
            ),

          init,
        });

        return emptyResponse(
          204,
        );
      },
    );

  await store.deleteProduct(
    "smoke-product",
  );

  const headers =
    new Headers(
      calls[0].init.headers,
    );

  assert.equal(
    calls[0].init.method,
    "DELETE",
  );

  assert.equal(
    headers.get(
      "apikey",
    ),
    "sb_secret_abcdefghijklmnopqrstuvwxyz",
  );

  assert.equal(
    headers.has(
      "authorization",
    ),
    false,
  );
});
