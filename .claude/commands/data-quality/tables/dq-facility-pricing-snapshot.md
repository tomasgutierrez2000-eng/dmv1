---
description: "DQ Facility Pricing Snapshot — deep-dive data quality review for l2.facility_pricing_snapshot"
---

# DQ Facility Pricing Snapshot Review

You are a **per-table data quality agent** reviewing `l2.facility_pricing_snapshot` in the GSIB credit risk PostgreSQL database. This table contains facility-level pricing data (base rates, spreads, all-in rates, pricing tiers, exception flags). It feeds pricing metrics (PRC-001 through PRC-009) and profitability calculations.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

### Step 1: Read Configuration
```
Read .claude/config/bank-profile.yaml
```

### Step 2: Read Data Dictionary
```
Read facility-summary-mvp/output/data-dictionary/data-dictionary.json
```
Parse `l2` array for `facility_pricing_snapshot` table definition.

### Step 3: Read CLAUDE.md Conventions
Grep for:
- Data Type Rules (suffix -> type, especially _bps)
- Benchmark Rate Transition Rules
- Common YAML Formula Bugs (wrong boolean compare, wrong field name)

### Step 4: Load Baseline Profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Table Profile

| Property | Value |
|----------|-------|
| Schema.Table | `l2.facility_pricing_snapshot` |
| Expected rows | One per facility per reporting date |
| Primary key | Composite: `(facility_id, as_of_date)` or `(facility_pricing_snapshot_id)` |
| Key FKs OUT | `facility_id` -> `l2.facility_master`, `pricing_tier_code` -> `l1.pricing_tier_dim` (if exists), `benchmark_rate_id` -> `l1.benchmark_rate_index` (if exists) |
| Key FKs IN | Consumed by PRC-* pricing metrics, profitability calculations |
| Business meaning | Point-in-time pricing parameters for each facility — base rate, spread, all-in rate, pricing tier, exception status. |

---

## 3. Dimension Checks

### 3A. Schema Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_pricing_snapshot'
ORDER BY ordinal_position;
EOSQL
```

### 3B. Primary Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT 'total_rows', COUNT(*) FROM l2.facility_pricing_snapshot
UNION ALL
SELECT 'distinct_fac_date', COUNT(*) FROM (
  SELECT DISTINCT facility_id, as_of_date FROM l2.facility_pricing_snapshot
) t;
EOSQL
```

### 3C. Foreign Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Orphaned facility_id
SELECT 'orphan_facility', COUNT(DISTINCT fps.facility_id)
FROM l2.facility_pricing_snapshot fps
LEFT JOIN l2.facility_master fm ON fps.facility_id = fm.facility_id
WHERE fm.facility_id IS NULL;
EOSQL
```

### 3D. Null Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT col, nulls, total, ROUND(100.0 * nulls / NULLIF(total, 0), 2) AS null_pct FROM (
  SELECT 'all_in_rate_bps' AS col, COUNT(*) FILTER (WHERE all_in_rate_bps IS NULL) AS nulls, COUNT(*) AS total FROM l2.facility_pricing_snapshot
  UNION ALL SELECT 'base_rate_bps', COUNT(*) FILTER (WHERE base_rate_bps IS NULL), COUNT(*) FROM l2.facility_pricing_snapshot
  UNION ALL SELECT 'spread_bps', COUNT(*) FILTER (WHERE spread_bps IS NULL), COUNT(*) FROM l2.facility_pricing_snapshot
  UNION ALL SELECT 'pricing_tier_code', COUNT(*) FILTER (WHERE pricing_tier_code IS NULL), COUNT(*) FROM l2.facility_pricing_snapshot
  UNION ALL SELECT 'is_pricing_exception_flag', COUNT(*) FILTER (WHERE is_pricing_exception_flag IS NULL), COUNT(*) FROM l2.facility_pricing_snapshot
) t;
EOSQL
```

### 3E-3F. Distribution
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Pricing tier distribution
SELECT pricing_tier_code, COUNT(*) FROM l2.facility_pricing_snapshot
WHERE pricing_tier_code IS NOT NULL
GROUP BY pricing_tier_code ORDER BY COUNT(*) DESC;

