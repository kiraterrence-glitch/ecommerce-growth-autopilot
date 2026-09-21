# Local n8n workflows

These exports are portfolio orchestration examples. They are intentionally:

- inactive in Git;
- credential-free;
- restricted to loopback HTTP endpoints;
- free of Code/Function business logic;
- unable to publish to Meta, Google, Shopify, Amazon, or an email provider.

`npm run validate:n8n` enforces those rules.

## Workflows

| Workflow | Stable ID | Trigger | Purpose |
|---|---|---|---|
| Ecom Engine Proof - CLI Local | `EcomEngineProof0920` | Manual | Actual local n8n CLI engine proof on isolated port 3011 |
| Ecom Full Portfolio Demo - Local | `EcomFullDemo0901` | Webhook | Production-style local research → campaign → timeline demo |
| Ecom Product Intake to Product Brain - Local | `EcomBrainDemo901` | Webhook | Product → Product Brain example |
| Ecom Product Intake to Full Campaign Kit - Local | `EcomCampDemo0901` | Webhook | Product → full campaign-kit example |
| Ecom Research Intake to Evidence Analysis - Local | `EcomRschDemo0901` | Webhook | Research evidence → verified analysis example |

## Preferred proof

On Windows with local n8n Community Edition installed:

```text
engine-proof-local-n8n-windows.cmd
```

The script imports and executes the manual workflow through the actual local n8n engine and writes a proof receipt only if the local safety assertion passes.

See `../docs/LOCAL-N8N-PROOF.md`.
