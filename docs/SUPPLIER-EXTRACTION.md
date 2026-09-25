# Supplier Extraction

Phase 2 adds a provenance-first supplier extraction layer.

## Extraction order

The extractor uses:

1. Product JSON-LD / structured data
2. Product meta tags as a fallback
3. Manual capture when usable evidence is unavailable

It does not allow AI to invent missing supplier facts.

## Current supplier support

The live capture CLI currently accepts:

- AliExpress supplier URLs
- Alibaba supplier URLs

The deterministic test suite uses saved HTML fixtures rather than live marketplace requests.

## Blocked pages

Pages containing common human-verification, CAPTCHA, access-denied, or security-verification signals return:

`MANUAL_CAPTURE_REQUIRED`

The application must not attempt to bypass those controls.

## Evidence

Supplier extraction can capture evidence for:

- title
- description
- SKU
- brand
- listed price
- currency
- structured additional properties
- variants
- variant prices
- image URLs
- video URLs

Every extracted value retains:

- evidence ID
- source ID
- source URL
- timestamp
- extractor identity
- raw value
- normalized value
- variant identity where applicable

## Media discovery

Image and video URLs become ProductAssetCandidate records.

Every candidate remains:

`UNKNOWN_RIGHTS`

until a user or authorized process establishes a different usage status.

Public visibility does not imply commercial-use permission.

## Safe network capture

The network client:

- accepts HTTPS only
- rejects embedded credentials
- validates DNS resolution
- rejects loopback and common private network ranges
- validates every redirect
- limits redirects
- uses request timeouts
- limits HTML response size
- validates response MIME type
- does not send credentials or cookies

## Asset acquisition

The local asset store:

- accepts approved image/video MIME types only
- enforces the 50 MB asset limit
- hashes content using SHA-256
- creates deterministic metadata sidecars
- retains source evidence identity
- retains source URL
- retains rights status

## Live supplier capture

After deterministic verification:

`node scripts/capture-supplier.mjs <supplier-url>`

Optional local asset acquisition:

`node scripts/capture-supplier.mjs <supplier-url> --download-assets`

The command must be used only where automated access is permitted.

If a marketplace blocks or requires human verification, use the manual capture/import path.

## Phase boundary

This phase does not perform automatic competitor discovery, competitor ranking, comparison claims, visual marketing asset generation, or publishing.
