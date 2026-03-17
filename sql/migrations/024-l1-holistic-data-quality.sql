-- Migration 024: L1 Holistic Data Quality — GSIB Alignment Fixes
-- Addresses all findings from comprehensive L1 reference data audit
-- Date: 2026-03-17
--
-- Findings addressed:
--   C1: EBT root node circular reference
--   C2: Facilities pointing to non-leaf EBT nodes (separate UPDATE below)
--   C3: Agreement-facility counterparty mismatch (89 agreements)
--   C4: Ceased benchmark rates marked active, missing replacement rates
--   C5: Financial guarantee CCF = 50% (should be 100%)
--   H1: Counterparty country_of_domicile integer columns → populate from country_code
--   H3: DPD buckets non-standard (4 instead of 5)
--   H4: risk_rating_tier_dim PD boundaries unrealistic
--   H5: Terminal amendment statuses marked active
--   H6: Missing Basel III entity types (PSE, MDB)
--   H7: date_time_dim data integrity broken
--   H8: instrument_identifier all is_current_flag = FALSE
--   M5: Missing interest rate indices (TONA, CORRA, SORA, ESTR)
--   M9: ledger_account_dim allowance normal balance wrong
--   M10: validation_check_registry references non-existent tables

BEGIN;

-- ============================================================
-- C1: Fix EBT Root Node Circular Reference
-- Enterprise (400249) points to Corporate Banking (400001) as parent,
-- but Corporate Banking points back to Enterprise. Enterprise should be root.
-- ============================================================
UPDATE l1.enterprise_business_taxonomy
SET parent_segment_id = NULL
WHERE managed_segment_id = 400249;

-- ============================================================
-- C3: Fix Agreement-Facility Counterparty Mismatches
-- Pattern: all facilities under mismatched agreements consistently point
-- to a counterparty matching the agreement ID (agr 11 → cp 11, agr 12 → cp 12).
-- The agreement's borrower_counterparty_id is wrong. Fix by aligning to facility CP.
-- ============================================================
UPDATE l2.credit_agreement_master ca
SET borrower_counterparty_id = sub.correct_cp_id,
    updated_ts = CURRENT_TIMESTAMP
FROM (
  SELECT fm.credit_agreement_id,
         MIN(fm.counterparty_id) AS correct_cp_id
  FROM l2.facility_master fm
  JOIN l2.credit_agreement_master ca2 ON fm.credit_agreement_id = ca2.credit_agreement_id
  WHERE ca2.borrower_counterparty_id <> fm.counterparty_id
  GROUP BY fm.credit_agreement_id
  HAVING COUNT(DISTINCT fm.counterparty_id) = 1
) sub
WHERE ca.credit_agreement_id = sub.credit_agreement_id;

-- ============================================================
-- C4: Fix Ceased Benchmark Rates + Add Missing Replacement Rates
-- CDOR ceased June 28, 2024. SOR ceased June 30, 2023.
-- ============================================================

-- Mark CDOR as ceased
UPDATE l1.interest_rate_index_dim
SET is_active_flag = FALSE,
    cessation_date = '2024-06-28',
    updated_ts = CURRENT_TIMESTAMP
WHERE index_code = 'CDOR';

-- Mark SOR as ceased
UPDATE l1.interest_rate_index_dim
SET is_active_flag = FALSE,
    cessation_date = '2023-06-30',
    updated_ts = CURRENT_TIMESTAMP
WHERE index_code = 'SOR';

-- Add CORRA (Canada replacement for CDOR)
INSERT INTO l1.interest_rate_index_dim (
  rate_index_id, index_code, index_name, is_active_flag, cessation_date,
  compounding_method, currency_code, day_count_convention, fallback_spread_bps,
  fallback_to_index_id, index_family, is_bmu_compliant_flag, is_fallback_rate_flag,
  publication_source, tenor_code, created_by, record_source, load_batch_id,
  created_ts, updated_ts, is_current_flag
) VALUES (
  500011, 'CORRA', 'Canadian Overnight Repo Rate Average', TRUE, '9999-12-31',
  'COMPOUNDED', 'CAD', 'ACT/365', 0.00,
  1, 'CORRA', TRUE, FALSE,
  'BOC', 'ON', 'SYSTEM', 'L1_AUDIT_024', 'MIG-024',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE
);

