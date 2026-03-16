-- ═══════════════════════════════════════════════════════════════
-- Syndicated Facility Participation Seed Data
-- Converts 8 facilities from sole-borrower to multi-party syndications
-- Purpose: Test EXP-006 (Counterparty Share %) with varied participation_pct
-- ═══════════════════════════════════════════════════════════════
-- ID range: facility_participation_id 1001-1022 (safe: max existing = 405)
-- Uses existing counterparties 80-97 as syndicate partners
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── Step 1: Reduce existing borrower participation on syndicated facilities ──
-- These facilities will become syndicated (shares < 100%)

UPDATE l2.facility_counterparty_participation
SET participation_pct = 50.0000
WHERE facility_id = 1 AND is_current_flag = true;

UPDATE l2.facility_counterparty_participation
SET participation_pct = 40.0000
WHERE facility_id = 2 AND is_current_flag = true;

UPDATE l2.facility_counterparty_participation
SET participation_pct = 55.0000
WHERE facility_id = 3 AND is_current_flag = true;

UPDATE l2.facility_counterparty_participation
SET participation_pct = 35.0000
WHERE facility_id = 6 AND is_current_flag = true;

UPDATE l2.facility_counterparty_participation
SET participation_pct = 45.0000
WHERE facility_id = 10 AND is_current_flag = true;

UPDATE l2.facility_counterparty_participation
SET participation_pct = 60.0000
WHERE facility_id = 11 AND is_current_flag = true;

UPDATE l2.facility_counterparty_participation
SET participation_pct = 50.0000
WHERE facility_id = 17 AND is_current_flag = true;

UPDATE l2.facility_counterparty_participation
SET participation_pct = 65.0000
WHERE facility_id = 19 AND is_current_flag = true;


-- ── Step 2: Add syndicate partner participations ────────────────────────────

-- Facility 1 (CP1 Meridian Aerospace, USD $120M revolver) — 3-way syndicate
-- CP1=50% (primary), CP80=30% (participant), CP81=20% (participant)
INSERT INTO l2.facility_counterparty_participation
  (facility_participation_id, facility_id, counterparty_id, counterparty_role_code,
   is_primary_flag, participation_pct, role_priority_rank, source_record_id,
   effective_start_date, effective_end_date, is_current_flag, created_ts)
VALUES
  (1001, 1, 80, 'PARTICIPANT', false, 30.0000, '2', 900001, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1002, 1, 81, 'PARTICIPANT', false, 20.0000, '3', 900002, '2024-01-01', NULL, true, '2024-06-15 12:00:00');

-- Facility 2 (CP2 European Industrial, EUR €440M term loan) — 4-way syndicate
-- CP2=40% (primary), CP82=25% (agent), CP83=20% (participant), CP84=15% (participant)
INSERT INTO l2.facility_counterparty_participation
  (facility_participation_id, facility_id, counterparty_id, counterparty_role_code,
   is_primary_flag, participation_pct, role_priority_rank, source_record_id,
   effective_start_date, effective_end_date, is_current_flag, created_ts)
VALUES
  (1003, 2, 82, 'AGENT',     false, 25.0000, '2', 900003, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1004, 2, 83, 'PARTICIPANT', false, 20.0000, '3', 900004, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1005, 2, 84, 'PARTICIPANT', false, 15.0000, '4', 900005, '2024-01-01', NULL, true, '2024-06-15 12:00:00');

-- Facility 3 (CP3 British Corp, GBP £800M revolver) — 3-way syndicate
-- CP3=55% (primary), CP85=30% (participant), CP86=15% (participant)
INSERT INTO l2.facility_counterparty_participation
  (facility_participation_id, facility_id, counterparty_id, counterparty_role_code,
   is_primary_flag, participation_pct, role_priority_rank, source_record_id,
   effective_start_date, effective_end_date, is_current_flag, created_ts)
VALUES
  (1006, 3, 85, 'PARTICIPANT', false, 30.0000, '2', 900006, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1007, 3, 86, 'PARTICIPANT', false, 15.0000, '3', 900007, '2024-01-01', NULL, true, '2024-06-15 12:00:00');

