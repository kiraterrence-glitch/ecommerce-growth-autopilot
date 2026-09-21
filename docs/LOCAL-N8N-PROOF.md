# Local n8n end-to-end proof

This proof is intentionally local. It does not use n8n Cloud and it does not perform any external platform write.

## Preferred v0.9.3 proof — one command

After local n8n Community Edition is installed, run from the project root:

```text
engine-proof-local-n8n-windows.cmd
```

This path does **not** require workflow activation or a production webhook. It imports an inactive manual-trigger workflow and executes it directly through the local n8n CLI engine.

The runner starts an isolated deterministic API on:

```text
http://127.0.0.1:3011
```

so the proof is independent of Ollama speed and does not collide with the normal dashboard API on port 3001.

### Engine flow

```text
Manual Trigger
        ↓
Verify Research Evidence
POST http://127.0.0.1:3011/research/analyze
        ↓
Generate Verified Campaign
POST http://127.0.0.1:3011/campaign-kit
        ↓
Read Demo Timeline
GET http://127.0.0.1:3011/demo/status?campaignId=...
        ↓
Assert Local Safety
POST http://127.0.0.1:3011/proof/assert-local-safety
```

The final endpoint fails with non-2xx unless:

```text
campaignId exists
externalWrites = false
livePublishing = false
human approval = WAITING
local delivery = BLOCKED
```

Successful execution persists a proof event and writes:

```text
.runtime/n8n-engine-proof.json
```

Expected final marker:

```text
N8N ENGINE PROOF PASSED
```

That is the preferred evidence for the actual engine-level gate.

## What normal verification already proves

`npm run n8n:contract` loads the exact committed `full-portfolio-demo.local.json` export, verifies its node graph/expressions, starts the real local API on an isolated port, and replays the research → campaign → demo-status contract end to end.

`npm run verify` also validates every committed workflow as inactive, credential-free, local-only, and free of Code/Function business logic.

Those deterministic gates catch orchestration drift before n8n is involved, but they are not presented as a substitute for the one actual engine execution above.

## Production-style local webhook proof — optional

The original webhook flow remains available for visual demonstration after the CLI engine proof is green.

The committed workflow uses:

```text
http://127.0.0.1:3001
```

for the normal Ecom API.

Sequence:

1. Start `npm run dev:api`.
2. Start local n8n with `start-local-n8n-windows.cmd`.
3. Import `full-portfolio-demo.local.json` using `import-local-n8n-workflow-windows.cmd` or the local UI.
4. Activate **Ecom Full Portfolio Demo - Local** only in the local instance.
5. Run `local-n8n-proof-windows.cmd`.

The production-style flow is:

```text
POST /webhook/ecom-full-demo
        ↓
POST /research/analyze
        ↓
POST /campaign-kit
        ↓
GET /demo/status?campaignId=...
        ↓
Return Portfolio Proof
```

The expected initial state still has human approval `WAITING` and local delivery `BLOCKED`.

## Safety boundaries

- All n8n proof URLs are loopback-only.
- Committed workflows contain no credentials.
- Committed workflows contain no Code/Function nodes.
- Business logic remains in the TypeScript API.
- The dedicated engine proof uses deterministic mock AI rather than a paid API.
- No Meta, Shopify, Google Ads, Amazon, or email external write is performed.
- The proof consumes zero n8n Cloud executions.

## Troubleshooting

If `engine-proof-local-n8n-windows.cmd` fails, preserve the final n8n/error section. Do not reinstall n8n or rebuild earlier phases unless the output specifically proves that is necessary.

If the optional webhook proof returns 404, confirm the local workflow is activated. For test-webhook mode, set `N8N_TEST_WEBHOOK=true` and put the workflow in Listen for Test Event mode.
