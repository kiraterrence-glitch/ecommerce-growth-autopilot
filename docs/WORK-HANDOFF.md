# Work handoff — v0.9.3

Read `PROJECT-STATE.json` and `CONTINUE-LATER.md` first. Do not redo verified phases.

## Base of record

v0.8.0 passed the real Windows/Ollama gate with `qwen3-vl:4b`. v0.8.1 fixed the dashboard approval/refresh UX discovered in the browser trial. v0.9.0 added exact n8n workflow-contract replay. A real local n8n 2.39.8 install was then completed on the user's Windows machine and the local owner account was created.

The first real CLI import exposed `SQLITE_CONSTRAINT: NOT NULL constraint failed: workflow_entity.id`. v0.9.1 fixed that with stable top-level workflow IDs and regression validation. v0.9.2 went further by eliminating the remaining manual activation/webhook steps from the actual engine proof.

## What v0.9.3 changes

- `n8n/workflows/engine-proof-cli.local.json`: inactive manual-trigger proof workflow with no credentials and no Code/Function nodes.
- Isolated deterministic proof API port `127.0.0.1:3011`, separate from the normal dashboard API on 3001.
- `POST /proof/assert-local-safety`: fail-closed endpoint that rejects missing campaign identity, enabled external writes, enabled live publishing, or bypassed approval/delivery gates.
- `GET /proof/latest`: read-only access to the latest persisted local n8n proof event.
- `scripts/run-n8n-engine-proof.mjs`: imports and executes the proof through the actual local n8n CLI engine.
- `scripts/capture-n8n-engine-proof.mjs`: validates and stores `.runtime/n8n-engine-proof.json`.
- `engine-proof-local-n8n-windows.cmd`: lower-level Windows engine-proof wrapper.
- `finish-portfolio-proof-windows.cmd`: preferred continuation command; chains engine proof and release preflight.
- Windows diagnostics continue deterministic verification when a live Ollama generation merely times out; strict live-model behavior remains available with `STRICT_OLLAMA_SMOKE=true`.
- GitHub/recruiter materials are prewritten in `docs/PORTFOLIO-CASE-STUDY.md`, `docs/DEMO-SCRIPT.md`, and `docs/GITHUB-PUBLISH.md`.

## Safety invariants

- n8n Cloud executions remain 0.
- committed workflows remain inactive, credential-free, and loopback-only.
- no Code/Function business logic is stored in n8n.
- no live publishing or external writes exist in the portfolio baseline.
- human approval remains mandatory before local draft delivery.
- research, grounding, and marketing quality gates fail closed.
- the engine proof itself runs with deterministic mock AI so Ollama speed cannot hide an orchestration defect.

## Actual Windows state already established

- Node 24.21.0 is installed and has successfully built/tested prior checkpoints.
- Ollama is installed at `127.0.0.1:11434` with `qwen3-vl:4b`.
- Real Ollama Product Brain smoke tests passed on v0.8.0; v0.9.0 later had one 120-second transient generation timeout.
- Local n8n Community Edition 2.39.8 is installed and `where n8n` resolves to the user's global npm directory.
- Local n8n owner-account setup is complete and the editor opened successfully at localhost:5678.
- Do not reinstall n8n, Node, Ollama, or TypeScript globally.

## Actual engine proof complete

The Windows v0.9.3 wrapper completed successfully through local n8n Community Edition 2.39.8 and created `.runtime/n8n-engine-proof.json`. `release:preflight` then validated the receipt. Verified safety state: zero n8n Cloud executions, deterministic mock mode for the engine proof, green core stages, `externalWrites=false`, `livePublishing=false`, and intact approval/delivery gates.

Do not rerun or redesign the engine proof unless a later code change invalidates it.

## After engine proof

No new product/channel features should be added before portfolio release. Finish only:

1. dashboard/n8n/verification screenshots;
2. optional short demo recording;
3. GitHub repository creation/push;
4. README screenshot links/release notes;
5. portfolio case-study publication.

Use `docs/GITHUB-PUBLISH.md` and `docs/DEMO-SCRIPT.md`; do not reconstruct those materials.

### v0.9.3 runtime hardening

The Windows runner now leaves simple CLI flags unquoted and executes import/execute in a fresh per-run `N8N_USER_FOLDER`. Do not revert to the v0.9.2 quoting behavior or reuse the user browser/server profile for the engine proof.
