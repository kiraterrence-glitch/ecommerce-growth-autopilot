import {
  DatabaseSync,
} from "node:sqlite";

function requiredText(
  value,
  field,
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${field} is required.`,
    );
  }

  return value.trim();
}

function jsonText(
  value,
  field,
) {
  const encoded =
    JSON.stringify(
      value,
    );

  if (
    typeof encoded !== "string"
  ) {
    throw new Error(
      `${field} must be JSON serializable.`,
    );
  }

  return encoded;
}

function parseJson(
  value,
) {
  return JSON.parse(
    value,
  );
}

function rowRun(
  row,
) {
  if (!row) {
    return null;
  }

  return {
    runId:
      row.run_id,

    productId:
      row.product_id,

    methodology:
      parseJson(
        row.methodology_json,
      ),

    createdAt:
      row.created_at,
  };
}

function rowItem(
  row,
) {
  return {
    runId:
      row.run_id,

    contentId:
      row.content_id,

    platform:
      row.platform,

    sourceUrl:
      row.source_url,

    creator:
      row.creator,

    publishedAt:
      row.published_at,

    transcript:
      row.transcript,

    metrics:
      parseJson(
        row.metrics_json,
      ),

    tags:
      parseJson(
        row.tags_json,
      ),

    classification:
      parseJson(
        row.classification_json,
      ),

    performance:
      parseJson(
        row.performance_json,
      ),

    createdAt:
      row.created_at,
  };
}

function rowPattern(
  row,
) {
  return {
    runId:
      row.run_id,

    dimension:
      row.dimension,

    value:
      row.value,

    sampleSize:
      row.sample_size,

    contentIds:
      parseJson(
        row.content_ids_json,
      ),

    medianViews:
      row.median_views,

    medianEngagementRateByViews:
      row.median_engagement_rate_by_views,

    medianViewsPerFollower:
      row.median_views_per_follower,

    createdAt:
      row.created_at,
  };
}

function rowSignal(
  row,
) {
  return {
    runId:
      row.run_id,

    signalType:
      row.signal_type,

    phrase:
      row.phrase,

    count:
      row.signal_count,

    contentIds:
      parseJson(
        row.content_ids_json,
      ),

    createdAt:
      row.created_at,
  };
}

function rowBrief(
  row,
) {
  return {
    runId:
      row.run_id,

    briefId:
      row.brief_id,

    channel:
      row.channel,

    brief:
      parseJson(
        row.brief_json,
      ),

    draftOnly:
      Boolean(
        row.draft_only,
      ),

    externalWrites:
      Boolean(
        row.external_writes,
      ),

    livePublishing:
      Boolean(
        row.live_publishing,
      ),

    createdAt:
      row.created_at,
  };
}

function requireArray(
  value,
  field,
) {
  if (!Array.isArray(value)) {
    throw new Error(
      `${field} must be an array.`,
    );
  }

  return value;
}

function assertBriefSafety(
  briefs,
) {
  for (
    const brief
    of briefs
  ) {
    if (
      brief?.safety?.draftOnly !== true ||
      brief?.safety?.externalWrites !== false ||
      brief?.safety?.livePublishing !== false
    ) {
      throw new Error(
        "Activation briefs must preserve draft-only safety.",
      );
    }

    if (
      brief.safety.sourceContentPolicy !==
      "messaging_signals_only"
    ) {
      throw new Error(
        "Activation briefs must preserve messaging-signals-only policy.",
      );
    }

    if (
      brief.safety.productFactPolicy !==
      "verified_product_evidence_only"
    ) {
      throw new Error(
        "Activation briefs must preserve verified-product-evidence policy.",
      );
    }
  }
}

export class ContentIntelligenceStore {
  constructor(
    databasePath,
  ) {
    requiredText(
      databasePath,
      "databasePath",
    );

    this.database =
      new DatabaseSync(
        databasePath,
      );

    this.database.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS content_intelligence_runs (
        run_id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        methodology_json TEXT NOT NULL,
        created_at TEXT NOT NULL,

        FOREIGN KEY(product_id)
          REFERENCES products(id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS content_intelligence_items (
        run_id TEXT NOT NULL,
        content_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        source_url TEXT,
        creator TEXT,
        published_at TEXT,
        transcript TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        classification_json TEXT NOT NULL,
        performance_json TEXT NOT NULL,
        created_at TEXT NOT NULL,

        PRIMARY KEY(
          run_id,
          content_id
        ),

        FOREIGN KEY(run_id)
          REFERENCES content_intelligence_runs(run_id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS content_intelligence_patterns (
        run_id TEXT NOT NULL,
        dimension TEXT NOT NULL,
        value TEXT NOT NULL,
        sample_size INTEGER NOT NULL,
        content_ids_json TEXT NOT NULL,
        median_views REAL,
        median_engagement_rate_by_views REAL,
        median_views_per_follower REAL,
        created_at TEXT NOT NULL,

        PRIMARY KEY(
          run_id,
          dimension,
          value
        ),

        FOREIGN KEY(run_id)
          REFERENCES content_intelligence_runs(run_id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS content_intelligence_customer_signals (
        run_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        phrase TEXT NOT NULL,
        signal_count INTEGER NOT NULL,
        content_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL,

        PRIMARY KEY(
          run_id,
          signal_type,
          phrase
        ),

        FOREIGN KEY(run_id)
          REFERENCES content_intelligence_runs(run_id)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS content_intelligence_activation_briefs (
        run_id TEXT NOT NULL,
        brief_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        brief_json TEXT NOT NULL,
        draft_only INTEGER NOT NULL
          CHECK(draft_only = 1),
        external_writes INTEGER NOT NULL
          CHECK(external_writes = 0),
        live_publishing INTEGER NOT NULL
          CHECK(live_publishing = 0),
        created_at TEXT NOT NULL,

        PRIMARY KEY(
          run_id,
          brief_id
        ),

        FOREIGN KEY(run_id)
          REFERENCES content_intelligence_runs(run_id)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_content_intelligence_runs_product
        ON content_intelligence_runs(product_id);

      CREATE INDEX IF NOT EXISTS idx_content_intelligence_items_run
        ON content_intelligence_items(run_id);

      CREATE INDEX IF NOT EXISTS idx_content_intelligence_patterns_run
        ON content_intelligence_patterns(run_id);

      CREATE INDEX IF NOT EXISTS idx_content_intelligence_signals_run
        ON content_intelligence_customer_signals(run_id);

      CREATE INDEX IF NOT EXISTS idx_content_intelligence_briefs_run
        ON content_intelligence_activation_briefs(run_id);
    `);
  }

  close() {
    this.database.close();
  }

  productExists(
    productId,
  ) {
    return Boolean(
      this.database
        .prepare(`
          SELECT 1
          FROM products
          WHERE id = ?
          LIMIT 1
        `)
        .get(
          productId,
        ),
    );
  }

  listRuns(
    productId,
  ) {
    requiredText(
      productId,
      "productId",
    );

    return this.database
      .prepare(`
        SELECT *
        FROM content_intelligence_runs
        WHERE product_id = ?
        ORDER BY created_at, run_id
      `)
      .all(
        productId,
      )
      .map(
        rowRun,
      );
  }

  getRun(
    runId,
  ) {
    requiredText(
      runId,
      "runId",
    );

    const run =
      rowRun(
        this.database
          .prepare(`
            SELECT *
            FROM content_intelligence_runs
            WHERE run_id = ?
          `)
          .get(
            runId,
          ),
      );

    if (run === null) {
      return null;
    }

    const items =
      this.database
        .prepare(`
          SELECT *
          FROM content_intelligence_items
          WHERE run_id = ?
          ORDER BY content_id
        `)
        .all(
          runId,
        )
        .map(
          rowItem,
        );

    const patterns =
      this.database
        .prepare(`
          SELECT *
          FROM content_intelligence_patterns
          WHERE run_id = ?
          ORDER BY dimension, value
        `)
        .all(
          runId,
        )
        .map(
          rowPattern,
        );

    const customerSignals =
      this.database
        .prepare(`
          SELECT *
          FROM content_intelligence_customer_signals
          WHERE run_id = ?
          ORDER BY signal_type, phrase
        `)
        .all(
          runId,
        )
        .map(
          rowSignal,
        );

    const activationBriefs =
      this.database
        .prepare(`
          SELECT *
          FROM content_intelligence_activation_briefs
          WHERE run_id = ?
          ORDER BY brief_id
        `)
        .all(
          runId,
        )
        .map(
          rowBrief,
        );

    return {
      ...run,
      items,
      patterns,
      customerSignals,
      activationBriefs,
    };
  }

  persistSnapshot({
    runId,
    productId,
    records,
    report,
    briefs,
    createdAt =
      new Date().toISOString(),
  }) {
    requiredText(
      runId,
      "runId",
    );

    requiredText(
      productId,
      "productId",
    );

    requiredText(
      createdAt,
      "createdAt",
    );

    requireArray(
      records,
      "records",
    );

    requireArray(
      report?.classifications,
      "report.classifications",
    );

    requireArray(
      report?.performance,
      "report.performance",
    );

    requireArray(
      report?.patterns,
      "report.patterns",
    );

    requireArray(
      briefs,
      "briefs",
    );

    assertBriefSafety(
      briefs,
    );

    if (
      !this.productExists(
        productId,
      )
    ) {
      throw new Error(
        `Unknown product: ${productId}`,
      );
    }

    if (
      report.classifications.length !==
        records.length ||
      report.performance.length !==
        records.length
    ) {
      throw new Error(
        "Content records, classifications, and performance rows must align.",
      );
    }

    const classificationByContentId =
      new Map(
        report.classifications.map(
          (classification) => [
            classification.contentId,
            classification,
          ],
        ),
      );

    const performanceByContentId =
      new Map(
        report.performance.map(
          (performance) => [
            performance.contentId,
            performance,
          ],
        ),
      );

    const signalGroups = [
      [
        "audience",
        report.customerIntelligence?.audience ?? [],
      ],

      [
        "painPoints",
        report.customerIntelligence?.painPoints ?? [],
      ],

      [
        "benefits",
        report.customerIntelligence?.benefits ?? [],
      ],

      [
        "objections",
        report.customerIntelligence?.objections ?? [],
      ],

      [
        "buyingTriggers",
        report.customerIntelligence?.buyingTriggers ?? [],
      ],
    ];

    this.database.exec(
      "BEGIN IMMEDIATE",
    );

    try {
      this.database
        .prepare(`
          INSERT INTO content_intelligence_runs (
            run_id,
            product_id,
            methodology_json,
            created_at
          )
          VALUES (?, ?, ?, ?)
          ON CONFLICT(run_id)
          DO UPDATE SET
            product_id = excluded.product_id,
            methodology_json = excluded.methodology_json,
            created_at = excluded.created_at
        `)
        .run(
          runId,
          productId,
          jsonText(
            report.methodology,
            "methodology",
          ),
          createdAt,
        );

      for (
        const table
        of [
          "content_intelligence_items",
          "content_intelligence_patterns",
          "content_intelligence_customer_signals",
          "content_intelligence_activation_briefs",
        ]
      ) {
        this.database.exec(
          `DELETE FROM ${table} WHERE run_id = '${runId.replaceAll("'", "''")}'`,
        );
      }

      const insertItem =
        this.database.prepare(`
          INSERT INTO content_intelligence_items (
            run_id,
            content_id,
            platform,
            source_url,
            creator,
            published_at,
            transcript,
            metrics_json,
            tags_json,
            classification_json,
            performance_json,
            created_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `);

      for (
        const record
        of records
      ) {
        const classification =
          classificationByContentId.get(
            record.id,
          );

        const performance =
          performanceByContentId.get(
            record.id,
          );

        if (
          classification === undefined ||
          performance === undefined
        ) {
          throw new Error(
            `Missing analysis rows for content ${record.id}`,
          );
        }

        insertItem.run(
          runId,
          record.id,
          record.platform,
          record.sourceUrl,
          record.creator,
          record.publishedAt,
          record.transcript,
          jsonText(
            record.metrics,
            "metrics",
          ),
          jsonText(
            record.tags,
            "tags",
          ),
          jsonText(
            classification,
            "classification",
          ),
          jsonText(
            performance,
            "performance",
          ),
          createdAt,
        );
      }

      const insertPattern =
        this.database.prepare(`
          INSERT INTO content_intelligence_patterns (
            run_id,
            dimension,
            value,
            sample_size,
            content_ids_json,
            median_views,
            median_engagement_rate_by_views,
            median_views_per_follower,
            created_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `);

      for (
        const pattern
        of report.patterns
      ) {
        insertPattern.run(
          runId,
          pattern.dimension,
          pattern.value,
          pattern.sampleSize,
          jsonText(
            pattern.contentIds,
            "pattern.contentIds",
          ),
          pattern.medianViews,
          pattern.medianEngagementRateByViews,
          pattern.medianViewsPerFollower,
          createdAt,
        );
      }

      const insertSignal =
        this.database.prepare(`
          INSERT INTO content_intelligence_customer_signals (
            run_id,
            signal_type,
            phrase,
            signal_count,
            content_ids_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `);

      for (
        const [
          signalType,
          signals,
        ]
        of signalGroups
      ) {
        for (
          const signal
          of signals
        ) {
          insertSignal.run(
            runId,
            signalType,
            signal.phrase,
            signal.count,
            jsonText(
              signal.contentIds,
              "signal.contentIds",
            ),
            createdAt,
          );
        }
      }

      const insertBrief =
        this.database.prepare(`
          INSERT INTO content_intelligence_activation_briefs (
            run_id,
            brief_id,
            channel,
            brief_json,
            draft_only,
            external_writes,
            live_publishing,
            created_at
          )
          VALUES (?, ?, ?, ?, 1, 0, 0, ?)
        `);

      for (
        const brief
        of briefs
      ) {
        insertBrief.run(
          runId,
          brief.briefId,
          brief.channel,
          jsonText(
            brief,
            "brief",
          ),
          createdAt,
        );
      }

      this.database.exec(
        "COMMIT",
      );
    } catch (error) {
      this.database.exec(
        "ROLLBACK",
      );

      throw error;
    }

    return {
      runId,
      productId,
      itemCount:
        records.length,
      patternCount:
        report.patterns.length,
      signalCount:
        signalGroups.reduce(
          (
            total,
            group,
          ) =>
            total +
            group[1].length,
          0,
        ),
      briefCount:
        briefs.length,
    };
  }
}
