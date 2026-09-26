const DEFAULT_TABLE =
  "product_intelligence_snapshots";

function enabledValue(value) {
  return [
    "1",
    "true",
    "yes",
    "on",
  ].includes(
    String(
      value ?? "",
    )
      .trim()
      .toLowerCase(),
  );
}

function permanentError(
  message,
  syncCode,
) {
  const error =
    new Error(
      message,
    );

  error.permanent =
    true;

  error.syncCode =
    syncCode;

  return error;
}

function validateTable(
  table,
) {
  if (
    typeof table !==
      "string" ||
    !/^[a-z_][a-z0-9_]*$/i.test(
      table,
    )
  ) {
    throw new Error(
      "Invalid Supabase table name.",
    );
  }

  return table;
}

function validateUrl(
  value,
) {
  let url;

  try {
    url =
      new URL(
        value,
      );
  } catch {
    throw new Error(
      "SUPABASE_URL must be a valid URL.",
    );
  }

  if (
    url.protocol !==
    "https:"
  ) {
    throw new Error(
      "SUPABASE_URL must use HTTPS.",
    );
  }

  if (
    url.username ||
    url.password
  ) {
    throw new Error(
      "SUPABASE_URL must not contain credentials.",
    );
  }

  if (
    url.pathname !==
      "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "SUPABASE_URL must be the project origin only.",
    );
  }

  return url.origin;
}

function validateSecretKey(
  value,
) {
  if (
    typeof value !==
      "string" ||
    !value.startsWith(
      "sb_secret_",
    ) ||
    value.length <
      20
  ) {
    throw new Error(
      "SUPABASE_SECRET_KEY must be a current sb_secret_ server key.",
    );
  }

  return value;
}

export function readSupabaseSyncConfig(
  env =
    process.env,
) {
  const enabled =
    enabledValue(
      env.SUPABASE_ENABLED,
    );

  if (!enabled) {
    return {
      enabled:
        false,

      table:
        DEFAULT_TABLE,
    };
  }

  if (
    !env.SUPABASE_URL
  ) {
    throw new Error(
      "SUPABASE_URL is required when SUPABASE_ENABLED=true.",
    );
  }

  if (
    !env.SUPABASE_SECRET_KEY
  ) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required when SUPABASE_ENABLED=true.",
    );
  }

  return {
    enabled:
      true,

    url:
      validateUrl(
        env.SUPABASE_URL,
      ),

    secretKey:
      validateSecretKey(
        env.SUPABASE_SECRET_KEY,
      ),

    table:
      validateTable(
        env.SUPABASE_PRODUCT_INTELLIGENCE_TABLE ??
          DEFAULT_TABLE,
      ),
  };
}

async function safeErrorText(
  response,
) {
  try {
    return (
      await response.text()
    )
      .replace(
        /\s+/g,
        " ",
      )
      .trim()
      .slice(
        0,
        300,
      );
  } catch {
    return "";
  }
}

function responseError(
  response,
  body,
) {
  const error =
    new Error(
      `Supabase Data API request failed with HTTP ${response.status}${
        body
          ? `: ${body}`
          : ""
      }`,
    );

  error.status =
    response.status;

  return error;
}

function remotePrecedence(
  remote,
  envelope,
) {
  const remoteRevision =
    Number(
      remote.revision_number ??
        0,
    );

  if (
    !Number.isInteger(
      remoteRevision,
    ) ||
    remoteRevision <
      0
  ) {
    throw permanentError(
      "Remote revision_number is invalid.",
      "REMOTE_PAYLOAD",
    );
  }

  if (
    remoteRevision >
    envelope.revisionNumber
  ) {
    return "REMOTE_NEWER";
  }

  if (
    remoteRevision <
    envelope.revisionNumber
  ) {
    return "LOCAL_NEWER";
  }

  const remoteTime =
    Date.parse(
      remote.product_updated_at,
    );

  const localTime =
    Date.parse(
      envelope.updatedAt,
    );

  if (
    !Number.isFinite(
      remoteTime,
    ) ||
    !Number.isFinite(
      localTime,
    )
  ) {
    throw permanentError(
      "Remote or local product timestamp is invalid.",
      "REMOTE_PAYLOAD",
    );
  }

  if (
    remoteTime >
    localTime
  ) {
    return "REMOTE_NEWER";
  }

  return "LOCAL_NEWER";
}

