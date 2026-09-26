
export const PRODUCT_INTELLIGENCE_SCHEMA_VERSION =
  1;

export const PRODUCT_INTELLIGENCE_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_sku
ON products(sku);

CREATE TABLE IF NOT EXISTS product_revisions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(product_id, revision_number),
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  title TEXT NOT NULL,
  sku TEXT,
  price REAL,
  currency TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(product_id, variant_key),
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_sources (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  content_hash TEXT,
  captured_at TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_sources_product
ON product_sources(product_id);

CREATE TABLE IF NOT EXISTS evidence_records (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  field TEXT NOT NULL,
  raw_value TEXT NOT NULL,
  normalized_value TEXT,
  unit TEXT,
  status TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,
  FOREIGN KEY(source_id)
    REFERENCES product_sources(id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_evidence_product_field
ON evidence_records(product_id, field);

CREATE TABLE IF NOT EXISTS competitor_links (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  competitor_product_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  confirmed INTEGER NOT NULL CHECK(confirmed IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE(product_id, competitor_product_id),
  CHECK(product_id <> competitor_product_id),
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,
  FOREIGN KEY(competitor_product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comparison_runs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  competitor_product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,
  FOREIGN KEY(competitor_product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS visual_assets (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  file_path TEXT NOT NULL,
  rights_status TEXT,
  evidence_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_page_drafts (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  html_path TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(product_id, version),
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_runs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  qa_type TEXT NOT NULL,
  passed INTEGER NOT NULL CHECK(passed IN (0, 1)),
  errors INTEGER NOT NULL CHECK(errors >= 0),
  warnings INTEGER NOT NULL CHECK(warnings >= 0),
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  status TEXT NOT NULL,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approvals_product
ON approvals(product_id);

INSERT INTO schema_meta(key, value)
VALUES (
  'schema_version',
  '1'
)
ON CONFLICT(key)
DO UPDATE SET value = excluded.value;
`;
