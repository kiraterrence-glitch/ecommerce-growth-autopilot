# Project inventory — where to look first

Use this file to avoid rediscovering the repository structure.

## Core TypeScript

| Area | Main files | Responsibility |
|---|---|---|
| Product contract | `src/domain/product.ts`, `src/validation/product.ts` | Canonical product shape and runtime validation |
| Product engine | `src/product-engine/*` | CSV intake, normalization, identity/fingerprints, duplicate registry |
| AI providers | `src/ai/*` | Vendor-neutral provider contract, deterministic mock, local Ollama |
| Product Brain | `src/product-brain/*` | Structured generation, validation, one repair attempt, grounding |
| Product research | `src/research/*` | Evidence normalization, competitor/review analysis, economics, quality, review AI |
| Campaign factory | `src/campaign/*` | Meta, email, Shopify, Google Ads, Amazon drafts |
| Marketing quality | `src/quality/marketing.ts` | Prompt/placeholder leakage, CTA/channel/completeness checks |
| Creatives | `src/creatives/*`, `src/rendering/html.ts` | Static/video plans and renderable HTML |
| Approval | `src/approval/workflow.ts` | Fail-closed approval state machine |
| Safe delivery | `src/publishing/*` | Channel plans and mock/draft-only adapters |
| Demo state | `src/demo/status.ts` | PASS/WARNING/WAITING/BLOCKED timeline |
| Dashboard | `src/dashboard/page.ts` | Standalone local review UI |
| n8n boundary | `src/orchestration/local-n8n.ts` | Loopback URL validation and webhook URL construction |
| Public surface | `src/index.ts` | Explicit exports used by scripts/tests |

## Local runtime scripts

| File | Purpose |
|---|---|
| `scripts/local-api.mjs` | Local HTTP API/dashboard; history, approvals, delivery, proof endpoints |
| `scripts/project-history-store.mjs` | Append-only local JSONL project history |
| `scripts/verify.mjs` | Master deterministic verification gate |
| `scripts/n8n-workflow-contract.mjs` | Exact production-style n8n contract replay against the real local API |
| `scripts/run-n8n-engine-proof.mjs` | Actual local n8n CLI engine proof orchestration |
| `scripts/capture-n8n-engine-proof.mjs` | Validates/saves the runtime proof receipt |
| `scripts/release-preflight.mjs` | Blocks portfolio release unless the saved actual engine proof is valid |
| `scripts/diagnose-windows.mjs` | Windows environment/Ollama/verification diagnostics |

## n8n exports

All committed exports are inactive, credential-free, loopback-only, and forbidden from containing Code/Function business logic.

| File | Stable ID | Purpose |
|---|---|---|
| `engine-proof-cli.local.json` | `EcomEngineProof0920` | Manual-trigger actual-engine proof on isolated port 3011 |
| `full-portfolio-demo.local.json` | `EcomFullDemo0901` | Production-style local webhook: research → campaign → timeline |
| `product-intake-to-brain.local.json` | `EcomBrainDemo901` | Product Brain orchestration example |
| `product-intake-to-campaign-kit.local.json` | `EcomCampDemo0901` | Campaign-kit orchestration example |
| `research-intake-to-analysis.local.json` | `EcomRschDemo0901` | Research-analysis orchestration example |

## Tests

- `tests/unit/`: deterministic domain/AI/campaign/quality/dashboard/research tests.
- `tests/integration/local-api.test.mjs`: local API, persistence, approvals, delivery, proof assertion.
- `tests/integration/n8n-full-flow-contract.test.mjs`: production workflow contract shape.
- `tests/integration/n8n-import-compat.test.mjs`: stable top-level workflow IDs.
- `tests/integration/n8n-engine-proof-workflow.test.mjs`: dedicated CLI proof workflow fixture and safety contract.

## Windows entry points

| Command file | Use |
|---|---|
| `finish-portfolio-proof-windows.cmd` | **Preferred next command.** Runs the actual local n8n engine proof, then the release preflight. |
| `engine-proof-local-n8n-windows.cmd` | Lower-level actual local n8n engine proof helper for debugging. |
| `portfolio-release-preflight-windows.cmd` | Run after engine proof before GitHub/release claims. |
| `open-dashboard-safe-windows.cmd` | Reliable deterministic recruiter/screenshot dashboard. |
| `open-dashboard-windows.cmd` | Live Ollama-backed dashboard. |
| `start-here-windows.cmd` | Environment diagnostic + deterministic verification; live Ollama timeout is warning unless strict mode enabled. |
| `local-n8n-proof-windows.cmd` | Optional production-style local webhook proof. |

## Continuity files

Read in this order:

1. `PROJECT-STATE.json`
2. `CONTINUE-LATER.md`
3. `docs/WORK-HANDOFF.md`
4. `docs/PROJECT-INVENTORY.md`
5. `docs/V0.9.3-REPORT.md`
6. `docs/GITHUB-PUBLISH.md`

Do not infer completion from file presence. `PROJECT-STATE.json` records both deterministic verification and the completed actual Windows n8n 2.39.8 engine proof.
