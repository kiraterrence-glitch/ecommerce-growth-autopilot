# Marketplace Evidence Safety

Phase 12A-2 extends the marketplace intake foundation with strict CSV evidence import, duplicate protection, normalized conflict detection and automated claim gating.

## CSV fields

Required fields:

- product_id
- source_url
- source_id
- field
- raw_value
- normalized_value
- unit
- status
- rights_status
- captured_at

Evidence status is limited to:

- VERIFIED
- UNVERIFIED

Media rights status is limited to:

- UNKNOWN_RIGHTS
- OWNED
- LICENSED
- AUTHORIZED

## Conflict rules

Only VERIFIED evidence is eligible to support automatic factual claims.

Equivalent normalized units such as `500 ml` and `0.5 l` are treated as agreeing evidence.

Different verified canonical values produce an explicit CONFLICT.

Unverified records remain visible but cannot become automated claims.

## Duplicate protection

Exact duplicate evidence rows are rejected.

Duplicate evidence IDs are rejected.

Duplicate source facts are rejected even when they arrive under different record IDs.

## Claim safety

Automatic fact claims are blocked when:

- no verified evidence exists
- verified evidence conflicts
- evidence IDs do not exist
- evidence belongs to another product or field
- numerical values are unsupported
- winner/superiority language is introduced without a separate evidence-backed comparison workflow

## Media

UNKNOWN_RIGHTS media cannot be automatically reused.

Only OWNED, LICENSED or AUTHORIZED media is eligible for downstream automated use.

## Next

Phase 12A-3 will connect this evidence boundary to the Product Intelligence database and Product Library UI.
