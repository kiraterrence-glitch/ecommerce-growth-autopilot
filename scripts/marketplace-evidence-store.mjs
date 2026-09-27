import { DatabaseSync } from "node:sqlite";

import {
  canonicalEvidenceValue,
  buildMarketplaceEvidenceLedger,
} from "./marketplace-evidence-ledger.mjs";

import {
  parseMarketplaceEvidenceCsv,
} from "./marketplace-evidence-csv.mjs";

function required(value, field) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function mapEvidence(row) {
  return {
    id: row.id,
    productId: row.product_id,
    sourceUrl: row.source_url,
    sourceId: row.source_id,
    policyId: row.policy_id,
    captureMethod: row.capture_method,
    field: row.field,
    rawValue: row.raw_value,
    normalizedValue: row.normalized_value,
    unit: row.unit,
    status: row.status,
    rightsStatus: row.rights_status,
    capturedAt: row.captured_at,
    automatedFetch: Boolean(row.automated_fetch),
    canonicalKey: row.canonical_key,
    createdAt: row.created_at,
  };
}

function mapSource(row) {
  return {
    productId: row.product_id,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    policyId: row.policy_id,
    captureMethod: row.capture_method,
    rightsStatus: row.rights_status,
    capturedAt: row.captured_at,
    automatedFetch: Boolean(row.automated_fetch),
    createdAt: row.created_at,
  };
}

function sameSourceIdentity(existing, record) {
  return (
    existing.source_url === record.sourceUrl &&
    existing.policy_id === record.policyId &&
    existing.capture_method === record.captureMethod &&
    Boolean(existing.automated_fetch) ===
      Boolean(record.automatedFetch)
  );
}

function reconcileSourceRights(
  existingStatus,
  incomingStatus,
) {
  return existingStatus === incomingStatus
    ? existingStatus
    : "UNKNOWN_RIGHTS";
}

function sameEvidence(existing, record, canonicalKey) {
  return (
    existing.product_id === record.productId &&
    existing.source_id === record.sourceId &&
    existing.source_url === record.sourceUrl &&
    existing.policy_id === record.policyId &&
    existing.field === record.field &&
    existing.raw_value === record.rawValue &&
    existing.normalized_value === record.normalizedValue &&
    (existing.unit ?? null) === (record.unit ?? null) &&
    existing.status === record.status &&
    existing.rights_status === record.rightsStatus &&
    existing.captured_at === record.capturedAt &&
    existing.canonical_key === canonicalKey
  );
}

