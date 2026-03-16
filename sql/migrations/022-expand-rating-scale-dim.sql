-- ═══════════════════════════════════════════════════════════════
-- Migration 022: Expand rating_scale_dim to Full GSIB Standard
-- ═══════════════════════════════════════════════════════════════
-- Problem: rating_scale_dim has only 10 notches (AAA through BB),
-- missing 12 standard letter notches (AA-, A-, BB-, B+, B, B-,
-- CCC+, CCC, CCC-, CC, C, D) and all numeric internal ratings.
-- This causes RSK-010 (Internal Risk Rating) to return 0 for 85%
-- of counterparties because their internal_risk_rating values
-- (numeric "2"-"8" or letter "A-", "B+") don't match any notch.
--
-- Fix: UPDATE existing 10 rows to proper 22-notch ordinal values,
-- then INSERT the 12 missing letter notches and 10 numeric
-- internal scale entries. Preserves FK references from
-- rating_grade_dim → rating_scale_dim.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── Step 1: UPDATE existing 10 rows ─────────────────────────────
-- Remap from 10-notch ordinals to proper 22-notch positions.
-- Also standardize scale_name to 'S&P Equivalent' for letter grades.
-- AAA(1), AA+(2), AA(3) stay the same; A+ shifts from 4→5, etc.

UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'AAA', rating_value = 1, rating_grade_id = 1,
  scale_type = 'EXTERNAL', is_investment_grade_flag = true, pd_implied = 0.0001,
  display_color_hex = '#1B5E20', is_current_flag = true
WHERE rating_scale_id = 920001;

UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'AA+', rating_value = 2, rating_grade_id = 2,
  scale_type = 'EXTERNAL', is_investment_grade_flag = true, pd_implied = 0.0002,
  display_color_hex = '#2E7D32', is_current_flag = true
WHERE rating_scale_id = 920002;

UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'AA', rating_value = 3, rating_grade_id = 3,
  scale_type = 'EXTERNAL', is_investment_grade_flag = true, pd_implied = 0.0003,
  display_color_hex = '#388E3C', is_current_flag = true
WHERE rating_scale_id = 920003;

-- A+ was ordinal 4, now 5 in 22-notch scale
UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'A+', rating_value = 5, rating_grade_id = 5,
  scale_type = 'EXTERNAL', is_investment_grade_flag = true, pd_implied = 0.0008,
  display_color_hex = '#4CAF50', is_current_flag = true
WHERE rating_scale_id = 920004;

-- A was ordinal 5, now 6
UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'A', rating_value = 6, rating_grade_id = 6,
  scale_type = 'EXTERNAL', is_investment_grade_flag = true, pd_implied = 0.0012,
  display_color_hex = '#66BB6A', is_current_flag = true
WHERE rating_scale_id = 920005;

-- BBB+ was ordinal 6, now 8
UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'BBB+', rating_value = 8, rating_grade_id = 8,
  scale_type = 'EXTERNAL', is_investment_grade_flag = true, pd_implied = 0.0025,
  display_color_hex = '#FFC107', is_current_flag = true
WHERE rating_scale_id = 920006;

-- BBB was ordinal 7, now 9
UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'BBB', rating_value = 9, rating_grade_id = 9,
  scale_type = 'EXTERNAL', is_investment_grade_flag = true, pd_implied = 0.0040,
  display_color_hex = '#FFB300', is_current_flag = true
WHERE rating_scale_id = 920007;

-- BBB- was ordinal 8, now 10
UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'BBB-', rating_value = 10, rating_grade_id = 10,
  scale_type = 'EXTERNAL', is_investment_grade_flag = true, pd_implied = 0.0070,
  display_color_hex = '#FF9800', is_current_flag = true
WHERE rating_scale_id = 920008;

-- BB+ was ordinal 9, now 11
UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'BB+', rating_value = 11, rating_grade_id = 11,
  scale_type = 'EXTERNAL', is_investment_grade_flag = false, pd_implied = 0.0100,
  display_color_hex = '#FF7043', is_current_flag = true
WHERE rating_scale_id = 920009;

-- BB was ordinal 10, now 12
UPDATE l1.rating_scale_dim SET scale_name = 'S&P Equivalent',
  rating_notch = 'BB', rating_value = 12, rating_grade_id = 12,
  scale_type = 'EXTERNAL', is_investment_grade_flag = false, pd_implied = 0.0150,
  display_color_hex = '#FF5722', is_current_flag = true
