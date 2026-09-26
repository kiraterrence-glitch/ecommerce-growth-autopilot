import {
  createHash,
} from "node:crypto";

import {
  DatabaseSync,
} from "node:sqlite";

function stableValue(value) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(
        (key) => [
          key,
          stableValue(value[key]),
        ],
      ),
  );
}

function stableJson(value) {
  return JSON.stringify(
    stableValue(value),
  );
}

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function jobId(
  productId,
  payloadHash,
) {
  return `sync-${sha256(
    `${productId}:${payloadHash}`,
  ).slice(0, 24)}`;
}

function mapJob(row) {
  if (!row) {
    return null;
  }

  return {
    id:
      row.id,

    productId:
      row.product_id,

    fingerprint:
      row.fingerprint,

    payloadHash:
      row.payload_hash,

    payloadJson:
      row.payload_json,

    status:
      row.status,

    attempts:
      row.attempts,

    nextAttemptAt:
      row.next_attempt_at,

    lastErrorCode:
      row.last_error_code,

    lastErrorMessage:
      row.last_error_message,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

export function buildProductSyncEnvelope(
  snapshot,
) {
  if (
    !snapshot?.product?.id ||
    !snapshot?.product?.fingerprint
  ) {
    throw new Error(
      "A complete Product Intelligence snapshot is required.",
    );
  }

  const revisionNumber =
    snapshot.revisions.reduce(
      (
        highest,
        revision,
      ) =>
        Math.max(
          highest,
          revision.revisionNumber,
        ),
      0,
    );

  const base = {
    schemaVersion:
      1,

    productId:
      snapshot.product.id,

    fingerprint:
      snapshot.product.fingerprint,

    updatedAt:
      snapshot.product.updatedAt,

    revisionNumber,

    snapshot,
  };

  const payloadHash =
    sha256(
      stableJson(base),
    );

  return {
    ...base,
    payloadHash,
  };
}

export class SqliteProductSyncOutbox {
  constructor(
    databasePath,
  ) {
    if (!databasePath) {
      throw new Error(
        "databasePath is required",
      );
    }

    this.database =
      new DatabaseSync(
        databasePath,
      );

    this.database.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS product_sync_outbox (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK(
            status IN (
              'PENDING',
              'RETRY',
              'SUCCEEDED',
              'BLOCKED',
              'CONFLICT'
            )
          ),
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT,
        last_error_code TEXT,
        last_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(product_id, payload_hash),
        FOREIGN KEY(product_id)
          REFERENCES products(id)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_product_sync_ready
      ON product_sync_outbox(
        status,
        next_attempt_at,
        created_at
      );

      CREATE TABLE IF NOT EXISTS product_sync_state (
        product_id TEXT PRIMARY KEY,
        payload_hash TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        remote_version TEXT,
        FOREIGN KEY(product_id)
          REFERENCES products(id)
          ON DELETE CASCADE
      );
    `);
  }

  close() {
    this.database.close();
  }

  enqueueSnapshot(
    snapshot,
    now =
      new Date().toISOString(),
  ) {
    const envelope =
      buildProductSyncEnvelope(
        snapshot,
      );

    const id =
      jobId(
        envelope.productId,
        envelope.payloadHash,
      );

    this.database
      .prepare(`
        INSERT OR IGNORE INTO product_sync_outbox(
          id,
          product_id,
          fingerprint,
          payload_hash,
          payload_json,
          status,
          attempts,
          next_attempt_at,
          last_error_code,
          last_error_message,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'PENDING', 0, NULL, NULL, NULL, ?, ?)
      `)
      .run(
        id,
        envelope.productId,
        envelope.fingerprint,
        envelope.payloadHash,
        stableJson(
          envelope,
        ),
        now,
        now,
      );

    return this.getJob(
      id,
    );
  }

  getJob(id) {
    return mapJob(
      this.database
        .prepare(`
          SELECT *
          FROM product_sync_outbox
          WHERE id = ?
        `)
        .get(id),
    );
  }

  listJobs() {
    return this.database
      .prepare(`
        SELECT *
        FROM product_sync_outbox
        ORDER BY created_at, id
      `)
      .all()
      .map(mapJob);
  }

  listReady(
    now,
    limit =
      20,
  ) {
    return this.database
      .prepare(`
        SELECT *
        FROM product_sync_outbox
        WHERE
          status IN ('PENDING', 'RETRY')
          AND (
            next_attempt_at IS NULL
            OR next_attempt_at <= ?
          )
        ORDER BY created_at, id
        LIMIT ?
      `)
      .all(
        now,
        limit,
      )
      .map(mapJob);
  }

  markSucceeded(
    job,
    {
      now,
      remoteVersion =
        null,
    },
  ) {
    this.database
      .prepare(`
        UPDATE product_sync_outbox
        SET
          status = 'SUCCEEDED',
          attempts = attempts + 1,
          next_attempt_at = NULL,
          last_error_code = NULL,
          last_error_message = NULL,
          updated_at = ?
        WHERE id = ?
      `)
      .run(
        now,
        job.id,
      );

    this.database
      .prepare(`
        INSERT INTO product_sync_state(
          product_id,
          payload_hash,
          synced_at,
          remote_version
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(product_id)
        DO UPDATE SET
          payload_hash = excluded.payload_hash,
          synced_at = excluded.synced_at,
          remote_version = excluded.remote_version
      `)
      .run(
        job.productId,
        job.payloadHash,
        now,
        remoteVersion,
      );
  }

  markRetry(
    job,
    {
      now,
      nextAttemptAt,
      code,
      message,
    },
  ) {
    this.database
      .prepare(`
        UPDATE product_sync_outbox
        SET
          status = 'RETRY',
          attempts = attempts + 1,
          next_attempt_at = ?,
          last_error_code = ?,
          last_error_message = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .run(
        nextAttemptAt,
        code,
        message,
        now,
        job.id,
      );
  }

  markBlocked(
    job,
    {
      now,
      code,
      message,
    },
  ) {
    this.database
      .prepare(`
        UPDATE product_sync_outbox
        SET
          status = 'BLOCKED',
          attempts = attempts + 1,
          next_attempt_at = NULL,
          last_error_code = ?,
          last_error_message = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .run(
        code,
        message,
        now,
        job.id,
      );
  }

  markConflict(
    job,
    {
      now,
      remoteVersion =
        null,
    },
  ) {
    this.database
      .prepare(`
        UPDATE product_sync_outbox
        SET
          status = 'CONFLICT',
          attempts = attempts + 1,
          next_attempt_at = NULL,
          last_error_code = 'REMOTE_NEWER',
          last_error_message = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .run(
        remoteVersion,
        now,
        job.id,
      );
  }

  getState(
    productId,
  ) {
    const row =
      this.database
        .prepare(`
          SELECT *
          FROM product_sync_state
          WHERE product_id = ?
        `)
        .get(productId);

    if (!row) {
      return null;
    }

    return {
      productId:
        row.product_id,

      payloadHash:
        row.payload_hash,

      syncedAt:
        row.synced_at,

      remoteVersion:
        row.remote_version,
    };
  }
}

function statusOf(error) {
  const value =
    error?.status ??
    error?.statusCode;

  return Number.isInteger(value)
    ? value
    : null;
}

function classifyError(error) {
  const status =
    statusOf(error);

  if (
    status ===
      401 ||
    status ===
      403
  ) {
    return {
      retry:
        false,
      code:
        "AUTH",
    };
  }

  if (
    status ===
    429
  ) {
    return {
      retry:
        true,
      code:
        "RATE_LIMIT",
    };
  }

  if (
    status !== null &&
    status >= 500
  ) {
    return {
      retry:
        true,
      code:
        "REMOTE_5XX",
    };
  }

  if (
    status === null
  ) {
    return {
      retry:
        true,
      code:
        "NETWORK",
    };
  }

  return {
    retry:
      true,
    code:
      "REMOTE_ERROR",
  };
}

function nextAttempt(
  now,
  attemptsBefore,
  baseDelayMs,
) {
  const delay =
    Math.min(
      baseDelayMs *
        2 ** attemptsBefore,
      60 * 60 * 1000,
    );

  return new Date(
    Date.parse(now) +
      delay,
  ).toISOString();
}

export class ProductIntelligenceSyncService {
  constructor({
    outbox,
    remoteStore,
    enabled =
      false,
    maxAttempts =
      5,
    baseDelayMs =
      60_000,
  }) {
    this.outbox =
      outbox;

    this.remoteStore =
      remoteStore;

    this.enabled =
      enabled;

    this.maxAttempts =
      maxAttempts;

    this.baseDelayMs =
      baseDelayMs;
  }

  async runOnce({
    now =
      new Date().toISOString(),
    limit =
      20,
  } = {}) {
    if (!this.enabled) {
      return {
        status:
          "DISABLED",
        processed:
          0,
        succeeded:
          0,
        retried:
          0,
        blocked:
          0,
        conflicts:
          0,
      };
    }

    const summary = {
      status:
        "COMPLETE",
      processed:
        0,
      succeeded:
        0,
      retried:
        0,
      blocked:
        0,
      conflicts:
        0,
    };

    const jobs =
      this.outbox.listReady(
        now,
        limit,
      );

    for (
      const job of jobs
    ) {
      summary.processed +=
        1;

      try {
        const envelope =
          JSON.parse(
            job.payloadJson,
          );

        const result =
          await this.remoteStore
            .upsertSnapshot(
              envelope,
            );

        if (
          !result ||
          typeof result.status !==
            "string"
        ) {
          throw new Error(
            "Malformed remote sync result.",
          );
        }

        if (
          result.status ===
            "APPLIED" ||
          result.status ===
            "ALREADY_CURRENT"
        ) {
          this.outbox
            .markSucceeded(
              job,
              {
                now,
                remoteVersion:
                  result.remoteVersion ??
                  null,
              },
            );

          summary.succeeded +=
            1;

          continue;
        }

        if (
          result.status ===
          "REMOTE_NEWER"
        ) {
          this.outbox
            .markConflict(
              job,
              {
                now,
                remoteVersion:
                  result.remoteVersion ??
                  null,
              },
            );

          summary.conflicts +=
            1;

          continue;
        }

        throw new Error(
          `Unsupported remote status: ${result.status}`,
        );
      } catch (error) {
        const classified =
          classifyError(
            error,
          );

        const attemptsAfter =
          job.attempts +
          1;

        const message =
          error instanceof Error
            ? error.message
            : String(error);

        if (
          !classified.retry ||
          attemptsAfter >=
            this.maxAttempts
        ) {
          this.outbox
            .markBlocked(
              job,
              {
                now,
                code:
                  classified.retry
                    ? "MAX_ATTEMPTS"
                    : classified.code,
                message,
              },
            );

          summary.blocked +=
            1;

          continue;
        }

        this.outbox
          .markRetry(
            job,
            {
              now,
              nextAttemptAt:
                nextAttempt(
                  now,
                  job.attempts,
                  this.baseDelayMs,
                ),
              code:
                classified.code,
              message,
            },
          );

        summary.retried +=
          1;
      }
    }

    return summary;
  }
}
