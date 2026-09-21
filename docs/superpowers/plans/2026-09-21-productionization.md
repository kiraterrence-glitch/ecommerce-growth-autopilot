# Ecom Growth Autopilot productionization plan

## Spec

Preserve the verified local portfolio baseline while removing stale state and establishing
the next safe architecture: one canonical product model, explicit claim-risk evidence,
portable brand-kit input, and read-only performance ingestion before any publisher write.
Live spend, email sending, and storefront publication remain disabled.

## Global constraints

- TypeScript owns business logic; n8n remains orchestration only.
- No external write or live publisher adapter without a separate approved design.
- No opaque opportunity score, fabricated demand, or unsupported product claim.
- Every new defect or contract gets a failing test before implementation.
- CI receives read-only repository permissions.

## Tasks

1. Add explicit `contents: read` workflow permissions and a regression check.
2. Correct `PROJECT-STATE.json`, README, and release checklist so the public GitHub repo is
   recorded as published and remaining work is screenshots/presentation, not publication.
3. Add a versioned canonical product contract shared by intake, research, Product Brain,
   campaign builders, dashboard, and n8n fixtures; add migration/compatibility tests.
4. Replace single-number fit language with named confidence dimensions and evidence links.
5. Extend Claim Risk into structured claim/evidence/severity/resolution records and ensure
   high-risk unresolved claims block approval.
6. Add a portable Brand Kit contract (colors, fonts, tone, prohibited language, assets)
   with validation and deterministic fixtures.
7. Add read-only performance CSV ingestion with provenance, deduplication, and aggregate
   reporting. No Shopify/Meta/Google/Amazon mutations.
8. Re-run deterministic verification, the local n8n proof, and presentation preflight;
   update machine-readable state only from observed evidence.

## Review focus

Backward compatibility, explainability, evidence provenance, fail-closed approval behavior,
privacy of merchant data, and prevention of accidental live publishing.
