# Deterministic demo output

Generated with `npm run demo:generate` using repository fixtures, not a live merchant account.

The folder demonstrates the export contract, Product Research Intelligence, research-quality gate, marketing-quality gate, and channel/creative outputs without requiring Ollama or external APIs.

Included evidence artifacts:

- `research-analysis.json` — observed competitor/review/economics analysis
- `research-quality-report.json` — provenance/demand/economics verification
- `campaign-kit.json` — research-aware Product Brain plus all channel drafts
- `marketing-quality-report.json` — downstream marketing checks
- static SVG/PNG creatives and a deterministic MP4 demo

The fixture research deliberately has a small sample and no independent demand-data source, so the research report contains warnings and explicitly refuses to infer demand strength.

For a real local-AI run use `npm run demo:generate:ollama`; live outputs remain under `.runtime/demo-live` and are intentionally not committed.

For the v0.8 dashboard proof, run `open-dashboard-windows.cmd`, click **Run full portfolio demo**, then use the **Run** and **Learn** tabs. The dashboard timeline is derived from persisted campaign/approval/delivery state rather than this static fixture folder.


## Fixture-only placeholders

This committed sample intentionally uses a synthetic product-image URL (`example.invalid`) and publication tokens such as an unsubscribe placeholder. They demonstrate safe draft boundaries and are not live merchant assets. Recruiter screenshots should use the local dashboard/media preview rather than presenting those tokens as production-ready content.
