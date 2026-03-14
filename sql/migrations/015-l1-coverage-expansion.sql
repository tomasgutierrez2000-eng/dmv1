-- Migration 015: L1 Coverage Expansion
-- Expands country_dim (16→50), impairment_model_dim (2→8), scenario_dim (10→40)
-- Date: 2026-03-14

BEGIN;

SET search_path TO l1, public;

-- ============================================================================
-- PART 1: l1.impairment_model_dim — Fix existing rows + add 6 new
-- ============================================================================

-- Fix NULL dates on existing CECL row
UPDATE l1.impairment_model_dim
SET effective_start_date = '2020-01-01',
    effective_end_date   = '9999-12-31',
    is_current_flag      = true,
    updated_ts           = CURRENT_TIMESTAMP
WHERE model_code = 'CECL';

-- Fix NULL dates on existing IFRS9 row
UPDATE l1.impairment_model_dim
SET effective_start_date = '2018-01-01',
    effective_end_date   = '9999-12-31',
    is_current_flag      = true,
    updated_ts           = CURRENT_TIMESTAMP
WHERE model_code = 'IFRS9';

-- Insert 6 new impairment models
INSERT INTO l1.impairment_model_dim
  (model_code, model_name, regulatory_framework, description, is_active_flag,
   effective_start_date, effective_end_date, is_current_flag,
   created_ts, updated_ts, created_by, record_source, load_batch_id)
