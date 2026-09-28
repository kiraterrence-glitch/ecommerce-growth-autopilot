# Phase 14B Market Validation Design

**Status:** Approved in chat on 2026-09-28

## Purpose

Complete Phase 14B by turning the existing demand and competition evidence models into an auditable market-validation result, then make that result a real input to the Product Opportunity `VALIDATE` / `HOLD` / `REJECT` decision.

This phase judges whether the evidence is sufficient for commercial review. It does not declare a product a winner, infer market share, guarantee demand or profitability, or authorize launch or publishing.

## Verified Starting Point

- Branch: `feature/product-opportunity-engine-v1`.
- Phase 14A checkpoint: `67e6a76`.
- Phase 14B.1 through 14B.4 exist as uncommitted local files and must be preserved.
- The current source does not compile because `CompetitionMarketSnapshot.freshness` excludes `STALE`, while `latestSnapshots` returns the broader `CompetitionFreshness` type. The implementation must repair this with a type-safe filter or narrow mapping; it must not allow stale snapshots into current evidence.
- The historical 46-test result is not a current green baseline because compilation fails before those tests execute.

## Scope

This specification covers only:

1. the Phase 14B.4 compilation regression;
2. Phase 14B.5 competition interpretation;
3. combined demand/competition market validation;
4. Phase 14B.6 evidence-pipeline integration with Product Opportunity;
5. focused and full regression verification; and
6. documentation needed to explain the new public contract.

The broader ecommerce-management audit, persistence, API, Product Library UI, visual proof, benchmark cases, and later hardening are separate architectural increments after Phase 14B is green. They must not be mixed into this implementation plan.

## Design Principles

- Evidence sufficiency is separate from commercial attractiveness.
- Freshness, provenance, source independence, and conflicts remain visible in returned data.
- Missing, stale, unverified, or materially conflicting evidence cannot produce the strongest classification.
- Existing Research Engine calculations are consumed, not reimplemented.
- No normalized trend index is converted into absolute search volume.
- Competitor-sample percentages remain sample statistics, never market share.
- No opaque composite score is introduced.
- SQLite remains authoritative; this phase adds no external writes or live publishing.

## Components

### Competition interpretation

Add `src/product-opportunity/competition-interpretation.ts` with `interpretCompetitionProfile(profile)`.

It returns the candidate ID, `SUPPORTED` / `PARTIAL` / `INSUFFICIENT`, reasons, warnings, next actions, evidence counts, and explicit safety policies.

Classification rules:

- `SUPPORTED` requires at least five sampled competitors, at least one current verified direct-saturation observation, at least one independent verified market source, and no material disagreement among comparable current market observations.
- `PARTIAL` applies when some usable competition evidence exists but one or more `SUPPORTED` requirements are missing, or current comparable sources materially disagree.
- `INSUFFICIENT` applies when there is neither a usable competitor sample nor a current verified market observation.
- Stale and unverified observations never contribute to current support. They remain countable for warnings and auditability.

Comparable current observations are those with the same signal, unit, geography, and measurement period. Different values from independent sources create a review-required disagreement; they are not averaged and do not automatically prove either source wrong.

`CompetitionMarketSnapshot` must therefore retain both `periodStart` and `periodEnd`. Disagreement detection uses those explicit boundaries rather than assuming two observations with the same end date describe the same period.

### Combined market validation

Add `src/product-opportunity/market-validation.ts` with `validateMarketEvidence(demand, competition)`.

It returns:

- `READY_FOR_COMMERCIAL_REVIEW` only when demand and competition are both `SUPPORTED`;
- `INSUFFICIENT_EVIDENCE` when either side is `INSUFFICIENT`; or
- `PARTIAL_EVIDENCE` for every other combination.

The result contains the two underlying interpretations, reasons, warnings, next actions, and policies stating that readiness is permission for further review rather than launch approval.

Candidate IDs must match. A mismatch throws instead of silently combining unrelated evidence.

### Canonical evidence pipeline

Add a focused orchestration module, `src/product-opportunity/evidence-pipeline.ts`, exposing `runProductOpportunityEvidencePipeline`.

