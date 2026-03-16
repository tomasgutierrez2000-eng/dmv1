-- ═══════════════════════════════════════════════════════════════
-- Metric Test Seed Data
-- Populates tables required by EXP-007, EXP-008, EXP-009
-- Load AFTER 08-payment-stress-seed.sql
-- ═══════════════════════════════════════════════════════════════

-- ── EXP-007: CRITICIZED risk flags (16 active + 1 cleared) ──
-- Uses risk_flag_id range 10001-10017 to avoid collision with seed/scenario data
INSERT INTO l2.risk_flag (risk_flag_id, facility_id, counterparty_id, flag_type, as_of_date, raised_ts, cleared_ts, flag_code, flag_description, flag_scope, flag_severity, flag_trigger_value) VALUES
(10001, 1, 1, 'CREDIT_QUALITY', '2025-01-31', '2025-01-10 08:00:00', NULL, 'CRITICIZED', 'Special mention classification — early deterioration signals', 'FACILITY', 'WARNING', NULL),
(10002, 3, 3, 'CREDIT_QUALITY', '2025-01-31', '2025-01-12 09:30:00', NULL, 'CRITICIZED', 'Substandard classification — inadequate debt service coverage', 'FACILITY', 'HIGH', 0.85),
(10003, 11, 11, 'CREDIT_QUALITY', '2025-01-31', '2025-01-05 14:00:00', NULL, 'CRITICIZED', 'Special mention — covenant breach pending waiver', 'FACILITY', 'WARNING', NULL),
(10004, 12, 11, 'CREDIT_QUALITY', '2025-01-31', '2025-01-05 14:00:00', NULL, 'CRITICIZED', 'Special mention — declining revenue trend', 'FACILITY', 'WARNING', NULL),
(10005, 13, 11, 'CREDIT_QUALITY', '2025-01-31', '2025-01-05 14:00:00', NULL, 'CRITICIZED', 'Substandard — liquidity concern in subsidiary', 'FACILITY', 'HIGH', 1.1),
(10006, 26, 15, 'CREDIT_QUALITY', '2025-01-31', '2025-01-08 10:15:00', NULL, 'CRITICIZED', 'Special mention — industry downturn exposure', 'FACILITY', 'WARNING', NULL),
(10007, 27, 15, 'CREDIT_QUALITY', '2025-01-31', '2025-01-08 10:15:00', NULL, 'CRITICIZED', 'Doubtful — material uncertainty on recovery', 'FACILITY', 'CRITICAL', 0.45),
(10008, 54, 20, 'CREDIT_QUALITY', '2025-01-31', '2025-01-15 11:00:00', NULL, 'CRITICIZED', 'Substandard — operating losses and negative cash flow', 'FACILITY', 'HIGH', 0.72),
(10009, 80, 25, 'CREDIT_QUALITY', '2025-01-31', '2025-01-20 09:00:00', NULL, 'CRITICIZED', 'Special mention — management quality concern', 'FACILITY', 'WARNING', NULL),
(10010, 100, 30, 'CREDIT_QUALITY', '2025-01-31', '2025-01-22 13:45:00', NULL, 'CRITICIZED', 'Substandard — collateral value impaired', 'FACILITY', 'HIGH', 0.60),
(10011, 131, 40, 'CREDIT_QUALITY', '2025-01-31', '2025-01-18 15:30:00', NULL, 'CRITICIZED', 'Special mention — regulatory action pending', 'FACILITY', 'WARNING', NULL),
(10012, 160, 50, 'CREDIT_QUALITY', '2025-01-31', '2025-01-11 08:30:00', NULL, 'CRITICIZED', 'Substandard — delinquent payments >60 days', 'FACILITY', 'HIGH', 65),
(10013, 160, 50, 'CREDIT_QUALITY', '2025-01-31', '2025-01-25 16:00:00', NULL, 'CRITICIZED', 'Loss — recovery uncertain per external assessment', 'FACILITY', 'CRITICAL', 0.15),
(10014, 200, 60, 'CREDIT_QUALITY', '2025-01-31', '2024-12-01 09:00:00', '2025-01-15 10:00:00', 'CRITICIZED', 'Special mention — resolved after restructuring', 'FACILITY', 'WARNING', NULL),
(10015, 230, 70, 'CREDIT_QUALITY', '2025-01-31', '2025-01-14 11:30:00', NULL, 'CRITICIZED', 'Substandard — environmental remediation liability', 'FACILITY', 'HIGH', 2.5),
(10016, 260, 80, 'CREDIT_QUALITY', '2025-01-31', '2025-01-19 14:00:00', NULL, 'CRITICIZED', 'Special mention — customer concentration >40 pct', 'FACILITY', 'WARNING', 42.5),
(10017, 290, 90, 'CREDIT_QUALITY', '2025-01-31', '2025-01-21 09:15:00', NULL, 'CRITICIZED', 'Substandard — adverse audit findings', 'FACILITY', 'HIGH', NULL);

-- ── EXP-008: counterparty_derived (facility-level denormalization with cross-entity flags) ──
-- Cross-entity = counterparties with 4+ active facilities
-- Populated via INSERT ... SELECT from l1/l2 joins
INSERT INTO l3.counterparty_derived (
  facility_id, counterparty_id, as_of_date,
  legal_name, credit_agreement_id,
  is_active_flag, has_cross_entity_flag,
  committed_amt, outstanding_amt, unfunded_amt,
  base_currency_code, created_ts
)
SELECT
  fm.facility_id,
  fm.counterparty_id,
  '2025-01-31'::DATE,
  c.legal_name,
  fm.credit_agreement_id,
  true,
  fm.counterparty_id = ANY(
    ARRAY(SELECT f3.counterparty_id FROM l2.facility_master f3
          WHERE f3.is_active_flag = 'Y'
          GROUP BY f3.counterparty_id HAVING COUNT(*) >= 4)
  ),
  fes.committed_amount,
  fes.drawn_amount,
  fes.undrawn_amount,
  'USD',
  CURRENT_TIMESTAMP
FROM l2.facility_master fm
INNER JOIN l2.counterparty c ON c.counterparty_id = fm.counterparty_id
LEFT JOIN l2.facility_exposure_snapshot fes
  ON fes.facility_id = fm.facility_id AND fes.as_of_date = '2025-01-31'
WHERE fm.is_active_flag = 'Y';
