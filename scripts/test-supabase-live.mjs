import {
  createHash,
} from "node:crypto";

import {
  readSupabaseSyncConfig,
  SupabaseProductIntelligenceRemoteStore,
} from "./supabase-product-intelligence.mjs";

if (
  process.env
    .SUPABASE_LIVE_TEST !==
  "1"
) {
  console.log(
    "SKIPPED: set SUPABASE_LIVE_TEST=1 to run the live Supabase smoke test.",
  );

  process.exit(
    0,
  );
}

const config =
  readSupabaseSyncConfig();

if (!config.enabled) {
  throw new Error(
    "SUPABASE_ENABLED=true is required for the live smoke test.",
  );
}

const store =
  new SupabaseProductIntelligenceRemoteStore({
    url:
      config.url,

    secretKey:
      config.secretKey,

    table:
      config.table,
  });

const now =
  new Date().toISOString();

const productId =
  `live-smoke-${Date.now()}`;

const fingerprint =
  `live-smoke-fingerprint-${Date.now()}`;

const snapshot = {
  product: {
    id:
      productId,

    fingerprint,

    title:
      "Supabase live smoke test",

    updatedAt:
      now,
  },
};

const base = {
  schemaVersion:
    1,

  productId,

  fingerprint,

  updatedAt:
    now,

  revisionNumber:
    0,

  snapshot,
};

const payloadHash =
  createHash(
    "sha256",
  )
    .update(
      JSON.stringify(
        base,
      ),
    )
    .digest(
      "hex",
    );

const envelope = {
  ...base,
  payloadHash,
};

try {
  const result =
    await store.upsertSnapshot(
      envelope,
    );

  if (
    result.status !==
      "APPLIED" &&
    result.status !==
      "ALREADY_CURRENT"
  ) {
    throw new Error(
      `Unexpected live smoke status: ${result.status}`,
    );
  }

  console.log(
    "LIVE SUPABASE WRITE/READ SMOKE PASSED.",
  );
} finally {
  await store.deleteProduct(
    productId,
  );

  console.log(
    "LIVE SUPABASE SMOKE ROW CLEANED UP.",
  );
}
