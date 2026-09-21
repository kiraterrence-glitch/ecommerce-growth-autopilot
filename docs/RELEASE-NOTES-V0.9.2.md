# Release notes — v0.9.2

## Summary

v0.9.2 turns the last local n8n runtime check into a one-command proof and prepares the repository for portfolio release.

## Added

- dedicated inactive `Ecom Engine Proof - CLI Local` n8n workflow;
- isolated deterministic proof API on `127.0.0.1:3011`;
- fail-closed `/proof/assert-local-safety` endpoint;
- persisted `/proof/latest` event path;
- `.runtime/n8n-engine-proof.json` receipt capture;
- `engine-proof-local-n8n-windows.cmd` one-command runner;
- `portfolio-release-preflight-windows.cmd` release gate;
- deterministic `open-dashboard-safe-windows.cmd` presentation launcher;
- portfolio case study, recruiter demo script, GitHub publishing checklist, project inventory, security notes, and MIT license.

## Hardened

- n8n workflow validator allows only the normal local API port 3001 and isolated proof port 3011;
- stable n8n 2.39.8 workflow IDs remain mandatory and unique;
- proof history uses a unique run ID so a stale prior receipt cannot satisfy a new run;
- the proof assertion requires all pre-approval core stages to be `PASS`, deterministic mock provider metadata, disabled external writes/live publishing, human approval `WAITING`, and delivery `BLOCKED`;
- `setup` skips network work when project-local TypeScript 5.8.3 is already installed;
- Windows diagnostics keep deterministic verification running when a live Ollama generation only times out; strict behavior remains opt-in with `STRICT_OLLAMA_SMOKE=true`.

## Deterministic verification

- 63 tests
- 63 passed
- 0 failed
- 5 committed n8n workflow exports
- n8n contract replay passed
- research quality passed with expected small-sample warnings
- marketing quality passed
- package, handoff, dependency, format, lint, type, secret, Postman, and build gates passed

## Still requires the Windows machine

The actual local n8n engine execution is intentionally not claimed from the build sandbox. Run:

```text
engine-proof-local-n8n-windows.cmd
```

Only after it prints `N8N ENGINE PROOF PASSED` should the runtime be described as executed end to end inside local n8n Community Edition.
