-- Seed: ECL Staging, Forbearance, Limit Assignment, Watchlist
-- Populates 4 empty L2 tables with narrative-coherent GSIB data.
-- Distressed facilities (5, 7, 8, 10, 18) appear consistently across tables.
-- All L1 dim codes exercised. ON CONFLICT DO NOTHING for idempotency.
-- Dates: 2024-11-30, 2024-12-31, 2025-01-31 (3-month window)

SET search_path TO l1, l2, l3, public;
SET client_min_messages TO WARNING;

-----------------------------------------------------------------------
-- ECL STAGING SNAPSHOT (~60 rows)
-- 20 facilities × 3 as_of_dates
-- Stages: STAGE_1 (performing), STAGE_2 (under-performing),
--         STAGE_3 (non-performing), POCI (purchased credit-impaired)
-- Models: CECL (USD/CAD facilities), IFRS9 (non-USD)
-- Narrative:
--   Fac 5 (Atlas): STAGE_1 → STAGE_1 → STAGE_2 (deteriorating)
--   Fac 7 (Pinnacle): STAGE_2 → STAGE_2 → STAGE_3 (impaired)
--   Fac 10 (Crestview): STAGE_1 → STAGE_2 → STAGE_3 (rapid decline)
--   Fac 8 (Westlake): STAGE_3 throughout (already impaired)
--   Fac 18 (Quantum/Cypher): POCI (purchased credit-impaired)
--   Fac 1-4, 6, 9, 11-17, 19-20: STAGE_1 (performing)
-----------------------------------------------------------------------
INSERT INTO l2.ecl_staging_snapshot (
    ecl_staging_id, facility_id, counterparty_id, as_of_date,
    ecl_stage_code, prior_stage_code, stage_change_date, stage_change_reason,
    model_code, days_past_due, is_significant_increase_flag, is_credit_impaired_flag,
    currency_code, record_source
) VALUES
-- === 2024-11-30 ===
-- Performing facilities (STAGE_1)
(1,  1,  1,  '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(2,  2,  2,  '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'EUR', 'SEED'),
(3,  3,  3,  '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED'),
(4,  4,  4,  '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'CHF', 'SEED'),
(5,  5,  5,  '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'JPY', 'SEED'),
(6,  6,  6,  '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'CAD', 'SEED'),
-- Under-performing (STAGE_2)
(7,  7,  7,  '2024-11-30', 'STAGE_2', 'STAGE_1', '2024-09-15', 'Revenue decline and covenant breach','IFRS9', 35, TRUE,  FALSE, 'AUD', 'SEED'),
-- Non-performing (STAGE_3)
(8,  8,  8,  '2024-11-30', 'STAGE_3', 'STAGE_2', '2024-08-01', 'Missed principal payment; credit-impaired', 'IFRS9', 95, TRUE,  TRUE,  'CNY', 'SEED'),
-- Performing
(9,  9,  9,  '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'HKD', 'SEED'),
(10, 10, 10, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'SGD', 'SEED'),
(11, 11, 11, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(12, 12, 11, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(13, 13, 11, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(14, 14, 11, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(15, 15, 11, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(16, 16, 11, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(17, 17, 12, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
-- POCI (purchased credit-impaired)
(18, 18, 12, '2024-11-30', 'POCI',    NULL,       '2024-06-01', 'Acquired from distressed portfolio','CECL',  120, TRUE,  TRUE,  'USD', 'SEED'),
(19, 19, 13, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED'),
(20, 20, 13, '2024-11-30', 'STAGE_1', NULL,       NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED'),

-- === 2024-12-31 ===
(21, 1,  1,  '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(22, 2,  2,  '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'EUR', 'SEED'),
(23, 3,  3,  '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED'),
(24, 4,  4,  '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'CHF', 'SEED'),
-- Fac 5: still STAGE_1 in Dec (deterioration not yet triggered)
(25, 5,  5,  '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 5,  FALSE, FALSE, 'JPY', 'SEED'),
(26, 6,  6,  '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'CAD', 'SEED'),
-- Fac 7: stays STAGE_2 (worsening DPD)
(27, 7,  7,  '2024-12-31', 'STAGE_2', 'STAGE_2', NULL,         NULL,                              'IFRS9', 55, TRUE,  FALSE, 'AUD', 'SEED'),
-- Fac 8: stays STAGE_3
(28, 8,  8,  '2024-12-31', 'STAGE_3', 'STAGE_3', NULL,         NULL,                              'IFRS9', 125,TRUE,  TRUE,  'CNY', 'SEED'),
(29, 9,  9,  '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'HKD', 'SEED'),
-- Fac 10: STAGE_1 → STAGE_2 in Dec (significant increase in credit risk)
(30, 10, 10, '2024-12-31', 'STAGE_2', 'STAGE_1', '2024-12-15', 'DSCR below 1.0x; significant credit risk increase', 'IFRS9', 32, TRUE, FALSE, 'SGD', 'SEED'),
(31, 11, 11, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(32, 12, 11, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(33, 13, 11, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(34, 14, 11, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(35, 15, 11, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(36, 16, 11, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(37, 17, 12, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(38, 18, 12, '2024-12-31', 'POCI',    'POCI',    NULL,         NULL,                              'CECL',  150,TRUE,  TRUE,  'USD', 'SEED'),
(39, 19, 13, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED'),
(40, 20, 13, '2024-12-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED'),

-- === 2025-01-31 ===
(41, 1,  1,  '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(42, 2,  2,  '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'EUR', 'SEED'),
(43, 3,  3,  '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED'),
(44, 4,  4,  '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'CHF', 'SEED'),
-- Fac 5: STAGE_1 → STAGE_2 in Jan (covenant breach confirmed)
(45, 5,  5,  '2025-01-31', 'STAGE_2', 'STAGE_1', '2025-01-10', 'Covenant breach confirmed; DSCR 0.95x', 'IFRS9', 15, TRUE, FALSE, 'JPY', 'SEED'),
(46, 6,  6,  '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'CAD', 'SEED'),
-- Fac 7: STAGE_2 → STAGE_3 in Jan (credit-impaired)
(47, 7,  7,  '2025-01-31', 'STAGE_3', 'STAGE_2', '2025-01-20', 'Missed interest payment; credit-impaired', 'IFRS9', 92, TRUE, TRUE, 'AUD', 'SEED'),
-- Fac 8: stays STAGE_3
(48, 8,  8,  '2025-01-31', 'STAGE_3', 'STAGE_3', NULL,         NULL,                              'IFRS9', 155,TRUE,  TRUE,  'CNY', 'SEED'),
(49, 9,  9,  '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'HKD', 'SEED'),
-- Fac 10: STAGE_2 → STAGE_3 in Jan (rapid decline)
(50, 10, 10, '2025-01-31', 'STAGE_3', 'STAGE_2', '2025-01-25', 'Missed principal payment; bankruptcy filing imminent', 'IFRS9', 93, TRUE, TRUE, 'SGD', 'SEED'),
(51, 11, 11, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(52, 12, 11, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(53, 13, 11, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(54, 14, 11, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(55, 15, 11, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(56, 16, 11, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(57, 17, 12, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'CECL',  0,  FALSE, FALSE, 'USD', 'SEED'),
(58, 18, 12, '2025-01-31', 'POCI',    'POCI',    NULL,         NULL,                              'CECL',  180,TRUE,  TRUE,  'USD', 'SEED'),
(59, 19, 13, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED'),
(60, 20, 13, '2025-01-31', 'STAGE_1', 'STAGE_1', NULL,         NULL,                              'IFRS9', 0,  FALSE, FALSE, 'GBP', 'SEED')
ON CONFLICT DO NOTHING;

-----------------------------------------------------------------------
-- FORBEARANCE EVENT (~18 rows)
-- All 6 forbearance types exercised across distressed facilities.
-- Facilities: 5 (Atlas), 7 (Pinnacle), 8 (Westlake), 10 (Crestview), 18 (Cypher)
-- Timeline aligned with ECL staging transitions.
-----------------------------------------------------------------------
INSERT INTO l2.forbearance_event (
    forbearance_event_id, facility_id, counterparty_id, forbearance_type_code,
    event_date, original_maturity_date, modified_maturity_date,
    original_rate_pct, modified_rate_pct, maturity_extension_months,
    principal_forgiven_amt, currency_code, approval_date, approved_by, as_of_date,
    record_source
) VALUES
-- Facility 8 (Westlake Materials, CNY) — already STAGE_3, multiple forbearance actions
(1, 8, 8, 'TERM_EXT',         '2024-08-15', '2025-06-30', '2026-06-30', NULL,     NULL,     12,  NULL,         'CNY', '2024-08-10', 'Credit Committee', '2024-11-30', 'SEED'),
(2, 8, 8, 'RATE_RED',          '2024-09-01', NULL,         NULL,         5.250000, 3.500000, NULL, NULL,         'CNY', '2024-08-28', 'Credit Committee', '2024-11-30', 'SEED'),
(3, 8, 8, 'PMT_HOLIDAY',       '2024-10-01', NULL,         NULL,         NULL,     NULL,     NULL, NULL,         'CNY', '2024-09-25', 'Chief Credit Officer', '2024-11-30', 'SEED'),

-- Facility 7 (Pinnacle Healthcare, AUD) — STAGE_2, term extension + rate reduction
(4, 7, 7, 'TERM_EXT',         '2024-11-01', '2025-09-30', '2026-03-31', NULL,     NULL,     6,   NULL,         'AUD', '2024-10-28', 'Credit Committee', '2024-11-30', 'SEED'),
(5, 7, 7, 'RATE_RED',          '2024-11-15', NULL,         NULL,         4.750000, 3.250000, NULL, NULL,         'AUD', '2024-11-10', 'Credit Committee', '2024-11-30', 'SEED'),

-- Facility 10 (Crestview REIT, SGD) — STAGE_1→2 in Dec, rate reduction as early intervention
(6, 10, 10, 'RATE_RED',        '2024-12-20', NULL,         NULL,         6.000000, 4.500000, NULL, NULL,         'SGD', '2024-12-18', 'Relationship Manager', '2024-12-31', 'SEED'),
(7, 10, 10, 'PMT_HOLIDAY',     '2025-01-05', NULL,         NULL,         NULL,     NULL,     NULL, NULL,         'SGD', '2025-01-03', 'Credit Committee', '2025-01-31', 'SEED'),

-- Facility 5 (Atlas Industrial, JPY) — STAGE_1→2 in Jan, term extension
(8, 5, 5, 'TERM_EXT',         '2025-01-15', '2025-12-31', '2026-06-30', NULL,     NULL,     6,   NULL,         'JPY', '2025-01-12', 'Credit Committee', '2025-01-31', 'SEED'),

-- Facility 18 (Quantum/Cypher, USD) — POCI, principal forgiveness + full restructure
(9,  18, 12, 'PRINCIPAL_FORGIVE','2024-07-01', NULL,         NULL,         NULL,     NULL,     NULL, 5000000.0000, 'USD', '2024-06-28', 'Board of Directors', '2024-11-30', 'SEED'),
(10, 18, 12, 'DEBT_EQUITY',      '2024-08-01', NULL,         NULL,         NULL,     NULL,     NULL, NULL,         'USD', '2024-07-28', 'Board of Directors', '2024-11-30', 'SEED'),
(11, 18, 12, 'RESTRUCTURE',      '2024-09-01', '2025-03-31', '2027-03-31', 7.500000, 4.000000, 24,  2000000.0000, 'USD', '2024-08-25', 'Board of Directors', '2024-11-30', 'SEED'),

-- Additional forbearance events in Dec/Jan for worsening facilities
-- Fac 7: payment holiday added in Jan as it moves to STAGE_3
(12, 7, 7, 'PMT_HOLIDAY',      '2025-01-10', NULL,         NULL,         NULL,     NULL,     NULL, NULL,         'AUD', '2025-01-08', 'Chief Credit Officer', '2025-01-31', 'SEED'),
-- Fac 10: principal forgiveness as STAGE_3 intervention in Jan
(13, 10, 10, 'PRINCIPAL_FORGIVE','2025-01-28', NULL,         NULL,         NULL,     NULL,     NULL, 3000000.0000, 'SGD', '2025-01-26', 'Credit Committee', '2025-01-31', 'SEED'),
-- Fac 8: full restructure package in Jan
(14, 8, 8, 'RESTRUCTURE',      '2025-01-15', '2026-06-30', '2028-06-30', 3.500000, 2.000000, 24,  8000000.0000, 'CNY', '2025-01-10', 'Board of Directors', '2025-01-31', 'SEED'),
-- Additional term extensions for distressed
(15, 5, 5, 'RATE_RED',          '2025-01-20', NULL,         NULL,         4.500000, 3.000000, NULL, NULL,         'JPY', '2025-01-18', 'Credit Committee', '2025-01-31', 'SEED'),
-- Fac 10: term extension in Dec
(16, 10, 10, 'TERM_EXT',       '2024-12-22', '2025-06-30', '2026-06-30', NULL,     NULL,     12,  NULL,         'SGD', '2024-12-20', 'Credit Committee', '2024-12-31', 'SEED'),
-- Fac 7: restructure in Jan (comprehensive)
(17, 7, 7, 'RESTRUCTURE',      '2025-01-25', '2026-03-31', '2027-09-30', 3.250000, 2.500000, 18,  4500000.0000, 'AUD', '2025-01-22', 'Board of Directors', '2025-01-31', 'SEED'),
-- Fac 8: debt-to-equity conversion in Dec
(18, 8, 8, 'DEBT_EQUITY',      '2024-12-01', NULL,         NULL,         NULL,     NULL,     NULL, NULL,         'CNY', '2024-11-28', 'Board of Directors', '2024-12-31', 'SEED')
ON CONFLICT DO NOTHING;

-----------------------------------------------------------------------
-- LIMIT ASSIGNMENT SNAPSHOT (90 rows)
-- 10 facilities × 3 limit rules × 3 dates
-- Rules: 600001 (Single Name), 600002 (Sector Concentration), 600003 (Country)
-- Status progression: ACTIVE → WITHIN_THRESHOLD → BREACHED for distressed
-- PK = (facility_id, limit_rule_id, as_of_date) — composite
-----------------------------------------------------------------------
INSERT INTO l2.limit_assignment_snapshot (
    facility_id, limit_rule_id, as_of_date,
    limit_amt, assigned_date, expiry_date, status_code, currency_code,
    record_source
) VALUES
-- === Facility 1 (Meridian Aerospace, USD) — healthy, all ACTIVE ===
(1, 600001, '2024-11-30', 50000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),
(1, 600002, '2024-11-30', 200000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),
(1, 600003, '2024-11-30', 500000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),
(1, 600001, '2024-12-31', 50000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),
(1, 600002, '2024-12-31', 200000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),
(1, 600003, '2024-12-31', 500000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),
(1, 600001, '2025-01-31', 50000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),
(1, 600002, '2025-01-31', 200000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),
(1, 600003, '2025-01-31', 500000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'USD', 'SEED'),

-- === Facility 2 (Northbridge Pharma, EUR) — healthy ===
(2, 600001, '2024-11-30', 35000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),
(2, 600002, '2024-11-30', 150000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),
(2, 600003, '2024-11-30', 400000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),
(2, 600001, '2024-12-31', 35000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),
(2, 600002, '2024-12-31', 150000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),
(2, 600003, '2024-12-31', 400000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),
(2, 600001, '2025-01-31', 35000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),
(2, 600002, '2025-01-31', 150000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),
(2, 600003, '2025-01-31', 400000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'EUR', 'SEED'),

-- === Facility 3 (Pacific Ridge, GBP) — healthy ===
(3, 600001, '2024-11-30', 40000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),
(3, 600002, '2024-11-30', 175000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),
(3, 600003, '2024-11-30', 350000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),
(3, 600001, '2024-12-31', 40000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),
(3, 600002, '2024-12-31', 175000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),
(3, 600003, '2024-12-31', 350000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),
(3, 600001, '2025-01-31', 40000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),
(3, 600002, '2025-01-31', 175000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),
(3, 600003, '2025-01-31', 350000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'GBP', 'SEED'),

-- === Facility 5 (Atlas Industrial, JPY) — deteriorating: ACTIVE → ACTIVE → WITHIN_THRESHOLD ===
(5, 600001, '2024-11-30', 3000000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'JPY', 'SEED'),
(5, 600002, '2024-11-30', 10000000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'JPY', 'SEED'),
(5, 600003, '2024-11-30', 25000000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'JPY', 'SEED'),
(5, 600001, '2024-12-31', 3000000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'JPY', 'SEED'),
(5, 600002, '2024-12-31', 10000000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'JPY', 'SEED'),
(5, 600003, '2024-12-31', 25000000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'JPY', 'SEED'),
(5, 600001, '2025-01-31', 3000000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'JPY', 'SEED'),
(5, 600002, '2025-01-31', 10000000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'JPY', 'SEED'),
(5, 600003, '2025-01-31', 25000000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'JPY', 'SEED'),

-- === Facility 7 (Pinnacle Healthcare, AUD) — WITHIN_THRESHOLD → WITHIN_THRESHOLD → BREACHED ===
(7, 600001, '2024-11-30', 30000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'AUD', 'SEED'),
(7, 600002, '2024-11-30', 120000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'AUD', 'SEED'),
(7, 600003, '2024-11-30', 250000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'AUD', 'SEED'),
(7, 600001, '2024-12-31', 30000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'AUD', 'SEED'),
(7, 600002, '2024-12-31', 120000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'AUD', 'SEED'),
(7, 600003, '2024-12-31', 250000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'AUD', 'SEED'),
(7, 600001, '2025-01-31', 30000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'AUD', 'SEED'),
(7, 600002, '2025-01-31', 120000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'AUD', 'SEED'),
(7, 600003, '2025-01-31', 250000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'AUD', 'SEED'),

-- === Facility 8 (Westlake Materials, CNY) — already BREACHED on single name ===
(8, 600001, '2024-11-30', 200000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'CNY', 'SEED'),
(8, 600002, '2024-11-30', 800000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'CNY', 'SEED'),
(8, 600003, '2024-11-30', 2000000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CNY', 'SEED'),
(8, 600001, '2024-12-31', 200000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'CNY', 'SEED'),
(8, 600002, '2024-12-31', 800000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'CNY', 'SEED'),
(8, 600003, '2024-12-31', 2000000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'CNY', 'SEED'),
(8, 600001, '2025-01-31', 200000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'CNY', 'SEED'),
(8, 600002, '2025-01-31', 800000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'CNY', 'SEED'),
(8, 600003, '2025-01-31', 2000000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'CNY', 'SEED'),

-- === Facility 10 (Crestview REIT, SGD) — ACTIVE → WITHIN_THRESHOLD → BREACHED ===
(10, 600001, '2024-11-30', 25000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'SGD', 'SEED'),
(10, 600002, '2024-11-30', 100000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'SGD', 'SEED'),
(10, 600003, '2024-11-30', 200000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'SGD', 'SEED'),
(10, 600001, '2024-12-31', 25000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'SGD', 'SEED'),
(10, 600002, '2024-12-31', 100000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'SGD', 'SEED'),
(10, 600003, '2024-12-31', 200000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'SGD', 'SEED'),
(10, 600001, '2025-01-31', 25000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'SGD', 'SEED'),
(10, 600002, '2025-01-31', 100000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'SGD', 'SEED'),
(10, 600003, '2025-01-31', 200000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'SGD', 'SEED'),

-- === Facility 18 (Quantum/Cypher, USD) — POCI, BREACHED from start ===
(18, 600001, '2024-11-30', 20000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'USD', 'SEED'),
(18, 600002, '2024-11-30', 80000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'USD', 'SEED'),
(18, 600003, '2024-11-30', 150000000.0000, '2024-01-01', '2025-12-31', 'WITHIN_THRESHOLD', 'USD', 'SEED'),
(18, 600001, '2024-12-31', 20000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'USD', 'SEED'),
(18, 600002, '2024-12-31', 80000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'USD', 'SEED'),
(18, 600003, '2024-12-31', 150000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'USD', 'SEED'),
(18, 600001, '2025-01-31', 20000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'USD', 'SEED'),
(18, 600002, '2025-01-31', 80000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'USD', 'SEED'),
(18, 600003, '2025-01-31', 150000000.0000, '2024-01-01', '2025-12-31', 'BREACHED', 'USD', 'SEED'),

-- === Facility 6 (Greenfield Consumer, CAD) — healthy ===
(6, 600001, '2024-11-30', 25000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED'),
(6, 600002, '2024-11-30', 100000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED'),
(6, 600003, '2024-11-30', 250000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED'),
(6, 600001, '2024-12-31', 25000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED'),
(6, 600002, '2024-12-31', 100000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED'),
(6, 600003, '2024-12-31', 250000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED'),
(6, 600001, '2025-01-31', 25000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED'),
(6, 600002, '2025-01-31', 100000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED'),
(6, 600003, '2025-01-31', 250000000.0000, '2024-01-01', '2025-12-31', 'ACTIVE', 'CAD', 'SEED')
ON CONFLICT DO NOTHING;

-----------------------------------------------------------------------
-- WATCHLIST ENTRY (~24 rows)
-- All 5 OCC categories exercised: EARLY_WARNING, SPECIAL_MENTION,
-- SUBSTANDARD, DOUBTFUL, LOSS.
-- Mix of current (active) and exited entries.
-- Narrative: distressed facilities escalate through watchlist categories.
-----------------------------------------------------------------------
INSERT INTO l2.watchlist_entry (
    watchlist_entry_id, counterparty_id, facility_id, watchlist_category_code,
    entry_date, exit_date, entry_reason, exit_reason,
    assigned_officer, review_frequency, next_review_date,
    as_of_date, is_current_flag, record_source
) VALUES
-- === Facility 10 (Crestview REIT) — escalation trail: EW → SM → Substandard ===
-- Early Warning entry (exited → escalated to Special Mention)
(1,  10, 10, 'EARLY_WARNING',   '2024-09-01', '2024-11-15', 'Declining occupancy rates; DSCR trending below covenant', 'Escalated to Special Mention',
     'J. Morrison', 'MONTHLY', NULL, '2024-11-30', FALSE, 'SEED'),
-- Special Mention (exited → escalated to Substandard)
(2,  10, 10, 'SPECIAL_MENTION', '2024-11-15', '2025-01-10', 'DSCR below 1.0x; tenant vacancies rising to 25%', 'Escalated to Substandard',
     'J. Morrison', 'BIWEEKLY', NULL, '2024-12-31', FALSE, 'SEED'),
-- Substandard (current)
(3,  10, 10, 'SUBSTANDARD',     '2025-01-10', NULL,         'Missed principal payment; bankruptcy filing imminent; LTV above 90%', NULL,
     'S. Chen', 'WEEKLY', '2025-02-07', '2025-01-31', TRUE, 'SEED'),

-- === Facility 8 (Westlake Materials) — Doubtful (long-standing) ===
(4,  8,  8,  'DOUBTFUL',        '2024-06-01', NULL,         'Credit-impaired; multiple forbearance measures; full collection highly unlikely', NULL,
     'R. Patel', 'WEEKLY', '2025-02-07', '2024-11-30', TRUE, 'SEED'),
(5,  8,  8,  'DOUBTFUL',        '2024-06-01', NULL,         'Credit-impaired; multiple forbearance measures; full collection highly unlikely', NULL,
     'R. Patel', 'WEEKLY', '2025-02-07', '2024-12-31', TRUE, 'SEED'),
(6,  8,  8,  'DOUBTFUL',        '2024-06-01', NULL,         'Credit-impaired; multiple forbearance measures; full collection highly unlikely', NULL,
     'R. Patel', 'WEEKLY', '2025-02-07', '2025-01-31', TRUE, 'SEED'),

-- === Facility 7 (Pinnacle Healthcare) — SM → Substandard ===
(7,  7,  7,  'SPECIAL_MENTION', '2024-08-15', '2025-01-05', 'Revenue decline and covenant breach; STAGE_2 classification', 'Escalated to Substandard',
     'M. Torres', 'BIWEEKLY', NULL, '2024-11-30', FALSE, 'SEED'),
(8,  7,  7,  'SPECIAL_MENTION', '2024-08-15', '2025-01-05', 'Revenue decline and covenant breach; STAGE_2 classification', 'Escalated to Substandard',
     'M. Torres', 'BIWEEKLY', NULL, '2024-12-31', FALSE, 'SEED'),
(9,  7,  7,  'SUBSTANDARD',     '2025-01-05', NULL,         'Missed interest payment; credit-impaired; STAGE_3 migration', NULL,
     'M. Torres', 'WEEKLY', '2025-02-05', '2025-01-31', TRUE, 'SEED'),

-- === Facility 18 (Quantum/Cypher) — Loss (POCI) ===
(10, 12, 18, 'LOSS',            '2024-06-01', NULL,         'Purchased credit-impaired; principal forgiveness applied; uncollectible portion recognized', NULL,
     'D. Kim', 'MONTHLY', '2025-02-28', '2024-11-30', TRUE, 'SEED'),
(11, 12, 18, 'LOSS',            '2024-06-01', NULL,         'Purchased credit-impaired; principal forgiveness applied; uncollectible portion recognized', NULL,
     'D. Kim', 'MONTHLY', '2025-02-28', '2024-12-31', TRUE, 'SEED'),
(12, 12, 18, 'LOSS',            '2024-06-01', NULL,         'Purchased credit-impaired; principal forgiveness applied; uncollectible portion recognized', NULL,
     'D. Kim', 'MONTHLY', '2025-02-28', '2025-01-31', TRUE, 'SEED'),

-- === Facility 5 (Atlas Industrial) — Early Warning in Dec, SM in Jan ===
(13, 5,  5,  'EARLY_WARNING',   '2024-12-01', '2025-01-10', 'Revenue softening; covenant compliance narrowing', 'Escalated to Special Mention',
     'A. Nakamura', 'MONTHLY', NULL, '2024-12-31', FALSE, 'SEED'),
(14, 5,  5,  'SPECIAL_MENTION', '2025-01-10', NULL,         'Covenant breach confirmed; DSCR 0.95x; STAGE_2 migration', NULL,
     'A. Nakamura', 'BIWEEKLY', '2025-02-10', '2025-01-31', TRUE, 'SEED'),

-- === Facility 4 (Silverton Financial) — Early Warning, current, minor concern ===
(15, 4,  4,  'EARLY_WARNING',   '2025-01-15', NULL,         'Rising exposure concentration; interest rate sensitivity', NULL,
     'L. Weber', 'QUARTERLY', '2025-04-15', '2025-01-31', TRUE, 'SEED'),

-- === Facility 9 (Ironclad Infrastructure) — Early Warning, exited (resolved) ===
(16, 9,  9,  'EARLY_WARNING',   '2024-07-01', '2024-10-15', 'Construction delay; cost overrun risk', 'Resolved: project back on schedule; cost overruns contained',
     'P. Nguyen', 'MONTHLY', NULL, '2024-11-30', FALSE, 'SEED'),

-- === Additional as_of_date snapshots for continuity ===
-- Fac 4 EW also visible in prior months (not present = healthy then)
-- Fac 10 SM visible in Dec
(17, 10, 10, 'SPECIAL_MENTION', '2024-11-15', '2025-01-10', 'DSCR below 1.0x; tenant vacancies rising to 25%', 'Escalated to Substandard',
     'J. Morrison', 'BIWEEKLY', '2025-01-15', '2025-01-31', FALSE, 'SEED'),

-- === Healthy facilities exited from watchlist (demonstrate full lifecycle) ===
-- Fac 3 (Pacific Ridge) — was on EW briefly, exited clean
(18, 3,  3,  'EARLY_WARNING',   '2024-04-01', '2024-06-30', 'Commodity price volatility; hedging adequacy review', 'Resolved: hedging program strengthened; risk reduced',
     'K. Stewart', 'MONTHLY', NULL, '2024-11-30', FALSE, 'SEED'),

-- Fac 2 (Northbridge Pharma) — SM briefly, exited
(19, 2,  2,  'SPECIAL_MENTION', '2024-03-01', '2024-05-31', 'FDA approval delay for key product; revenue forecast revised down', 'Resolved: FDA approval received; revenues recovering',
     'E. Rodriguez', 'BIWEEKLY', NULL, '2024-11-30', FALSE, 'SEED'),

-- Fac 10 EW visible in Nov snapshot for completeness
(20, 10, 10, 'EARLY_WARNING',   '2024-09-01', '2024-11-15', 'Declining occupancy rates; DSCR trending below covenant', 'Escalated to Special Mention',
     'J. Morrison', 'MONTHLY', '2024-10-01', '2024-12-31', FALSE, 'SEED')

ON CONFLICT DO NOTHING;
