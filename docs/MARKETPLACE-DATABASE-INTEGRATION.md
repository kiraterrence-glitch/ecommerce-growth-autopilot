# Marketplace Database Integration

Phase 12A-3A persists marketplace evidence inside the same SQLite database used by Product Intelligence.

## Tables

`marketplace_sources`

Stores product/source provenance.

`marketplace_evidence`

Stores individual evidence records, normalized canonical keys, verification state and media-rights state.

## Safety

- products must already exist
- foreign keys are enforced
- source ID collisions fail closed
- evidence ID collisions fail closed
- duplicate source facts fail closed
- exact re-imports are idempotent
- multi-record imports are transactional
- verified conflicts remain explicit
- unverified evidence remains non-claimable
- UNKNOWN_RIGHTS remains visible
- no live marketplace writes or credentials are introduced

## Product Library integration

A marketplace view-model now exposes:

- source count
- evidence count
- verified/unverified counts
- conflict count
- unknown-rights count
- review status
- warnings
- source provenance
- raw evidence

Phase 12A-3B will render this view-model in the browser Product Library and expose safe local API routes.
