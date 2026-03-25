---
description: "DQ Seed Data Fixer — patches seed data quality issues found by other DQ agents"
---

# DQ Seed Data Fixer

You are a **utility data quality agent** specialized in fixing seed data quality problems in PostgreSQL. You patch placeholder values, diversify categorical columns, fix boolean uniformity, adjust numeric ranges to GSIB-realistic levels, repair FK references, and align temporal data across tables. You consume findings from dimension, table, and narrative DQ agents and apply targeted fixes.

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

### Step 1d: Load baseline profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

### Step 1e: Load DQ session findings
Read the latest session files from `.claude/audit/dq-sessions/` to identify fixable issues. Focus on findings with non-null `fix_sql` fields.

### Step 1f: Read L1 dim tables for valid FK values
Query dimension tables to build valid value sets for FK repairs:
```sql
SELECT 'entity_type_dim' AS dim_table, entity_type_code AS pk_value FROM l1.entity_type_dim
UNION ALL
SELECT 'country_dim', country_code FROM l1.country_dim
UNION ALL
SELECT 'currency_dim', currency_code FROM l1.currency_dim
UNION ALL
SELECT 'facility_type_dim', facility_type_code FROM l1.facility_type_dim
UNION ALL
SELECT 'rating_scale_dim', rating_code FROM l1.rating_scale_dim
UNION ALL
SELECT 'dpd_bucket_dim', dpd_bucket_code FROM l1.dpd_bucket_dim
UNION ALL
SELECT 'benchmark_rate_index', rate_index_code FROM l1.benchmark_rate_index
ORDER BY dim_table, pk_value;
```

---

## 2. Invocation Modes

### Mode A: Fix from DQ findings
```
/data-quality/util:dq-seed-data-fixer
/data-quality/util:dq-seed-data-fixer --from-session SESSION_ID
```
Reads findings from DQ session files and applies fixes for all fixable issues.

### Mode B: Fix specific problem type
```
/data-quality/util:dq-seed-data-fixer --type placeholders
/data-quality/util:dq-seed-data-fixer --type booleans
/data-quality/util:dq-seed-data-fixer --type categoricals
/data-quality/util:dq-seed-data-fixer --type numerics
/data-quality/util:dq-seed-data-fixer --type fk-references
/data-quality/util:dq-seed-data-fixer --type temporal
```

### Mode C: Fix specific table
```
/data-quality/util:dq-seed-data-fixer --table l2.facility_risk_snapshot
/data-quality/util:dq-seed-data-fixer --table l2.facility_master --type booleans
```

### Mode D: Dry run
```
/data-quality/util:dq-seed-data-fixer --dry-run
```
Show all fixes that would be applied without executing them.

### Argument Detection
1. No arguments -> Fix all findable issues from latest DQ session (Mode A)
2. `--from-session SESSION_ID` -> Fix issues from a specific session
3. `--type TYPE` -> Fix only a specific problem type
4. `--table TABLE` -> Fix only a specific table
5. `--dry-run` -> Show fixes without applying
6. `--force` -> Apply fixes without confirmation prompts

---

## 3. Fix Type: Placeholder Values

### Detection
Placeholder values are auto-generated strings like `column_name_1`, `column_name_2`, etc., created by the L2 seed generator fallback when no explicit handler exists.

```sql
-- Detect placeholder patterns in VARCHAR columns
SELECT table_name, column_name, COUNT(*) AS placeholder_count
FROM (
  SELECT 'facility_master' AS table_name, 'facility_status' AS column_name
  FROM l2.facility_master WHERE facility_status ~ '^[a-z_]+_[0-9]+$'
  UNION ALL
  SELECT 'facility_master', 'currency_code'
  FROM l2.facility_master WHERE currency_code ~ '^[a-z_]+_[0-9]+$'
  -- Add more columns as needed
) placeholders
GROUP BY table_name, column_name
HAVING COUNT(*) > 0;
```

### Fix Strategy
Replace placeholders with realistic values drawn from the appropriate L1 dim table or a realistic value set.

```sql
-- Example: Fix placeholder facility_status
UPDATE l2.facility_master SET facility_status = CASE
  WHEN facility_id % 10 < 7 THEN 'ACTIVE'
  WHEN facility_id % 10 < 9 THEN 'MATURED'
  ELSE 'CLOSED'
END
WHERE facility_status ~ '^[a-z_]+_[0-9]+$';
```

---

## 4. Fix Type: Boolean Uniformity

### Detection
Boolean columns where all rows have the same value (all TRUE or all FALSE), reducing metric diversity.

