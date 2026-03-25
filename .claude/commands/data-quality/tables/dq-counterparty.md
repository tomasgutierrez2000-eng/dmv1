---
description: "DQ Counterparty — deep-dive data quality review for l2.counterparty"
---

# DQ Counterparty Review

You are a **per-table data quality agent** reviewing `l2.counterparty` in the GSIB credit risk PostgreSQL database. This is the entity master table — every borrower, guarantor, and participant in the credit portfolio. Counterparty data quality directly impacts rollup accuracy at the counterparty, desk, portfolio, and segment levels.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

### Step 1: Read Configuration
```
Read .claude/config/bank-profile.yaml
```
Extract: `database.primary` connection, `institution_tier`.

### Step 2: Read Data Dictionary
```
Read facility-summary-mvp/output/data-dictionary/data-dictionary.json
```
Parse the `l2` array for the `counterparty` table definition.

### Step 3: Read CLAUDE.md Conventions
Grep for:
- Counterparty Country Field Convention
- Entity Type Completeness
- Agreement-Facility Counterparty Alignment

### Step 4: Load Baseline Profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Table Profile

| Property | Value |
|----------|-------|
| Schema.Table | `l2.counterparty` |
| Expected rows | 100+ (seed) + scenario counterparties (up to ~1720) |
| Primary key | `counterparty_id` (BIGINT) |
| SCD type | Type 2 (`is_current_flag`, `effective_from_date`, `effective_to_date`) |
| Key FKs OUT | `entity_type_code` -> `l1.entity_type_dim`, `industry_id` -> `l1.industry_dim`, `country_code` -> `l1.country_dim`, `parent_counterparty_id` -> self-referencing hierarchy |
| Key FKs IN | `l2.facility_master.counterparty_id`, `l2.credit_agreement_master.borrower_counterparty_id`, `l2.counterparty_rating_observation`, `l2.counterparty_hierarchy` |
| Business meaning | Every legal entity the bank has a credit relationship with — borrowers, guarantors, parents, subsidiaries. |

---

## 3. Dimension Checks

### 3A. Schema Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'counterparty'
ORDER BY ordinal_position;
EOSQL
```

### 3B. Primary Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'total_rows', COUNT(*) FROM l2.counterparty
UNION ALL
SELECT 'distinct_pks', COUNT(DISTINCT counterparty_id) FROM l2.counterparty
UNION ALL
SELECT 'null_pks', COUNT(*) FROM l2.counterparty WHERE counterparty_id IS NULL;
"
```

### 3C. Foreign Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Orphaned entity_type_code
SELECT 'orphan_entity_type', COUNT(*)
FROM l2.counterparty c
LEFT JOIN l1.entity_type_dim et ON c.entity_type_code = et.entity_type_code
WHERE et.entity_type_code IS NULL AND c.entity_type_code IS NOT NULL AND c.is_current_flag = true;

-- Orphaned industry_id
SELECT 'orphan_industry', COUNT(*)
FROM l2.counterparty c
LEFT JOIN l1.industry_dim i ON c.industry_id = i.industry_id
WHERE i.industry_id IS NULL AND c.industry_id IS NOT NULL AND c.is_current_flag = true;

-- Orphaned country_code
SELECT 'orphan_country', COUNT(*)
FROM l2.counterparty c
LEFT JOIN l1.country_dim cd ON c.country_code = cd.country_code
WHERE cd.country_code IS NULL AND c.country_code IS NOT NULL AND c.is_current_flag = true;

-- Orphaned parent_counterparty_id (self-referencing)
SELECT 'orphan_parent_cp', COUNT(*)
FROM l2.counterparty c
LEFT JOIN l2.counterparty parent ON c.parent_counterparty_id = parent.counterparty_id
WHERE parent.counterparty_id IS NULL AND c.parent_counterparty_id IS NOT NULL AND c.is_current_flag = true;
EOSQL
```

### 3D. Null Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT col, nulls, total, ROUND(100.0 * nulls / total, 2) AS null_pct FROM (
  SELECT 'legal_name' AS col, COUNT(*) FILTER (WHERE legal_name IS NULL) AS nulls, COUNT(*) AS total FROM l2.counterparty WHERE is_current_flag = true
  UNION ALL SELECT 'entity_type_code', COUNT(*) FILTER (WHERE entity_type_code IS NULL), COUNT(*) FROM l2.counterparty WHERE is_current_flag = true
  UNION ALL SELECT 'industry_id', COUNT(*) FILTER (WHERE industry_id IS NULL), COUNT(*) FROM l2.counterparty WHERE is_current_flag = true
  UNION ALL SELECT 'country_code', COUNT(*) FILTER (WHERE country_code IS NULL), COUNT(*) FROM l2.counterparty WHERE is_current_flag = true
  UNION ALL SELECT 'parent_counterparty_id', COUNT(*) FILTER (WHERE parent_counterparty_id IS NULL), COUNT(*) FROM l2.counterparty WHERE is_current_flag = true
  UNION ALL SELECT 'domicile_country_code', COUNT(*) FILTER (WHERE domicile_country_code IS NULL), COUNT(*) FROM l2.counterparty WHERE is_current_flag = true
) t;
EOSQL
```

