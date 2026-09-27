# Product Page Automation

The Product Page Automation extends Ecom Growth Autopilot with a local supplier-to-product-page workflow.

## Workflow

Supplier URL
→ supplier intake
→ specification evidence
→ deterministic conflict detection
→ validated Product
→ Product Brain
→ Product Page Brief
→ media plan
→ Shopify DRAFT
→ GemPages DRAFT manifest
→ Product Page QA
→ human approval
→ APPROVED_LOCAL

## Supplier intake

The system accepts HTTPS supplier URLs and recognizes:

- AliExpress
- Alibaba
- other supplier domains

It does not automatically scrape those marketplaces.

Private-network, localhost, unsafe-protocol, and embedded-credential URLs are rejected.

## Specification verification

Every observation retains its field, value, source ID, and criticality.

Equivalent formatting such as:

`500 ml`

and:

`500ml`

can verify as the same value.

Conflicting critical values such as:

`500 ml`

and:

`600 ml`

produce:

`NEEDS_VERIFICATION`

The AI is not allowed to guess which conflicting value is correct.

## Product Page Brief

The brief reuses the project's validated Product Brain.

Sections include:

- hero
- problem
- benefits
- demo
- features
- comparison
- use cases
- objections
- FAQ
- offer
- shipping and returns
- CTA

## Shopify

Shopify output remains:

`status = DRAFT`

and:

`externalWrite = false`

No Shopify credentials are required.

## GemPages

GemPages output is a structured page manifest.

It remains:

`status = DRAFT`

and:

`externalWrite = false`

No GemPages credentials are required.

## Media

The media plan identifies the required hero image, detail image, benefit graphic, comparison graphic, GIF, and short video.

Missing assets are explicitly marked rather than fabricated.

## QA

The Product Page QA layer checks:

- critical specification conflicts
- required sections
- unsupported claim language
- Shopify draft-only state
- GemPages draft-only state
- external-write safety
- media readiness
- variant readiness
- SEO metadata

## Human approval

The local workflow ends at:

`APPROVED_LOCAL`

Approval does not publish externally.

## Local dashboard

Run:

`npm.cmd run dev:api`

Then open:

`http://127.0.0.1:3001/product-page`

The original campaign dashboard remains available at:

`http://127.0.0.1:3001/dashboard`

## API

- GET `/product-page`
- GET `/product-page/capabilities`
- POST `/product-page/jobs`
- GET `/product-page/jobs`
- GET `/product-page/job?jobId=...`
- POST `/product-page/evidence`
- POST `/product-page/brief`
- POST `/product-page/qa`
- POST `/product-page/approval`

## n8n

The local workflow is:

`n8n/workflows/product-page-pipeline.local.json`

It is:

- inactive by default
- credential-free
- local-loopback only
- free of Code/Function nodes
- orchestration-only
- independent of n8n Cloud

## Safety

The project continues to enforce:

- external writes disabled
- live publishing disabled
- human approval required
- no fake reviews
- no fake sales estimates
- no opaque winning-product scores
- no AI guessing of conflicting product specifications