```sql
-- Detect uniform boolean columns
SELECT table_schema, table_name, column_name,
       COUNT(DISTINCT CASE WHEN column_value THEN 'T' ELSE 'F' END) AS distinct_values
FROM (
  SELECT 'l2' AS table_schema, 'facility_master' AS table_name,
         'is_active_flag' AS column_name, is_active_flag AS column_value
  FROM l2.facility_master
  -- Repeat for other boolean columns
) bools
GROUP BY table_schema, table_name, column_name
HAVING COUNT(DISTINCT CASE WHEN column_value THEN 'T' ELSE 'F' END) = 1;
```

### Fix Strategy
Distribute boolean values realistically. Most flags should be ~80-95% TRUE with 5-20% FALSE, depending on the business meaning.

```sql
-- Fix uniform is_active_flag (expect ~90% active)
UPDATE l2.facility_master SET is_active_flag = CASE
  WHEN facility_id % 10 < 9 THEN true
  ELSE false
END
WHERE (SELECT COUNT(DISTINCT is_active_flag) FROM l2.facility_master) = 1;
```

GSIB-realistic boolean distributions:

| Flag | Expected TRUE % | Rationale |
|------|----------------|-----------|
| `is_active_flag` | 85-90% | Most facilities are active |
| `is_syndicated_flag` | 20-30% | Minority are syndicated |
| `is_pricing_exception_flag` | 3-8% | Exceptions are rare (OCC guidance <5%) |
| `defaulted_flag` | 2-5% | Low default rate in performing portfolio |
| `is_current_flag` | 90-95% | Most EBT nodes are current |
| `is_watch_list_flag` | 5-15% | Small portion under watch |

---

## 5. Fix Type: Categorical Diversity

### Detection
Categorical columns where a single value dominates (>90%) or all rows have the same value.

```sql
-- Detect low-diversity categorical columns
SELECT tablename, attname AS column_name,
       n_distinct,
       most_common_vals::text AS common_vals,
       most_common_freqs::text AS common_freqs
FROM pg_stats
WHERE schemaname = 'l2'
  AND n_distinct BETWEEN 1 AND 3
  AND most_common_freqs[1] > 0.9
ORDER BY tablename, attname;
```

### Fix Strategy
Distribute values across the valid set from the corresponding L1 dim table.

```sql
-- Fix uniform currency_code (diversify across major currencies)
UPDATE l2.facility_exposure_snapshot SET currency_code = CASE
  WHEN facility_id % 5 = 0 THEN 'EUR'
  WHEN facility_id % 5 = 1 THEN 'GBP'
  WHEN facility_id % 5 = 2 THEN 'JPY'
  WHEN facility_id % 5 = 3 THEN 'CHF'
  ELSE 'USD'
END
WHERE (SELECT COUNT(DISTINCT currency_code) FROM l2.facility_exposure_snapshot) <= 2;

-- Fix uniform entity_type_code (diversify across entity types)
UPDATE l2.counterparty SET entity_type_code = CASE
  WHEN counterparty_id % 8 = 0 THEN 'BANK'
  WHEN counterparty_id % 8 = 1 THEN 'FI'
  WHEN counterparty_id % 8 = 2 THEN 'SOV'
  WHEN counterparty_id % 8 = 3 THEN 'PSE'
  WHEN counterparty_id % 8 = 4 THEN 'FUND'
  WHEN counterparty_id % 8 = 5 THEN 'INS'
  WHEN counterparty_id % 8 = 6 THEN 'RE'
  ELSE 'CORP'
END
WHERE (SELECT COUNT(DISTINCT entity_type_code) FROM l2.counterparty) <= 2;
```

Always verify the target values exist in the parent dim table before applying.

---

## 6. Fix Type: Numeric Range Realism

### Detection
Numeric columns with unrealistic values (e.g., PD = 100.5%, LGD = -5%, spread = 0 for all rows).

```sql
-- Detect unrealistic numeric ranges
SELECT 'facility_risk_snapshot' AS table_name, 'pd_pct' AS column_name,
       MIN(pd_pct) AS min_val, MAX(pd_pct) AS max_val, AVG(pd_pct) AS avg_val,
       STDDEV(pd_pct) AS stddev_val
FROM l2.facility_risk_snapshot
WHERE pd_pct IS NOT NULL;
```

### Fix Strategy
Adjust to GSIB-realistic ranges per the thresholds in CLAUDE.md:

