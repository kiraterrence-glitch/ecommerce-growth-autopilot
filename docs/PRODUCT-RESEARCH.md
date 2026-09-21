# Product Research Intelligence

## Purpose

Product research in this portfolio is an **evidence system**, not a "winning product" predictor. The module distinguishes observed evidence, seller assumptions, deterministic calculations, and AI analysis.

## Inputs

A research project can contain:

- structured source records with capture timestamps
- competitor observations: title, price, rating, review count, features, offer
- imported review evidence with stable review IDs
- seller-supplied unit-economics assumptions
- optional demand-data sources when the user actually has them

Manual and CSV imports are supported. The free-tier portfolio does not depend on Amazon scraping, Helium 10, Jungle Scout, or a paid marketplace API.

## Guardrails

Research validation rejects common fake-confidence fields such as:

- estimated monthly sales
- sales/revenue estimates
- opportunity/winning scores

The research-quality gate requires source provenance, evidence-backed findings, canonical competitor deduplication, reproducible unit economics, and demand-specific evidence before any demand conclusion is allowed.

When no demand-data source is supplied, the report explicitly says demand is **not measured**.

## Analysis

The deterministic engine currently produces:

- competitor price min/median/max/average
- feature frequency and supporting competitor IDs
- observed offer patterns
- review themes with supporting review IDs
- contribution economics and break-even CPA
- evidence-backed findings with confidence derived from sample size
- explicit limitations

AI-assisted review mining is available through the same provider abstraction as Product Brain. AI review themes are accepted only when every theme cites real imported review IDs.

## Research-aware Product Brain

Product Brain can accept a compact research context. Research may inform audience language, objections, and positioning hypotheses, but competitor features and reviews are **not** converted into product facts.

The normal product grounding gate still applies after AI generation.

## API

`POST /research/analyze`

Returns the normalized research project, deterministic analysis, and research-quality report.

`POST /campaign-kit`

Remains backward compatible with a direct product JSON body. A research-aware request can instead use:

```json
{
  "product": { "...": "canonical product" },
  "research": { "...": "research project" }
}
```

Research must pass its own quality gate before it can influence Product Brain.

## Local commands

```bash
npm run research:check
npm run research:demo
npm run demo:generate
npm run demo:generate:ollama
```

All routine research development remains local and consumes zero n8n Cloud executions.