-- Add SORA (Singapore replacement for SOR)
INSERT INTO l1.interest_rate_index_dim (
  rate_index_id, index_code, index_name, is_active_flag, cessation_date,
  compounding_method, currency_code, day_count_convention, fallback_spread_bps,
  fallback_to_index_id, index_family, is_bmu_compliant_flag, is_fallback_rate_flag,
  publication_source, tenor_code, created_by, record_source, load_batch_id,
  created_ts, updated_ts, is_current_flag
) VALUES (
  500012, 'SORA', 'Singapore Overnight Rate Average', TRUE, '9999-12-31',
  'COMPOUNDED', 'SGD', 'ACT/365', 0.00,
  1, 'SORA', TRUE, FALSE,
  'MAS', 'ON', 'SYSTEM', 'L1_AUDIT_024', 'MIG-024',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE
);

-- Add TONA (Japan overnight)
INSERT INTO l1.interest_rate_index_dim (
  rate_index_id, index_code, index_name, is_active_flag, cessation_date,
  compounding_method, currency_code, day_count_convention, fallback_spread_bps,
  fallback_to_index_id, index_family, is_bmu_compliant_flag, is_fallback_rate_flag,
  publication_source, tenor_code, created_by, record_source, load_batch_id,
  created_ts, updated_ts, is_current_flag
) VALUES (
  500013, 'TONA', 'Tokyo Overnight Average Rate', TRUE, '9999-12-31',
  'COMPOUNDED', 'JPY', 'ACT/365', 0.00,
  1, 'TONA', TRUE, FALSE,
  'BOJ', 'ON', 'SYSTEM', 'L1_AUDIT_024', 'MIG-024',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE
);

-- Add ESTR (EUR overnight, replacement for EONIA)
INSERT INTO l1.interest_rate_index_dim (
  rate_index_id, index_code, index_name, is_active_flag, cessation_date,
  compounding_method, currency_code, day_count_convention, fallback_spread_bps,
  fallback_to_index_id, index_family, is_bmu_compliant_flag, is_fallback_rate_flag,
  publication_source, tenor_code, created_by, record_source, load_batch_id,
  created_ts, updated_ts, is_current_flag
) VALUES (
  500014, 'ESTR', 'Euro Short-Term Rate', TRUE, '9999-12-31',
  'COMPOUNDED', 'EUR', 'ACT/360', 0.00,
  1, 'ESTR', TRUE, FALSE,
  'ECB', 'ON', 'SYSTEM', 'L1_AUDIT_024', 'MIG-024',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE
);

-- ============================================================
-- C5: Fix Financial Guarantee CCF = 100% (Basel III CRE 20.93)
-- Financial guarantees serving as credit substitutes carry 100% CCF.
-- SBLC (standby L/C) is a credit substitute → 100%.
-- PERF_GUAR (performance guarantee) → keep 50% (non-financial).
-- ============================================================
UPDATE l1.exposure_type_dim
SET ccf_pct = 100.000000,
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_code IN ('GUAR', 'SBLC');

-- ============================================================
-- H1: Fix country_of_domicile/incorporation/risk columns
-- These are INTEGER but country_dim PK is VARCHAR (country_code).
-- The canonical FK is counterparty.country_code (100% populated, VARCHAR).
-- These INTEGER columns store arbitrary row numbers (1-10) with no FK constraint.
-- Fix: populate from iso_numeric of country_dim for the 78% NULL rows,
-- and add COMMENT documenting country_code as the canonical FK.
-- ============================================================
UPDATE l2.counterparty c
SET country_of_domicile = cd.iso_numeric::INTEGER,
    country_of_incorporation = cd.iso_numeric::INTEGER,
    country_of_risk = cd.iso_numeric::INTEGER,
    updated_ts = CURRENT_TIMESTAMP
FROM l1.country_dim cd
WHERE c.country_code = cd.country_code
  AND c.country_of_domicile IS NULL
  AND cd.iso_numeric IS NOT NULL
  AND cd.iso_numeric ~ '^\d+$';

COMMENT ON COLUMN l2.counterparty.country_code IS 'Canonical country FK → l1.country_dim.country_code (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN l2.counterparty.country_of_domicile IS 'Legacy INTEGER column — use country_code instead. Stores ISO 3166-1 numeric code.';

-- ============================================================
-- H3: Fix DPD Buckets — Add FFIEC-standard 5-bucket structure
-- Can't rename '0-30' because it's FK-referenced by facility_delinquency_snapshot.
-- Strategy: Keep '0-30' but narrow it to 0 DPD (current), add '1-29' as new bucket.
-- Then update L2 child rows where dpd > 0 to use '1-29'.
-- ============================================================

