-- Migration 002a: Capital Metrics Seed Data
-- Seeds: basel_exposure_type_dim, sample regulatory_capital_requirement, sample capital_position_snapshot
-- Depends on: 002-capital-metrics.sql

SET client_min_messages TO WARNING;
SET search_path TO l1, l2, l3, public;

-----------------------------------------------------------------------
-- L1: basel_exposure_type_dim seed (sentinel + 7 Basel exposure classes)
-----------------------------------------------------------------------
INSERT INTO l1.basel_exposure_type_dim
    (basel_exposure_type_id, exposure_type_code, exposure_type_name, description, std_risk_weight_pct, erba_risk_weight_pct, asset_class_group)
VALUES
    (0, 'ALL',            'All Exposure Types',    'Sentinel row for composite PK totals (portfolio/segment aggregates). Not a real exposure class.', NULL, NULL, NULL),
    (1, 'CORPORATE',      'Corporate',             'Exposures to corporates including SMEs. Risk weight depends on rating and revenue.', 100.000000, 65.000000, 'Credit Risk'),
    (2, 'SOVEREIGN',      'Sovereign',             'Exposures to sovereign governments and central banks. US Treasuries = 0% RW.', 0.000000, 0.000000, 'Credit Risk'),
    (3, 'BANK',           'Bank',                  'Exposures to banks and other depository institutions. RW 20-150% based on rating.', 20.000000, 40.000000, 'Credit Risk'),
    (4, 'RETAIL',         'Retail',                'Retail exposures: consumer loans, credit cards, auto loans. Granularity criteria apply.', 75.000000, 75.000000, 'Credit Risk'),
    (5, 'RESI_MORTGAGE',  'Residential Mortgage',  'Residential mortgage exposures. RW based on LTV ratio under both approaches.', 50.000000, 40.000000, 'Credit Risk'),
    (6, 'EQUITY',         'Equity',                'Equity investments in banking and trading book. RW 100-400% depending on type.', 100.000000, 250.000000, 'Market Risk'),
    (7, 'OTHER',          'Other',                 'Other asset classes not covered by specific categories (e.g., real estate, project finance, commodities).', 100.000000, 100.000000, 'Credit Risk')
ON CONFLICT (basel_exposure_type_id) DO NOTHING;

-----------------------------------------------------------------------
-- L1: Sample regulatory_capital_requirement
-- Uses legal_entity_id = 1 (first legal entity in seed data)
-- Uses regulatory_capital_basis_id = 1 (first basis in seed data)
-- Requirement values based on typical US GSIB as of 2025
-----------------------------------------------------------------------
DO $$
DECLARE
    v_le_id BIGINT;
    v_basis_id BIGINT;
