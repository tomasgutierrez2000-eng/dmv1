---
description: "DQ FX Rate — validates exchange rates, major pair coverage, reciprocal consistency, and exposure currency coverage in l2.fx_rate"
---

# DQ FX Rate

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You perform a deep-dive review of `l2.fx_rate` — the table that stores foreign exchange conversion rates used to translate multi-currency exposures to a common reporting currency (typically USD). FX rate data is CRITICAL for all aggregate-level metric calculations. Zero, negative, or missing rates silently corrupt exposure aggregations, capital calculations, and regulatory reports. A single bad FX rate can misstate billions in exposure.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — parse the L2 entry for `fx_rate` to get all column names, types, PKs, and FKs
3. Read `CLAUDE.md` sections on "FX Conversion Pattern" and "FK Referential Integrity Rules"
4. If a baseline profile exists at `.claude/audit/dq-baselines/fx-rate.json`, load it for delta comparison

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/tables:dq-fx-rate
/data-quality/tables:dq-fx-rate --fix
```

### Mode B: Orchestrator
Receives JSON payload:
```json
{
  "mode": "orchestrator",
  "fix_mode": false
}
```

If `$ARGUMENTS` contains `--fix`, execute fix procedures after reporting. Otherwise, report only.

---

## 3. Check Procedures

### 3A. Row Count and Basic Profile

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT COUNT(*) AS total_rows,
       COUNT(DISTINCT from_currency_code) AS distinct_from,
       COUNT(DISTINCT to_currency_code) AS distinct_to,
       COUNT(DISTINCT as_of_date) AS distinct_dates,
       MIN(as_of_date) AS earliest_date,
       MAX(as_of_date) AS latest_date,
       COUNT(*) FILTER (WHERE rate IS NULL) AS null_rates,
       COUNT(*) FILTER (WHERE rate <= 0) AS non_positive_rates
FROM l2.fx_rate;
"
```

**Severity rules:**
- CRITICAL if `total_rows = 0` (no FX rate data — all aggregate metrics will fail)
- CRITICAL if `non_positive_rates > 0` (rate must always be > 0)
- CRITICAL if `null_rates > 0` (rate is the core field)

### 3B. Rate Positivity (CRITICAL CHECK)

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT from_currency_code, to_currency_code, as_of_date, rate
FROM l2.fx_rate
WHERE rate <= 0 OR rate IS NULL
LIMIT 20;
"
```

**Severity:** CRITICAL for every row with rate <= 0 or NULL. This is a data-breaking issue.

### 3C. Same-Currency Pair Check

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT from_currency_code, to_currency_code, as_of_date, rate
FROM l2.fx_rate
WHERE from_currency_code = to_currency_code
LIMIT 20;
"
```

**Severity:**
- MEDIUM if same-currency pairs exist with rate != 1.0 (identity rate should be exactly 1)
- LOW if same-currency pairs exist with rate = 1.0 (unnecessary but harmless)

### 3D. Currency Code Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'from_currency' AS direction, fx.from_currency_code AS code, COUNT(*) AS cnt
FROM l2.fx_rate fx
LEFT JOIN l1.currency_dim cd ON fx.from_currency_code = cd.currency_code
WHERE cd.currency_code IS NULL
GROUP BY fx.from_currency_code
UNION ALL
SELECT 'to_currency' AS direction, fx.to_currency_code AS code, COUNT(*) AS cnt
FROM l2.fx_rate fx
LEFT JOIN l1.currency_dim cd ON fx.to_currency_code = cd.currency_code
WHERE cd.currency_code IS NULL
GROUP BY fx.to_currency_code
ORDER BY cnt DESC;
"
```

**Severity:** HIGH if currency codes do not exist in `l1.currency_dim`.

### 3E. Major Pair Coverage

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
WITH required_pairs AS (
  SELECT unnest(ARRAY[
    'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'SGD', 'HKD', 'BRL', 'INR', 'KRW', 'MXN'
  ]) AS currency
),
existing AS (
  SELECT DISTINCT from_currency_code
  FROM l2.fx_rate
  WHERE to_currency_code = 'USD'
)
SELECT rp.currency AS missing_to_usd_pair
FROM required_pairs rp
LEFT JOIN existing e ON rp.currency = e.from_currency_code
WHERE e.from_currency_code IS NULL;
EOSQL
```

