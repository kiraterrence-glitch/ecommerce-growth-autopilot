# Continue here — v0.9.3 presentation closeout

## Current state

- Project version: v0.9.3
- Deterministic verification target: 66 tests, 5 n8n exports.
- Local n8n Community Edition 2.39.8 is installed on the Windows machine and the owner account setup is complete.
- The actual local n8n engine proof **passed** on Windows.
- `release:preflight` **passed** against the saved runtime receipt.
- Fresh engine-proof campaign: `036cec47-295c-4ef6-b423-1719ef953f4b`.
- n8n Cloud executions used by this project: **0**.
- External writes: **false**.
- Live publishing: **false**.
- v0.9.0 exposed the missing workflow ID issue; v0.9.1 fixed it.
- v0.9.2 exposed Windows n8n CLI quoting behavior; v0.9.3 fixed it and completed the real engine proof.

## Do not redo

Do not rebuild product research, Product Brain, campaign generation, quality gates, rendering, dashboard, approvals, delivery boundaries, Postman, deterministic n8n contract tests, or the local n8n engine proof. Those phases are already verified.

## Remaining work only

1. Refresh the portfolio entry with the six committed proof images captured from the real local dashboard and runtime receipt.
2. Optionally capture the n8n canvas or terminal verification later if a presentation specifically benefits from them; do not fabricate either view.

The runtime receipt remains local under `.runtime/n8n-engine-proof.json` and is intentionally excluded from Git.