-- Spread distribution (decile buckets)
SELECT
  CASE
    WHEN spread_bps < 50 THEN '<50 bps'
    WHEN spread_bps < 100 THEN '50-100 bps'
    WHEN spread_bps < 200 THEN '100-200 bps'
    WHEN spread_bps < 300 THEN '200-300 bps'
    WHEN spread_bps < 500 THEN '300-500 bps'
    ELSE '>500 bps'
  END AS spread_bucket,
  COUNT(*) AS count
FROM l2.facility_pricing_snapshot
WHERE spread_bps IS NOT NULL
GROUP BY 1 ORDER BY MIN(spread_bps);

-- Snapshot date distribution
SELECT as_of_date, COUNT(*) FROM l2.facility_pricing_snapshot GROUP BY as_of_date ORDER BY as_of_date;
EOSQL
```

### 3G-3J. (Temporal, Bounds, Booleans, Cross-Table)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Bounds
SELECT
  MIN(all_in_rate_bps) AS min_air, MAX(all_in_rate_bps) AS max_air,
  MIN(base_rate_bps) AS min_base, MAX(base_rate_bps) AS max_base,
  MIN(spread_bps) AS min_spread, MAX(spread_bps) AS max_spread,
  COUNT(*) FILTER (WHERE spread_bps < 0) AS negative_spread,
  COUNT(*) FILTER (WHERE base_rate_bps < 0) AS negative_base
FROM l2.facility_pricing_snapshot;

-- Boolean: is_pricing_exception_flag
SELECT
  COUNT(*) FILTER (WHERE is_pricing_exception_flag = true) AS exception_true,
  COUNT(*) FILTER (WHERE is_pricing_exception_flag = false) AS exception_false,
  COUNT(*) FILTER (WHERE is_pricing_exception_flag IS NULL) AS exception_null,
  COUNT(*) AS total
FROM l2.facility_pricing_snapshot;
EOSQL
```

---

## 4. Business Rule Checks (Pricing Snapshot Specific)

### 4A. All-In Rate = Base Rate + Spread (Additive Check)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- all_in_rate_bps should approximately equal base_rate_bps + spread_bps
SELECT facility_id, as_of_date,
  all_in_rate_bps, base_rate_bps, spread_bps,
  base_rate_bps + spread_bps AS expected_all_in,
  ABS(all_in_rate_bps - (base_rate_bps + spread_bps)) AS delta_bps
FROM l2.facility_pricing_snapshot
WHERE all_in_rate_bps IS NOT NULL
  AND base_rate_bps IS NOT NULL
  AND spread_bps IS NOT NULL
  AND ABS(all_in_rate_bps - (base_rate_bps + spread_bps)) > 5
ORDER BY delta_bps DESC
LIMIT 20;
EOSQL
```
**Severity:** HIGH if delta > 50 bps. MEDIUM if 5-50 bps (may include fees).

### 4B. Spread Positive for Most Facilities
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  COUNT(*) FILTER (WHERE spread_bps > 0) AS positive_spread,
  COUNT(*) FILTER (WHERE spread_bps = 0) AS zero_spread,
  COUNT(*) FILTER (WHERE spread_bps < 0) AS negative_spread,
  COUNT(*) FILTER (WHERE spread_bps IS NULL) AS null_spread,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE spread_bps <= 0 OR spread_bps IS NULL) / COUNT(*), 2) AS non_positive_pct
FROM l2.facility_pricing_snapshot;
EOSQL
```
**Severity:** MEDIUM if >30% zero/negative spreads. Banks rarely lend at or below base rate.

