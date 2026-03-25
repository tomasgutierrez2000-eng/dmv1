---
description: "Curator Pipeline — LLM-powered scenario generation and quality auditing for the GSIB data factory."
---

# Curator Pipeline

Wraps the TypeScript data factory with Python-based LLM pipelines for scenario generation and quality auditing.

## Available CLI Commands

| Command | Description |
|---------|-------------|
| `npm run curator:gen -- "narrative"` | Generate scenario YAML from English narrative |
| `npm run curator:audit -- --input <json> --config <yaml>` | Audit factory output for coherence |
| `npm run curator:metric -- --metric DSCR --behavior breach` | Generate scenario targeting a metric |
| `npm run curator:variants -- --base <yaml> --mod "prompt" --count 5` | Generate N variants of a scenario |
| `npm run curator:install` | Install Python dependencies |

## Architecture

```
Python Curator (pre/post)              TypeScript Factory (unchanged)
========================              ==============================

curator-gen CLI
  English narrative
  → Block 1: NarrativeAnalyzer (LLM)
  → Block 2: ScenarioStructurer (LLM)
  → Block 3: GSIB SanityChecker (deterministic)
  → YAML file ─────────────────────→ scenarios/narratives/*.yaml
                                              │
                                    scenario-runner.ts
                                    V2 state machine + 20 generators
                                    13 quality control groups
                                              │
curator-audit CLI ←─────────────── V2 output (--export-json)
  LLM coherence review (6 issue types)
  → CoherenceReport (score 0-100)
```

## Quality-First Settings
- Default model: `claude-opus-4-6` (best GSIB domain reasoning)
- Interactive mode default (batch opt-in via `--batch`)
- Hard coherence gate: score < 80 blocks SQL emission (`--force` to override)
- 3-retry progressive refinement on Block 2 failures
- 3-5 few-shot examples per LLM call (similarity-ranked from existing scenarios)

## Pydantic Models (`scenarios/curator/curator_factory/models/`)
- `ScenarioConfig` — mirrors TS ScenarioConfig with GSIB constraint validators
- `CounterpartyProfile` — validates country, industry, rating tier, entity type cross-fields
- `NarrativeAnalysis` — Block 1 structured extraction output
- `CoherenceReport` — audit report with score, issues, pass/fail

## Integration with Orchestrator
Two modes in `orchestrate.md`:
- `DATA_GEN_ENHANCED`: full pipeline (narrative → YAML → factory → audit → PG load → diagnose → remediate)
- `REMEDIATE`: standalone database healing (diagnose → fix → verify)
