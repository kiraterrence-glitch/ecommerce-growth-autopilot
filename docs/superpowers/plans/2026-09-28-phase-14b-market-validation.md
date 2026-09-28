# Phase 14B Market Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 14B with auditable competition interpretation, combined market validation, and a canonical evidence-backed Product Opportunity pipeline.

**Architecture:** Extend the existing demand and competition profiles rather than recalculating Research Engine results. A new competition interpreter and market validator feed an orchestration layer that calls the existing opportunity decision/report functions with an explicit market-validation gate; the manual Research bridge remains compatible but is no longer the canonical evidence path.

**Tech Stack:** TypeScript 5.8, Node.js test runner, existing local Research Engine and Product Opportunity modules.

**Spec:** `docs/superpowers/specs/2026-09-28-phase-14b-market-validation-design.md`

## Global Constraints

- Preserve all pre-existing uncommitted Phase 14B files and changes.
- Use `npm.cmd` and `npx.cmd` on Windows.
- Follow red-green-refactor for every behavior change.
- Keep `externalWrites=false`, `livePublishing=false`, and human approval required.
- Do not infer market share, guaranteed demand, absolute search volume from a relative index, or a winning-product outcome.
- Do not add dependencies, paid services, live marketplace extraction, or duplicate Research Engine calculations.
- SQLite/local-first state remains authoritative.
- Do not update canonical test counts until the complete `npm.cmd run verify` run passes.

## Review Focus

- A stale observation must remain excluded even if its value is exceptionally favorable; Task 1 adds an explicit snapshot assertion.
- Two current sources with different values for the same competition period must create a disagreement and block `SUPPORTED`; Task 2 covers this.
- A relative trend index must remain labeled as relative and must never become absolute volume; Task 5 covers this end to end.
- A caller must not be able to assert demand sufficiency or market readiness through the canonical pipeline; Task 5 pins the accepted input shape and runtime output.
- Supported market evidence must not override negative economics, supplier conflicts, missing provenance, or unsupported claims; Tasks 4 and 5 cover these independent gates.

---

### Task 1: Restore the Phase 14B.4 green baseline

**Files:**
- Modify: `src/product-opportunity/competition-profile.ts`
- Modify: `tests/unit/product-opportunity-competition.test.mjs`

**Interfaces:**
- Consumes: `CompetitionObservationAssessment` from `src/product-opportunity/competition-types.ts`.
- Produces: `latestSnapshots(usable)` results whose `freshness` is statically and operationally limited to `"FRESH" | "AGING"`.

- [ ] **Step 1: Strengthen the stale-evidence regression test**

In `tests/unit/product-opportunity-competition.test.mjs`, extend `stale market evidence is excluded from current saturation evidence` to assert `profile.marketEvidence.snapshots` is empty.

- [ ] **Step 2: Run the failing build and record the expected red state**

Run: `npm.cmd run build`

Expected: FAIL at `competition-profile.ts` because `CompetitionFreshness` still includes `STALE` while snapshots exclude it.

- [ ] **Step 3: Narrow the snapshot mapper without a type assertion that permits stale data**

Refactor `latestSnapshots` to accept assessments narrowed by a type predicate to freshness `FRESH | AGING`, or give it an equivalent narrow input type. Do not widen `CompetitionMarketSnapshot.freshness` to include `STALE`.

