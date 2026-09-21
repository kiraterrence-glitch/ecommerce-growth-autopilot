# Recruiter walkthrough

Goal: demonstrate engineering and eCommerce judgment in under five minutes without implying production client results.

## 1. Research (45 sec)
Open the Research tab. Show observed competitor pricing/features, review themes with evidence IDs, explicit limitations, and break-even CPA. Point out that the system refuses unsupported demand claims and fake opportunity scores.

## 2. Product Brain (30 sec)
Show audiences, pains, benefits, objections, triggers, and campaign angles. Explain that live local Ollama output must pass schema + grounding before it can feed campaigns.

## 3. Campaign factory (60 sec)
Show Meta, lifecycle email, Shopify, Google Ads, and optional Amazon drafts. Mention the separate marketing-quality gate for prompt leakage, CTA fit, placeholders, and channel constraints.

## 4. Creatives (45 sec)
Show generated static creatives and the vertical-video workflow. Explain that rendering is local/free and does not depend on a paid creative API.

## 5. Human approval + persistence (45 sec)
Move an asset from DRAFT → IN_REVIEW → APPROVED. Refresh/restore the campaign from history to demonstrate that approvals and campaign versions persist locally.

## 6. Delivery safety (30 sec)
Open Delivery. Attempt a local draft before all channel assets are approved and show the block. Explain that portfolio adapters are mock/draft only and report `externalWrite: false`; live spend/publishing is intentionally absent.

## 7. Verification (30 sec)
Show `npm run verify`, Postman assets, inactive credential-free n8n exports, and `PROJECT-STATE.json`. Explain that routine development used zero n8n Cloud executions.

## Claims to make accurately

- built a local-first eCommerce automation portfolio system
- integrated local Ollama with structured validation/grounding
- built evidence-backed product research and unit economics
- built draft campaign generators and creative rendering
- built persistent human approval and safe local delivery boundaries
- built automated engineering/research/marketing verification

## Claims not to make

Do not claim production merchant revenue, live ad-management experience, Amazon sales-estimate accuracy, or autonomous live publishing unless that work is later performed and documented.
