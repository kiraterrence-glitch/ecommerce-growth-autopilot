# Cloud Sync Foundation

Phase 11A introduces an optional asynchronous cloud synchronization boundary.

SQLite remains the local source of truth.

No Supabase credentials or network access are required for this phase.

## Flow

Product Intelligence snapshot
→ durable SQLite sync outbox
→ asynchronous remote-store interface
→ optional cloud adapter

## Safety

Cloud synchronization is disabled by default.

A cloud outage, rate limit, authentication error or malformed remote response cannot prevent local Product Library reads.

Authentication failures are blocked rather than retried forever.

Retryable failures use deterministic exponential backoff.

Remote-newer state becomes an explicit conflict and is never silently overwritten.

## Secrets

Sync envelopes are created only from Product Intelligence records.

Environment variables and provider credentials are never serialized into sync payloads.

## Next phase

Phase 11B will implement the real Supabase remote-store adapter, migrations and optional live smoke tests.

Normal repository verification will remain credential-free and offline.
