# L2 schema and seed (exposure + snapshot tables)

L2 DDL and seed are **generated** from TypeScript definitions. Use the generated files under `scripts/l2/output/`:

1. **DDL**: Run `scripts/l2/output/ddl.sql` after `scripts/l1/output/ddl.sql` and `scripts/l1/output/seed.sql`.
2. **Seed**: Run `scripts/l2/output/seed.sql` after L2 DDL.

To regenerate after changing table definitions:

```bash
npx tsx scripts/l2/generate.ts
```

This produces `scripts/l2/output/ddl.sql`, `seed.sql`, `sample-data.json`, `relationships.json`, and `table-metadata.json`. Data uses facility_id/counterparty_id 1..10 and as_of_date 2025-01-31 (see [sql/SEED_CONVENTIONS.md](../SEED_CONVENTIONS.md)).
