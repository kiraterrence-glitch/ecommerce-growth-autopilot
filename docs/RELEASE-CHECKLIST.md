# Portfolio release checklist

Use this after the local n8n proof. It exists so a future coding agent does not repeat architecture work.

- [ ] `npm run verify` is green
- [ ] `portfolio-release-preflight-windows.cmd` is green after the actual engine proof
- [x] Windows setup/build/verification has been proven on prior checkpoints; v0.9.3 engine proof self-runs setup/build
- [x] real Ollama Product Brain smoke was proven on v0.8.0; v0.9.x does not change the Ollama provider path
- [x] deterministic n8n workflow contract proof is green
- [ ] `finish-portfolio-proof-windows.cmd` completes; its engine-proof step reports `N8N ENGINE PROOF PASSED` and writes `.runtime/n8n-engine-proof.json`
- [ ] `PROJECT-STATE.json` matches package version and actual test count
- [ ] no `.env`, `.runtime`, credentials, PII, or raw merchant data committed
- [ ] all workflow exports are inactive and credential-free
- [ ] README screenshots show Research → Product Brain → Campaign → Approval → Local Draft
- [ ] sample output is clearly labeled demo/synthetic data
- [ ] release notes state that live external writes are disabled
- [x] recruiter walkthrough/demo script is prewritten in `docs/DEMO-SCRIPT.md`
- [x] portfolio case-study copy is prewritten in `docs/PORTFOLIO-CASE-STUDY.md`
- [x] GitHub publishing checklist is prewritten in `docs/GITHUB-PUBLISH.md`
- [ ] GitHub repository contains `PROJECT-STATE.json`, handoff docs, tests, Postman assets, and n8n exports