### 4C. Base Rate Non-Negative
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, as_of_date, base_rate_bps
FROM l2.facility_pricing_snapshot
WHERE base_rate_bps < 0
LIMIT 20;
EOSQL
```
**Severity:** LOW in current rate environment. Negative rates were valid in EUR/JPY pre-2022.

### 4D. Pricing Exception Flag Diversity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Exception rate should be <15% for healthy portfolio (OCC 2020-36)
SELECT
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_pricing_exception_flag = true)
    / NULLIF(COUNT(*) FILTER (WHERE is_pricing_exception_flag IS NOT NULL), 0), 2) AS exception_rate_pct,
  COUNT(*) FILTER (WHERE is_pricing_exception_flag = true) AS exceptions,
  COUNT(*) FILTER (WHERE is_pricing_exception_flag IS NOT NULL) AS total_with_flag
FROM l2.facility_pricing_snapshot;
EOSQL
```
**Severity:** MEDIUM if exception_rate = 0% (no diversity, PRC-003 metric returns trivial 0).

### 4E. Spread vs Risk Rating Correlation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Higher risk should correlate with higher spread
SELECT frs.internal_risk_rating,
  COUNT(*) AS count,
  ROUND(AVG(fps.spread_bps), 2) AS avg_spread_bps,
  ROUND(MIN(fps.spread_bps), 2) AS min_spread,
  ROUND(MAX(fps.spread_bps), 2) AS max_spread
FROM l2.facility_pricing_snapshot fps
JOIN l2.facility_risk_snapshot frs
  ON fps.facility_id = frs.facility_id AND fps.as_of_date = frs.as_of_date
WHERE fps.spread_bps IS NOT NULL AND frs.internal_risk_rating IS NOT NULL
GROUP BY frs.internal_risk_rating
ORDER BY avg_spread_bps;
EOSQL
```
**Severity:** LOW. Correlation is expected but not mandatory (relationship pricing, client tiers).

### 4F. Pricing Tier Code Validity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Check if pricing_tier_code values exist in dim table (if one exists)
SELECT fps.pricing_tier_code, COUNT(*)
FROM l2.facility_pricing_snapshot fps
WHERE fps.pricing_tier_code IS NOT NULL
GROUP BY fps.pricing_tier_code
ORDER BY fps.pricing_tier_code;
EOSQL
```
**Severity:** MEDIUM if invalid codes found.

### 4G. Extreme Rate Values
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Flag unrealistic rates (>5000 bps = 50% all-in rate)
SELECT facility_id, as_of_date, all_in_rate_bps, base_rate_bps, spread_bps
FROM l2.facility_pricing_snapshot
WHERE all_in_rate_bps > 5000 OR spread_bps > 3000
ORDER BY all_in_rate_bps DESC
LIMIT 10;
EOSQL
```
**Severity:** MEDIUM. Rates >50% are unusual outside distressed debt.

### 4H. Temporal Consistency of Exception Flag
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Exception flag should be consistent across dates for same facility
-- (unless a pricing review changed it)
SELECT facility_id,
  COUNT(DISTINCT is_pricing_exception_flag) AS distinct_flag_values,
  ARRAY_AGG(DISTINCT is_pricing_exception_flag ORDER BY is_pricing_exception_flag) AS flag_values
FROM l2.facility_pricing_snapshot
WHERE is_pricing_exception_flag IS NOT NULL
GROUP BY facility_id
HAVING COUNT(DISTINCT is_pricing_exception_flag) > 1;
EOSQL
```
**Severity:** LOW. Flag changes are valid (pricing review events) but should be rare.

---

## 5. Fix Procedures

### Fix: All-In Rate Recalculation
```sql
UPDATE l2.facility_pricing_snapshot
SET all_in_rate_bps = base_rate_bps + spread_bps
WHERE ABS(all_in_rate_bps - (base_rate_bps + spread_bps)) > 50
  AND base_rate_bps IS NOT NULL AND spread_bps IS NOT NULL;
```

### Fix: Missing Exception Flag
```sql
UPDATE l2.facility_pricing_snapshot
SET is_pricing_exception_flag = false
WHERE is_pricing_exception_flag IS NULL;
```

---

## 6. Output Format

Return standard DQ output JSON per template. Finding IDs use prefix `DQ-FPS-NNN` (e.g., `DQ-FPS-001`).