BEGIN
    -- Find the first legal entity
    SELECT legal_entity_id INTO v_le_id FROM l2.legal_entity ORDER BY legal_entity_id LIMIT 1;
    -- Find the first regulatory basis
    SELECT regulatory_capital_basis_id INTO v_basis_id FROM l1.regulatory_capital_basis_dim ORDER BY regulatory_capital_basis_id LIMIT 1;

    IF v_le_id IS NOT NULL AND v_basis_id IS NOT NULL THEN
        INSERT INTO l1.regulatory_capital_requirement (
            legal_entity_id, as_of_date, regulatory_capital_basis_id,
            min_cet1_ratio_pct, min_tier1_ratio_pct, min_total_capital_ratio_pct,
            min_leverage_ratio_pct, min_slr_pct,
            stress_capital_buffer_pct, gsib_surcharge_pct, countercyclical_buffer_pct,
            total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct,
            total_leverage_req_pct, total_slr_req_pct,
            tlac_risk_based_req_pct, tlac_leverage_req_pct,
            currency_code
        ) VALUES (
            v_le_id, '2025-01-01', v_basis_id,
            4.500000,   -- CET1 min (Basel III pillar 1)
            6.000000,   -- Tier 1 min
            8.000000,   -- Total capital min
            4.000000,   -- Leverage ratio min
            3.000000,   -- SLR min
            2.500000,   -- SCB (stress capital buffer, bank-specific, typical GSIB range 2.5-6.5%)
            3.000000,   -- GSIB surcharge (typical large US GSIB)
            0.000000,   -- CCyB (currently 0% in US)
            10.000000,  -- Total CET1 = 4.5 + 2.5 + 3.0 + 0.0
            11.500000,  -- Total Tier 1 = 6.0 + 2.5 + 3.0 + 0.0
            13.500000,  -- Total capital = 8.0 + 2.5 + 3.0 + 0.0
            4.000000,   -- Leverage (buffers don't apply to leverage ratio in US)
            5.000000,   -- SLR = 3% min + 2% eSLR buffer
            21.500000,  -- TLAC risk-based = 18% + 3.0% GSIB surcharge + 0.5% method 2 buffer
            9.500000,   -- TLAC leverage-based = 7.5% + 2% eSLR buffer
            'USD'
        ) ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Seeded regulatory_capital_requirement for legal_entity_id=%, basis_id=%', v_le_id, v_basis_id;
    ELSE
        RAISE NOTICE 'Skipped regulatory_capital_requirement seed: no legal_entity or regulatory_basis found';
    END IF;
END $$;

-----------------------------------------------------------------------
-- L2: Sample capital_position_snapshot
-- Typical US GSIB capital ratios (illustrative, based on public disclosures)
-----------------------------------------------------------------------
DO $$
DECLARE
    v_le_id BIGINT;
BEGIN
    SELECT legal_entity_id INTO v_le_id FROM l2.legal_entity ORDER BY legal_entity_id LIMIT 1;

    IF v_le_id IS NOT NULL THEN
        INSERT INTO l2.capital_position_snapshot (
            legal_entity_id, as_of_date, currency_code,
            cet1_ratio_pct, tier1_ratio_pct, total_capital_ratio_pct,
            tier1_leverage_ratio_pct, leverage_ratio_pct,
            tlac_ratio_pct, slr_pct,
            tier1_capital_amt, cet1_capital_amt, total_capital_amt,
            rwa_amt, total_assets_leverage_amt, total_leverage_exposure_amt,
            tlac_amt, rwa_std_amt, rwa_erba_amt,
            source_filing_code
        ) VALUES
        -- Q4 2024
        (v_le_id, '2024-12-31', 'USD',
            13.100000, 15.200000, 17.800000,
            7.600000, 7.200000,
            28.500000, 6.100000,
            228000.0000, 196500.0000, 267000.0000,
            1500000.0000, 3000000.0000, 3725000.0000,
            427500.0000, 1500000.0000, 1650000.0000,
            'Y9C-2024Q4'),
        -- Q3 2024
        (v_le_id, '2024-09-30', 'USD',
            12.900000, 14.900000, 17.500000,
            7.400000, 7.000000,
            27.800000, 5.900000,
            223500.0000, 193350.0000, 262500.0000,
            1500000.0000, 3019000.0000, 3787000.0000,
            417000.0000, 1500000.0000, 1620000.0000,
            'Y9C-2024Q3'),
        -- Q2 2024
        (v_le_id, '2024-06-30', 'USD',
            12.700000, 14.700000, 17.200000,
            7.200000, 6.800000,
            27.200000, 5.700000,
            220500.0000, 190650.0000, 258000.0000,
            1500000.0000, 3063000.0000, 3864000.0000,
            408000.0000, 1500000.0000, 1590000.0000,
            'Y9C-2024Q2')
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Seeded capital_position_snapshot for legal_entity_id=% (3 quarters)', v_le_id;
    ELSE
        RAISE NOTICE 'Skipped capital_position_snapshot seed: no legal_entity found';
    END IF;
END $$;

-----------------------------------------------------------------------
-- L3: Sample capital_binding_constraint
-- Derived from capital_position_snapshot and regulatory_capital_requirement
-----------------------------------------------------------------------
DO $$
DECLARE
    v_le_id BIGINT;
BEGIN
    SELECT legal_entity_id INTO v_le_id FROM l2.legal_entity ORDER BY legal_entity_id LIMIT 1;

    IF v_le_id IS NOT NULL THEN
        INSERT INTO l3.capital_binding_constraint (
            legal_entity_id, as_of_date,
            cet1_binding_amt, tier1_binding_amt, total_capital_binding_amt,
            tier1_leverage_binding_amt, leverage_binding_amt,
            slr_binding_amt, tlac_binding_amt,
            most_binding_constraint, most_binding_ratio_pct, most_binding_denominator,
            binding_rwa_approach,
            cet1_buffer_pct, tier1_buffer_pct, total_capital_buffer_pct,
            tier1_leverage_buffer_pct, leverage_buffer_pct, slr_buffer_pct, tlac_buffer_pct
        ) VALUES
        (v_le_id, '2024-12-31',
            -- Dollar buffers: (actual_ratio - required_ratio) × denominator
            46500.0000,   -- CET1: (13.1% - 10.0%) × 1,500,000 = 46,500
            55500.0000,   -- Tier1: (15.2% - 11.5%) × 1,500,000 = 55,500
            64500.0000,   -- Total: (17.8% - 13.5%) × 1,500,000 = 64,500
            108000.0000,  -- Tier1 Leverage: (7.6% - 4.0%) × 3,000,000 = 108,000
            96000.0000,   -- Leverage: (7.2% - 4.0%) × 3,000,000 = 96,000
            40975.0000,   -- SLR: (6.1% - 5.0%) × 3,725,000 = 40,975
            105000.0000,  -- TLAC: (28.5% - 21.5%) × 1,500,000 = 105,000
            'SLR', 5.000000, 'TOTAL_LEVERAGE_EXPOSURE',
            'ERBA',
            -- Buffer percentages (basis points / 100)
            3.100000,   -- CET1 buffer: 13.1% - 10.0%
            3.700000,   -- Tier1 buffer: 15.2% - 11.5%
            4.300000,   -- Total buffer: 17.8% - 13.5%
            3.600000,   -- Tier1 leverage buffer: 7.6% - 4.0%
            3.200000,   -- Leverage buffer: 7.2% - 4.0%
            1.100000,   -- SLR buffer: 6.1% - 5.0%
            7.000000    -- TLAC buffer: 28.5% - 21.5%
        )
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Seeded capital_binding_constraint for legal_entity_id=% (SLR most binding)', v_le_id;
    END IF;
END $$;
