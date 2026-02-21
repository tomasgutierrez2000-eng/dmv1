# Metric Library — SQL schema and seed (GSIB)

High-quality, GSIB-realistic sample data for the Metric Library: domains, parent metrics, and metric variants.

## Tables

- **metric_library.domains** — 8 domains (Credit Quality, Exposure, Profitability, Loss & Provision, Capital, Pricing, Portfolio Composition, Early Warning)
- **metric_library.parent_metrics** — 12 parent metrics (PD, DSCR, LTV, LGD, All-In Rate, ROE, Expected Loss, Utilization, EAD, RWA, Concentration, Rating Migration)
- **metric_library.metric_variants** — 27 variants with formulas, rollup logic, validation rules, lineage, regulatory references

## Run in PostgreSQL

```bash
psql -U your_user -d your_db -f sql/metric-library/01_DDL.sql
psql -U your_user -d your_db -f sql/metric-library/02_SEED_GSIB.sql
```

Order matters: run `01_DDL.sql` first, then `02_SEED_GSIB.sql`. The seed truncates existing data before inserting.

## Regenerate seed (JSON + SQL)

The app currently reads from **JSON files** in `data/metric-library/`. To regenerate both the JSON files and the SQL seed from the same source:

```bash
npx tsx scripts/seed-metric-library-gsib.ts
```

This overwrites `data/metric-library/domains.json`, `parent-metrics.json`, `variants.json` and `sql/metric-library/02_SEED_GSIB.sql`.
