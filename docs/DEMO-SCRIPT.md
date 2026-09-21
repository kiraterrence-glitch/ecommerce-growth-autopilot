# Recruiter demo script

Target length: 4–6 minutes.

## 1. Start with the problem

"This project automates the workflow between product research and campaign execution, but it deliberately keeps evidence, validation, and human approval in the loop."

## 2. Show Research

Open the dashboard Research view.

Explain:

- competitor/review evidence has provenance;
- unit economics are deterministic;
- demand is not invented when the dataset cannot support it;
- research findings can feed the Product Brain.

## 3. Show Product Brain

Point out provider/model metadata and the structured fields.

Explain:

- mock mode makes CI deterministic;
- local Ollama is used for the live AI demo;
- schema and grounding checks sit between the model and campaign generators.

## 4. Show campaign drafts

Open Meta, Email, Shopify, Google Ads, Amazon, and Creatives.

Explain that all outputs are drafts and that marketing-quality checks reject prompt leakage, unresolved placeholders, wrong lifecycle CTAs, and other repeatable quality failures.

## 5. Show approval safety

Open Delivery with a fresh campaign.

Before approval, show that local delivery is blocked. Approve one channel and explain that approvals are persisted per campaign.

Do not present mock/draft delivery as live publishing.

## 6. Show n8n

Open `Ecom Full Portfolio Demo - Local` or `Ecom Engine Proof - CLI Local` in local n8n.

Explain:

"n8n sequences API calls. The research and campaign logic is not hidden in Code nodes; it stays in TypeScript where it is unit/integration tested."

Show that the nodes target only `127.0.0.1`.

## 7. Show verification

Run or show the saved output from:

```text
npm run verify
```

Then show `.runtime/n8n-engine-proof.json` after the local engine proof.

Close with:

"The important part is not that AI generated copy. The important part is that the automation is testable, evidence-aware, fail-closed, and designed so an AI mistake cannot silently become a live platform action."