### 3E. Data Type Conformance
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type,
  CASE
    WHEN column_name LIKE '%_id' AND data_type NOT IN ('bigint','integer') THEN 'FAIL'
    WHEN column_name LIKE '%_code' AND data_type NOT LIKE 'character%' THEN 'FAIL'
    WHEN column_name LIKE '%_flag' AND data_type != 'boolean' THEN 'FAIL'
    WHEN column_name LIKE '%_date' AND data_type != 'date' THEN 'FAIL'
    WHEN column_name LIKE '%_ts' AND data_type NOT LIKE 'timestamp%' THEN 'FAIL'
    ELSE 'OK'
  END AS check
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'counterparty'
ORDER BY ordinal_position;
EOSQL
```

### 3F. Distribution Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Entity type distribution
SELECT entity_type_code, COUNT(*) FROM l2.counterparty WHERE is_current_flag = true GROUP BY entity_type_code ORDER BY COUNT(*) DESC;

-- Country distribution (top 15)
SELECT country_code, COUNT(*) FROM l2.counterparty WHERE is_current_flag = true GROUP BY country_code ORDER BY COUNT(*) DESC LIMIT 15;

-- Industry distribution (top 15)
SELECT industry_id, COUNT(*) FROM l2.counterparty WHERE is_current_flag = true GROUP BY industry_id ORDER BY COUNT(*) DESC LIMIT 15;
EOSQL
```

### 3G. Temporal Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  MIN(effective_from_date) AS earliest_eff,
  MAX(effective_from_date) AS latest_eff,
  COUNT(*) FILTER (WHERE created_ts IS NULL) AS missing_created,
  COUNT(*) FILTER (WHERE updated_ts IS NULL) AS missing_updated,
  COUNT(*) AS total
FROM l2.counterparty;
EOSQL
```

### 3H. Boolean Field Checks
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  COUNT(*) FILTER (WHERE is_current_flag = true) AS current_true,
  COUNT(*) FILTER (WHERE is_current_flag = false) AS current_false,
  COUNT(*) FILTER (WHERE is_current_flag IS NULL) AS current_null,
  COUNT(*) AS total
FROM l2.counterparty;
EOSQL
```

### 3I. Categorical Value Checks
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- entity_type_code distinct values
SELECT COUNT(DISTINCT entity_type_code) AS distinct_entity_types,
  COUNT(DISTINCT country_code) AS distinct_countries,
  COUNT(DISTINCT industry_id) AS distinct_industries
FROM l2.counterparty WHERE is_current_flag = true;
EOSQL
```

### 3J. Cross-Table Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Counterparties without any facilities
SELECT 'cp_no_facilities', COUNT(*)
FROM l2.counterparty c
LEFT JOIN l2.facility_master fm ON c.counterparty_id = fm.counterparty_id AND fm.is_current_flag = true
WHERE fm.facility_id IS NULL AND c.is_current_flag = true;

-- Counterparties referenced in facility_master but not in counterparty table
SELECT 'phantom_cp_in_fm', COUNT(DISTINCT fm.counterparty_id)
FROM l2.facility_master fm
LEFT JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
WHERE c.counterparty_id IS NULL AND fm.is_current_flag = true;
EOSQL
```

---

## 4. Business Rule Checks (Counterparty Specific)

### 4A. Entity Type Coverage
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- All 12 Basel entity types should be represented
SELECT et.entity_type_code, et.entity_type_name,
  COUNT(c.counterparty_id) AS cp_count
