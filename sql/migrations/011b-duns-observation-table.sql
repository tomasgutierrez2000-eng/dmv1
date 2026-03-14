-- Migration 011b: Extract time-varying D&B observation fields from l1.duns_entity_dim
-- into a proper L2 snapshot table l2.duns_entity_observation.
--
-- The L1/L2/L3 convention requires that time-varying observation data (paydex_score,
-- failure_score, annual_revenue_amt, employee_count) live in L2 as point-in-time
-- snapshots, not in an L1 reference/dimension table. This migration:
--   1. Creates l2.duns_entity_observation with composite PK (duns_number, as_of_date)
--   2. Migrates existing observation data from l1.duns_entity_dim using last_updated_date
--   3. Drops the time-varying columns from l1.duns_entity_dim

SET search_path TO l1, l2, public;

-- Step 1: Create the L2 observation table
CREATE TABLE IF NOT EXISTS l2.duns_entity_observation (
    duns_number        VARCHAR(9) NOT NULL,
    as_of_date         DATE NOT NULL,
    paydex_score       INTEGER,
    failure_score      INTEGER,
    annual_revenue_amt NUMERIC(20,4),
    employee_count     INTEGER,
    created_ts         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by         VARCHAR(100),
    load_batch_id      VARCHAR(100),
    CONSTRAINT pk_duns_entity_obs PRIMARY KEY (duns_number, as_of_date),
    CONSTRAINT fk_deo_duns FOREIGN KEY (duns_number) REFERENCES l1.duns_entity_dim (duns_number)
);

-- Step 2: Migrate existing data from l1.duns_entity_dim
-- Only migrate rows where at least one observation field is populated
INSERT INTO l2.duns_entity_observation (
    duns_number,
    as_of_date,
    paydex_score,
    failure_score,
    annual_revenue_amt,
    employee_count,
    created_by
)
SELECT
    duns_number,
    COALESCE(last_updated_date, CURRENT_DATE),
    paydex_score,
    failure_score,
    annual_revenue_amt,
    employee_count,
    'migration-011b'
FROM l1.duns_entity_dim
WHERE paydex_score IS NOT NULL
   OR failure_score IS NOT NULL
   OR annual_revenue_amt IS NOT NULL
   OR employee_count IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 3: Drop the time-varying columns from the L1 dimension table
ALTER TABLE l1.duns_entity_dim DROP COLUMN IF EXISTS paydex_score;
ALTER TABLE l1.duns_entity_dim DROP COLUMN IF EXISTS failure_score;
ALTER TABLE l1.duns_entity_dim DROP COLUMN IF EXISTS annual_revenue_amt;
ALTER TABLE l1.duns_entity_dim DROP COLUMN IF EXISTS employee_count;
