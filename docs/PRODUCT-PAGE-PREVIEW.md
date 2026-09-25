# Product Page Preview

Phase 5 converts the evidence-grounded visual pack into a complete responsive ecommerce page preview.

## Preview structure

The page contains:

- product hero
- product positioning
- CTA presentation
- evidence/trust strip
- benefits
- product details
- competitor comparison
- offer section
- FAQ
- shipping and returns
- local-only safety state

## Responsive layout

The preview includes:

- desktop layout
- tablet layout
- mobile layout

The HTML includes viewport metadata and responsive CSS breakpoints.

## Safety

The preview explicitly contains:

`externalWrites=false`

and:

`livePublishing=false`

There is no live checkout route.

There is no client-side executable JavaScript.

The CTA is presentation-only.

## Visual inputs

The preview consumes the Phase 4 visual pack:

- hero
- benefits
- features
- comparison
- offer

Missing real product imagery remains visible as a source requirement instead of being fabricated.

## Demo route

Start the local API:

`npm.cmd run dev:api`

Open:

`http://127.0.0.1:3001/product-page/preview-demo`

This route renders a deterministic demo fixture.

It is not a live merchant store.

## Next phase

Phase 6 will add browser-based visual QA, desktop/mobile screenshots, overflow checks, broken-image checks and portfolio demo packaging.