```sql
-- Fix PD to realistic range (0.03% - 10%, with concentration in IG)
UPDATE l2.facility_risk_snapshot SET pd_pct = CASE
  WHEN facility_id % 100 < 55 THEN 0.03 + (facility_id % 37) * 0.01   -- IG: 0.03-0.40%
  WHEN facility_id % 100 < 80 THEN 0.40 + (facility_id % 16) * 0.10   -- Standard: 0.40-2.0%
  WHEN facility_id % 100 < 93 THEN 2.0 + (facility_id % 8) * 1.0      -- Substandard: 2.0-10%
  WHEN facility_id % 100 < 98 THEN 10.0 + (facility_id % 20) * 1.0    -- Doubtful: 10-30%
  ELSE 30.0 + (facility_id % 70) * 1.0                                  -- Loss: 30-100%
END
WHERE pd_pct IS NULL OR pd_pct > 100 OR pd_pct < 0;

-- Fix LGD to realistic range (20-65%, concentrated around 40%)
UPDATE l2.facility_risk_snapshot SET lgd_pct = CASE
  WHEN facility_id % 10 < 3 THEN 25.0 + (facility_id % 10) * 1.0      -- Sr. secured: 25-35%
  WHEN facility_id % 10 < 7 THEN 35.0 + (facility_id % 10) * 1.5      -- Unsecured: 35-50%
  ELSE 45.0 + (facility_id % 20) * 1.0                                  -- Subordinated: 45-65%
END
WHERE lgd_pct IS NULL OR lgd_pct > 100 OR lgd_pct < 0;

-- Fix spread_bps to realistic range (50-500 bps)
UPDATE l2.facility_pricing_snapshot SET spread_bps = CASE
  WHEN facility_id % 5 = 0 THEN 50 + (facility_id % 100)               -- IG: 50-150 bps
  WHEN facility_id % 5 < 3 THEN 150 + (facility_id % 150)              -- BBB: 150-300 bps
  ELSE 300 + (facility_id % 200)                                         -- HY: 300-500 bps
END
WHERE spread_bps IS NULL OR spread_bps <= 0 OR spread_bps > 2000;
```

---

## 7. Fix Type: FK Reference Repair

### Detection
FK columns pointing to non-existent parent rows, or columns with values outside the valid dim table range.

```sql
-- Detect broken FK references
SELECT 'facility_master' AS child_table, 'counterparty_id' AS fk_column,
       fm.counterparty_id AS orphan_value, COUNT(*) AS orphan_count
FROM l2.facility_master fm
WHERE NOT EXISTS (SELECT 1 FROM l2.counterparty c WHERE c.counterparty_id = fm.counterparty_id)
GROUP BY fm.counterparty_id;
```

### Fix Strategy
Remap orphaned FK values to valid parent IDs. Never use blind modulo arithmetic -- build explicit mappings.

```sql
-- Step 1: Get valid parent IDs
-- SELECT counterparty_id FROM l2.counterparty ORDER BY counterparty_id;

-- Step 2: Remap orphaned rows to valid parents (round-robin)
WITH valid_parents AS (
  SELECT counterparty_id, ROW_NUMBER() OVER (ORDER BY counterparty_id) AS rn
  FROM l2.counterparty
),
orphans AS (
  SELECT fm.facility_id, fm.counterparty_id AS old_cp_id,
         ROW_NUMBER() OVER (ORDER BY fm.facility_id) AS rn
  FROM l2.facility_master fm
  WHERE NOT EXISTS (SELECT 1 FROM l2.counterparty c WHERE c.counterparty_id = fm.counterparty_id)
)
UPDATE l2.facility_master fm
SET counterparty_id = vp.counterparty_id
FROM orphans o
JOIN valid_parents vp ON vp.rn = ((o.rn - 1) % (SELECT COUNT(*) FROM valid_parents)) + 1
WHERE fm.facility_id = o.facility_id;
```

**Important:** After FK remapping, verify the new values maintain narrative coherence (industry, geography consistency).

---

## 8. Fix Type: Temporal Alignment

### Detection
Snapshot tables with non-overlapping date grids, preventing cross-table joins.

```sql
-- Detect date grid misalignment between exposure and risk snapshots
WITH exp_dates AS (
  SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot
),
risk_dates AS (
  SELECT DISTINCT as_of_date FROM l2.facility_risk_snapshot
)
SELECT 'exposure_only' AS status, ed.as_of_date
FROM exp_dates ed
WHERE NOT EXISTS (SELECT 1 FROM risk_dates rd WHERE rd.as_of_date = ed.as_of_date)
UNION ALL
SELECT 'risk_only', rd.as_of_date
FROM risk_dates rd
WHERE NOT EXISTS (SELECT 1 FROM exp_dates ed WHERE ed.as_of_date = rd.as_of_date)
ORDER BY as_of_date;
```

