# GitHub publishing checklist

Do this only after deterministic verification is green and `portfolio-release-preflight-windows.cmd` passes. That release preflight requires the saved actual local n8n engine-proof receipt.

## Repository hygiene

- keep `.env`, `.runtime/`, rendered temporary media, and `node_modules/` out of Git;
- never commit local n8n owner credentials or cookies;
- never commit Meta/Google/Shopify/Amazon credentials;
- run `npm run secrets:check` immediately before push;
- run `npm run verify` immediately before the release commit.

## Suggested repository description

> Local-first eCommerce growth automation: evidence-backed product research, Ollama Product Brain, multi-channel campaign drafts, quality gates, human approval, and safe n8n orchestration.

## Suggested topics

`typescript`, `n8n`, `ollama`, `ecommerce`, `automation`, `ai-agents`, `shopify`, `marketing-automation`, `product-research`, `portfolio`

## Screenshots to capture

1. Dashboard Run timeline.
2. Research evidence and unit economics.
3. Product Brain/provider metadata.
4. Campaign/channel tabs.
5. Human-approval / blocked-delivery state.
6. Local n8n workflow canvas.
7. Terminal verification summary.
8. Local n8n engine-proof receipt/output.

Never include personal email addresses, local account passwords, tokens, browser cookies, or customer data in screenshots.

## Release evidence

Attach or reference:

- `docs/PORTFOLIO-CASE-STUDY.md`
- `docs/ARCHITECTURE-DIAGRAM.md`
- `docs/DEMO-SCRIPT.md`
- `docs/CODE-TOUR.md`
- Postman collection
- sanitized n8n workflow exports
- deterministic verification result
- local n8n engine-proof receipt when available

## Claims to use carefully

Safe after deterministic verification:

- "automated tests pass"
- "workflow exports are validated as inactive, local-only, credential-free"
- "live platform writes are disabled"

Use only after the actual engine proof succeeds:

- "executed end to end inside local n8n Community Edition"

Use only after a real Ollama smoke/demo succeeds on the target machine:

- "generated through local Ollama using qwen3-vl:4b"
