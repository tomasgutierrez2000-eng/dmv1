-- ============================================================
-- L3 PERFORMANCE INDEXES
-- ============================================================

-- T1: exposure_metric_cube (highest cardinality)
CREATE INDEX IF NOT EXISTS idx_emc_cpty_date ON l3.exposure_metric_cube(counterparty_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_emc_facility ON l3.exposure_metric_cube(facility_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_emc_lob ON l3.exposure_metric_cube(lob_node_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_emc_product ON l3.exposure_metric_cube(product_node_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_emc_country ON l3.exposure_metric_cube(country_code, as_of_date);
CREATE INDEX IF NOT EXISTS idx_emc_scenario ON l3.exposure_metric_cube(scenario_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_emc_le ON l3.exposure_metric_cube(legal_entity_id, as_of_date);

-- T2: risk_metric_cube
CREATE INDEX IF NOT EXISTS idx_rmc_cpty ON l3.risk_metric_cube(counterparty_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_rmc_rating ON l3.risk_metric_cube(rating_grade_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_rmc_lob ON l3.risk_metric_cube(lob_node_id, as_of_date);

-- T03 counterparty_exposure_summary: REMOVED (subsumed by *_derived tables)

-- T8: limit_current_state
CREATE INDEX IF NOT EXISTS idx_lcs_status ON l3.limit_current_state(status_code, run_version_id);
CREATE INDEX IF NOT EXISTS idx_lcs_lob ON l3.limit_current_state(lob_node_id, run_version_id);
CREATE INDEX IF NOT EXISTS idx_lcs_tier ON l3.limit_current_state(utilization_tier_code, run_version_id);

-- T22: lob_exposure_summary
CREATE INDEX IF NOT EXISTS idx_les_lob ON l3.lob_exposure_summary(lob_node_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_les_scenario ON l3.lob_exposure_summary(scenario_id, as_of_date);

-- T30: risk_appetite_metric_state
CREATE INDEX IF NOT EXISTS idx_rams_status ON l3.risk_appetite_metric_state(status_code, run_version_id);
CREATE INDEX IF NOT EXISTS idx_rams_metric ON l3.risk_appetite_metric_state(metric_id, as_of_date);

-- T32 counterparty_detail_snapshot: REMOVED (subsumed by *_derived tables)
-- T45 facility_detail_snapshot: REMOVED (subsumed by *_derived tables)

-- Global: run_version index on all tables (for partition/purge)
-- Add to each table: CREATE INDEX idx_{table}_run ON l3.{table}(run_version_id);
