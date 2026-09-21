# Architecture diagram

```mermaid
flowchart TD
  A[Product / Research Intake] --> B[Validation + Normalization]
  B --> C[Research Intelligence]
  C --> D[Research Quality Gate]
  B --> E[Product Brain]
  D --> E
  E --> F[Schema + Grounding]
  F --> G[Campaign Factory]
  G --> H[Marketing Quality Gate]
  H --> I[Creatives + Video]
  H --> J[Campaign Snapshot]
  J --> K[Project History JSONL]
  I --> L[Human Review]
  K --> L
  L --> M{All channel assets approved?}
  M -- No --> N[Block delivery]
  M -- Yes --> O[Local Mock/Draft Adapter]
  O --> P[externalWrite=false]

  Q[n8n Local] -->|orchestrates HTTP only| A
  Q -->|no business logic| B
```

## Boundaries

- TypeScript owns business logic and verification.
- Ollama is optional for deterministic tests and explicit for live local demos.
- n8n remains an orchestration layer.
- Project history is append-only and local.
- Platform adapters are local mock/draft boundaries only in the portfolio baseline.
