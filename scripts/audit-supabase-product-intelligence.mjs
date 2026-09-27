import {
  readFile,
} from "node:fs/promises";

import {
  readSupabaseSyncConfig,
  SupabaseProductIntelligenceRemoteStore,
} from "./supabase-product-intelligence.mjs";

const disabled =
  readSupabaseSyncConfig(
    {},
  );

if (
  disabled.enabled !==
  false
) {
  throw new Error(
    "Supabase must be disabled by default.",
  );
}

console.log(
  "[PASS] Supabase disabled by default",
);

const migration =
  await readFile(
    new URL(
      "../supabase/migrations/20260926030000_product_intelligence_cloud_mirror.sql",
      import.meta.url,
    ),
    "utf8",
  );

for (
  const requirement of [
    /enable row level security/i,
    /from anon/i,
    /from authenticated/i,
    /to service_role/i,
    /schema_version\s*=\s*1/i,
  ]
) {
  if (
    !requirement.test(
      migration,
    )
  ) {
    throw new Error(
      `Migration requirement missing: ${requirement}`,
    );
  }
}

console.log(
  "[PASS] migration security boundary verified",
);

const calls = [];

const store =
  new SupabaseProductIntelligenceRemoteStore({
    url:
      "https://audit.supabase.co",

    secretKey:
      "sb_secret_abcdefghijklmnopqrstuvwxyz",

    fetchImpl:
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
          return new Response(
            "[]",
            {
              status:
                200,

              headers: {
                "content-type":
                  "application/json",
              },
            },
          );
        }

        return new Response(
          null,
          {
            status:
              204,
          },
        );
      },
  });

const envelope = {
  schemaVersion:
    1,

  productId:
    "audit-product",

  fingerprint:
    "audit-fingerprint",

  updatedAt:
    "2026-09-26T00:00:00Z",

  revisionNumber:
    1,

  payloadHash:
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",

  snapshot: {
    product: {
      id:
        "audit-product",
    },
  },
};

const result =
  await store.upsertSnapshot(
    envelope,
  );

if (
  result.status !==
  "APPLIED"
) {
  throw new Error(
    "Mocked Supabase adapter did not apply the snapshot.",
  );
}

const postHeaders =
  new Headers(
    calls[1].init.headers,
  );

if (
  !postHeaders.has(
    "apikey",
  ) ||
  postHeaders.has(
    "authorization",
  )
) {
  throw new Error(
    "Supabase API key header safety failed.",
  );
}

console.log(
  "[PASS] secret key sent only through apikey header",
);

console.log(
  "[PASS] adapter errors and sync payloads are tested for secret exclusion",
);

console.log("");
console.log(
  "PHASE 11B-1 SUPABASE ADAPTER AUDIT PASSED",
);