FROM l1.entity_type_dim et
LEFT JOIN l2.counterparty c ON et.entity_type_code = c.entity_type_code AND c.is_current_flag = true
GROUP BY et.entity_type_code, et.entity_type_name
ORDER BY cp_count;
EOSQL
```
**Severity:** MEDIUM if fewer than 5 entity types have counterparties. GSIB requires broad coverage.

### 4B. Legal Name Quality
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT counterparty_id, legal_name
FROM l2.counterparty
WHERE is_current_flag = true
  AND (legal_name IS NULL
    OR legal_name = ''
    OR legal_name ~ '^[0-9]+$'
    OR legal_name ~ '^counterparty_'
    OR legal_name ~ '^legal_name_'
    OR LENGTH(legal_name) < 3
    OR legal_name = legal_name);  -- always true, just a syntax anchor
EOSQL
```
**Severity:** LOW for placeholders, HIGH if NULL.

### 4C. SCD-2 Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Multiple current rows for same counterparty
SELECT counterparty_id, COUNT(*) AS current_count
FROM l2.counterparty
WHERE is_current_flag = true
GROUP BY counterparty_id
HAVING COUNT(*) > 1;
EOSQL
```
**Severity:** CRITICAL. Duplicate current rows cause double-counting in counterparty-level metrics.

### 4D. Rating Observation Coverage
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Active counterparties with facilities but no rating observations
SELECT c.counterparty_id, c.legal_name, COUNT(fm.facility_id) AS facility_count
FROM l2.counterparty c
JOIN l2.facility_master fm ON c.counterparty_id = fm.counterparty_id AND fm.is_current_flag = true
LEFT JOIN l2.counterparty_rating_observation cro ON c.counterparty_id = cro.counterparty_id
WHERE c.is_current_flag = true AND cro.counterparty_id IS NULL
GROUP BY c.counterparty_id, c.legal_name
ORDER BY facility_count DESC;
EOSQL
```
**Severity:** MEDIUM. Counterparties without ratings cannot be risk-bucketed.

### 4E. Country Code Format
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- country_code should be ISO alpha-2 (exactly 2 uppercase letters)
SELECT counterparty_id, country_code
FROM l2.counterparty
WHERE is_current_flag = true
  AND country_code IS NOT NULL
  AND country_code !~ '^[A-Z]{2}$';
EOSQL
```
**Severity:** HIGH. Non-ISO country codes break country_dim joins.

### 4F. Hierarchy Cycle Detection
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Self-referencing counterparty (parent = self)
SELECT counterparty_id, parent_counterparty_id
FROM l2.counterparty
WHERE counterparty_id = parent_counterparty_id AND is_current_flag = true;

-- Simple 2-level cycle detection
SELECT c1.counterparty_id AS cp1, c2.counterparty_id AS cp2
FROM l2.counterparty c1
JOIN l2.counterparty c2 ON c1.parent_counterparty_id = c2.counterparty_id
WHERE c2.parent_counterparty_id = c1.counterparty_id
  AND c1.is_current_flag = true AND c2.is_current_flag = true;
EOSQL
```
**Severity:** CRITICAL. Hierarchy cycles cause infinite loops in rollup calculations.

### 4G. Domicile Country Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- domicile_country_code (if present) should also exist in country_dim
SELECT c.counterparty_id, c.domicile_country_code
FROM l2.counterparty c
LEFT JOIN l1.country_dim cd ON c.domicile_country_code = cd.country_code
WHERE c.domicile_country_code IS NOT NULL
  AND cd.country_code IS NULL
  AND c.is_current_flag = true;
EOSQL
```
**Severity:** MEDIUM.

---

## 5. Fix Procedures

### Fix: SCD-2 Duplicate Current Rows
```sql
UPDATE l2.counterparty c SET is_current_flag = false
WHERE c.is_current_flag = true
  AND EXISTS (
    SELECT 1 FROM l2.counterparty c2
    WHERE c2.counterparty_id = c.counterparty_id
      AND c2.is_current_flag = true
      AND c2.effective_from_date > c.effective_from_date
  );
```

### Fix: Missing Entity Type
```sql
UPDATE l2.counterparty SET entity_type_code = 'CORP'
WHERE entity_type_code IS NULL AND is_current_flag = true;
```

### Fix: Invalid Country Code Format
```sql
-- Manual review — map numeric codes to alpha-2
-- Example: 840 -> 'US', 826 -> 'GB'
```

---

## 6. Output Format

Return standard DQ output JSON per template. Finding IDs use prefix `DQ-CP-NNN` (e.g., `DQ-CP-001`).
