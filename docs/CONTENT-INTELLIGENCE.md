# Content Intelligence

Content Intelligence analyzes captured content without treating competitor wording or claims as facts about our product.

Phase 13A.1 provides:

- validated content intake
- deterministic classification
- hook and structure classification
- transcript-grounded evidence
- grounded customer-signal extraction
- synthetic demo data
- anti-hallucination checks

The deterministic classifier is intentionally transparent and does not emit an opaque viral, winning-product, or opportunity score.

Observed content patterns are evidence about the source content only. They are not proof that a marketing tactic caused performance and they are not product claims.

Later phases may add performance analysis, AI/Ollama classification, Product Brain context, persistence, API routes, dashboards and activation briefs.

## Phase 13A.2 — Performance and pattern intelligence

Performance analysis remains descriptive and observable.

The system calculates:

- engagement count;
- engagement rate by views;
- views per follower;
- creator median views;
- creator median engagement rate;
- creator-relative ratios;
- hook pattern medians;
- structure pattern medians;
- topic pattern medians;
- creative-format pattern medians;
- CTA-presence pattern medians;
- grounded audience signals;
- grounded pain points;
- grounded benefits;
- grounded objections;
- grounded buying triggers.

Zero denominators return `null` rather than infinity or an invented fallback.

Creator-relative metrics use the median of the captured records for that creator in the current dataset.

Pattern relationships are observational. They do not prove that a hook, structure, CTA, format, topic or other characteristic caused performance.

Competitor and creator content signals remain messaging evidence only. They must never be promoted into product facts without separate product evidence.

No viral score, winner score or opaque opportunity score is generated.

## Phase 13A.3 — Activation briefs

Content Intelligence can convert descriptive observations into original draft directions for Meta ads, lifecycle email, landing pages and creative production.

Activation remains draft-only.

The activation layer does not publish, schedule, send, edit external systems or perform external writes.

Captured creator and competitor content is treated as messaging evidence only.

Generated directions must use original wording. A deterministic originality guard rejects long copied word sequences from source transcripts.

Content Intelligence cannot establish product facts. Factual product statements require separately verified product evidence.

Observed performance relationships remain descriptive and do not establish causality.

## Phase 13B.1 — SQLite persistence

Content Intelligence now has local Product Intelligence persistence.

The store uses the same SQLite database file as Product Intelligence and follows the same separate-store pattern used by marketplace evidence.

Persisted data includes:

- analysis runs;
- captured content and transcripts;
- metrics and tags;
- deterministic classifications;
- performance analysis;
- pattern summaries;
- customer intelligence signals;
- activation briefs.

Runs are bound to an existing Product Intelligence product through a foreign key.

Re-persisting the same run replaces its child snapshot transactionally, preventing stale pattern, signal, item or activation rows.

Activation persistence remains fail-closed:

- draft only;
- external writes disabled;
- live publishing disabled;
- source content remains messaging evidence;
- product claims still require separately verified product evidence.

SQLite remains the local authoritative persistence layer.

## Phase 13B.2 — Product-bound intelligence service

Raw Content Intelligence input can now be processed for an existing Product Intelligence product through one local service:

1. validate captured content;
2. classify content deterministically;
3. calculate descriptive performance and patterns;
4. build customer intelligence;
5. create original draft activation briefs;
6. persist the complete snapshot in the same Product Intelligence SQLite database;
7. reload the persisted run for verification.

Automatic run IDs are deterministic for the same product and validated content.

The service remains fail-closed:

- the product must already exist;
- activation remains draft-only;
- external writes remain disabled;
- live publishing remains disabled;
- source content remains messaging evidence only;
- product facts require separately verified product evidence.

Snapshot child-row deletion uses parameterized prepared statements.
