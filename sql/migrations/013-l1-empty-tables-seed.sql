-- Migration 013: Seed 6 empty L1 tables
-- Tables: limit_status_dim, rating_change_status_dim, basel_exposure_type_dim,
--         regulatory_capital_requirement, capital_allocation, equity_allocation_config

BEGIN;

SET search_path TO l1, l2, public;

-- ============================================================================
-- 1. l1.limit_status_dim (8 rows)
-- ============================================================================
INSERT INTO l1.limit_status_dim (
    limit_status_code, status_name, description,
    severity_ordinal, display_order, is_active_flag,
    created_ts, updated_ts, created_by, record_source, load_batch_id
) VALUES
('WITHIN_LIMIT', 'Within Limit',        'Utilization is below 75% of the approved limit — normal operating range',                   1, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('APPROACHING',  'Approaching Limit',   'Utilization between 75% and 89% of the approved limit — early warning threshold',           2, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('WARNING',      'Warning',             'Utilization between 90% and 99% of the approved limit — escalation required',               3, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('AT_LIMIT',     'At Limit',            'Utilization at exactly 100% of the approved limit — no remaining headroom',                 4, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('MINOR_BREACH', 'Minor Breach',        'Utilization between 100% and 105% of the approved limit — breach within tolerance band',    5, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('MAJOR_BREACH', 'Major Breach',        'Utilization exceeds 105% of the approved limit — material breach requiring remediation',    6, 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('SUSPENDED',    'Limit Suspended',     'Limit has been temporarily suspended by credit risk management — no new drawings allowed',  7, 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('EXPIRED',      'Limit Expired',       'Limit has passed its expiry date and is no longer valid — renewal or closure required',     8, 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001');

-- ============================================================================
-- 2. l1.rating_change_status_dim (10 rows)
-- ============================================================================
INSERT INTO l1.rating_change_status_dim (
    rating_change_status_code, status_name, description,
    direction, display_order, is_active_flag,
    created_ts, updated_ts, created_by, record_source, load_batch_id
) VALUES
('UPGRADE',       'Upgrade',                          'Credit rating upgraded by one or more notches',                             'UP',     1,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('DOWNGRADE',     'Downgrade',                        'Credit rating downgraded by one or more notches',                          'DOWN',   2,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('AFFIRMED',      'Affirmed',                         'Credit rating reviewed and affirmed at current level — no change',         'STABLE', 3,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('WATCHLIST_POS', 'Placed on Watchlist — Positive',   'Rating placed on positive watchlist indicating potential upgrade',          'UP',     4,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('WATCHLIST_NEG', 'Placed on Watchlist — Negative',   'Rating placed on negative watchlist indicating potential downgrade',        'DOWN',   5,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('WATCHLIST_DEV', 'Placed on Watchlist — Developing', 'Rating placed on developing watchlist with uncertain directional outcome',  'STABLE', 6,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('OUTLOOK_POS',   'Outlook Changed to Positive',      'Rating outlook revised to positive — potential upgrade over medium term',   'UP',     7,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('OUTLOOK_NEG',   'Outlook Changed to Negative',      'Rating outlook revised to negative — potential downgrade over medium term', 'DOWN',   8,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('WITHDRAWN',     'Rating Withdrawn',                 'Credit rating withdrawn by the rating agency — no longer rated',           'STABLE', 9,  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001'),
('NEW_RATING',    'New Rating Assigned',              'Initial credit rating assigned to a previously unrated entity',            'STABLE', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'MDM', 'GSIB-INIT-001');

-- ============================================================================
-- 3. l1.basel_exposure_type_dim (14 rows)
-- ============================================================================
INSERT INTO l1.basel_exposure_type_dim (
    basel_exposure_type_id, exposure_type_code, exposure_type_name, description,
    std_risk_weight_pct, erba_risk_weight_pct, asset_class_group,
    created_ts, updated_ts, created_by, load_batch_id
) VALUES
(1,  'CORP',             'Corporate',                          'General corporate exposures under Basel III SA — includes investment-grade and sub-investment-grade obligors',                   100.000000, 100.000000, 'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(2,  'CORP_SME',         'Corporate SME',                      'Small and medium enterprise corporate exposures with consolidated revenue below regulatory threshold',                        85.000000,   85.000000, 'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(3,  'SOVEREIGN',        'Sovereign',                          'Exposures to sovereign governments and central banks — OECD member states eligible for 0% risk weight',                      0.000000,    0.000000,  'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(4,  'PSE',              'Public Sector Entity',               'Exposures to non-central-government public sector entities including municipalities and government agencies',                 20.000000,  20.000000,  'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(5,  'BANK',             'Bank',                               'Exposures to regulated banking institutions — risk weight depends on CQS of the sovereign or bank directly',                 20.000000,  20.000000,  'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(6,  'RETAIL_MORT',      'Retail — Residential Mortgage',      'Residential mortgage exposures meeting Basel III eligibility criteria including LTV and borrower income verification',        35.000000,  35.000000,  'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(7,  'RETAIL_REV',       'Retail — Qualifying Revolving',      'Qualifying revolving retail exposures including credit cards and unsecured revolving lines to individuals',                   75.000000,  75.000000,  'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(8,  'RETAIL_OTHER',     'Retail — Other',                     'Non-mortgage non-revolving retail exposures including personal loans and auto loans',                                        75.000000,  75.000000,  'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(9,  'EQUITY',           'Equity',                             'Equity holdings in banking and trading book — risk weight varies by approach and granularity',                               100.000000, 250.000000, 'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(10, 'SECUR_SENIOR',     'Securitization — Senior Tranche',    'Senior tranche exposures in securitization structures — lowest risk weight tier in the securitization framework',            20.000000,  20.000000,  'SECURITIZATION',  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(11, 'SECUR_MEZZANINE',  'Securitization — Mezzanine',         'Mezzanine tranche exposures in securitization structures — intermediate risk weight',                                       50.000000,  50.000000,  'SECURITIZATION',  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(12, 'CRE',              'Commercial Real Estate',             'Income-producing commercial real estate exposures — includes office, retail, industrial, and multi-family properties',       100.000000, 100.000000, 'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(13, 'HVCRE',            'High-Volatility CRE',                'High-volatility commercial real estate exposures including ADC loans and speculative CRE developments',                     150.000000, 150.000000, 'CREDIT_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
(14, 'CCR',              'Counterparty Credit Risk',           'Counterparty credit risk exposures arising from OTC derivatives, SFTs, and long-settlement transactions',                   100.000000, 100.000000, 'MARKET_RISK',     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001');

-- ============================================================================
-- 4. l1.regulatory_capital_requirement (8 rows: 4 entities x 2 bases)
-- ============================================================================

-- Entity 1: Meridian National Bank (US) — SA_CR basis
INSERT INTO l1.regulatory_capital_requirement (
    legal_entity_id, as_of_date, regulatory_capital_basis_id,
    min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
    min_leverage_ratio_pct, min_slr_pct,
    stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
    total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
    total_leverage_req_pct, total_slr_req_pct,
    tlac_risk_based_req_pct, tlac_leverage_req_pct,
    currency_code,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
(1, '2025-01-01', 1000001,
 4.500000, 6.000000, 8.000000,
 4.000000, 5.000000,
 2.500000, 1.500000, 0.000000,
 8.500000, 10.000000, 12.000000,
 4.000000, 5.000000,
 22.000000, 9.500000,
 'USD',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

-- Entity 1: Meridian National Bank (US) — A_IRB basis
INSERT INTO l1.regulatory_capital_requirement (
    legal_entity_id, as_of_date, regulatory_capital_basis_id,
    min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
    min_leverage_ratio_pct, min_slr_pct,
    stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
    total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
    total_leverage_req_pct, total_slr_req_pct,
    tlac_risk_based_req_pct, tlac_leverage_req_pct,
    currency_code,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
(1, '2025-01-01', 1000002,
 4.500000, 6.000000, 8.000000,
 4.000000, 5.000000,
 2.500000, 1.500000, 0.000000,
 8.500000, 10.000000, 12.000000,
 4.000000, 5.000000,
 22.000000, 9.500000,
 'USD',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

-- Entity 4: Meridian Bank Europe DAC (FR) — SA_CR basis (EU CRR III buffers)
INSERT INTO l1.regulatory_capital_requirement (
    legal_entity_id, as_of_date, regulatory_capital_basis_id,
    min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
    min_leverage_ratio_pct, min_slr_pct,
    stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
    total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
    total_leverage_req_pct, total_slr_req_pct,
    tlac_risk_based_req_pct, tlac_leverage_req_pct,
    currency_code,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
(4, '2025-01-01', 1000001,
 4.500000, 6.000000, 8.000000,
 3.000000, 3.000000,
 2.500000, 1.000000, 0.500000,
 8.500000, 10.000000, 12.000000,
 3.000000, 3.000000,
 20.500000, 6.750000,
 'EUR',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

-- Entity 4: Meridian Bank Europe DAC (FR) — A_IRB basis
INSERT INTO l1.regulatory_capital_requirement (
    legal_entity_id, as_of_date, regulatory_capital_basis_id,
    min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
    min_leverage_ratio_pct, min_slr_pct,
    stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
    total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
    total_leverage_req_pct, total_slr_req_pct,
    tlac_risk_based_req_pct, tlac_leverage_req_pct,
    currency_code,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
(4, '2025-01-01', 1000002,
 4.500000, 6.000000, 8.000000,
 3.000000, 3.000000,
 2.500000, 1.000000, 0.500000,
 8.500000, 10.000000, 12.000000,
 3.000000, 3.000000,
 20.500000, 6.750000,
 'EUR',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

-- Entity 6: Meridian Bank Japan (CH in DB, functionally Japan) — SA_CR basis (JFSA buffers)
INSERT INTO l1.regulatory_capital_requirement (
    legal_entity_id, as_of_date, regulatory_capital_basis_id,
    min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
    min_leverage_ratio_pct, min_slr_pct,
    stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
    total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
    total_leverage_req_pct, total_slr_req_pct,
    tlac_risk_based_req_pct, tlac_leverage_req_pct,
    currency_code,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
(6, '2025-01-01', 1000001,
 4.500000, 6.000000, 8.000000,
 3.000000, 3.000000,
 2.500000, 1.000000, 0.000000,
 8.000000, 9.500000, 11.500000,
 3.000000, 3.000000,
 18.000000, 6.750000,
 'JPY',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

-- Entity 6: Meridian Bank Japan — A_IRB basis
INSERT INTO l1.regulatory_capital_requirement (
    legal_entity_id, as_of_date, regulatory_capital_basis_id,
    min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
    min_leverage_ratio_pct, min_slr_pct,
    stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
    total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
    total_leverage_req_pct, total_slr_req_pct,
    tlac_risk_based_req_pct, tlac_leverage_req_pct,
    currency_code,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
(6, '2025-01-01', 1000002,
 4.500000, 6.000000, 8.000000,
 3.000000, 3.000000,
 2.500000, 1.000000, 0.000000,
 8.000000, 9.500000, 11.500000,
 3.000000, 3.000000,
 18.000000, 6.750000,
 'JPY',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

-- Entity 7: Meridian Bank Canada — SA_CR basis (OSFI buffers with domestic stability buffer)
INSERT INTO l1.regulatory_capital_requirement (
    legal_entity_id, as_of_date, regulatory_capital_basis_id,
    min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
    min_leverage_ratio_pct, min_slr_pct,
    stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
    total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
    total_leverage_req_pct, total_slr_req_pct,
    tlac_risk_based_req_pct, tlac_leverage_req_pct,
    currency_code,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
(7, '2025-01-01', 1000001,
 4.500000, 6.000000, 8.000000,
 3.000000, 3.000000,
 2.500000, 1.000000, 1.500000,
 9.500000, 11.000000, 13.000000,
 3.000000, 3.000000,
 21.500000, 6.750000,
 'CAD',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

-- Entity 7: Meridian Bank Canada — A_IRB basis
INSERT INTO l1.regulatory_capital_requirement (
    legal_entity_id, as_of_date, regulatory_capital_basis_id,
    min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
    min_leverage_ratio_pct, min_slr_pct,
    stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
    total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
    total_leverage_req_pct, total_slr_req_pct,
    tlac_risk_based_req_pct, tlac_leverage_req_pct,
    currency_code,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
(7, '2025-01-01', 1000002,
 4.500000, 6.000000, 8.000000,
 3.000000, 3.000000,
 2.500000, 1.000000, 1.500000,
 9.500000, 11.000000, 13.000000,
 3.000000, 3.000000,
 21.500000, 6.750000,
 'CAD',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

-- ============================================================================
-- 5. l1.capital_allocation (10 rows: 6 entity-level + 4 segment-level)
--    NOTE: ALTER CHECK constraint to allow LEGAL_ENTITY node_type
-- ============================================================================

-- Widen the node_type check constraint to include LEGAL_ENTITY
ALTER TABLE l1.capital_allocation DROP CONSTRAINT chk_ca_node_type;
ALTER TABLE l1.capital_allocation ADD CONSTRAINT chk_ca_node_type
    CHECK (node_type IN ('FACILITY','COUNTERPARTY','DESK','PORTFOLIO','SEGMENT','LEGAL_ENTITY'));

-- Entity-level allocations (node_type = LEGAL_ENTITY, node_id = legal_entity_id)
INSERT INTO l1.capital_allocation (
    node_id, node_type, as_of_date, legal_entity_id,
    allocated_capital_amt, capital_allocation_pct, required_capital_pct,
    allocated_equity_amt, equity_allocation_pct,
    created_ts, updated_ts, created_by, load_batch_id
) VALUES
-- Entity 1: Meridian National Bank — main US bank
(1, 'LEGAL_ENTITY', '2025-01-31', 1,
 45000000000.0000, 35.000000, 12.000000,
 52000000000.0000, 36.000000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
-- Entity 2: Meridian Securities Inc.
(2, 'LEGAL_ENTITY', '2025-01-31', 2,
 20000000000.0000, 16.000000, 10.000000,
 23000000000.0000, 16.000000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
-- Entity 3: Meridian Capital Corporation
(3, 'LEGAL_ENTITY', '2025-01-31', 3,
 15000000000.0000, 12.000000, 8.000000,
 17500000000.0000, 12.000000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
-- Entity 4: Meridian Bank Europe DAC
(4, 'LEGAL_ENTITY', '2025-01-31', 4,
 18000000000.0000, 14.000000, 12.000000,
 21000000000.0000, 14.500000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
-- Entity 5: Meridian Securities Europe SA
(5, 'LEGAL_ENTITY', '2025-01-31', 5,
 12000000000.0000, 9.000000, 10.000000,
 14000000000.0000, 9.500000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
-- Entity 6: Meridian Bank (Japan) Ltd.
(6, 'LEGAL_ENTITY', '2025-01-31', 6,
 10000000000.0000, 8.000000, 11.500000,
 11500000000.0000, 8.000000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001');

-- Segment-level allocations under Entity 1
INSERT INTO l1.capital_allocation (
    node_id, node_type, as_of_date, legal_entity_id,
    allocated_capital_amt, capital_allocation_pct, required_capital_pct,
    allocated_equity_amt, equity_allocation_pct,
    created_ts, updated_ts, created_by, load_batch_id
) VALUES
-- Corporate Banking segment
(400001, 'SEGMENT', '2025-01-31', 1,
 14000000000.0000, 31.100000, 12.000000,
 16000000000.0000, 30.800000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
-- Commercial Real Estate segment
(400034, 'SEGMENT', '2025-01-31', 1,
 9000000000.0000, 20.000000, 13.000000,
 10500000000.0000, 20.200000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
-- Investment Banking segment
(400116, 'SEGMENT', '2025-01-31', 1,
 12000000000.0000, 26.700000, 10.000000,
 14000000000.0000, 26.900000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001'),
-- Global Markets segment
(400141, 'SEGMENT', '2025-01-31', 1,
 10000000000.0000, 22.200000, 11.000000,
 11500000000.0000, 22.100000,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001');

-- ============================================================================
-- 6. l1.equity_allocation_config (4 rows)
--    equity_allocation_id is BIGSERIAL — auto-generated
-- ============================================================================
INSERT INTO l1.equity_allocation_config (
    managed_segment_id, legal_entity_id, effective_date,
    equity_allocation_amt, currency_code, is_active_flag,
    created_ts, updated_ts, created_by, load_batch_id,
    effective_start_date, effective_end_date, is_current_flag
) VALUES
-- Corporate Banking
(400001, 1, '2025-01-01',
 12000000000.0000, 'USD', true,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true),
-- Commercial Real Estate
(400034, 1, '2025-01-01',
 8000000000.0000, 'USD', true,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true),
-- Investment Banking
(400116, 1, '2025-01-01',
 15000000000.0000, 'USD', true,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true),
-- Global Markets
(400141, 1, '2025-01-01',
 10000000000.0000, 'USD', true,
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'GSIB-INIT-001',
 '2025-01-01', NULL, true);

COMMIT;
