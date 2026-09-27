# Product Research Evidence Foundation

This module is the evidence boundary for supplier, competitor, manual, HTML-snapshot, and CSV research sources.

## Core rule

AI is not a source of product facts.

Every factual product or competitor claim must originate from a captured evidence record or be explicitly marked as unknown.

## Evidence records

Each evidence record carries:

- evidence ID
- job ID
- source ID
- source kind
- source URL when available
- field
- original raw value
- normalized value
- canonical unit when available
- variant identity when applicable
- confidence type
- capture timestamp
- extractor identity
- notes

## Automatic extraction

Automatic source adapters will be added separately.

If no compatible adapter exists, or an adapter fails safely, the workflow returns:

`MANUAL_CAPTURE_REQUIRED`

The workflow must not bypass access controls or invent missing product information.

## Conflict detection

Equivalent measurements are normalized before comparison.

Examples:

- `0.5 L` and `500 ml` agree
- `1 kg` and `1000 g` agree

Conflicting values remain visible in the evidence ledger.

AI does not decide which conflicting product specification is correct.

## URL boundary

Research URLs must:

- use HTTPS
- be absolute
- contain no embedded credentials
- not target localhost
- not target common private IPv4 ranges

Additional DNS and redirect validation belongs in the live network-extraction phase.

## Asset boundary

The current asset metadata gate permits:

- JPEG
- PNG
- WebP
- GIF
- MP4
- WebM

Assets are restricted to 50 MB and sane image dimensions.

Actual downloading is intentionally deferred until the supplier-extraction phase.

## Rights

Source discovery does not imply commercial-use rights.

Later media manifests must separately track source provenance and usage approval.

## Current phase status

This phase creates the evidence foundation only.

It does not perform live marketplace scraping, competitor discovery, media downloading, image generation, or publishing.
