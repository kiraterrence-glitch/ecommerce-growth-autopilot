# n8n workflow exports

Workflow JSON exports are committed only after their logic is covered by local tests. Portfolio workflows must stay inactive in git, contain no credential references, and keep business logic out of n8n Code/Function nodes.

## Local API base

The committed exports use the Windows-native local API base:

```text
http://127.0.0.1:3001
```

This is the recommended portfolio setup when n8n Community Edition is running directly on the same Windows machine.

If n8n is later run inside Docker, replace `http://127.0.0.1:3001` in HTTP Request nodes with:

```text
http://host.docker.internal:3001
```

Do not point committed portfolio workflows at n8n Cloud or live merchant endpoints.

## `product-intake-to-brain.local.json`

1. receives a product on `POST /webhook/ecom-product-intake`
2. forwards the body to the verified local TypeScript service
3. returns the Product Brain result

## `product-intake-to-campaign-kit.local.json`

Research-aware campaign orchestration. It forwards either a direct product payload or the backward-compatible wrapper `{ "product": ..., "research": ... }` to `/campaign-kit`. Research is quality-gated before it is allowed to influence Product Brain.

## `research-intake-to-analysis.local.json`

Evidence-only product research orchestration. It forwards a structured research project to `/research/analyze` and returns evidence-backed price/feature/review/economics findings plus the research-quality report.

## `full-portfolio-demo.local.json`

Recruiter-facing end-to-end proof:

```text
Webhook
  ↓
POST /research/analyze
  ↓
POST /campaign-kit
  ↓
GET /demo/status
  ↓
Return proof
```

It contains no credentials, no Code nodes, no live publishers, and is inactive by default.

Before importing it into n8n, run:

```text
npm run n8n:contract
```

After it is active in local/community n8n, run:

```text
local-n8n-proof-windows.cmd
```
