# GSIB Credit Risk Data Model — SQL Export

Load order (files are numbered for correct sequence):

| # | File | Description |
|---|------|-------------|
| 1 | `01-l1-ddl.sql` | L1 schema (82 tables: dimensions, masters, lookups) |
| 2 | `02-l2-ddl.sql` | L2 schema (25 tables: snapshots, events) |
| 3 | `03-l1-seed.sql` | L1 seed data (100 counterparties, 410 facilities, dimensions) |
| 4 | `04-l2-seed.sql` | L2 seed data (5-cycle time series, exposure snapshots) |
| 5 | `05-scenario-seed.sql` | 18 CRO Dashboard scenarios (623 INSERTs across 31 tables) |

## Load with psql

From this directory (copy the 5 SQL files from your export package here first):

```bash
psql -h <host> -U <user> -d <database> -f 01-l1-ddl.sql
psql -h <host> -U <user> -d <database> -f 02-l2-ddl.sql
psql -h <host> -U <user> -d <database> -f 03-l1-seed.sql
psql -h <host> -U <user> -d <database> -f 04-l2-seed.sql
psql -h <host> -U <user> -d <database> -f 05-scenario-seed.sql
```

Or use the project script (no `psql` required; uses Node + `pg` and `DATABASE_URL` from `.env`):

```bash
# From repo root, after copying the 5 SQL files into sql/gsib-export/
npm run db:load-gsib
```

## ID ranges

| Scope | counterparty_id | facility_id | credit_agreement_id |
|-------|-----------------|------------|---------------------|
| Seed | 1–100 | 1–410 | 1–100 |
| Scenarios | 1001–1720 | 5001–5720 | 1001–1180 |

## Validation

51/53 checks passed (2 false positives from validator column naming).

- No duplicate PKs
- No FK violations
- All drawn ≤ committed, undrawn = committed − drawn
- Complete FK chains: exposure → facility → agreement → counterparty
- Correct data types throughout
