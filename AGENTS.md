# Agent collaboration rules

- Read `PROJECT-STATE.json`, `CONTINUE-LATER.md`, and `docs/WORK-HANDOFF.md` first; do not redo verified phases.
- The current checkpoint is v0.9.3. The actual Windows n8n 2.39.8 engine proof and release preflight have passed; remaining work is presentation/publication only.
- Challenge unnecessary dependencies and vendor lock-in.
- Make the smallest testable change and run `npm run verify`.
- Never mark work complete from code inspection alone.
- Public-contract changes require tests and documentation.
- Preserve local-first development so normal work uses zero n8n Cloud executions.
- Treat engineering verification and marketing-quality verification as separate required gates.
- Keep business logic in TypeScript. n8n may orchestrate but must not gain Code/Function business logic.
- Do not add another channel while a known quality defect exists in an existing channel.
- Research conclusions require explicit evidence IDs/source IDs; demand claims require demand-data sources.
- Never add opaque winning/opportunity scores or fabricated sales estimates.
- Treat `docs/CODE-TOUR.md` as the learning map; explain new major modules in business, technical, and interview terms.
- Do not enable live publisher adapters or external writes in the portfolio baseline.