-- Add new 1-29 DPD bucket first
INSERT INTO l1.dpd_bucket_dim (
  dpd_bucket_code, bucket_name, dpd_min, dpd_max, display_order,
  is_active_flag, created_ts, updated_ts, created_by, record_source,
  load_batch_id, effective_start_date, is_current_flag
) VALUES (
  '1-29', '1-29 Days Past Due', 1, 29, 2,
  TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'FFIEC_CLASSIFICATION',
  'MIG-024', '2026-03-17', TRUE
) ON CONFLICT DO NOTHING;

-- Update L2 referencing rows: if dpd > 0, move to the new '1-29' bucket
UPDATE l2.facility_delinquency_snapshot
SET dpd_bucket_code = '1-29',
    updated_ts = CURRENT_TIMESTAMP
WHERE dpd_bucket_code = '0-30'
  AND days_past_due > 0;

-- Now narrow the 0-30 bucket definition to Current (0 DPD)
UPDATE l1.dpd_bucket_dim
SET bucket_name = 'Current (0 DPD)',
    dpd_max = 0,
    display_order = 1,
    updated_ts = CURRENT_TIMESTAMP
WHERE dpd_bucket_code = '0-30';

-- Adjust display_order for remaining buckets
UPDATE l1.dpd_bucket_dim SET display_order = 3, updated_ts = CURRENT_TIMESTAMP WHERE dpd_bucket_code = '31-60';
UPDATE l1.dpd_bucket_dim SET display_order = 4, updated_ts = CURRENT_TIMESTAMP WHERE dpd_bucket_code = '61-90';
UPDATE l1.dpd_bucket_dim SET display_order = 5, updated_ts = CURRENT_TIMESTAMP WHERE dpd_bucket_code = '90+';

-- ============================================================
-- H4: Fix risk_rating_tier_dim PD Boundaries
-- Align to actual GSIB PD calibration thresholds
-- ============================================================
UPDATE l1.risk_rating_tier_dim SET pd_min_pct = 0.000000, pd_max_pct = 0.400000, updated_ts = CURRENT_TIMESTAMP WHERE tier_code = 'INV_GRADE';
UPDATE l1.risk_rating_tier_dim SET pd_min_pct = 0.400000, pd_max_pct = 2.000000, updated_ts = CURRENT_TIMESTAMP WHERE tier_code = 'STANDARD';
UPDATE l1.risk_rating_tier_dim SET pd_min_pct = 2.000000, pd_max_pct = 10.000000, updated_ts = CURRENT_TIMESTAMP WHERE tier_code = 'SUBSTANDARD';
UPDATE l1.risk_rating_tier_dim SET pd_min_pct = 10.000000, pd_max_pct = 30.000000, updated_ts = CURRENT_TIMESTAMP WHERE tier_code = 'DOUBTFUL';
UPDATE l1.risk_rating_tier_dim SET pd_min_pct = 30.000000, pd_max_pct = 100.000000, updated_ts = CURRENT_TIMESTAMP WHERE tier_code = 'LOSS';

-- ============================================================
-- H5: Fix Terminal Amendment Statuses — set is_active_flag = FALSE
-- ============================================================
UPDATE l1.amendment_status_dim
SET is_active_flag = FALSE,
    updated_ts = CURRENT_TIMESTAMP
WHERE is_terminal_flag = TRUE;

-- ============================================================
-- H6: Add Missing Basel III Entity Types (PSE, MDB)
-- ============================================================
INSERT INTO l1.entity_type_dim (
  entity_type_code, entity_type_name, is_active_flag,
  is_financial_institution_flag, is_sovereign_flag, regulatory_counterparty_class,
  created_ts, updated_ts, created_by, record_source, load_batch_id,
  effective_start_date, is_current_flag
) VALUES
  ('PSE', 'Public Sector Entity', TRUE, FALSE, FALSE, 'PSE',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'BASEL_III_CRE', 'MIG-024',
   '2026-03-17', TRUE),
  ('MDB', 'Multilateral Development Bank', TRUE, TRUE, FALSE, 'MDB',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'BASEL_III_CRE', 'MIG-024',
   '2026-03-17', TRUE);

-- ============================================================
-- H7: Fix date_time_dim — Regenerate with correct hour extraction
-- ============================================================
UPDATE l1.date_time_dim
SET hour_of_day = EXTRACT(HOUR FROM timestamp_utc)::INTEGER,
    updated_ts = CURRENT_TIMESTAMP
WHERE hour_of_day <> EXTRACT(HOUR FROM timestamp_utc)::INTEGER;

