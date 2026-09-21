# Code tour — how the system works

This is the learning map for the project. Read it before opening individual files.

## 1. Product and research intake

**Business view:** turn seller product facts and competitor/review evidence into a trustworthy input.

**Technical view:** `src/validation/product.ts` validates the product; `src/product-engine/*` normalizes it; `src/research/*` validates provenance, analyzes observed prices/features/reviews, calculates seller-provided economics, and rejects unsupported demand claims.

**Interview view:** “I normalize seller data and evidence before AI sees it. Research conclusions keep source IDs, and the system does not invent demand or sales estimates.”

## 2. Product Brain

**Business view:** convert trusted inputs into audiences, pains, benefits, objections, buying triggers, and campaign angles.

**Technical view:** `src/ai/*` provides Mock/Ollama boundaries. `src/product-brain/service.ts` requests structured output, validates it, checks grounding, and allows one controlled repair attempt.

**Interview view:** “The model is not trusted by default. AI output must pass schema and grounding checks before downstream generators can use it.”

## 3. Campaign factory

**Business view:** use one strategy to produce channel-specific drafts instead of rewriting the same strategy manually.

**Technical view:** `src/campaign/*` contains deterministic Meta, email, Shopify, Google Ads, and Amazon builders. They consume the validated Product Brain rather than calling AI independently.

**Interview view:** “The AI layer creates strategy; deterministic channel builders enforce platform and lifecycle constraints.”

## 4. Quality gates

**Business view:** stop bad-but-valid marketing from escaping.

**Technical view:** `src/research/quality.ts` checks evidence quality; `src/quality/marketing.ts` checks prompt leakage, unresolved placeholders, CTA fit, content completeness, and channel rules.

**Interview view:** “Schema validation answers ‘is this shaped correctly?’ while marketing quality answers ‘is this safe and usable?’”

## 5. Creatives and media

**Business view:** turn the approved campaign strategy into visible portfolio assets.

**Technical view:** `src/creatives/*` builds static/video plans, `src/rendering/*` emits standalone HTML/SVG, and rendering scripts create PNG/MP4 files using local tools.

**Interview view:** “Paid image/video APIs are optional; the portfolio baseline can render real media locally.”

## 6. Human approval and delivery

**Business view:** keep a person responsible for what can leave the system.

**Technical view:** `src/approval/workflow.ts` enforces `DRAFT → IN_REVIEW → APPROVED/REJECTED`. `src/publishing/*` refuses delivery unless every required channel asset is approved. Baseline adapters support only local `mock`/`draft` modes and always return `externalWrite: false`.

**Interview view:** “Automation prepares work, but humans approve it. Live publishing is deliberately outside the portfolio baseline.”

## 7. History and demo timeline

**Business view:** show a recruiter what happened, in what order, and what is still blocked.

**Technical view:** `scripts/project-history-store.mjs` stores append-only JSONL history. `src/demo/status.ts` derives the visible end-to-end timeline from campaign state, approvals, and local delivery events. `GET /demo/status` exposes it to the dashboard.

**Interview view:** “The UI does not fake progress. It derives status from persisted events and reports PASS, WARNING, WAITING, or BLOCKED.”

## 8. n8n orchestration

**Business view:** coordinate tools without burying core logic in a visual workflow.

**Technical view:** `n8n/workflows/*.json` contains inactive, credential-free HTTP orchestration only. The full demo workflow calls `/research/analyze`, `/campaign-kit`, and `/demo/status`. No Code/Function nodes are allowed by `scripts/check-n8n.mjs`.

**Interview view:** “n8n orchestrates tested services; the business rules stay in TypeScript where they can be versioned and unit tested.”

## 9. Verification

Run `npm run verify`. Normal verification is deterministic and does not require Ollama or n8n Cloud. `start-here-windows.cmd` adds the real local Ollama smoke test on the user's machine.

## 10. Actual local n8n engine proof

**Business view:** prove the visual orchestration really executes without exposing a live publisher or spending Cloud executions.

**Technical view:** `n8n/workflows/engine-proof-cli.local.json` starts with a Manual Trigger, uses the same local research/campaign/status APIs on isolated port 3011, and ends at `POST /proof/assert-local-safety`. `scripts/run-n8n-engine-proof.mjs` imports and executes that workflow through the installed n8n CLI. The assertion endpoint persists a successful `n8n.engine_proof` event only when all core stages pass and the safety/approval gates remain intact. `scripts/capture-n8n-engine-proof.mjs` writes the receipt.

**Interview view:** “I did not stop at validating the n8n JSON. I built a separate local engine proof that executes the workflow inside n8n and fails if the orchestration enables external writes, enables live publishing, skips core stages, or bypasses human approval.”

## 11. Release proof

**Business view:** prevent a portfolio claim from getting ahead of the evidence.

**Technical view:** `scripts/release-preflight.mjs` requires the saved actual-engine receipt before the project can be treated as release-ready. `portfolio-release-preflight-windows.cmd` combines deterministic verification with that receipt check.

**Interview view:** “The repository distinguishes code verification, model smoke tests, and real orchestration-runtime proof. Each claim has a separate gate.”