The function consumes:

- the normalized `ResearchProject`;
- its matching `ResearchAnalysis`;
- demand observations;
- competition-market observations;
- a caller-supplied `asOf` timestamp; and
- only the evidence not yet derivable from these pipelines: supplier state, verified source IDs, critical evidence conflicts, unsupported claim count, and explicitly confirmed comparable competitor IDs where required by the existing Research adapter.

It builds demand and competition profiles, interprets both, combines them into market validation, reuses existing Research Analysis economics/customer calculations, evaluates Product Opportunity, and returns all intermediate evidence plus the final decision and report.

The canonical pipeline must not accept caller-supplied `demand.verified`, trend growth, normalized trend, or market-validation status. Those values are derived or left explicitly unavailable. It must not average independent sources to manufacture one canonical demand number.

The existing low-level `buildProductOpportunityInput` remains temporarily available for compatibility and focused unit testing, but it is documented as a legacy/manual adapter. The new pipeline is the canonical evidence-backed entry point.

### Product Opportunity integration

Extend the Product Opportunity input and gates with explicit market-validation evidence.

- `READY_FOR_COMMERCIAL_REVIEW` passes the market-validation gate.
- `PARTIAL_EVIDENCE` holds the opportunity.
- `INSUFFICIENT_EVIDENCE` holds the opportunity.
- Existing hard rejection for non-positive post-advertising economics remains unchanged.
- Supplier, customer, provenance, conflict, and unsupported-claim gates remain independent and can still hold or reject the candidate.
- `VALIDATE` continues to mean low-cost further testing, never launch approval.

The decision/report contract version must be advanced because the gate set and canonical input semantics change. Tests and documentation must identify the new version explicitly.

## Error Handling

The pipeline fails closed for:

- mismatched candidate/project IDs;
- stale Research Analysis bindings;
- malformed observation values or dates;
- invalid units for a signal;
- unknown verified source IDs;
- unknown comparable competitor IDs; and
- impossible count relationships.

Missing or weak evidence produces a structured `HOLD` result when the input is otherwise valid. Structurally invalid evidence throws a validation error rather than being silently ignored.

## Testing Strategy

Implementation follows red-green-refactor. Each behavior is first expressed as a failing test and observed failing for the intended reason.

Permanent tests must cover:

- the 14B.4 freshness type regression and exclusion of stale snapshots;
- all three competition interpretations;
- all market-validation combinations;
- mismatched candidate IDs;
- missing, stale, unverified, duplicate, and conflicting evidence;
- suspiciously optimistic but valid metrics without provenance;
- relative search indexes remaining relative indexes;
- the canonical pipeline refusing manual demand conclusions;
- a strong evidence case reaches `VALIDATE` only when every other gate passes;
- an ambiguous evidence case reaches `HOLD`;
- a poor-economics case reaches `REJECT` even when market evidence is supported; and
- preservation of existing supplier, economics, customer, provenance, and claim-safety gates.

Verification order:

1. build and focused Phase 14B tests;
2. Product Opportunity unit and integration tests;
3. full `npm.cmd run verify`;
4. consistency checks for `PROJECT-STATE.json`, `README.md`, and `CONTINUE-LATER.md` after the final test count is known.

No historical test count is updated until the full suite passes.

## Delivery Boundaries

This phase may create coherent local commits after each green milestone. It must not enable external writes, live publishing, paid services, or marketplace circumvention.

Push, pull request creation, merge, local-main synchronization, deployment, and production claims occur only after the complete requested local scope is green and reviewed under the repository's delivery rules.

## Success Criteria

Phase 14B is complete when:

- the current compilation error is fixed without weakening stale-evidence exclusion;
- competition and combined market interpretations are deterministic and auditable;
- the canonical opportunity path derives demand and competition from real evidence observations;
- partial or insufficient market evidence cannot yield `VALIDATE`;
- existing safety gates remain effective;
- focused and full verification pass;
- canonical documentation agrees on status and test count; and
- the working tree contains no accidental or unexplained changes.