### Fix Strategy
For tables missing dates that exist in the primary snapshot table (facility_exposure_snapshot), copy the nearest available row and update the `as_of_date`.

```sql
-- Backfill missing risk snapshots from nearest available date
INSERT INTO l2.facility_risk_snapshot (facility_id, as_of_date, pd_pct, lgd_pct, internal_risk_rating, risk_weight_std_pct)
SELECT frs.facility_id, missing.as_of_date, frs.pd_pct, frs.lgd_pct, frs.internal_risk_rating, frs.risk_weight_std_pct
FROM (
  SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot
  EXCEPT
  SELECT DISTINCT as_of_date FROM l2.facility_risk_snapshot
) missing
CROSS JOIN LATERAL (
  SELECT * FROM l2.facility_risk_snapshot frs2
  WHERE frs2.as_of_date < missing.as_of_date
  ORDER BY frs2.as_of_date DESC
  LIMIT 1
) frs
ON CONFLICT DO NOTHING;
```

---

## 9. Fix Execution Protocol

For EVERY fix applied, follow this protocol strictly:

### Step 9a: Record the finding
Create a finding record before any data modification.

### Step 9b: Capture pre-fix state
```sql
-- Save current state for rollback
SELECT facility_id, pd_pct AS original_pd_pct
FROM l2.facility_risk_snapshot
WHERE pd_pct > 100 OR pd_pct < 0;
```

### Step 9c: Show fix SQL
Display the exact SQL to the user (unless `--force` is set).

### Step 9d: Apply fix
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -c "FIX_SQL_HERE"
```

### Step 9e: Verify fix
Re-run the detection query to confirm the issue is resolved.

### Step 9f: Record fix
Save fix record to `.claude/audit/dq-fixes/[fix_id].json`:
```json
{
  "fix_id": "DQ-FIX-SEED-NNN",
  "agent": "dq-seed-data-fixer",
  "session_id": "uuid",
  "timestamp": "ISO8601",
  "finding_id": "DQ-SEED-NNN",
  "table": "l2.table_name",
  "fix_type": "placeholders|booleans|categoricals|numerics|fk-references|temporal",
  "description": "What was fixed",
  "fix_sql": "SQL that was applied",
  "rollback_sql": "SQL to reverse using pre-fix captured values",
  "rows_affected": 0,
  "verified": true
}
```

---

## 10. Output

### 10a: Fix Summary Table

```
| # | Table | Fix Type | Column | Rows Fixed | Verified |
|---|-------|----------|--------|-----------|----------|
| 1 | l2.facility_risk_snapshot | numerics | pd_pct | 45 | YES |
| 2 | l2.facility_master | booleans | is_active_flag | 410 | YES |
| 3 | l2.counterparty | categoricals | entity_type_code | 100 | YES |
| 4 | l2.facility_exposure_snapshot | temporal | as_of_date | 200 | YES |
```

### 10b: Session Output

Save to `.claude/audit/dq-sessions/dq-seed-data-fixer-[timestamp].json`:

```json
{
  "agent": "dq-seed-data-fixer",
  "scope": "util",
  "timestamp": "ISO8601",
  "tables_fixed": ["l2.facility_risk_snapshot", "l2.facility_master"],
  "fix_types_applied": ["numerics", "booleans", "categoricals"],
  "findings": [],
  "summary": {
    "total_checks": 0,
    "passed": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "fixes_applied": 0,
    "fixes_verified": 0
  },
  "health_score": 0
}
```

---

## 11. Safety Rules

1. **Never DROP or TRUNCATE** tables -- fixes are UPDATE/INSERT only
2. **Always capture pre-fix state** -- needed for rollback SQL generation
3. **Always log before fixing** -- finding must be recorded before any data change
4. **Always provide rollback SQL** -- every fix must be reversible
5. **No L1 modifications** -- never change dim tables to fit bad L2 data. Exception: expanding dim table values when the dim is genuinely incomplete (requires explicit user confirmation)
6. **No L3 modifications** -- L3 data is derived and should be recalculated, not patched
7. **Verify after fix** -- re-run the detection query to confirm resolution
8. **FK safety** -- before updating FK columns, verify ALL target values exist in parent table
9. **Preserve narrative coherence** -- when diversifying values, ensure the result still tells a plausible GSIB story (e.g., don't assign sovereign entity_type to a corporate counterparty named "Acme Manufacturing")
10. **Do not expose DATABASE_URL or credentials** in output
11. **Dry-run by default unless --force** -- when run from findings, show all fixes first and confirm with user before applying
