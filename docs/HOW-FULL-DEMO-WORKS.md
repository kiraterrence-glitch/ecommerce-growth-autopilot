# How the full portfolio demo works

## Goal

Make the complete system visible without enabling any live publisher.

## Dashboard flow

1. Product JSON and optional research evidence are submitted.
2. `/campaign-kit` validates product/research, generates Product Brain, creates channel drafts, runs marketing quality, persists the campaign, and returns a `campaignId`.
3. `/demo/status?campaignId=...` derives the visible timeline from the persisted campaign, approvals, and delivery events.
4. The Run tab shows `PASS`, `WARNING`, `WAITING`, and `BLOCKED` states instead of pretending every step is complete.
5. The user explicitly approves channel assets from the Delivery tab.
6. `/delivery/draft` can then create local payloads. `live` mode is rejected and `externalWrite` remains `false`.

## Timeline meaning

- **PASS** — verified stage completed.
- **WARNING** — stage completed with a limitation such as missing independent research evidence.
- **WAITING** — a human action or local draft step remains.
- **BLOCKED** — a safety gate is intentionally preventing progression.

The initial full demo should normally stop with Human approval = `WAITING` and Local draft delivery = `BLOCKED`. That is expected behavior, not a failure.

## Safety demonstrations

The Run tab exposes two recruiter-friendly negative-path checks:

- **Test approval gate** attempts local delivery before approval and should return `approval_required`.
- **Test live-mode block** requests `mode=live` and should return `unsupported_mode`.

These prove that the system fails closed.

## Local n8n flow

`n8n/workflows/full-portfolio-demo.local.json` performs:

```text
Webhook
  ↓
POST /research/analyze
  ↓
POST /campaign-kit
  ↓
GET /demo/status
  ↓
Return proof
```

n8n contains no business logic, credentials, or live publisher nodes. The export stays inactive by default.
