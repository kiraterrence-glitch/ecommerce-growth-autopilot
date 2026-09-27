# Competitor Evidence and Comparison Matrix

Phase 3 adds evidence-backed competitor comparison.

## Competitor selection

The current system does not automatically declare products to be competitors.

A competitor candidate must be explicitly confirmed by the user or another authorized upstream process.

Every confirmed competitor also requires a documented comparison basis such as:

- same product type
- same intended use
- same audience need
- same relevant category

This avoids silently treating unrelated marketplace listings as direct competitors.

## Comparability

The comparison engine uses verified shared evidence fields.

Competitors are classified as:

- `COMPARABLE`
- `PARTIALLY_COMPARABLE`
- `NOT_COMPARABLE`

Unconfirmed candidates are always:

`NOT_COMPARABLE`

## Comparison matrix

The matrix uses normalized evidence rather than raw display text.

For example:

- `0.5 L` becomes `500 ml`
- `0.4 kg` becomes `400 g`

This allows equivalent measurements to be compared correctly.

## Conflicts

If the same source contains conflicting evidence for a field, that comparison cell becomes:

`CONFLICT`

The system does not ask AI to choose which value is correct.

## Missing data

Unavailable facts remain:

`MISSING`

Missing information does not become a generated assumption.

## Automated claims

Automated comparison claims are deliberately narrow.

They are produced only when:

- the competitor is fully `COMPARABLE`
- both sides have verified values
- both normalized values are numeric
- both values use the same normalized unit
- supporting evidence IDs exist

Example:

`Our product has a higher listed Capacity than Competitor A (500 ml vs 350 ml).`

The word `listed` is intentional because the system is comparing captured source evidence.

## Prohibited automated language

The comparison QA layer rejects unsupported language such as:

- best
- better
- winner
- superior
- beats
- outperforms

The system does not generate an overall winner or product ranking.

## Current phase boundary

Phase 3 does not yet perform automatic competitor discovery.

Competitor URLs or evidence must be supplied by the user or another trusted upstream process.

Automatic marketplace discovery can be considered later if a reliable and permitted data source is available.

Phase 4 will consume the verified comparison matrix to produce local marketing visuals.
