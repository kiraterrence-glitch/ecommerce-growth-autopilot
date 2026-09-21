# Architecture decisions

## 1. Local-first TypeScript core
Business rules, AI validation, research analysis, campaign generation, approvals, and delivery safety live in ordinary TypeScript. n8n is orchestration only. This keeps tests free and repeatable.

## 2. Deterministic tests separate from live AI tests
Normal `npm run verify` uses mocks. Ollama is checked only by explicit doctor/smoke/demo commands. A model outage must not make ordinary unit tests flaky.

## 3. Evidence-first research
Observed competitor/review evidence, seller assumptions, deterministic economics, and AI analysis remain distinct. Demand claims require demand-data evidence. Opaque winning/opportunity scores and fabricated sales estimates are rejected.

## 4. Append-only JSONL persistence before a database
Portfolio persistence uses `.runtime/project-history.jsonl` as an append-only event log. It has zero service/dependency cost, preserves version history, and can later be migrated to SQLite/Postgres without changing domain contracts.

## 5. Human approval is a hard delivery gate
Draft assets move through DRAFT → IN_REVIEW → APPROVED/REJECTED. Delivery is blocked until every asset required by that channel is APPROVED.

## 6. No live platform writes in the portfolio baseline
Meta, Shopify, Google Ads, and email adapters support only local `mock` and `draft` modes. `live` is explicitly rejected. Adapter results always report `externalWrite: false`.

## 7. Amazon SP-API is not a baseline dependency
Amazon listing generation remains a draft artifact. Real SP-API authentication is intentionally deferred so the demo works without a seller account or paid service.

## 8. Quality is broader than schema validity
Engineering, research, grounding, and marketing-quality gates are separate. Valid JSON is not enough to call content portfolio-ready.
