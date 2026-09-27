# Supabase Product Intelligence Adapter

Phase 11B-1 adds an optional server-side Supabase Data API adapter.

SQLite remains the local source of truth.

## Default state

Supabase synchronization is disabled unless:

- `SUPABASE_ENABLED=true`
- `SUPABASE_URL` is configured
- `SUPABASE_SECRET_KEY` is configured

The secret key must stay server-side.

## Data API

The adapter uses the Supabase REST Data API directly with Node's built-in `fetch`.

No Supabase JavaScript SDK is required for deterministic verification.

Current publishable and secret keys are sent using the `apikey` header. They are not sent as bearer JWTs.

## Remote table

The migration creates:

`public.product_intelligence_snapshots`

The table is an optional cloud mirror of complete local Product Intelligence snapshots.

SQLite remains authoritative.

## Security

The migration:

- enables Row Level Security
- revokes table privileges from `anon`
- revokes table privileges from `authenticated`
- grants server-side CRUD access to `service_role`
- constrains `schema_version` to version 1

## Migrations

The migration lives under:

`supabase/migrations/`

Before applying it to a real project, link the project and run:

`supabase db push --dry-run`

Then review the output before:

`supabase db push`

## Live smoke test

Normal verification is fully offline.

The optional live smoke test is:

`npm.cmd run test:supabase:live`

It does nothing unless `SUPABASE_LIVE_TEST=1` is explicitly set.

The smoke test creates a temporary Product Intelligence row, verifies the adapter path, then deletes the row.

Never commit the secret key.
