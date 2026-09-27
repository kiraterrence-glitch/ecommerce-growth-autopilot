
# Product Intelligence Database

Phase 9 introduces the persistent local product intelligence foundation.

## Database

The local adapter uses SQLite through the Node.js built-in `node:sqlite` API.

No database subscription or external service is required.

The default future runtime database location is:

`.runtime/product-intelligence.sqlite`

Runtime database files are not intended to be committed.

## Core entities

- products
- product revisions
- variants
- sources
- evidence
- competitor relationships
- comparison runs
- visual assets
- product-page drafts
- QA runs
- approvals

## Evidence provenance

A verified fact cannot exist without its source relationship.

SQLite foreign keys enforce the source/evidence relationship.

## Product history

Product changes are stored as numbered revisions.

A later supplier capture does not erase an earlier revision.

## Duplicate protection

Canonical product fingerprints are unique.

The repository supports fingerprint lookup before a new product record is created.

## Transaction safety

Repository transactions use `BEGIN IMMEDIATE`.

Any failure rolls the transaction back rather than keeping partial product intelligence.

## Cloud portability

Business-facing repository contracts live under:

`src/product-intelligence/`

The SQLite adapter is separate.

A future PostgreSQL/Supabase adapter can implement the same repository contract without replacing the product research business logic.

## Next database phase

After this foundation passes its audit, the next phase will connect product intake/research output to the database and build a Product Library API/dashboard.