- [ ] **Step 4: Verify the repaired baseline**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-demand.test.mjs tests/unit/product-opportunity-demand-profile.test.mjs tests/unit/product-opportunity-demand-interpretation.test.mjs tests/unit/product-opportunity-competition.test.mjs`

Expected: build passes and the historical 46 focused tests, plus the strengthened assertion, pass.

- [ ] **Step 5: Commit the baseline repair with the existing 14B.1-14B.4 files**

Stage only the eight `src/product-opportunity` Phase 14B files, `src/product-opportunity/index.ts`, and the four existing Phase 14B test files. Confirm the staged name list before committing.

Commit: `feat: complete phase 14b evidence profiles`

---

### Task 2: Add competition disagreements and interpretation

**Files:**
- Modify: `src/product-opportunity/competition-profile.ts`
- Create: `src/product-opportunity/competition-interpretation.ts`
- Modify: `src/product-opportunity/index.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/product-opportunity-competition.test.mjs`
- Create: `tests/unit/product-opportunity-competition-interpretation.test.mjs`

**Interfaces:**
- Consumes: `CompetitionProfile`, including current verified snapshots and sampled-competitor metrics.
- Produces: `CompetitionSourceDisagreement`, `CompetitionSufficiency`, `CompetitionInterpretation`, and `interpretCompetitionProfile(profile: CompetitionProfile): CompetitionInterpretation`.
- `CompetitionMarketSnapshot` gains `periodStart: string` while preserving `periodEnd: string`.
- `CompetitionProfile.marketEvidence.disagreements` contains comparable-period, independent-source value conflicts without averaging them.

- [ ] **Step 1: Write failing profile tests for explicit periods and disagreements**

Add tests asserting that snapshots preserve `periodStart`, two independent sources with the same signal/unit/geography/period and different values create one disagreement, duplicate observations from one source do not create a cross-source disagreement, and different periods are not compared.

- [ ] **Step 2: Run the focused profile tests and verify red**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-competition.test.mjs`

Expected: FAIL because `periodStart` and `disagreements` do not exist.

- [ ] **Step 3: Implement competition disagreement modeling**

Add `CompetitionSourceDisagreement` in `competition-profile.ts`. Group current verified observations by `[signal, unit, geography, periodStart, periodEnd]`, keep only the latest capture per source, flag groups with two or more sources and two or more distinct values, and sort deterministically. Never average the values.

- [ ] **Step 4: Verify profile tests green**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-competition.test.mjs`

Expected: PASS.

- [ ] **Step 5: Write failing competition-interpretation tests**

Create tests for:

- zero competitors and no current verified observations -> `INSUFFICIENT`;
- a non-empty but fewer-than-five sample -> `PARTIAL`;
- at least five competitors plus a current verified direct-saturation observation -> `SUPPORTED`;
- missing direct-saturation evidence -> `PARTIAL`;
- a material current disagreement -> `PARTIAL` even when every other support condition passes;
- stale and unverified observations produce warnings but not support; and
- safety policies state that sample percentages are not market share and support is not a guarantee.

- [ ] **Step 6: Run interpretation tests and verify red**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-competition-interpretation.test.mjs`

Expected: FAIL because the module/export does not exist.

- [ ] **Step 7: Implement `interpretCompetitionProfile`**

Use the exact classification rules in the approved specification. Return deduplicated reasons, warnings, and next actions plus evidence counts; do not introduce an attractiveness score or saturation threshold.

- [ ] **Step 8: Export and verify competition interpretation**

Export the function and types from both product-opportunity and root indexes.

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-competition.test.mjs tests/unit/product-opportunity-competition-interpretation.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit**

Commit: `feat: interpret competition evidence sufficiency`

---

### Task 3: Combine demand and competition into market validation

**Files:**
- Create: `src/product-opportunity/market-validation.ts`
- Modify: `src/product-opportunity/index.ts`
- Modify: `src/index.ts`
- Create: `tests/unit/product-opportunity-market-validation.test.mjs`

**Interfaces:**
- Consumes: `DemandInterpretation` and `CompetitionInterpretation` for the same candidate.
- Produces: `MarketValidationStatus = "READY_FOR_COMMERCIAL_REVIEW" | "PARTIAL_EVIDENCE" | "INSUFFICIENT_EVIDENCE"`.
- Produces: `validateMarketEvidence(demand: DemandInterpretation, competition: CompetitionInterpretation): MarketValidation`.

- [ ] **Step 1: Write the failing market-validation matrix**

Test all nine demand/competition sufficiency combinations. Assert that only `SUPPORTED + SUPPORTED` is ready, any combination containing `INSUFFICIENT` is insufficient, and every remaining combination is partial. Add candidate-ID mismatch and policy tests.

- [ ] **Step 2: Run tests and verify red**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-market-validation.test.mjs`

Expected: FAIL because the module/export does not exist.

- [ ] **Step 3: Implement `validateMarketEvidence`**

Return the underlying interpretations, deterministic deduplicated reasons/warnings/actions, and literal safety policies `readyMeansCommercialReviewNotLaunch: true`, `noDemandGuarantee: true`, `noMarketShareInference: true`, and `noOpaqueMarketScore: true`.

- [ ] **Step 4: Export and verify**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-demand-interpretation.test.mjs tests/unit/product-opportunity-competition-interpretation.test.mjs tests/unit/product-opportunity-market-validation.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: combine market evidence validation`

