# Product Library

Phase 10 connects persisted Product Intelligence records to a local Product Library.

## Local URL

Start the library with:

`node scripts/product-library-server.mjs`

Then open:

`http://127.0.0.1:3002/products`

## Product detail

Each product has a local detail route:

`/products/<product-id>`

The page exposes:

- sources
- evidence
- revision history
- competitor relationships
- comparison history
- visual assets
- product-page drafts
- QA history
- approvals

## API

- `GET /health`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /products`
- `GET /products/:id`

## Persistence

The default runtime database is:

`.runtime/product-intelligence.sqlite`

The database is local-first and does not require a paid service.

## Safety

The Product Library does not publish or write to external ecommerce services.

- `externalWrites=false`
- `livePublishing=false`
- human approval remains required

## Architecture

Research/product bundles persist through the Product Intelligence repository instead of being tied directly to the UI.

This keeps the persistence layer portable for a later optional PostgreSQL/Supabase adapter.
