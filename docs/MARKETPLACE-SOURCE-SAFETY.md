# Marketplace Source Safety

Reviewed 2026-09-26.

Phase 12A-1 establishes a fail-closed source boundary for Amazon, AliExpress, Alibaba.com, Temu and generic supplier URLs.

Marketplace retail pages are not fetched automatically in this phase.

Supported intake is currently user-provided HTML or text.

Official APIs remain authorization-gated.

Every captured source receives deterministic SHA-256 provenance.

All media defaults to `UNKNOWN_RIGHTS`.

Human-verification, CAPTCHA and anti-bot pages are rejected rather than interpreted as product evidence.

## Official documentation

Amazon SP-API:
https://developer-docs.amazon.com/sp-api/docs/onboarding-overview

AliExpress Open Platform:
https://developer.alibaba.com/docs/doc.htm?articleId=120672&docType=1&treeId=727

Alibaba.com Open Platform:
https://openapi.alibaba.com/doc/doc.htm

Temu Partner Platform:
https://partner.temu.com/documentation

## Next

Phase 12A-2 adds strict CSV evidence import, evidence conflict detection and automated-claim gating.
