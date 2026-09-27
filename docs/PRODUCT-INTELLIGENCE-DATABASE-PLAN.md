
# Product Intelligence Database Plan

Phase 9 will introduce a persistent product intelligence database.

## Local-first database

The first adapter will use SQLite through the Node.js runtime.

No paid service is required.

The business logic will depend on repository interfaces rather than directly on SQLite so a PostgreSQL or Supabase adapter can be added later.

## Planned entities

### products

Canonical product identity and lifecycle state.

### product_variants

Variant-level SKU, pricing and option information.

### product_sources

Supplier, competitor and manually supplied source records.

### evidence_records

Provenance-preserving product facts.

Each fact remains linked to the source and capture time that produced it.

### product_revisions

Historical snapshots of verified product state.

New supplier information creates a new revision rather than silently replacing historical evidence.

### competitor_links

Explicit relationships between a primary product and confirmed competitor products.

### comparison_runs

Stored normalized comparison results.

### visual_assets

Generated visual artifacts, rights state and supporting evidence IDs.

### product_page_drafts

Versioned local product-page drafts.

### qa_runs

Deterministic, browser and other QA reports.

### approvals

Human approval state for generated artifacts.

## Design rule

The database is not allowed to turn missing information into product facts.

Evidence provenance remains the source of truth.