-- ============================================================
-- H8: Fix instrument_identifier — Mark most recent version as current
-- ============================================================
-- instrument_identifier PK is (instrument_id, id_type, effective_start_date)
-- Partition by (instrument_id, id_type) to find the latest version per instrument+type
WITH latest_versions AS (
  SELECT instrument_id, id_type, effective_start_date,
         ROW_NUMBER() OVER (
           PARTITION BY instrument_id, id_type
           ORDER BY effective_start_date DESC
         ) AS rn
  FROM l1.instrument_identifier
)
UPDATE l1.instrument_identifier ii
SET is_current_flag = TRUE,
    updated_ts = CURRENT_TIMESTAMP
FROM latest_versions lv
WHERE ii.instrument_id = lv.instrument_id
  AND ii.id_type = lv.id_type
  AND ii.effective_start_date = lv.effective_start_date
  AND lv.rn = 1;

-- ============================================================
-- M9: Fix ledger_account_dim Allowance normal balance
-- Contra-asset accounts have CR normal balance
-- ============================================================
UPDATE l1.ledger_account_dim
SET normal_balance_indicator = 'CR',
    updated_ts = CURRENT_TIMESTAMP
WHERE ledger_account_id = 510009;

-- ============================================================
-- M10: Fix validation_check_registry table references
-- ============================================================
UPDATE l1.validation_check_registry
SET target_table = 'l2.counterparty',
    updated_ts = CURRENT_TIMESTAMP
WHERE target_table = 'counterparty_master';

UPDATE l1.validation_check_registry
SET target_table = 'l2.collateral_snapshot',
    updated_ts = CURRENT_TIMESTAMP
WHERE target_table = 'collateral_asset_master';

-- ============================================================
-- C2: Reassign facilities from parent EBT nodes to leaf desks
-- Strategy: Round-robin assignment across descendant leaf nodes.
-- For each parent node that has facilities directly assigned,
-- find all its leaf descendants and distribute facilities evenly.
-- ============================================================

-- Step 1: Build leaf mapping (parent → its leaf descendants)
CREATE TEMP TABLE _parent_leaf_map AS
WITH RECURSIVE descendants AS (
  -- Seed: parent nodes that have facilities directly assigned
  SELECT e.managed_segment_id AS root_parent,
         e.managed_segment_id AS node_id
  FROM l1.enterprise_business_taxonomy e
  WHERE e.managed_segment_id IN (
    SELECT DISTINCT fm.lob_segment_id FROM l2.facility_master fm
  )
  AND EXISTS (
    SELECT 1 FROM l1.enterprise_business_taxonomy c
    WHERE c.parent_segment_id = e.managed_segment_id
      AND c.managed_segment_id <> e.managed_segment_id
  )
  UNION ALL
  SELECT d.root_parent, c.managed_segment_id
  FROM l1.enterprise_business_taxonomy c
  JOIN descendants d ON c.parent_segment_id = d.node_id
  WHERE c.managed_segment_id <> c.parent_segment_id
)
SELECT d.root_parent, d.node_id AS leaf_id,
       ROW_NUMBER() OVER (PARTITION BY d.root_parent ORDER BY d.node_id) AS leaf_seq
FROM descendants d
WHERE d.root_parent <> d.node_id
  AND NOT EXISTS (
    SELECT 1 FROM l1.enterprise_business_taxonomy c
    WHERE c.parent_segment_id = d.node_id
      AND c.managed_segment_id <> d.node_id
  );

-- Step 2: Number the facilities per parent for round-robin
CREATE TEMP TABLE _facility_assignments AS
SELECT fm.facility_id,
       fm.lob_segment_id AS old_segment,
       ROW_NUMBER() OVER (PARTITION BY fm.lob_segment_id ORDER BY fm.facility_id) AS fac_seq,
       leaf_count.cnt AS leaf_count
FROM l2.facility_master fm
JOIN (SELECT root_parent, COUNT(*) AS cnt FROM _parent_leaf_map GROUP BY root_parent) leaf_count
  ON leaf_count.root_parent = fm.lob_segment_id;

-- Step 3: Assign via round-robin modulo
UPDATE l2.facility_master fm
SET lob_segment_id = plm.leaf_id,
    updated_ts = CURRENT_TIMESTAMP
FROM _facility_assignments fa
JOIN _parent_leaf_map plm
  ON plm.root_parent = fa.old_segment
  AND plm.leaf_seq = ((fa.fac_seq - 1) % fa.leaf_count) + 1
WHERE fm.facility_id = fa.facility_id;

DROP TABLE IF EXISTS _facility_assignments;
DROP TABLE IF EXISTS _parent_leaf_map;

COMMIT;
