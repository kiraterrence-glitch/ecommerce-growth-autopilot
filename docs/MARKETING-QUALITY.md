# Marketing Quality Gate

Engineering-valid JSON is not enough for a portfolio campaign. `npm run verify` now runs a second gate after the build that checks customer-facing marketing quality.

## Current checks

- internal prompt/instruction leakage
- distinct Meta primary-text variants
- Meta audience-hypothesis diversity
- lifecycle-appropriate email CTAs
- unresolved Shopify placeholder tokens
- FAQ questions without answers
- Google headline/description uniqueness
- awkward Google truncation and connector-word endings
- Amazon listing completeness warnings
- visible creative placeholder language
- customer-facing video copy safety

The deterministic portfolio demo must pass this gate before artifacts are written. The live Ollama demo also runs the same gate after the real Product Brain is generated.

## Commands

```bash
npm run marketing:check
npm run demo:generate
npm run demo:generate:ollama
```

On Windows, `generate-live-demo-windows.cmd` runs setup, full deterministic verification, the quality gate, and then the real Ollama campaign generation path.

## Design rule

A channel draft may be schema-valid and still be poor marketing. Future channel work should add a quality rule whenever a real output review discovers a repeatable failure pattern.