**Severity:**
- HIGH if any of EUR, GBP, JPY, CHF are missing (G4 currencies are essential)
- MEDIUM if other major currencies are missing

### 3F. Rate Realism by Currency Pair

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT from_currency_code, to_currency_code,
       MIN(rate) AS min_rate,
       MAX(rate) AS max_rate,
       AVG(rate) AS avg_rate,
       COUNT(*) AS obs_count
FROM l2.fx_rate
WHERE to_currency_code = 'USD'
GROUP BY from_currency_code, to_currency_code
ORDER BY from_currency_code;
"
```

**Expected realistic ranges (to USD):**

| Pair | Approximate Range | Suspicious If |
|------|------------------|---------------|
| EUR/USD | 0.85 - 1.25 | < 0.5 or > 2.0 |
| GBP/USD | 1.0 - 1.6 | < 0.5 or > 2.5 |
| USD/JPY | 100 - 160 | < 50 or > 300 |
| USD/CHF | 0.8 - 1.1 | < 0.3 or > 2.0 |
| USD/CAD | 1.2 - 1.5 | < 0.5 or > 3.0 |
| USD/BRL | 4.0 - 6.0 | < 1.0 or > 10.0 |

**Severity:**
- HIGH if any rate is wildly outside expected range (possible decimal point error)
- MEDIUM if rates are static across all dates (no variation at all)

### 3G. Reciprocal Rate Consistency

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT a.from_currency_code, a.to_currency_code, a.as_of_date,
       a.rate AS forward_rate,
       b.rate AS reverse_rate,
       ROUND((a.rate * b.rate)::numeric, 6) AS product,
       ABS(a.rate * b.rate - 1.0) AS deviation
FROM l2.fx_rate a
JOIN l2.fx_rate b
  ON a.from_currency_code = b.to_currency_code
  AND a.to_currency_code = b.from_currency_code
  AND a.as_of_date = b.as_of_date
WHERE ABS(a.rate * b.rate - 1.0) > 0.01
ORDER BY deviation DESC
LIMIT 20;
EOSQL
```

**Severity:**
- HIGH if `forward_rate * reverse_rate` deviates from 1.0 by more than 1% (arbitrage opportunity / data error)
- MEDIUM if deviation is 0.1% - 1% (minor inconsistency, may be bid/ask spread)

### 3H. Date Coverage Alignment with Exposure Snapshots

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
WITH exposure_dates AS (
  SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot
),
fx_dates AS (
  SELECT DISTINCT as_of_date FROM l2.fx_rate
)
SELECT ed.as_of_date AS exposure_date,
       CASE WHEN fd.as_of_date IS NOT NULL THEN 'has_fx' ELSE 'MISSING_FX' END AS fx_status
FROM exposure_dates ed
LEFT JOIN fx_dates fd ON ed.as_of_date = fd.as_of_date
ORDER BY ed.as_of_date;
EOSQL
```

**Severity:**
- CRITICAL if the latest exposure snapshot date has no FX rates (current aggregations will fail)
- HIGH if >20% of exposure dates lack FX rates
- MEDIUM if any exposure dates lack FX rates

### 3I. Exposure Currency Coverage

All currencies used in `facility_exposure_snapshot` should have a rate to USD:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
WITH exposure_currencies AS (
  SELECT DISTINCT currency_code
  FROM l2.facility_exposure_snapshot
  WHERE currency_code IS NOT NULL AND currency_code != 'USD'
),
fx_currencies AS (
  SELECT DISTINCT from_currency_code
  FROM l2.fx_rate
  WHERE to_currency_code = 'USD'
)
SELECT ec.currency_code AS missing_fx_for_exposure_currency,
       COUNT(DISTINCT fes.facility_id) AS affected_facilities
FROM exposure_currencies ec
LEFT JOIN fx_currencies fc ON ec.currency_code = fc.from_currency_code
JOIN l2.facility_exposure_snapshot fes ON fes.currency_code = ec.currency_code
WHERE fc.from_currency_code IS NULL
GROUP BY ec.currency_code
ORDER BY affected_facilities DESC;
EOSQL
```

