# Security and data-handling notes

This repository is a portfolio/local-development project. Do not place production credentials, merchant secrets, customer PII, browser cookies, or raw production exports in the repository.

## Baseline safety model

- `.env` and `.runtime/` are ignored.
- committed n8n exports must be inactive and credential-free;
- committed n8n HTTP nodes may call only approved loopback API ports;
- live publishing is unsupported in the portfolio baseline;
- delivery adapters report `externalWrite=false`;
- human approval is required before local draft delivery;
- secret scanning is part of `npm run verify`.

## Reporting a security issue

For a private portfolio repository, report issues directly to the repository owner rather than opening a public issue containing secrets or sensitive data.