export class SupabaseProductIntelligenceRemoteStore {
  constructor({
    url,
    secretKey,
    table =
      DEFAULT_TABLE,
    fetchImpl =
      globalThis.fetch,
  }) {
    this.url =
      validateUrl(
        url,
      );

    this.secretKey =
      validateSecretKey(
        secretKey,
      );

    this.table =
      validateTable(
        table,
      );

    if (
      typeof fetchImpl !==
      "function"
    ) {
      throw new Error(
        "A fetch implementation is required.",
      );
    }

    this.fetch =
      fetchImpl;
  }

  headers(
    extra =
      {},
  ) {
    return {
      accept:
        "application/json",

      apikey:
        this.secretKey,

      ...extra,
    };
  }

  endpoint() {
    return new URL(
      `/rest/v1/${this.table}`,
      this.url,
    );
  }

  async selectRemote(
    productId,
  ) {
    const url =
      this.endpoint();

    url.searchParams.set(
      "product_id",
      `eq.${productId}`,
    );

    url.searchParams.set(
      "select",
      "product_id,payload_hash,revision_number,product_updated_at,schema_version",
    );

    url.searchParams.set(
      "limit",
      "1",
    );

    const response =
      await this.fetch(
        url,
        {
          method:
            "GET",

          headers:
            this.headers(),
        },
      );

    if (
      !response.ok
    ) {
      throw responseError(
        response,
        await safeErrorText(
          response,
        ),
      );
    }

    let rows;

    try {
      rows =
        await response.json();
    } catch {
      throw permanentError(
        "Supabase returned invalid JSON.",
        "REMOTE_PAYLOAD",
      );
    }

    if (
      !Array.isArray(
        rows,
      )
    ) {
      throw permanentError(
        "Supabase select response must be an array.",
        "REMOTE_PAYLOAD",
      );
    }

    if (
      rows.length ===
      0
    ) {
      return null;
    }

    const remote =
      rows[0];

    if (
      Number(
        remote.schema_version,
      ) !==
      1
    ) {
      throw permanentError(
        `Unsupported remote schema version: ${remote.schema_version}`,
        "REMOTE_SCHEMA",
      );
    }

    return remote;
  }

  async applyEnvelope(
    envelope,
  ) {
    const url =
      this.endpoint();

    url.searchParams.set(
      "on_conflict",
      "product_id",
    );

    const body = {
      product_id:
        envelope.productId,

      fingerprint:
        envelope.fingerprint,

      payload_hash:
        envelope.payloadHash,

      revision_number:
        envelope.revisionNumber,

      product_updated_at:
        envelope.updatedAt,

      schema_version:
        envelope.schemaVersion,

      snapshot:
        envelope.snapshot,

      synced_at:
        new Date().toISOString(),
    };

    const response =
      await this.fetch(
        url,
        {
          method:
            "POST",

          headers:
            this.headers({
              "content-type":
                "application/json",

              prefer:
                "resolution=merge-duplicates,return=minimal",
            }),

          body:
            JSON.stringify(
              body,
            ),
        },
      );

    if (
      !response.ok
    ) {
      throw responseError(
        response,
        await safeErrorText(
          response,
        ),
      );
    }

    return {
      status:
        "APPLIED",

      remoteVersion:
        envelope.payloadHash,
    };
  }

  async upsertSnapshot(
    envelope,
  ) {
    if (
      !envelope ||
      envelope.schemaVersion !==
        1 ||
      !envelope.productId ||
      !envelope.fingerprint ||
      !envelope.payloadHash
    ) {
      throw permanentError(
        "Unsupported or malformed Product Intelligence sync envelope.",
        "LOCAL_PAYLOAD",
      );
    }

    const remote =
      await this.selectRemote(
        envelope.productId,
      );

    if (
      remote?.payload_hash ===
      envelope.payloadHash
    ) {
      return {
        status:
          "ALREADY_CURRENT",

        remoteVersion:
          remote.payload_hash,
      };
    }

    if (remote) {
      const precedence =
        remotePrecedence(
          remote,
          envelope,
        );

      if (
        precedence ===
        "REMOTE_NEWER"
      ) {
        return {
          status:
            "REMOTE_NEWER",

          remoteVersion:
            remote.payload_hash,
        };
      }
    }

    return await this.applyEnvelope(
      envelope,
    );
  }

  async deleteProduct(
    productId,
  ) {
    const url =
      this.endpoint();

    url.searchParams.set(
      "product_id",
      `eq.${productId}`,
    );

    const response =
      await this.fetch(
        url,
        {
          method:
            "DELETE",

          headers:
            this.headers({
              prefer:
                "return=minimal",
            }),
        },
      );

    if (
      !response.ok
    ) {
      throw responseError(
        response,
        await safeErrorText(
          response,
        ),
      );
    }
  }
}
