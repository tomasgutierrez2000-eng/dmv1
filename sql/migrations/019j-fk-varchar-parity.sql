-- Migration 019j: FK VARCHAR Width Parity
-- Fixes all VARCHAR width mismatches detected by validation check 10.2.
-- Child FK columns must match parent PK column widths for FK constraints.

SET search_path TO l1, l2, l3, public;

-- 1. enterprise_product_taxonomy.fr2590_category_code: VARCHAR(20) → VARCHAR(30) to match fr2590_category_dim
ALTER TABLE l1.enterprise_product_taxonomy
  ALTER COLUMN fr2590_category_code TYPE VARCHAR(30);

-- 2. facility_exposure_snapshot.fr2590_category_code: VARCHAR(20) → VARCHAR(30) to match fr2590_category_dim
ALTER TABLE l2.facility_exposure_snapshot
  ALTER COLUMN fr2590_category_code TYPE VARCHAR(30);

-- 3. facility_exposure_snapshot.internal_risk_rating_bucket_code: VARCHAR(20) → VARCHAR(50) to match dim
ALTER TABLE l2.facility_exposure_snapshot
  ALTER COLUMN internal_risk_rating_bucket_code TYPE VARCHAR(50);

-- 4. gl_account_balance_snapshot.currency_code: VARCHAR(30) → VARCHAR(20) to match currency_dim
-- (Parent is smaller — widen parent instead)
ALTER TABLE l1.currency_dim
  ALTER COLUMN currency_code TYPE VARCHAR(30);

-- 5. position.credit_status_code: VARCHAR(20) → VARCHAR(30) to match credit_status_dim
ALTER TABLE l2.position
  ALTER COLUMN credit_status_code TYPE VARCHAR(30);

-- 6. counterparty_exposure_summary.risk_rating_tier_code: VARCHAR(30) → keep, widen dim to match
ALTER TABLE l1.risk_rating_tier_dim
  ALTER COLUMN tier_code TYPE VARCHAR(30);

-- 7. facility_exposure_calc.utilization_status_code: VARCHAR(30) → keep, widen dim to match
ALTER TABLE l1.utilization_status_dim
  ALTER COLUMN utilization_status_code TYPE VARCHAR(30);

-- 8. rating_mapping.rating_grade_code: VARCHAR(20) → VARCHAR(30) to match rating_grade_dim
ALTER TABLE l1.rating_mapping
  ALTER COLUMN rating_grade_code TYPE VARCHAR(30);

-- 9. report_cell_definition.report_code: VARCHAR(20) → VARCHAR(50) to match report_registry
ALTER TABLE l1.report_cell_definition
  ALTER COLUMN report_code TYPE VARCHAR(50);

-- 10. position.position_currency: VARCHAR(100) → keep (wider than currency_dim VARCHAR(20))
-- This is a non-standard name, not a direct FK. No change needed if FK is not enforced.
-- If FK IS enforced, widen currency_dim to VARCHAR(100) or rename position_currency.
-- Decision: leave as-is since position_currency may contain non-standard values.