**Severity:**
- CRITICAL if any non-USD exposure currency lacks an FX rate to USD (these exposures cannot be aggregated)
- Shows count of affected facilities per missing currency

### 3J. Duplicate Rate Detection

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT from_currency_code, to_currency_code, as_of_date, COUNT(*) AS dup_count
FROM l2.fx_rate
GROUP BY from_currency_code, to_currency_code, as_of_date
HAVING COUNT(*) > 1
LIMIT 20;
"
```

**Severity:** HIGH if duplicates exist (same pair, same date should be unique — which rate gets used is undefined).

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true` in orchestrator payload.

### 4A. Fix Non-Positive Rates (CRITICAL)

```sql
-- Remove rows with zero or negative rates (they break all calculations)
DELETE FROM l2.fx_rate
WHERE rate <= 0;
```

### 4B. Fix Same-Currency Pairs

```sql
-- Set identity rate to exactly 1.0
UPDATE l2.fx_rate
SET rate = 1.0
WHERE from_currency_code = to_currency_code AND rate != 1.0;
```

### 4C. Fix Duplicate Rates

```sql
-- Keep the latest-inserted row per (from, to, date)
DELETE FROM l2.fx_rate a
USING l2.fx_rate b
WHERE a.from_currency_code = b.from_currency_code
  AND a.to_currency_code = b.to_currency_code
  AND a.as_of_date = b.as_of_date
  AND a.ctid < b.ctid;
```

### 4D. Add Missing Major Pairs

For missing major currency pairs, insert placeholder rates (requires manual review of actual rates):

```sql
-- Example: Add EUR/USD if missing
INSERT INTO l2.fx_rate (from_currency_code, to_currency_code, as_of_date, rate)
SELECT 'EUR', 'USD', fes_dates.as_of_date, 1.08
FROM (SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot) fes_dates
WHERE NOT EXISTS (
  SELECT 1 FROM l2.fx_rate
  WHERE from_currency_code = 'EUR' AND to_currency_code = 'USD'
    AND as_of_date = fes_dates.as_of_date
);
```

**WARNING:** Placeholder rates should be replaced with actual market rates. Flag for manual review.

### 4E. Fix Execution Pattern

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -c "
BEGIN;
-- Apply fix SQL here
-- Verify with evidence query
COMMIT;
"
```

After fixes, run `npm run db:introspect` to update the data dictionary.

---

## 5. Output Format

```json
{
  "agent": "dq-fx-rate",
  "run_timestamp": "ISO8601",
  "scope": "l2.fx_rate",
  "tables_checked": ["l2.fx_rate", "l1.currency_dim", "l2.facility_exposure_snapshot"],
  "summary": {
    "total_rows": 0,
    "distinct_pairs": 0,
    "distinct_dates": 0,
    "missing_major_pairs": [],
    "missing_exposure_currencies": [],
    "total_checks": 10,
    "passed": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "fixes_applied": 0,
    "fixes_verified": 0
  },
  "findings": [],
  "fixes_applied": [],
  "health_score": 0
}
```

Health score formula: `max(0, 100 - (critical * 15 + high * 8 + medium * 3 + low * 1))`

---

## 6. Safety Rules

1. **Never DROP the table or any columns** — only UPDATE/DELETE/INSERT rows
2. **FX rate fixes are HIGH RISK** — incorrect rates corrupt all aggregate calculations
3. **Never execute fixes without `--fix` flag AND user confirmation for ALL fixes (not just CRITICAL)**
4. **Always run in a transaction** — ROLLBACK on any error
5. **Always run `db:introspect` after data changes** to keep DD in sync
6. **Log all findings to `.claude/audit/sessions/`** with agent name and timestamp
7. **Placeholder rates must be flagged** — never silently insert estimated rates without marking them
8. **Rate realism ranges are approximate** — extreme but legitimate rates exist (hyperinflation currencies)
9. **Reciprocal consistency uses 1% tolerance** — bid/ask spreads naturally cause small deviations
10. **If running in orchestrator mode**, return JSON payload only (no interactive prompts)
