# Local verification and debugging ladder

The project is designed so failures can be isolated before n8n Cloud is involved. Follow the ladder in order; do not skip directly to the workflow layer.

## 1. Static project verification

```bash
npm run verify
```

This must pass before a feature is considered demo-ready. It checks formatting, lint rules, TypeScript, secret scanning, n8n exports, Postman assets, the clean build, and automated tests.

## 2. Environment doctor

```bash
npm run doctor
```

This checks the project files and reports Ollama as optional when the repository is in mock mode.

For a hard Ollama gate:

```bash
npm run doctor:ollama
```

This fails if `http://127.0.0.1:11434` is unreachable or the configured model is missing.

## 3. Direct Ollama health

```bash
npm run ollama:check
```

Expected on Sean's current machine: the model list contains `qwen3-vl:4b`.

If this fails, debug Ollama before debugging the application.

## 4. Direct Product Brain smoke test

```bash
npm run ollama:smoke
```

This sends the validated fixture product directly through the real Ollama provider and Product Brain validator. It proves more than `/api/tags`: the model must actually generate parseable, contract-valid, grounded JSON.

## 5. Start the local API using Ollama

```bash
npm run dev:ollama
```

Leave this terminal open. The API defaults to `http://127.0.0.1:3001`.

In a second terminal:

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/ready
```

`/health` proves the process is alive. `/ready` proves the configured AI dependency is usable.

## 6. Postman isolation tests

Import both files from `postman/`:

- `Ecom Growth Autopilot.postman_collection.json`
- `Local.postman_environment.json`

Run the collection in order:

1. `Ollama Models`
2. `Ollama JSON Smoke`
3. `Health`
4. `Readiness`
5. `Generate Product Brain`
6. `Reject Invalid Product`

This sequence isolates the failure layer. If the first two fail, the problem is Ollama. If they pass and `Readiness` fails, the application configuration is wrong. If readiness passes but Product Brain fails, inspect model output/validation. If the API passes but n8n fails later, debug only the orchestration boundary.

## 7. Local n8n only

Import `n8n/workflows/product-intake-to-brain.local.json` into a local n8n instance only after steps 1-6 pass.

The workflow must remain inactive until imported and inspected. Do not use n8n Cloud for development testing.

## Stable error codes

The local API returns stable machine-readable errors:

- `invalid_json` — request body is not valid JSON
- `invalid_product` — seller input failed the canonical product contract
- `ai_output_invalid` — AI output failed Product Brain validation/grounding after the controlled repair attempt
- `ai_provider_error` — Ollama transport/response failure
- `not_found` — unknown route
- `internal_error` — unexpected application failure

Every API response also includes `x-request-id` and a matching `requestId` field so a failing request can be traced through logs.

## Debugging rule

Fix the lowest failing layer first. Do not edit n8n when Ollama is failing, and do not edit AI prompts when seller input validation is failing.

## qwen3-vl returns JSON in `thinking` with empty `content`

Observed with `qwen3-vl:4b` on Ollama: a JSON-mode `/api/chat` request can return an empty
`message.content` while placing the requested JSON object in `message.thinking`, even when
`think:false` is sent.

The provider handles this as a compatibility fallback only:

1. Prefer `message.content` (chat API) or `response` (generate-style payloads).
2. Only if those are empty, inspect `message.thinking` or top-level `thinking`.
3. The fallback must parse as JSON.
4. Parsed output must still pass Product Brain schema validation and grounding checks.

This preserves fail-closed behavior while supporting the model actually installed on the local
Windows development machine.


## Windows: TypeScript still missing after npm install

If `deps:check` reports that `node_modules/.bin/tsc.cmd` is missing, the package lock may contain a machine-specific link generated on another OS. v0.3.2 detects and removes that contaminated lock automatically during setup, then installs TypeScript 5.8.3 locally. Never solve this by installing TypeScript globally.