WHERE rating_scale_id = 920010;

-- ── Step 2: INSERT missing letter notches ────────────────────────
-- 12 additional letter grades to complete the 22-notch S&P scale
INSERT INTO l1.rating_scale_dim
  (rating_scale_id, scale_name, rating_notch, rating_value, rating_grade_id,
   scale_type, is_investment_grade_flag, pd_implied,
   display_color_hex, is_active_flag, is_default_flag,
   created_ts, updated_ts, effective_start_date, is_current_flag)
VALUES
  (920011, 'S&P Equivalent', 'AA-',  4,  4, 'EXTERNAL', true,  0.0005, '#43A047', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920012, 'S&P Equivalent', 'A-',   7,  7, 'EXTERNAL', true,  0.0018, '#81C784', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920013, 'S&P Equivalent', 'BB-', 13, 13, 'EXTERNAL', false, 0.0250, '#F4511E', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920014, 'S&P Equivalent', 'B+',  14, 14, 'EXTERNAL', false, 0.0400, '#E64A19', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920015, 'S&P Equivalent', 'B',   15, 15, 'EXTERNAL', false, 0.0650, '#D84315', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920016, 'S&P Equivalent', 'B-',  16, 16, 'EXTERNAL', false, 0.1000, '#BF360C', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920017, 'S&P Equivalent', 'CCC+',17, 17, 'EXTERNAL', false, 0.1500, '#E53935', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920018, 'S&P Equivalent', 'CCC', 18, 18, 'EXTERNAL', false, 0.2500, '#C62828', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920019, 'S&P Equivalent', 'CCC-',19, 19, 'EXTERNAL', false, 0.3500, '#B71C1C', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920020, 'S&P Equivalent', 'CC',  20, 20, 'EXTERNAL', false, 0.5000, '#880E4F', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920021, 'S&P Equivalent', 'C',   21, 21, 'EXTERNAL', false, 0.7500, '#4A148C', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920022, 'S&P Equivalent', 'D',   22, 22, 'EXTERNAL', false, 1.0000, '#311B92', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true);

-- ── Step 3: INSERT numeric internal scale (1-10) ─────────────────
-- Maps bank-internal numeric ratings to equivalent letter-grade
-- ordinal positions per typical GSIB 10-point PD master scale.
-- Mapping: 1≈AAA, 2≈AA, 3≈A, 4≈BBB+, 5≈BBB, 6≈BB, 7≈B+, 8≈B-, 9≈CCC, 10≈D
INSERT INTO l1.rating_scale_dim
  (rating_scale_id, scale_name, rating_notch, rating_value, rating_grade_id,
   scale_type, is_investment_grade_flag, pd_implied,
   display_color_hex, is_active_flag, is_default_flag,
   created_ts, updated_ts, effective_start_date, is_current_flag)
VALUES
  (920101, 'Internal 10-Point', '1',   1,  1, 'INTERNAL', true,  0.0001, '#1B5E20', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920102, 'Internal 10-Point', '2',   3,  3, 'INTERNAL', true,  0.0003, '#388E3C', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920103, 'Internal 10-Point', '3',   6,  6, 'INTERNAL', true,  0.0012, '#66BB6A', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920104, 'Internal 10-Point', '4',   8,  8, 'INTERNAL', true,  0.0025, '#FFC107', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920105, 'Internal 10-Point', '5',   9,  9, 'INTERNAL', true,  0.0040, '#FFB300', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920106, 'Internal 10-Point', '6',  12, 12, 'INTERNAL', false, 0.0150, '#FF5722', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920107, 'Internal 10-Point', '7',  14, 14, 'INTERNAL', false, 0.0400, '#E64A19', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920108, 'Internal 10-Point', '8',  16, 16, 'INTERNAL', false, 0.1000, '#BF360C', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920109, 'Internal 10-Point', '9',  18, 18, 'INTERNAL', false, 0.2500, '#C62828', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true),
  (920110, 'Internal 10-Point', '10', 22, 22, 'INTERNAL', false, 1.0000, '#311B92', true, false, '2024-06-15', '2024-06-15 12:00:00', '2026-01-01', true);

COMMIT;