VALUES
  ('CECL_V2',  'CECL v2.0 — Enhanced Weighted-Average',
   'US GAAP', 'Refinement of ASC 326 CECL with improved multi-scenario probability weighting and regression-based loss estimation',
   true, '2023-01-01', '9999-12-31', true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001'),

  ('CECL_V3',  'CECL v3.0 — Multi-Scenario DCF',
   'US GAAP', 'Latest ASC 326 model incorporating discounted cash flow (DCF) based lifetime loss estimation with forward-looking macroeconomic overlays',
   true, '2025-01-01', '9999-12-31', true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001'),

  ('IFRS9_V2', 'IFRS 9 v2.0 — Enhanced Stage Transfer',
   'IFRS', 'Enhanced IFRS 9 model with improved significant increase in credit risk (SICR) staging criteria and forward-looking management overlays',
   true, '2024-01-01', '9999-12-31', true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001'),

  ('IRB_PD',   'IRB PD Model',
   'Basel III', 'Basel III Advanced IRB probability of default model — through-the-cycle PD estimation with point-in-time calibration',
   true, '2019-06-01', '9999-12-31', true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001'),

  ('IRB_LGD',  'IRB LGD Model',
   'Basel III', 'Basel III Advanced IRB loss given default model — downturn LGD estimation with collateral recovery and workout cost adjustments',
   true, '2019-06-01', '9999-12-31', true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001'),

  ('SA_ECL',   'Standardized Approach ECL',
   'Basel III', 'Simplified expected credit loss model for jurisdictions not adopting CECL or IFRS 9, aligned with Basel III standardized approach',
   true, '2022-01-01', '9999-12-31', true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001');


-- ============================================================================
-- PART 2: l1.country_dim — Add 34 new countries (existing 16 untouched)
-- ============================================================================

INSERT INTO l1.country_dim
  (country_code, country_name, is_active_flag, region_code,
   basel_country_risk_weight, is_developed_market_flag,
   is_fatf_high_risk_flag, is_ofac_sanctioned_flag,
   iso_alpha_3, iso_numeric, jurisdiction_id,
   created_by, record_source, load_batch_id)
VALUES
  -- G20 members not yet included
  ('AR', 'Argentina',     true, 'AMER', '50%',  false, false, false, 'ARG', '032', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('CN', 'China',         true, 'APAC', '20%',  false, false, false, 'CHN', '156', 11,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('ID', 'Indonesia',     true, 'APAC', '20%',  false, false, false, 'IDN', '360', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('IT', 'Italy',         true, 'EMEA', '0%',   true,  false, false, 'ITA', '380', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('RU', 'Russia',        true, 'EMEA', '100%', false, false, true,  'RUS', '643', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('SA', 'Saudi Arabia',  true, 'EMEA', '20%',  false, false, false, 'SAU', '682', 16,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('TR', 'Turkey',        true, 'EMEA', '50%',  false, false, false, 'TUR', '792', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('ZA', 'South Africa',  true, 'EMEA', '20%',  false, false, false, 'ZAF', '710', 15,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),

  -- Major financial centers
  ('AT', 'Austria',       true, 'EMEA', '0%',   true,  false, false, 'AUT', '040', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('BE', 'Belgium',       true, 'EMEA', '0%',   true,  false, false, 'BEL', '056', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('BM', 'Bermuda',       true, 'AMER', '20%',  false, false, false, 'BMU', '060', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('CL', 'Chile',         true, 'AMER', '0%',   true,  false, false, 'CHL', '152', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('CO', 'Colombia',      true, 'AMER', '50%',  false, false, false, 'COL', '170', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('CY', 'Cyprus',        true, 'EMEA', '0%',   true,  false, false, 'CYP', '196', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('CZ', 'Czechia',       true, 'EMEA', '0%',   true,  false, false, 'CZE', '203', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('DK', 'Denmark',       true, 'EMEA', '0%',   true,  false, false, 'DNK', '208', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('ES', 'Spain',         true, 'EMEA', '0%',   true,  false, false, 'ESP', '724', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('FI', 'Finland',       true, 'EMEA', '0%',   true,  false, false, 'FIN', '246', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('IE', 'Ireland',       true, 'EMEA', '0%',   true,  false, false, 'IRL', '372', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('IL', 'Israel',        true, 'EMEA', '0%',   true,  false, false, 'ISR', '376', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('KY', 'Cayman Islands', true, 'AMER', '20%', false, false, false, 'CYM', '136', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('LU', 'Luxembourg',    true, 'EMEA', '0%',   true,  false, false, 'LUX', '442', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('MY', 'Malaysia',      true, 'APAC', '20%',  false, false, false, 'MYS', '458', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('NO', 'Norway',        true, 'EMEA', '0%',   true,  false, false, 'NOR', '578', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('NZ', 'New Zealand',   true, 'APAC', '0%',   true,  false, false, 'NZL', '554', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('PH', 'Philippines',   true, 'APAC', '50%',  false, false, false, 'PHL', '608', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('PL', 'Poland',        true, 'EMEA', '0%',   true,  false, false, 'POL', '616', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('PT', 'Portugal',      true, 'EMEA', '0%',   true,  false, false, 'PRT', '620', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('SE', 'Sweden',        true, 'EMEA', '0%',   true,  false, false, 'SWE', '752', 3,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('TH', 'Thailand',      true, 'APAC', '20%',  false, false, false, 'THA', '764', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('TW', 'Taiwan',        true, 'APAC', '0%',   true,  false, false, 'TWN', '158', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('VG', 'British Virgin Islands', true, 'AMER', '20%', false, false, false, 'VGB', '092', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),

  -- FATF high-risk / sanctioned countries
  ('IR', 'Iran',          true, 'EMEA', '100%', false, true,  true,  'IRN', '364', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('KP', 'North Korea',   true, 'APAC', '100%', false, true,  true,  'PRK', '408', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('MM', 'Myanmar',       true, 'APAC', '100%', false, true,  true,  'MMR', '104', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('SY', 'Syria',         true, 'EMEA', '100%', false, false, true,  'SYR', '760', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001'),
  ('CU', 'Cuba',          true, 'AMER', '100%', false, false, true,  'CUB', '192', NULL,
   'SYSTEM', 'GSIB-INIT-001', 'GSIB-INIT-001');


-- ============================================================================
-- PART 3: l1.scenario_dim — Add 30 new scenarios (IDs 1300011-1300040)
-- ============================================================================

INSERT INTO l1.scenario_dim
  (scenario_id, scenario_code, scenario_name, scenario_type,
   source_system_id, description, regulatory_scenario_code,
   scenario_start_date, scenario_end_date, scenario_horizon_months,
   shock_parameters_json,
   effective_start_date, effective_end_date, is_current_flag, is_active_flag,
   created_ts, updated_ts, created_by, record_source, load_batch_id)
VALUES
  -- SENSITIVITY type (IDs 1300011-1300018)
  (1300011, 'RATE_UP500', 'Interest Rate +500bp Shock', 'SENSITIVITY',
   1400026, 'Parallel upward shift of +500 basis points across the yield curve to stress interest rate sensitivity of the credit portfolio',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"rate_shock_bps": 500}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300012, 'FX_USD_STRONG', 'USD Appreciation +20%', 'SENSITIVITY',
   1400026, 'Broad-based USD appreciation of 20% against major trading partner currencies to assess FX-linked credit exposure',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"fx_usd_chg_pct": 20}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300013, 'FX_USD_WEAK', 'USD Depreciation -15%', 'SENSITIVITY',
   1400026, 'Broad-based USD depreciation of 15% against major currencies impacting trade finance and cross-border lending portfolios',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"fx_usd_chg_pct": -15}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300014, 'CREDIT_SPREAD_WIDE', 'IG Spread Widening +200bp', 'SENSITIVITY',
   1400026, 'Investment-grade credit spread widening of +200bp impacting mark-to-market valuations and new issuance capacity',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"ig_spread_widen_bps": 200}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300015, 'CREDIT_SPREAD_HY', 'HY Spread Widening +500bp', 'SENSITIVITY',
   1400026, 'High-yield credit spread widening of +500bp simulating risk-off environment with flight to quality',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"hy_spread_widen_bps": 500}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300016, 'OIL_PRICE_CRASH', 'Oil Price -60% Shock', 'SENSITIVITY',
   1400026, 'Crude oil price decline of 60% impacting energy sector lending, commodity-linked facilities, and reserve-based lending',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"oil_price_chg_pct": -60}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300017, 'YIELD_CURVE_INV', 'Yield Curve Inversion (-100bp 2s10s)', 'SENSITIVITY',
   1400026, 'Yield curve inversion with 2s10s spread compressing to -100bp, stressing NIM and signaling recession risk',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"curve_2s10s_bps": -100}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300018, 'INFLATION_SPIKE', 'Inflation Surge (+400bp CPI)', 'SENSITIVITY',
   1400026, 'Sustained inflation surge of +400bp above baseline CPI eroding real asset values and increasing borrower debt service burden',
   NULL, '2025-01-01', '2027-01-01', 24,
   '{"cpi_increase_bps": 400}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  -- SECTOR type (IDs 1300019-1300026)
  (1300019, 'LEV_LENDING', 'Leveraged Lending Stress', 'SECTOR',
   1400026, 'Leveraged lending portfolio stress with rising default rates among highly-levered borrowers and covenant-lite structures',
   NULL, '2025-01-01', '2026-07-01', 18,
   '{"lev_loan_default_rate_pct": 8.5, "recovery_rate_pct": 45}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300020, 'AUTO_STRESS', 'Auto Sector Downturn', 'SECTOR',
   1400026, 'Automotive sector downturn with declining vehicle sales, rising delinquencies in auto lending, and dealer floor-plan stress',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"auto_sales_decline_pct": -25, "delinquency_rate_pct": 5.2}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300021, 'CONSUMER_STRESS', 'Consumer Credit Deterioration', 'SECTOR',
   1400026, 'Broad consumer credit deterioration driven by unemployment spike to 9% and declining real wages across retail lending',
   NULL, '2025-01-01', '2026-07-01', 18,
   '{"unemployment_rate_pct": 9.0, "consumer_default_rate_pct": 6.5}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300022, 'HOSPITALITY', 'Hospitality & Leisure Stress', 'SECTOR',
   1400026, 'Hospitality and leisure sector stress with severe revenue decline impacting hotel, restaurant, and travel-related credit facilities',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"revenue_decline_pct": -40, "occupancy_drop_pct": -35}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300023, 'HEALTHCARE', 'Healthcare Sector Stress', 'SECTOR',
   1400026, 'Healthcare sector stress driven by reimbursement cuts, regulatory changes, and increased operating costs across provider and pharma lending',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"reimbursement_cut_pct": -15, "operating_cost_increase_pct": 12}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300024, 'TECH_CORRECTION', 'Technology Sector Correction', 'SECTOR',
   1400026, 'Technology sector correction with valuation compression, reduced venture funding, and rising defaults among growth-stage tech borrowers',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"tech_valuation_decline_pct": -35, "vc_funding_decline_pct": -50}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300025, 'ENERGY_TRANS', 'Energy Transition Risk', 'SECTOR',
   1400026, 'Long-term energy transition risk with accelerated fossil fuel asset stranding, carbon tax implementation, and shifting capex patterns',
   NULL, '2025-01-01', '2028-01-01', 36,
   '{"carbon_tax_per_ton_usd": 75, "fossil_asset_writedown_pct": 30}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300026, 'AGRICULTURE', 'Agriculture & Commodity Stress', 'SECTOR',
   1400026, 'Agricultural sector stress with crop failure, commodity price volatility, and rising input costs impacting farm and agribusiness lending',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"crop_yield_decline_pct": -20, "fertilizer_cost_increase_pct": 45}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  -- GEOPOLITICAL type (IDs 1300027-1300031)
  (1300027, 'GEO_CHINA', 'China Economic Slowdown', 'GEOPOLITICAL',
   1400026, 'China GDP growth decelerating to 2% with property sector contagion, capital outflows, and supply chain disruption impacting global trade finance',
   NULL, '2025-01-01', '2027-01-01', 24,
   '{"china_gdp_growth_pct": 2.0, "property_price_decline_pct": -25}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300028, 'GEO_EU_RECESS', 'European Recession', 'GEOPOLITICAL',
   1400026, 'Eurozone recession with negative GDP growth, rising sovereign spreads, and banking sector stress across peripheral economies',
   NULL, '2025-01-01', '2026-07-01', 18,
   '{"eu_gdp_growth_pct": -1.5, "peripheral_spread_widen_bps": 300}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300029, 'GEO_EM_CONTAGION', 'Emerging Market Contagion', 'GEOPOLITICAL',
   1400026, 'Emerging market contagion with simultaneous currency crises, capital flight, and sovereign debt restructuring across multiple EM economies',
   NULL, '2025-01-01', '2026-07-01', 18,
   '{"em_fx_depreciation_pct": -30, "em_sovereign_spread_bps": 600}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300030, 'GEO_TRADE_WAR', 'Global Trade War Escalation', 'GEOPOLITICAL',
   1400026, 'Escalated global trade war with broad tariff increases, supply chain decoupling, and retaliatory sanctions impacting cross-border lending',
   NULL, '2025-01-01', '2027-01-01', 24,
   '{"avg_tariff_increase_pct": 25, "trade_volume_decline_pct": -15}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300031, 'GEO_MIDEAST', 'Middle East Geopolitical Crisis', 'GEOPOLITICAL',
   1400026, 'Middle East geopolitical crisis with oil supply disruption, shipping lane blockage, and regional contagion affecting energy and trade finance',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"oil_supply_disruption_pct": -20, "shipping_cost_increase_pct": 80}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  -- REVERSE type (IDs 1300032-1300034)
  (1300032, 'REV_MAX_LOSS', 'Reverse Stress — Maximum Loss', 'REVERSE',
   1400026, 'Reverse stress test identifying the combination of macro and idiosyncratic shocks required to generate maximum portfolio loss',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"target": "max_portfolio_loss", "approach": "reverse_optimization"}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001'),

  (1300033, 'REV_CAPITAL_DEPL', 'Reverse Stress — Capital Depletion', 'REVERSE',
   1400026, 'Reverse stress test identifying scenarios that would deplete CET1 capital below minimum regulatory requirements',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"target": "cet1_breach", "min_cet1_pct": 4.5}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001'),

  (1300034, 'REV_LIQUIDITY', 'Reverse Stress — Liquidity Crisis', 'REVERSE',
   1400026, 'Reverse stress test identifying conditions that would trigger a liquidity crisis with LCR falling below 100%',
   NULL, '2025-01-01', '2025-07-01', 6,
   '{"target": "lcr_breach", "min_lcr_pct": 100}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'CCAR_PROGRAM', 'GSIB-INIT-001'),

  -- CLIMATE type (IDs 1300035-1300037)
  (1300035, 'CLIM_TRANSITION', 'Climate Transition Risk (Orderly)', 'CLIMATE',
   1400026, 'Orderly climate transition scenario with gradual policy tightening, carbon pricing, and managed phase-out of fossil fuel assets over 5 years',
   NULL, '2025-01-01', '2030-01-01', 60,
   '{"carbon_price_2030_usd": 150, "transition_path": "orderly"}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300036, 'CLIM_DISORDERLY', 'Climate Transition Risk (Disorderly)', 'CLIMATE',
   1400026, 'Disorderly climate transition with sudden policy shifts, abrupt carbon pricing, and rapid stranding of high-carbon assets',
   NULL, '2025-01-01', '2028-01-01', 36,
   '{"carbon_price_2028_usd": 250, "transition_path": "disorderly"}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300037, 'CLIM_PHYSICAL', 'Climate Physical Risk (Acute)', 'CLIMATE',
   1400026, 'Acute physical climate risk scenario with increased frequency and severity of extreme weather events impacting CRE and infrastructure lending',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"cat_loss_increase_pct": 40, "flood_risk_multiplier": 2.5}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  -- CONCENTRATION type (IDs 1300038-1300040)
  (1300038, 'CONC_SINGLE', 'Single-Name Concentration Failure', 'CONCENTRATION',
   1400026, 'Single-name concentration event with default of a top-10 counterparty across all facilities including unfunded commitments',
   NULL, '2025-01-01', '2025-07-01', 6,
   '{"counterparty_rank": "top_10", "default_lgd_pct": 60}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300039, 'CONC_SECTOR', 'Sector Concentration Stress', 'CONCENTRATION',
   1400026, 'Sector concentration stress with simultaneous deterioration across the largest sector exposure including rating downgrades and increased provisioning',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"sector_pd_multiplier": 3.0, "sector_lgd_add_pct": 10}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001'),

  (1300040, 'CONC_GEO', 'Geographic Concentration Stress', 'CONCENTRATION',
   1400026, 'Geographic concentration stress with economic collapse in the most concentrated geographic region impacting all local borrowers',
   NULL, '2025-01-01', '2026-01-01', 12,
   '{"regional_gdp_decline_pct": -8, "regional_pd_multiplier": 4.0}',
   '2025-01-01', '9999-12-31', true, true,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'STRESS_TESTING', 'GSIB-INIT-001');

COMMIT;