---

### Task 4: Add the explicit market-validation decision gate

**Files:**
- Modify: `src/product-opportunity/types.ts`
- Modify: `src/product-opportunity/decision.ts`
- Modify: `src/product-opportunity/report.ts`
- Modify: `tests/unit/product-opportunity-decision.test.mjs`
- Modify: `tests/unit/product-opportunity-report.test.mjs`

**Interfaces:**
- `ProductOpportunityInput` gains optional `marketValidation: Readonly<{ status: MarketValidationStatus; demandSufficiency: DemandSufficiency; competitionSufficiency: CompetitionSufficiency }>`. Absence selects the legacy 1.0 path; the canonical pipeline always supplies it.
- `OpportunityGateCode` gains `MARKET_VALIDATION`.
- `ProductOpportunityDecision.contractVersion` becomes `"1.0.0" | "1.1.0"`: legacy input remains 1.0.0, evidence-backed input returns 1.1.0.
- In 1.1 mode, `MARKET_VALIDATION` replaces the legacy `DEMAND_VERIFIED` and `COMPETITOR_SAMPLE` gates; all other gates remain unchanged.

- [ ] **Step 1: Write failing decision tests for the 1.1 contract**

Add tests proving ready market evidence passes, partial and insufficient statuses hold, legacy input still returns the unchanged 1.0 gate set, ready market evidence cannot override negative economics, and market status cannot override supplier/evidence conflicts or unsupported claims.

- [ ] **Step 2: Run tests and verify red**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-decision.test.mjs`

Expected: FAIL because market validation and contract 1.1 do not exist.

- [ ] **Step 3: Implement the market-validation gate and version selection**

Validate the status and underlying sufficiency values. Emit `PASS` only for ready, otherwise `HOLD`. Preserve `REJECT` precedence from economics and preserve legacy behavior when `marketValidation` is absent.

- [ ] **Step 4: Write failing report tests for 1.1 evidence**

Assert that reports expose market-validation status and both sufficiency classifications, include the market gate in positive/blocking reasons, and recommend evidence collection for partial/insufficient results without claiming launch readiness.

- [ ] **Step 5: Implement report support and verify**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-decision.test.mjs tests/unit/product-opportunity-report.test.mjs`

Expected: PASS for both legacy 1.0 and evidence-backed 1.1 cases.

- [ ] **Step 6: Commit**

Commit: `feat: gate opportunities on market evidence`

---

### Task 5: Build the canonical evidence-backed opportunity pipeline

**Files:**
- Modify: `src/product-opportunity/research-adapter.ts`
- Create: `src/product-opportunity/evidence-pipeline.ts`
- Modify: `src/product-opportunity/index.ts`
- Modify: `src/index.ts`
- Modify: `tests/integration/product-opportunity-research-adapter.test.mjs`
- Create: `tests/integration/product-opportunity-evidence-pipeline.test.mjs`

**Interfaces:**
- `ProductOpportunityEvidencePipelineContext` contains `supplier`, `verifiedSourceIds`, `criticalEvidenceConflictCount`, and `unsupportedClaimCount`; it contains no caller-supplied demand, competition classification, or market conclusion.
- `runProductOpportunityEvidencePipeline(project, analysis, demandObservations, competitionObservations, asOf, context): ProductOpportunityEvidencePipelineResult` returns both profiles, both interpretations, market validation, normalized decision input, decision, and report.
- The canonical pipeline treats `project.competitors` as the Research Project's curated comparable set and passes all of their IDs to the legacy adapter internally; callers cannot supply a second, conflicting comparable subset.

- [ ] **Step 1: Write failing canonical-pipeline integration tests**

Cover:

