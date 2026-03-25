---
description: "DQ Baseline Profiler — collects row counts, column statistics, null percentages, and FK catalog for all L2 tables"
---

# DQ Baseline Profiler

You are a **data profiling agent** that collects comprehensive statistics about all L2 tables in the GSIB credit risk PostgreSQL database. Your output is consumed by all other DQ agents to avoid redundant queries.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

### Step 1a: Read bank profile
```
Read .claude/config/bank-profile.yaml
```

### Step 1b: Verify database connectivity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "SELECT 'DQ_CONNECTED';"
```
If this fails, HALT with: "Cannot connect to PostgreSQL."

### Step 1c: Read data dictionary
```
Read facility-summary-mvp/output/data-dictionary/data-dictionary.json
```
Parse the L2 array for table names and field definitions.

---

## 2. Profiling Queries

Run these queries sequentially against PostgreSQL. Store all results.

### 2a: Row Counts
```sql
SELECT schemaname, relname AS table_name, n_live_tup::bigint AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'l2'
ORDER BY relname;
```

### 2b: Column Statistics (from pg_stats)
```sql
SELECT schemaname, tablename, attname AS column_name,
       null_frac, n_distinct,
       most_common_vals::text AS common_vals,
       most_common_freqs::text AS common_freqs
FROM pg_stats
WHERE schemaname = 'l2'
ORDER BY tablename, attname;
```

### 2c: Column Metadata (from information_schema)
```sql
SELECT table_name, column_name, data_type,
       character_maximum_length, numeric_precision, numeric_scale,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'l2'
ORDER BY table_name, ordinal_position;
```

### 2d: Primary Key Catalog
```sql
SELECT tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'l2'
ORDER BY tc.table_name, kcu.ordinal_position;
```

### 2e: Foreign Key Catalog
```sql
SELECT tc.table_name AS child_table,
       kcu.column_name AS child_column,
       ccu.table_schema AS parent_schema,
       ccu.table_name AS parent_table,
       ccu.column_name AS parent_column,
       tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'l2'
ORDER BY tc.table_name, kcu.column_name;
```

### 2f: Empty Tables Detection
```sql
SELECT schemaname, relname AS table_name
FROM pg_stat_user_tables
WHERE schemaname = 'l2' AND n_live_tup = 0
ORDER BY relname;
```

### 2g: Date Range Coverage (for snapshot tables)
```sql
SELECT 'facility_exposure_snapshot' AS table_name, MIN(as_of_date) AS min_date, MAX(as_of_date) AS max_date, COUNT(DISTINCT as_of_date) AS date_count FROM l2.facility_exposure_snapshot
UNION ALL
SELECT 'facility_risk_snapshot', MIN(as_of_date), MAX(as_of_date), COUNT(DISTINCT as_of_date) FROM l2.facility_risk_snapshot
UNION ALL
SELECT 'facility_pricing_snapshot', MIN(as_of_date), MAX(as_of_date), COUNT(DISTINCT as_of_date) FROM l2.facility_pricing_snapshot
UNION ALL
SELECT 'facility_financial_snapshot', MIN(as_of_date), MAX(as_of_date), COUNT(DISTINCT as_of_date) FROM l2.facility_financial_snapshot
UNION ALL
SELECT 'facility_delinquency_snapshot', MIN(as_of_date), MAX(as_of_date), COUNT(DISTINCT as_of_date) FROM l2.facility_delinquency_snapshot
UNION ALL
SELECT 'counterparty_rating_observation', MIN(as_of_date), MAX(as_of_date), COUNT(DISTINCT as_of_date) FROM l2.counterparty_rating_observation
UNION ALL
SELECT 'collateral_snapshot', MIN(as_of_date), MAX(as_of_date), COUNT(DISTINCT as_of_date) FROM l2.collateral_snapshot
UNION ALL
SELECT 'facility_profitability_snapshot', MIN(as_of_date), MAX(as_of_date), COUNT(DISTINCT as_of_date) FROM l2.facility_profitability_snapshot
ORDER BY table_name;
```

---

## 3. Output

Compile all query results into a structured JSON and save to:
`.claude/audit/dq-baseline/baseline-profile.json`

Structure:
```json
{
  "profile_timestamp": "ISO8601",
  "database": "connection_host",
  "tables": {
    "l2.table_name": {
      "row_count": N,
      "columns": {
        "column_name": {
          "data_type": "BIGINT",
          "is_nullable": "YES",
          "null_frac": 0.05,
          "n_distinct": 42,
          "common_vals": ["val1", "val2"],
          "common_freqs": [0.3, 0.2]
        }
      },
      "primary_key": ["col1", "col2"],
      "foreign_keys": [
        { "column": "facility_id", "references": "l2.facility_master(facility_id)" }
      ],
      "date_range": { "min": "2024-01-31", "max": "2025-01-31", "count": 13 }
    }
  },
  "summary": {
    "total_tables": N,
    "total_rows": N,
    "empty_tables": ["table1", "table2"],
    "tables_with_data": N
  }
}
```

Present a summary table to the user:
```
| Table | Rows | Columns | Empty Cols | Date Range |
|-------|------|---------|-----------|------------|
```

---

## 4. Safety Rules

- Read-only queries only (SELECT, no modifications)
- If any query fails, log the error and continue with remaining queries
- Do not expose DATABASE_URL or credentials in output