export class MarketplaceEvidenceStore {
  constructor(databasePath) {
    required(databasePath, "databasePath");

    this.database =
      new DatabaseSync(databasePath);

    this.database.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS marketplace_sources (
        product_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        policy_id TEXT NOT NULL,
        capture_method TEXT NOT NULL,
        rights_status TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        automated_fetch INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,

        PRIMARY KEY(product_id, source_id),

        FOREIGN KEY(product_id)
          REFERENCES products(id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS marketplace_evidence (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        policy_id TEXT NOT NULL,
        capture_method TEXT NOT NULL,
        field TEXT NOT NULL,
        raw_value TEXT NOT NULL,
        normalized_value TEXT NOT NULL,
        unit TEXT,
        status TEXT NOT NULL
          CHECK(status IN ('VERIFIED', 'UNVERIFIED')),
        rights_status TEXT NOT NULL
          CHECK(
            rights_status IN (
              'UNKNOWN_RIGHTS',
              'OWNED',
              'LICENSED',
              'AUTHORIZED'
            )
          ),
        captured_at TEXT NOT NULL,
        automated_fetch INTEGER NOT NULL DEFAULT 0,
        canonical_key TEXT NOT NULL,
        created_at TEXT NOT NULL,

        FOREIGN KEY(product_id, source_id)
          REFERENCES marketplace_sources(product_id, source_id)
          ON DELETE CASCADE,

        UNIQUE(
          product_id,
          source_id,
          field,
          canonical_key
        )
      );

      CREATE INDEX IF NOT EXISTS idx_marketplace_evidence_product
        ON marketplace_evidence(product_id);

      CREATE INDEX IF NOT EXISTS idx_marketplace_evidence_field
        ON marketplace_evidence(product_id, field);

      CREATE INDEX IF NOT EXISTS idx_marketplace_evidence_status
        ON marketplace_evidence(product_id, status);

      CREATE INDEX IF NOT EXISTS idx_marketplace_sources_product
        ON marketplace_sources(product_id);
    `);
  }

  close() {
    this.database.close();
  }

  productExists(productId) {
    return Boolean(
      this.database
        .prepare(`
          SELECT 1
          FROM products
          WHERE id = ?
          LIMIT 1
        `)
        .get(productId),
    );
  }

  listSources(productId) {
    return this.database
      .prepare(`
        SELECT *
        FROM marketplace_sources
        WHERE product_id = ?
        ORDER BY captured_at, source_id
      `)
      .all(productId)
      .map(mapSource);
  }

  listEvidence(productId) {
    return this.database
      .prepare(`
        SELECT *
        FROM marketplace_evidence
        WHERE product_id = ?
        ORDER BY captured_at, id
      `)
      .all(productId)
      .map(mapEvidence);
  }

  getEvidence(id) {
    const row =
      this.database
        .prepare(`
          SELECT *
          FROM marketplace_evidence
          WHERE id = ?
        `)
        .get(id);

    return row
      ? mapEvidence(row)
      : null;
  }

  ingestRecords(
    records,
    {
      createdAt =
        new Date().toISOString(),
    } = {},
  ) {
    if (!Array.isArray(records)) {
      throw new Error(
        "records must be an array.",
      );
    }

    const results = {
      insertedSources: 0,
      insertedEvidence: 0,
      skippedEvidence: 0,
    };

    this.database.exec(
      "BEGIN IMMEDIATE",
    );

    try {
      for (const record of records) {
        if (
          !this.productExists(
            record.productId,
          )
        ) {
          const error =
            new Error(
              `Unknown product: ${record.productId}`,
            );

          error.code =
            "UNKNOWN_PRODUCT";

          throw error;
        }

        const existingSource =
          this.database
            .prepare(`
              SELECT *
              FROM marketplace_sources
              WHERE product_id = ?
                AND source_id = ?
            `)
            .get(
              record.productId,
              record.sourceId,
            );

        if (existingSource) {
          if (
            !sameSourceIdentity(
              existingSource,
              record,
            )
          ) {
            const error =
              new Error(
                `Source ID collision: ${record.sourceId}`,
              );

            error.code =
              "SOURCE_ID_COLLISION";

            throw error;
          }

          const reconciledRights =
            reconcileSourceRights(
              existingSource.rights_status,
              record.rightsStatus,
            );

          if (
            reconciledRights !==
            existingSource.rights_status
          ) {
            this.database
              .prepare(`
                UPDATE marketplace_sources
                SET rights_status = ?
                WHERE product_id = ?
                  AND source_id = ?
              `)
              .run(
                reconciledRights,
                record.productId,
                record.sourceId,
              );
          }
        } else {
          this.database
            .prepare(`
              INSERT INTO marketplace_sources(
                product_id,
                source_id,
                source_url,
                policy_id,
                capture_method,
                rights_status,
                captured_at,
                automated_fetch,
                created_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              record.productId,
              record.sourceId,
              record.sourceUrl,
              record.policyId,
              record.captureMethod,
              record.rightsStatus,
              record.capturedAt,
              record.automatedFetch ? 1 : 0,
              createdAt,
            );

          results.insertedSources += 1;
        }

        const canonical =
          canonicalEvidenceValue(
            record,
          );

        const existingEvidence =
          this.database
            .prepare(`
              SELECT *
              FROM marketplace_evidence
              WHERE id = ?
            `)
            .get(record.id);

        if (existingEvidence) {
          if (
            !sameEvidence(
              existingEvidence,
              record,
              canonical.key,
            )
          ) {
            const error =
              new Error(
                `Evidence ID collision: ${record.id}`,
              );

            error.code =
              "EVIDENCE_ID_COLLISION";

            throw error;
          }

          results.skippedEvidence +=
            1;

          continue;
        }

        try {
          this.database
            .prepare(`
              INSERT INTO marketplace_evidence(
                id,
                product_id,
                source_id,
                source_url,
                policy_id,
                capture_method,
                field,
                raw_value,
                normalized_value,
                unit,
                status,
                rights_status,
                captured_at,
                automated_fetch,
                canonical_key,
                created_at
              )
              VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?
              )
            `)
            .run(
              record.id,
              record.productId,
              record.sourceId,
              record.sourceUrl,
              record.policyId,
              record.captureMethod,
              record.field,
              record.rawValue,
              record.normalizedValue,
              record.unit,
              record.status,
              record.rightsStatus,
              record.capturedAt,
              record.automatedFetch ? 1 : 0,
              canonical.key,
              createdAt,
            );
        } catch (error) {
          if (
            String(
              error?.message ?? "",
            ).includes(
              "UNIQUE constraint failed",
            )
          ) {
            const wrapped =
              new Error(
                "Duplicate source fact detected.",
              );

            wrapped.code =
              "DUPLICATE_SOURCE_FACT";

            throw wrapped;
          }

          throw error;
        }

        results.insertedEvidence +=
          1;
      }

      this.database.exec("COMMIT");

      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  ingestCsv(
    csv,
    options = {},
  ) {
    const records =
      parseMarketplaceEvidenceCsv(
        csv,
      );

    return this.ingestRecords(
      records,
      options,
    );
  }

  assessProduct(productId) {
    const evidence =
      this.listEvidence(
        productId,
      );

    const ledger =
      buildMarketplaceEvidenceLedger(
        evidence,
      );

    const fields =
      [
        ...new Set(
          evidence.map(
            (record) =>
              record.field,
          ),
        ),
      ].sort();

    return fields.map(
      (field) =>
        ledger.assessField(
          productId,
          field,
        ),
    );
  }

  getProductSummary(productId) {
    const sources =
      this.listSources(
        productId,
      );

    const evidence =
      this.listEvidence(
        productId,
      );

    const assessments =
      this.assessProduct(
        productId,
      );

    const conflicts =
      assessments.filter(
        (assessment) =>
          assessment.status ===
          "CONFLICT",
      );

    const unverifiedFields =
      assessments.filter(
        (assessment) =>
          assessment.status ===
          "UNVERIFIED",
      );

    const verifiedFields =
      assessments.filter(
        (assessment) =>
          assessment.status ===
          "VERIFIED",
      );

    return {
      productId,

      sourceCount:
        sources.length,

      evidenceCount:
        evidence.length,

      verifiedEvidenceCount:
        evidence.filter(
          (record) =>
            record.status ===
            "VERIFIED",
        ).length,

      unverifiedEvidenceCount:
        evidence.filter(
          (record) =>
            record.status ===
            "UNVERIFIED",
        ).length,

      verifiedFieldCount:
        verifiedFields.length,

      conflictCount:
        conflicts.length,

      unverifiedFieldCount:
        unverifiedFields.length,

      unknownRightsCount:
        evidence.filter(
          (record) =>
            record.rightsStatus ===
            "UNKNOWN_RIGHTS",
        ).length,

      hasBlockingConflict:
        conflicts.length > 0,

      assessments,
    };
  }
}