- a strong case with supported demand and competition plus all other gates -> `VALIDATE`, contract 1.1;
- an ambiguous case -> `HOLD`;
- a supported-market but negative-economics case -> `REJECT`;
- stale, unverified, conflicting, duplicate, and unavailable evidence;
- unknown observation source IDs and candidate mismatches fail closed;
- the context type and runtime API contain no `demand`, `demandVerified`, `normalizedTrendIndex`, `trendGrowthPercent`, or market-status override;
- a relative trend series remains `INDEX_0_100`, appears only as relative evidence, and never populates absolute search volume;
- multiple independent demand series are retained rather than averaged;
- supplier conflicts, provenance gaps, and unsupported claims independently prevent `VALIDATE`.

- [ ] **Step 2: Run integration tests and verify red**

Run: `npm.cmd run build`

Run: `node --test tests/integration/product-opportunity-evidence-pipeline.test.mjs`

Expected: FAIL because the canonical pipeline does not exist.

- [ ] **Step 3: Implement `runProductOpportunityEvidencePipeline`**

Build and interpret both profiles, validate market evidence, and call `buildProductOpportunityInput` with a bridge derived entirely from those evidence outputs. Internally pass every `project.competitors` ID as the curated comparable set, then attach the 1.1 market-validation evidence, call the existing evaluator and report builder, and return every intermediate artifact. Validate that every observation source ID exists in `project.sources`; demand observation sources must map to `demand_data`. Use `seasonality: "UNKNOWN"` until a dedicated evidence model exists. If exactly one usable relative-search series exists, expose its latest index as relative interest; otherwise leave the legacy scalar null. Never manufacture absolute search volume or cross-source averages. Reject context objects containing forbidden conclusion keys such as `demand`, `demandVerified`, `normalizedTrendIndex`, `trendGrowthPercent`, `marketValidation`, or `marketValidationStatus`.

- [ ] **Step 4: Mark the manual bridge as legacy and export the canonical pipeline**

Add JSDoc deprecation/canonical-path guidance without removing the old export. Export all new types/functions from both indexes.

- [ ] **Step 5: Verify all Product Opportunity tests**

Run: `npm.cmd run build`

Run: `node --test tests/unit/product-opportunity-*.test.mjs tests/integration/product-opportunity-*.test.mjs`

Expected: all Product Opportunity tests pass with no warnings or unhandled errors.

- [ ] **Step 6: Commit**

Commit: `feat: run opportunities from market evidence`

---

### Task 6: Document and fully verify Phase 14B

**Files:**
- Modify: `docs/CODE-TOUR.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `PROJECT-STATE.json`
- Modify: `README.md`
- Modify: `CONTINUE-LATER.md`
- Modify: `tests/unit/repository-governance.test.mjs` only if the established consistency contract requires a new assertion.

**Interfaces:**
- Consumes: final verified implementation and actual test output.
- Produces: consistent project status, test count, safety statement, and continuation instructions.

- [ ] **Step 1: Update architecture and learning documentation**

Explain the evidence flow in business, technical, and interview terms: observations -> profiles -> interpretations -> market validation -> independent opportunity gates. State why readiness is not launch approval and why legacy manual demand input is not canonical.

- [ ] **Step 2: Run pre-documentation full verification**

Run: `npm.cmd run verify`

Expected: PASS. Record the actual total test count and any non-test verification gates. Do not estimate it.

- [ ] **Step 3: Update canonical state files together**

Set the same actual deterministic test count and Phase 14B status in `PROJECT-STATE.json`, `README.md`, and `CONTINUE-LATER.md`. Preserve historical v0.9.3/n8n evidence as historical evidence rather than rewriting it as a current live test.

- [ ] **Step 4: Run the final verification suite**

Run: `npm.cmd run verify`

Expected: PASS with the documented count and governance checks consistent.

- [ ] **Step 5: Inspect final scope and safety state**

Run: `git status --short`

Run: `git diff --check`

Run: `git diff --stat 67e6a76..HEAD`

Confirm no credentials, runtime receipts, generated build output, external-write enablement, or unrelated project files are present.

- [ ] **Step 6: Commit**

Commit: `docs: complete phase 14b verification`

- [ ] **Step 7: Stop at the next architectural boundary**

Report Phase 14B evidence and begin a separate evidence-based design cycle for the post-14B ecommerce-management audit. Do not mix persistence, API, UI, benchmark, deployment, or PR work into this Phase 14B implementation commit.
