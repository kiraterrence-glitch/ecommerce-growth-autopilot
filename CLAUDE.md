# Claude Code project instructions

## Objective
Build a portfolio-grade Ecom Growth Autopilot for Shopify/Amazon sellers using local-first development and n8n only as orchestration.

## Hard rules
- Read `PROJECT-STATE.json` and `docs/WORK-HANDOFF.md` before planning or changing architecture.
- Keep business logic in testable TypeScript; n8n orchestrates it.
- Every feature needs verification for critical behavior.
- No live publishing or ad spend by default.
- Never commit credentials, customer PII, or production exports.
- AI output must pass schema, grounding, and marketing-quality validation.
- Do not expose internal prompt text or unresolved placeholders in portfolio exports.
- Use deterministic mocks in normal tests; live Ollama belongs in explicit smoke/demo commands.
- Run `npm run verify` before claiming a change is complete.
- If a gate fails, report the failure instead of weakening the gate.

## Completed
- Phase 0: engineering foundation, CI, secrets, Postman, n8n export checks.
- Phase 1: product schema, normalization, identity, duplicate detection, CSV import.
- Phase 2: Ollama Product Brain with repair, grounding, Windows diagnostics, and real qwen3-vl verification.
- Phase 3: draft Meta, email, Shopify, Google Ads, and Amazon generators.
- Phase 4A: static SVG drafts, video storyboard, approvals, optimization rules.
- Phase 4B: marketing-quality gate and real-Ollama campaign demo path.
- Phase 5: local approval dashboard plus real PNG/MP4 rendering.
- Phase 6 baseline: evidence-backed Product Research Intelligence, research quality gate, unit economics, research-aware Product Brain, Postman and local n8n research flow.
- Phase 7/8: append-only project history, persisted approvals, local mock/draft delivery adapters, live writes disabled.
- Phase 9 baseline: dashboard history restore, approval hydration, and local draft-delivery panel.
- v0.8 portfolio proof: visible run timeline, safety demonstrations, learning/code-tour view, and full local n8n workflow export.
- v0.9 local n8n hardening: exact workflow contract replay, stable n8n 2.39.8 workflow IDs, native-Windows localhost targets, and a dedicated manual-trigger CLI engine-proof workflow with a persisted safety receipt.

## Current phase
End-to-end portfolio proof and deterministic n8n contract replay are implemented. v0.8.0 passed the real Windows/Ollama gate; v0.8.1 fixed approval/refresh UX; v0.9.1 fixed the n8n 2.39.8 top-level workflow-ID import requirement; v0.9.2 added a one-command actual-engine proof; v0.9.3 fixed Windows cmd argument quoting and then passed the real local n8n 2.39.8 engine proof plus release preflight. Read `PROJECT-STATE.json`, `CONTINUE-LATER.md`, and `docs/WORK-HANDOFF.md` first. Do not redo completed phases. Remaining work is GitHub/screenshots/portfolio presentation only.
