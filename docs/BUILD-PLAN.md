# Build plan

## Completed foundation

### Phase 0 — Engineering verification ✅
Strict TypeScript, deterministic tests, secrets, Postman, n8n export checks, package safety, Windows diagnostics.

### Phase 1 — Product Data Engine ✅
Canonical product schema, normalization, IDs/fingerprints, duplicate detection, CSV import.

### Phase 2 — Product Brain ✅
Mock + Ollama provider, qwen3-vl compatibility, schema validation, one repair attempt, grounding, live Windows smoke verification.

### Phase 3 — Campaign Factory ✅
Meta, lifecycle email, Shopify, Google Ads, Amazon drafts. Draft-only.

### Phase 4 — Creative + Quality ✅
Marketing-quality gate, static creatives, PNG rendering, storyboard, FFmpeg MP4 rendering.

### Phase 5 — Review Workspace ✅ baseline
Local dashboard, research/campaign tabs, approval state machine, publication blocked until approved.

### Phase 6 — Product Research Intelligence ✅ baseline
Source/provenance model, competitor/review intake, deduplication, price/feature/offer analysis, review intelligence, unit economics, research-quality gate, research-aware Product Brain, Postman + local n8n flow.

### Phase 7 — Persistent local history ✅ baseline
- append-only project history
- campaign snapshots and version IDs
- saved research analysis runs
- approval persistence across API restarts
- history/readback endpoints

### Phase 8 — Safe platform adapter boundary ✅ baseline
- Meta, Shopify, Google Ads, and email channel adapters
- local `mock` and `draft` modes only
- explicit runtime rejection of `live`
- human approval gate before channel delivery
- `externalWrite: false` contract on every baseline adapter result

## Next priorities

### Phase 9 — Review workspace persistence UX ✅ baseline
- saved campaign list and restore
- persisted approval hydration
- local draft-delivery panel
- inline dashboard script syntax gate
- optional version-diff UX remains a polish item, not a blocker

### Phase 10A — End-to-end portfolio proof ✅ baseline
- Run tab with persisted timeline status
- provider/model visibility
- research/marketing/creative stage visibility
- human approval progress
- approval-gate and live-mode safety proofs
- Learn tab plus code-tour documentation
- full local n8n workflow export (research → campaign → demo status)

### Phase 10B — local n8n runtime proof 🟡 one Windows execution remaining
- ✅ exact committed workflow graph/expressions validated
- ✅ deterministic research → campaign → demo-status contract replay against the real local API
- ✅ stable n8n 2.39.8 import IDs after the first real CLI import exposed the missing-ID defect
- ✅ dedicated inactive manual-trigger engine-proof workflow
- ✅ fail-closed local safety assertion endpoint
- ✅ one-command Windows runner and persisted proof-receipt capture
- ⬜ run `finish-portfolio-proof-windows.cmd` once on the actual Windows/n8n installation (engine proof + release preflight)
- ⬜ preserve `.runtime/n8n-engine-proof.json` and one workflow-canvas screenshot
- preserve zero n8n Cloud executions

### Phase 11 — portfolio/GitHub hardening
- GitHub repository + release notes
- architecture diagram
- recruiter walkthrough
- screenshots/video
- clean-machine setup proof

### Phase 12 — optional authenticated draft integrations
Only with user-owned test/sandbox accounts and explicit approval. Keep activation/spend/storefront publishing disabled unless separately designed and verified.

## n8n execution budget

Routine work remains local. Current recorded n8n Cloud executions used by this project: **0**. Cloud is reserved only for a final proof run if it adds portfolio value, with a target well under 30 executions overall.
