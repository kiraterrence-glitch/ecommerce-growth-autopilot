# Architecture

## Core principle

n8n orchestrates; testable TypeScript owns business logic. Normal development, research analysis, AI mocks, campaign generation, and verification run locally with zero n8n Cloud executions.

## Implemented modules

1. **Product Data Engine**
   - canonical product contract and runtime validation
   - normalization, deterministic IDs/fingerprints, duplicate detection
   - seller CSV import

2. **Product Research Intelligence**
   - evidence/source contracts and timestamps
   - competitor and review CSV/manual intake
   - canonical research validation + deduplication
   - price, feature-frequency, offer-pattern analysis
   - evidence-traceable review themes
   - optional AI review mining with required review-ID citations
   - unit economics, contribution margin, break-even CPA
   - research-quality gate that blocks unsupported demand claims and fake sales/opportunity fields
   - research-aware Product Brain context

3. **Product Brain**
   - provider-neutral AI interface
   - deterministic mock provider + local Ollama provider
   - validated audiences, pains, benefits, objections, triggers, angles, offer positioning
   - repair + grounding checks

4. **Campaign Factory**
   - Meta, email, Shopify, Google Ads, Amazon draft generation
   - marketing-quality gate

5. **Creative Factory**
   - static SVG drafts and HTML rendering
   - real PNG rendering through a local Chromium-family browser
   - 20-second vertical storyboard + FFmpeg MP4 rendering

6. **Approval Dashboard**
   - local review UI
   - Product Brain, research, channel drafts, creatives, video
   - server-side approval transitions

7. **Optimization Engine**
   - deterministic campaign metrics and next-action rules

8. **n8n Local Orchestration**
   - product → Product Brain
   - product/research → campaign kit
   - research intake → evidence analysis
   - all committed exports inactive and credential-free

## Verification layers

### Engineering verification

Package safety → dependencies → format → lint → types → secrets → n8n → Postman → build → tests.

### Research verification

Provenance → deduplication → evidence-backed findings → demand guardrail → reproducible economics.

### Marketing verification

Prompt leakage → placeholders → lifecycle CTA fit → channel constraints → variant diversity → content completeness.

## AI boundary

Normal tests never require a live model. Live Ollama runs only in explicit smoke/demo commands. AI review findings must cite imported review IDs, and Product Brain must still pass schema + grounding after research context is applied.

## Safety boundaries

- no automatic ad activation or ad spend
- no storefront publishing by default
- no fake demand/sales estimates
- no AI-generated source URLs
- no live write adapter without explicit mode + credentials + human approval
- no customer PII in committed fixtures

9. **Project History + Delivery Boundary (v0.7)**
   - append-only `.runtime/project-history.jsonl`
   - versioned campaign and research snapshots
   - persisted approval transitions keyed by campaign + asset
   - history/readback API endpoints
   - local-only Meta, Shopify, Google Ads, and email adapters
   - mock/draft modes only; `live` is rejected at runtime
   - channel delivery blocked until every required asset is approved
   - every adapter result declares `externalWrite: false`

## Persistence boundary

JSONL is intentionally an implementation detail behind a small project-history store. Domain contracts do not depend on a database library. A later SQLite/Postgres migration should preserve campaign IDs, event types, timestamps, approval history, and delivery results.

## Handoff boundary

`PROJECT-STATE.json` is the machine-readable source of truth for current version, verified test count, safety invariants, completed phases, last user-confirmed Windows/Ollama gate, and next priorities. `docs/WORK-HANDOFF.md` tells a future coding agent what to read and what not to redo.
