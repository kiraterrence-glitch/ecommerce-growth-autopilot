
import {
  DatabaseSync,
} from "node:sqlite";

import {
  dirname,
  resolve,
} from "node:path";

import {
  mkdirSync,
} from "node:fs";

import {
  PRODUCT_INTELLIGENCE_SCHEMA_SQL,
  PRODUCT_INTELLIGENCE_SCHEMA_VERSION,
} from "./product-intelligence-schema.mjs";

function requireText(
  value,
  field,
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${field} is required`,
    );
  }

  return value;
}

function requireIsoLike(
  value,
  field,
) {
  requireText(
    value,
    field,
  );

  if (
    !Number.isFinite(
      Date.parse(value),
    )
  ) {
    throw new Error(
      `${field} must be ISO-like`,
    );
  }

  return value;
}

function requireJson(
  value,
  field,
) {
  requireText(
    value,
    field,
  );

  JSON.parse(value);

  return value;
}

function booleanInt(
  value,
) {
  return value
    ? 1
    : 0;
}

function rowProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id:
      row.id,

    sku:
      row.sku,

    title:
      row.title,

    status:
      row.status,

    fingerprint:
      row.fingerprint,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function rowRevision(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    revisionNumber:
      row.revision_number,

    snapshotJson:
      row.snapshot_json,

    createdAt:
      row.created_at,
  };
}

function rowVariant(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    variantKey:
      row.variant_key,

    title:
      row.title,

    sku:
      row.sku,

    price:
      row.price,

    currency:
      row.currency,

    createdAt:
      row.created_at,
  };
}

function rowSource(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    sourceType:
      row.source_type,

    sourceUrl:
      row.source_url,

    contentHash:
      row.content_hash,

    capturedAt:
      row.captured_at,

    status:
      row.status,
  };
}

function rowEvidence(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    sourceId:
      row.source_id,

    field:
      row.field,

    rawValue:
      row.raw_value,

    normalizedValue:
      row.normalized_value,

    unit:
      row.unit,

    status:
      row.status,

    capturedAt:
      row.captured_at,
  };
}

function rowCompetitor(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    competitorProductId:
      row.competitor_product_id,

    relationship:
      row.relationship,

    confirmed:
      row.confirmed === 1,

    createdAt:
      row.created_at,
  };
}

function rowComparison(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    competitorProductId:
      row.competitor_product_id,

    status:
      row.status,

    resultJson:
      row.result_json,

    createdAt:
      row.created_at,
  };
}

function rowVisual(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    kind:
      row.kind,

    filePath:
      row.file_path,

    rightsStatus:
      row.rights_status,

    evidenceIdsJson:
      row.evidence_ids_json,

    createdAt:
      row.created_at,
  };
}

function rowDraft(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    version:
      row.version,

    htmlPath:
      row.html_path,

    status:
      row.status,

    createdAt:
      row.created_at,
  };
}

function rowQa(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    qaType:
      row.qa_type,

    passed:
      row.passed === 1,

    errors:
      row.errors,

    warnings:
      row.warnings,

    reportJson:
      row.report_json,

    createdAt:
      row.created_at,
  };
}

function rowApproval(row) {
  return {
    id:
      row.id,

    productId:
      row.product_id,

    artifactType:
      row.artifact_type,

    artifactId:
      row.artifact_id,

    status:
      row.status,

    approvedAt:
      row.approved_at,

    createdAt:
      row.created_at,
  };
}

export class SqliteProductIntelligenceRepository {
  constructor(
    databasePath = ".runtime/product-intelligence.sqlite",
  ) {
    if (
      databasePath !== ":memory:"
    ) {
      const absolute =
        resolve(
          databasePath,
        );

      mkdirSync(
        dirname(
          absolute,
        ),
        {
          recursive: true,
        },
      );
    }

    this.database =
      new DatabaseSync(
        databasePath,
      );

    this.database.exec(
      PRODUCT_INTELLIGENCE_SCHEMA_SQL,
    );

    this.assertSchemaVersion();
  }

  assertSchemaVersion() {
    const row =
      this.database
        .prepare(
          `
            SELECT value
            FROM schema_meta
            WHERE key = 'schema_version'
          `,
        )
        .get();

    const version =
      Number(
        row?.value,
      );

    if (
      version !==
      PRODUCT_INTELLIGENCE_SCHEMA_VERSION
    ) {
      throw new Error(
        `Unsupported product intelligence schema version ${row?.value ?? "missing"}.`,
      );
    }
  }

  close() {
    this.database.close();
  }

  transaction(
    callback,
  ) {
    this.database.exec(
      "BEGIN IMMEDIATE",
    );

    try {
      const result =
        callback();

      this.database.exec(
        "COMMIT",
      );

      return result;
    } catch (error) {
      this.database.exec(
        "ROLLBACK",
      );

      throw error;
    }
  }

  createProduct(record) {
    requireText(
      record.id,
      "product.id",
    );

    requireText(
      record.sku,
      "product.sku",
    );

    requireText(
      record.title,
      "product.title",
    );

    requireText(
      record.fingerprint,
      "product.fingerprint",
    );

    requireIsoLike(
      record.createdAt,
      "product.createdAt",
    );

    requireIsoLike(
      record.updatedAt,
      "product.updatedAt",
    );

    this.database
      .prepare(
        `
          INSERT INTO products(
            id,
            sku,
            title,
            status,
            fingerprint,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.sku,
        record.title,
        record.status,
        record.fingerprint,
        record.createdAt,
        record.updatedAt,
      );
  }

  getProduct(productId) {
    const row =
      this.database
        .prepare(
          `
            SELECT *
            FROM products
            WHERE id = ?
          `,
        )
        .get(
          productId,
        );

    return rowProduct(
      row,
    );
  }

  getProductByFingerprint(
    fingerprint,
  ) {
    const row =
      this.database
        .prepare(
          `
            SELECT *
            FROM products
            WHERE fingerprint = ?
          `,
        )
        .get(
          fingerprint,
        );

    return rowProduct(
      row,
    );
  }

  listProducts() {
    return this.database
      .prepare(
        `
          SELECT *
          FROM products
          ORDER BY created_at DESC, id ASC
        `,
      )
      .all()
      .map(
        rowProduct,
      );
  }

  addRevision(record) {
    requireJson(
      record.snapshotJson,
      "revision.snapshotJson",
    );

    this.database
      .prepare(
        `
          INSERT INTO product_revisions(
            id,
            product_id,
            revision_number,
            snapshot_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.revisionNumber,
        record.snapshotJson,
        record.createdAt,
      );
  }

  addVariant(record) {
    this.database
      .prepare(
        `
          INSERT INTO product_variants(
            id,
            product_id,
            variant_key,
            title,
            sku,
            price,
            currency,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.variantKey,
        record.title,
        record.sku,
        record.price,
        record.currency,
        record.createdAt,
      );
  }

  addSource(record) {
    this.database
      .prepare(
        `
          INSERT INTO product_sources(
            id,
            product_id,
            source_type,
            source_url,
            content_hash,
            captured_at,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.sourceType,
        record.sourceUrl,
        record.contentHash,
        record.capturedAt,
        record.status,
      );
  }

  addEvidence(record) {
    this.database
      .prepare(
        `
          INSERT INTO evidence_records(
            id,
            product_id,
            source_id,
            field,
            raw_value,
            normalized_value,
            unit,
            status,
            captured_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.sourceId,
        record.field,
        record.rawValue,
        record.normalizedValue,
        record.unit,
        record.status,
        record.capturedAt,
      );
  }

  addCompetitorLink(record) {
    if (
      record.productId ===
      record.competitorProductId
    ) {
      throw new Error(
        "A product cannot be its own competitor.",
      );
    }

    this.database
      .prepare(
        `
          INSERT INTO competitor_links(
            id,
            product_id,
            competitor_product_id,
            relationship,
            confirmed,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.competitorProductId,
        record.relationship,
        booleanInt(
          record.confirmed,
        ),
        record.createdAt,
      );
  }

  addComparisonRun(record) {
    requireJson(
      record.resultJson,
      "comparison.resultJson",
    );

    this.database
      .prepare(
        `
          INSERT INTO comparison_runs(
            id,
            product_id,
            competitor_product_id,
            status,
            result_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.competitorProductId,
        record.status,
        record.resultJson,
        record.createdAt,
      );
  }

  addVisualAsset(record) {
    requireJson(
      record.evidenceIdsJson,
      "visual.evidenceIdsJson",
    );

    this.database
      .prepare(
        `
          INSERT INTO visual_assets(
            id,
            product_id,
            kind,
            file_path,
            rights_status,
            evidence_ids_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.kind,
        record.filePath,
        record.rightsStatus,
        record.evidenceIdsJson,
        record.createdAt,
      );
  }

  addProductPageDraft(record) {
    this.database
      .prepare(
        `
          INSERT INTO product_page_drafts(
            id,
            product_id,
            version,
            html_path,
            status,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.version,
        record.htmlPath,
        record.status,
        record.createdAt,
      );
  }

  addQaRun(record) {
    requireJson(
      record.reportJson,
      "qa.reportJson",
    );

    this.database
      .prepare(
        `
          INSERT INTO qa_runs(
            id,
            product_id,
            qa_type,
            passed,
            errors,
            warnings,
            report_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.qaType,
        booleanInt(
          record.passed,
        ),
        record.errors,
        record.warnings,
        record.reportJson,
        record.createdAt,
      );
  }

  addApproval(record) {
    this.database
      .prepare(
        `
          INSERT INTO approvals(
            id,
            product_id,
            artifact_type,
            artifact_id,
            status,
            approved_at,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.id,
        record.productId,
        record.artifactType,
        record.artifactId,
        record.status,
        record.approvedAt,
        record.createdAt,
      );
  }

  getSnapshot(productId) {
    const product =
      this.getProduct(
        productId,
      );

    if (!product) {
      return null;
    }

    const query =
      (
        table,
        mapper,
        orderBy,
      ) =>
        this.database
          .prepare(
            `
              SELECT *
              FROM ${table}
              WHERE product_id = ?
              ORDER BY ${orderBy}
            `,
          )
          .all(
            productId,
          )
          .map(
            mapper,
          );

    return {
      product,

      revisions:
        query(
          "product_revisions",
          rowRevision,
          "revision_number ASC",
        ),

      variants:
        query(
          "product_variants",
          rowVariant,
          "created_at ASC, id ASC",
        ),

      sources:
        query(
          "product_sources",
          rowSource,
          "captured_at ASC, id ASC",
        ),

      evidence:
        query(
          "evidence_records",
          rowEvidence,
          "captured_at ASC, id ASC",
        ),

      competitors:
        query(
          "competitor_links",
          rowCompetitor,
          "created_at ASC, id ASC",
        ),

      comparisons:
        query(
          "comparison_runs",
          rowComparison,
          "created_at ASC, id ASC",
        ),

      visuals:
        query(
          "visual_assets",
          rowVisual,
          "created_at ASC, id ASC",
        ),

      drafts:
        query(
          "product_page_drafts",
          rowDraft,
          "version ASC",
        ),

      qaRuns:
        query(
          "qa_runs",
          rowQa,
          "created_at ASC, id ASC",
        ),

      approvals:
        query(
          "approvals",
          rowApproval,
          "created_at ASC, id ASC",
        ),
    };
  }
}
