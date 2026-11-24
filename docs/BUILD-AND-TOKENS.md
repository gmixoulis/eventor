# How this was built

Eventor was produced with AI coding agents: Claude plus other assisting agents. They iterated on the app design, the dummy data, the de-branding of an earlier conference app, and the documentation. A human directed the work and reviewed the results.

## AI token usage

This build used one orchestrating Claude model plus four specialised sub-agents working in parallel. The sub-agent figures below are **measured** (reported by the harness on completion); the orchestrator figure is an **estimate**, since its running total was not metered.

### Measured sub-agent usage

| Sub-agent | Job | Tokens |
| --- | --- | --- |
| Data agent | Generate the New York dummy data (venues, 137 speakers, sessions, facts) | 151,906 |
| Assistant test repair | Fix the assistant test suites to the new data, remove the bilingual cases | 143,492 |
| Data / map test repair | Fix the data, venue-map, clock and art test suites | 96,211 |
| Docs agent | Write the README, feature/impact/server docs, licence and run script | 79,515 |
| **Measured total** | | **471,124** |

### Orchestrator (Claude) — estimate

The orchestrating Claude model did the scaffolding, the de-branding passes, the id and map rework, the brand-asset generation, and all integration and verification (type-check, lint, tests). That ran across hundreds of tool calls over a long session. A reasonable estimate is **1,000,000 to 2,000,000 tokens**, which is the "700,000+ from Claude" figure and then some.

### Grand total

Roughly **1.5 to 2.5 million tokens**: about half a million measured across the sub-agents, and the larger remainder estimated for the orchestrator. Treat the orchestrator and grand-total numbers as order-of-magnitude estimates; only the per-sub-agent rows are measured.