-- Facility 6 (CP6 Canadian Holding, CAD C$1.19B revolver) — 5-way syndicate (large deal)
-- CP6=35% (primary), CP87=25% (agent), CP88=20% (participant), CP89=12%, CP90=8%
INSERT INTO l2.facility_counterparty_participation
  (facility_participation_id, facility_id, counterparty_id, counterparty_role_code,
   is_primary_flag, participation_pct, role_priority_rank, source_record_id,
   effective_start_date, effective_end_date, is_current_flag, created_ts)
VALUES
  (1008, 6, 87, 'AGENT',     false, 25.0000, '2', 900008, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1009, 6, 88, 'PARTICIPANT', false, 20.0000, '3', 900009, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1010, 6, 89, 'PARTICIPANT', false, 12.0000, '4', 900010, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1011, 6, 90, 'PARTICIPANT', false,  8.0000, '5', 900011, '2024-01-01', NULL, true, '2024-06-15 12:00:00');

-- Facility 10 (CP10 Singapore Corp, SGD S$2.15B term loan) — 4-way syndicate
-- CP10=45% (primary), CP91=25% (agent), CP92=18% (participant), CP93=12%
INSERT INTO l2.facility_counterparty_participation
  (facility_participation_id, facility_id, counterparty_id, counterparty_role_code,
   is_primary_flag, participation_pct, role_priority_rank, source_record_id,
   effective_start_date, effective_end_date, is_current_flag, created_ts)
VALUES
  (1012, 10, 91, 'AGENT',     false, 25.0000, '2', 900012, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1013, 10, 92, 'PARTICIPANT', false, 18.0000, '3', 900013, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1014, 10, 93, 'PARTICIPANT', false, 12.0000, '4', 900014, '2024-01-01', NULL, true, '2024-06-15 12:00:00');

-- Facility 11 (CP11 Deepwater Drilling, USD $195M revolver) — 2-way syndicate
-- CP11=60% (primary), CP94=40% (participant)
INSERT INTO l2.facility_counterparty_participation
  (facility_participation_id, facility_id, counterparty_id, counterparty_role_code,
   is_primary_flag, participation_pct, role_priority_rank, source_record_id,
   effective_start_date, effective_end_date, is_current_flag, created_ts)
VALUES
  (1015, 11, 94, 'PARTICIPANT', false, 40.0000, '2', 900015, '2024-01-01', NULL, true, '2024-06-15 12:00:00');

-- Facility 17 (CP12 Arctic Exploration, USD $631M revolver) — 3-way syndicate
-- CP12=50% (primary), CP95=30% (agent), CP96=20% (participant)
INSERT INTO l2.facility_counterparty_participation
  (facility_participation_id, facility_id, counterparty_id, counterparty_role_code,
   is_primary_flag, participation_pct, role_priority_rank, source_record_id,
   effective_start_date, effective_end_date, is_current_flag, created_ts)
VALUES
  (1016, 17, 95, 'AGENT',     false, 30.0000, '2', 900016, '2024-01-01', NULL, true, '2024-06-15 12:00:00'),
  (1017, 17, 96, 'PARTICIPANT', false, 20.0000, '3', 900017, '2024-01-01', NULL, true, '2024-06-15 12:00:00');

-- Facility 19 (CP13 British Mining, GBP £24M revolver) — 2-way syndicate
-- CP13=65% (primary), CP97=35% (participant)
INSERT INTO l2.facility_counterparty_participation
  (facility_participation_id, facility_id, counterparty_id, counterparty_role_code,
   is_primary_flag, participation_pct, role_priority_rank, source_record_id,
   effective_start_date, effective_end_date, is_current_flag, created_ts)
VALUES
  (1018, 19, 97, 'PARTICIPANT', false, 35.0000, '2', 900018, '2024-01-01', NULL, true, '2024-06-15 12:00:00');

COMMIT;

-- ── Verification: participation shares sum to 100% per facility ─────────────
SELECT
  fcp.facility_id,
  COUNT(*) AS participant_count,
  SUM(fcp.participation_pct) AS total_pct,
  STRING_AGG(
    fcp.counterparty_role_code || ':' || fcp.participation_pct::text,
    ', ' ORDER BY fcp.role_priority_rank
  ) AS breakdown
FROM l2.facility_counterparty_participation fcp
WHERE fcp.is_current_flag = true
  AND fcp.facility_id IN (1, 2, 3, 6, 10, 11, 17, 19)
GROUP BY fcp.facility_id
ORDER BY fcp.facility_id;
