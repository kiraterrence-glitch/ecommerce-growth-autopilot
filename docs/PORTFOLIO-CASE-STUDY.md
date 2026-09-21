# Portfolio case study — Ecom Growth Autopilot

## Problem

Small eCommerce teams often have product research, campaign planning, creative briefs, channel drafts, approvals, and reporting spread across separate tools and manual handoffs. The project explores how to automate those steps without letting an LLM publish unsupported claims or spend money autonomously.

## Solution

Ecom Growth Autopilot is a local-first automation system that turns seller-supplied product information and research evidence into a validated Product Brain, channel-specific campaign drafts, creative plans, approval state, and local draft-delivery payloads.

The system deliberately separates responsibilities:

- TypeScript owns validation, research analysis, campaign logic, quality gates, approvals, delivery boundaries, and tests.
- Ollama is an optional local AI provider for structured Product Brain generation.
- n8n orchestrates local API calls but does not contain business logic.
- Human approval remains mandatory before any delivery layer can proceed.

## What it demonstrates

### Evidence-backed product research

The research layer accepts competitor/review evidence with provenance, deduplicates records, computes price and feature signals, mines review themes, and calculates seller-supplied unit economics such as contribution margin and break-even CPA.

It intentionally avoids fake sales estimates or opaque "winning product" scores. Demand conclusions are blocked unless a real demand-data source exists.

### Structured AI with guardrails

The Product Brain produces audiences, pain points, benefits, objections, buying triggers, angles, and offer positioning. Model output must pass schema validation, grounding checks, research-quality checks, and marketing-quality checks.

The provider boundary supports deterministic mock mode for tests and local Ollama for real demonstrations.

### Multi-channel campaign factory

The verified campaign factory produces draft-only outputs for:

- Meta
- Google Ads
- email lifecycle campaigns
- Shopify landing pages
- Amazon listings
- static creative plans
- a 20-second vertical-video storyboard

### Approval and delivery safety

Campaign history and approval transitions persist locally. Delivery adapters support only mock/draft behavior in the portfolio baseline. `live` mode is rejected and all adapter results report `externalWrite=false`.

### n8n orchestration

Committed n8n workflows are inactive, local-only, credential-free, and contain no Code/Function business logic. A dedicated CLI proof runs the exact local research → campaign → status sequence through the actual n8n engine and fails closed unless local-safety conditions hold.

## Verification story

The project uses two independent verification layers:

**Engineering verification** checks package safety, handoff state, dependencies, formatting, lint, TypeScript, secrets, n8n exports, Postman assets, build output, workflow contracts, and automated tests.

**Marketing/research verification** checks evidence provenance, unsupported demand claims, prompt leakage, placeholder leakage, channel constraints, lifecycle CTA fit, and completeness.

The live Ollama path is tested separately so deterministic CI does not depend on model speed or local hardware.

## Safety decisions

The portfolio baseline cannot:

- activate an ad campaign;
- spend ad budget;
- publish a Shopify page;
- send production email;
- write to Meta, Google, Amazon, or Shopify;
- bypass human approval.

Those restrictions are architectural, not just instructions in a prompt.

## Interview explanation

> I built the core logic in TypeScript and use n8n only as an orchestration layer. Product and research data are normalized first, then the Product Brain can use a local Ollama model for structured strategy. I do not trust the model output directly: it goes through schema, grounding, research, and marketing-quality gates. Campaign drafts are stored locally, human approval is persisted, and the delivery adapters are intentionally mock/draft only. The local n8n proof executes the full API sequence and fails if external writes or live publishing become enabled.

## Current scope boundary

This is a portfolio engineering system, not a production ad-buying platform. Real authenticated publisher adapters should only be added after provider-specific sandbox/draft APIs, permission scopes, idempotency, rate-limit handling, rollback behavior, and explicit user authorization are designed and tested.
