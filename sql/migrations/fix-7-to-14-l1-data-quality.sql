BEGIN;

-- ============================================================================
-- FIX 7: exposure_type_dim — Replace placeholder rows 420011-420020
--        with real GSIB exposure types
-- ============================================================================

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'BRIDGE_LOAN',
    exposure_type_name = 'Bridge Loan Facility',
    basel_exposure_class = 'CORPORATE',
    ccf_pct = 100.000000,
    is_off_balance_sheet_flag = false,
    product_id = 11,
    sa_ccr_asset_class = 'NA',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420011;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'BILATERAL_TL',
    exposure_type_name = 'Bilateral Term Loan',
    basel_exposure_class = 'CORPORATE',
    ccf_pct = 100.000000,
    is_off_balance_sheet_flag = false,
    product_id = 12,
    sa_ccr_asset_class = 'NA',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420012;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'CLUB_DEAL',
    exposure_type_name = 'Club Deal/Syndicated Loan',
    basel_exposure_class = 'CORPORATE',
    ccf_pct = 100.000000,
    is_off_balance_sheet_flag = false,
    product_id = 13,
    sa_ccr_asset_class = 'NA',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420013;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'SBLC',
    exposure_type_name = 'Standby Letter of Credit',
    basel_exposure_class = 'OFF_BALANCE_SHEET',
    ccf_pct = 50.000000,
    is_off_balance_sheet_flag = true,
    product_id = 14,
    sa_ccr_asset_class = 'NA',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420014;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'PERF_GUAR',
    exposure_type_name = 'Performance Guarantee',
    basel_exposure_class = 'OFF_BALANCE_SHEET',
    ccf_pct = 50.000000,
    is_off_balance_sheet_flag = true,
    product_id = 15,
    sa_ccr_asset_class = 'NA',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420015;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'TRADE_FIN',
    exposure_type_name = 'Trade Finance (BA/Discount)',
    basel_exposure_class = 'OFF_BALANCE_SHEET',
    ccf_pct = 20.000000,
    is_off_balance_sheet_flag = true,
    product_id = 16,
    sa_ccr_asset_class = 'NA',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420016;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'MARGIN_LOAN',
    exposure_type_name = 'Margin Lending',
    basel_exposure_class = 'COUNTERPARTY_CREDIT',
    ccf_pct = 100.000000,
    is_off_balance_sheet_flag = false,
    product_id = 17,
    sa_ccr_asset_class = 'EQUITY',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420017;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'CDS_BOUGHT',
    exposure_type_name = 'Credit Default Swap (Protection Bought)',
    basel_exposure_class = 'COUNTERPARTY_CREDIT',
    ccf_pct = 100.000000,
    is_off_balance_sheet_flag = true,
    product_id = 18,
    sa_ccr_asset_class = 'CREDIT',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420018;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'IRS',
    exposure_type_name = 'Interest Rate Swap',
    basel_exposure_class = 'COUNTERPARTY_CREDIT',
    ccf_pct = 100.000000,
    is_off_balance_sheet_flag = true,
    product_id = 19,
    sa_ccr_asset_class = 'INTEREST_RATE',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420019;

UPDATE l1.exposure_type_dim SET
    exposure_type_code = 'FX_FORWARD',
    exposure_type_name = 'FX Forward/Swap',
    basel_exposure_class = 'COUNTERPARTY_CREDIT',
    ccf_pct = 100.000000,
    is_off_balance_sheet_flag = true,
    product_id = 20,
    sa_ccr_asset_class = 'FOREIGN_EXCHANGE',
    created_by = 'SYSTEM',
    record_source = 'PRODUCT_CONTROL',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts = CURRENT_TIMESTAMP
WHERE exposure_type_id = 420020;


-- ============================================================================
-- FIX 8: rating_grade_dim — Fully populate skeleton rows 900011-900016
-- ============================================================================

UPDATE l1.rating_grade_dim SET
    grade_name          = 'Highly Speculative',
    is_default_flag     = false,
    pd_12m              = 0.020000,
    lgd_downturn        = 0.600000,
    rating_grade_code   = '11',
    rating_grade_name   = 'Highly Speculative',
    rating_notch        = 'BB-',
    rating_scale_code   = 'EXTERNAL',
    source_system_id    = 1400007,
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_grade_id = 900011;

UPDATE l1.rating_grade_dim SET
    grade_name          = 'Substantial Risk',
    is_default_flag     = false,
    pd_12m              = 0.040000,
    lgd_downturn        = 0.650000,
    rating_grade_code   = '12',
    rating_grade_name   = 'Substantial Risk',
    rating_notch        = 'CCC+',
    rating_scale_code   = 'EXTERNAL',
    source_system_id    = 1400007,
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_grade_id = 900012;

UPDATE l1.rating_grade_dim SET
    grade_name          = 'Extremely Speculative',
    is_default_flag     = false,
    pd_12m              = 0.080000,
    lgd_downturn        = 0.700000,
    rating_grade_code   = '13',
    rating_grade_name   = 'Extremely Speculative',
    rating_notch        = 'CCC',
    rating_scale_code   = 'EXTERNAL',
    source_system_id    = 1400007,
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_grade_id = 900013;

UPDATE l1.rating_grade_dim SET
    grade_name          = 'Default Imminent',
    is_default_flag     = false,
    pd_12m              = 0.150000,
    lgd_downturn        = 0.750000,
    rating_grade_code   = '14',
    rating_grade_name   = 'Default Imminent',
    rating_notch        = 'CCC-',
    rating_scale_code   = 'EXTERNAL',
    source_system_id    = 1400007,
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_grade_id = 900014;

UPDATE l1.rating_grade_dim SET
    grade_name          = 'Default Imminent',
    is_default_flag     = false,
    pd_12m              = 0.250000,
    lgd_downturn        = 0.800000,
    rating_grade_code   = '15',
    rating_grade_name   = 'Default Imminent',
    rating_notch        = 'CC',
    rating_scale_code   = 'EXTERNAL',
    source_system_id    = 1400007,
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_grade_id = 900015;

UPDATE l1.rating_grade_dim SET
    grade_name          = 'In Default',
    is_default_flag     = true,
    pd_12m              = 1.000000,
    lgd_downturn        = 0.900000,
    rating_grade_code   = '16',
    rating_grade_name   = 'In Default',
    rating_notch        = 'C',
    rating_scale_code   = 'EXTERNAL',
    source_system_id    = 1400007,
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_grade_id = 900016;


-- ============================================================================
-- FIX 9: rating_mapping — Fully populate skeleton rows 910011-910016
-- ============================================================================

UPDATE l1.rating_mapping SET
    approved_by         = 'K.PATEL',
    approved_ts         = '2024-06-01 14:00:00',
    mapping_method      = 'MODEL_BASED',
    model_id            = 720009,
    rating_grade_code   = '11',
    source_rating_code  = 'Ba3',
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    source_system_id    = 1400007,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_mapping_id = 910011;

UPDATE l1.rating_mapping SET
    approved_by         = 'K.PATEL',
    approved_ts         = '2024-06-01 14:00:00',
    mapping_method      = 'MODEL_BASED',
    model_id            = 720009,
    rating_grade_code   = '12',
    source_rating_code  = 'Caa1',
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    source_system_id    = 1400007,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_mapping_id = 910012;

UPDATE l1.rating_mapping SET
    approved_by         = 'K.PATEL',
    approved_ts         = '2024-06-01 14:00:00',
    mapping_method      = 'MODEL_BASED',
    model_id            = 720010,
    rating_grade_code   = '13',
    source_rating_code  = 'Caa2',
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    source_system_id    = 1400007,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_mapping_id = 910013;

UPDATE l1.rating_mapping SET
    approved_by         = 'A.GARCIA',
    approved_ts         = '2024-06-01 14:00:00',
    mapping_method      = 'MODEL_BASED',
    model_id            = 720010,
    rating_grade_code   = '14',
    source_rating_code  = 'Caa3',
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    source_system_id    = 1400007,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_mapping_id = 910014;

UPDATE l1.rating_mapping SET
    approved_by         = 'A.GARCIA',
    approved_ts         = '2024-06-01 14:00:00',
    mapping_method      = 'EXPERT_JUDGMENT',
    model_id            = NULL,
    rating_grade_code   = '15',
    source_rating_code  = 'Ca',
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    source_system_id    = 1400007,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_mapping_id = 910015;

UPDATE l1.rating_mapping SET
    approved_by         = 'A.GARCIA',
    approved_ts         = '2024-06-01 14:00:00',
    mapping_method      = 'EXPERT_JUDGMENT',
    model_id            = NULL,
    rating_grade_code   = '16',
    source_rating_code  = 'C',
    effective_start_date = '2024-01-01',
    effective_end_date  = '9999-12-31',
    is_current_flag     = true,
    source_system_id    = 1400007,
    created_ts          = CURRENT_TIMESTAMP,
    updated_ts          = CURRENT_TIMESTAMP,
    created_by          = 'SYSTEM',
    record_source       = 'RISK_RATING_SVC',
    load_batch_id       = 'GSIB-INIT-001'
WHERE rating_mapping_id = 910016;


-- ============================================================================
-- FIX 10: duns_entity_dim — Fix quality issues
--   Part A: Set audit/temporal fields on ALL 438 rows
--   Part B: Replace placeholder SIC/NAICS codes (9999/999999) with realistic
--           values inferred from business_name patterns
-- ============================================================================

-- Part A: Audit and temporal fields for all rows
UPDATE l1.duns_entity_dim SET
    effective_start_date = '2024-01-01',
    effective_end_date   = '9999-12-31',
    is_current_flag      = true,
    created_by           = 'SYSTEM',
    record_source        = 'DNB_DIRECT',
    load_batch_id        = 'GSIB-INIT-001',
    updated_ts           = CURRENT_TIMESTAMP
WHERE effective_start_date IS NULL
   OR created_by IS NULL;

-- Part B: Replace placeholder SIC/NAICS based on business_name patterns
-- Financial services
UPDATE l1.duns_entity_dim SET
    sic_code   = '6020',
    naics_code = '522110',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Bank%'
       OR business_name ILIKE '%Financial%'
       OR business_name ILIKE '%Capital%'
       OR business_name ILIKE '%Credit%'
       OR business_name ILIKE '%Insurance%'
       OR business_name ILIKE '%Investment%');

-- Energy / Utilities
UPDATE l1.duns_entity_dim SET
    sic_code   = '1311',
    naics_code = '211120',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Energy%'
       OR business_name ILIKE '%Power%'
       OR business_name ILIKE '%Oil%'
       OR business_name ILIKE '%Gas%'
       OR business_name ILIKE '%Petroleum%'
       OR business_name ILIKE '%Wind%'
       OR business_name ILIKE '%Solar%'
       OR business_name ILIKE '%Hydro%'
       OR business_name ILIKE '%Utilities%'
       OR business_name ILIKE '%Grid%'
       OR business_name ILIKE '%Electric%');

-- Technology / Telecom / Software
UPDATE l1.duns_entity_dim SET
    sic_code   = '7372',
    naics_code = '511210',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Tech%'
       OR business_name ILIKE '%Software%'
       OR business_name ILIKE '%Digital%'
       OR business_name ILIKE '%Data%'
       OR business_name ILIKE '%Systems%'
       OR business_name ILIKE '%Cyber%'
       OR business_name ILIKE '%Electronics%'
       OR business_name ILIKE '%Spectrum%');

-- Telecom (more specific — override the Systems/Tech catch above if telecom-specific)
UPDATE l1.duns_entity_dim SET
    sic_code   = '4813',
    naics_code = '517311',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code IN ('9999', '7372')
  AND (   business_name ILIKE '%Telecom%'
       OR business_name ILIKE '%Wireless%'
       OR business_name ILIKE '%Communications%');

-- Pharma / Healthcare / Medical
UPDATE l1.duns_entity_dim SET
    sic_code   = '2834',
    naics_code = '325412',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Pharma%'
       OR business_name ILIKE '%Bio%'
       OR business_name ILIKE '%Medical%'
       OR business_name ILIKE '%Health%'
       OR business_name ILIKE '%Therapeutics%'
       OR business_name ILIKE '%Rehabilitation%'
       OR business_name ILIKE '%Orthopedic%'
       OR business_name ILIKE '%Behavioral%');

-- Manufacturing / Industrial / Steel / Metal / Auto parts / Components / Battery
UPDATE l1.duns_entity_dim SET
    sic_code   = '3312',
    naics_code = '331110',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Manufacturing%'
       OR business_name ILIKE '%Industrial%'
       OR business_name ILIKE '%Steel%'
       OR business_name ILIKE '%Metal%'
       OR business_name ILIKE '%Materials%'
       OR business_name ILIKE '%Components%'
       OR business_name ILIKE '%Automotive%'
       OR business_name ILIKE '%Auto Parts%'
       OR business_name ILIKE '%Precision%'
       OR business_name ILIKE '%Fabricat%'
       OR business_name ILIKE '%Equipment%'
       OR business_name ILIKE '%Battery%'
       OR business_name ILIKE '%Engineering%'
       OR business_name ILIKE '%Textiles%');

-- Real Estate / Property / REIT / Infrastructure / Water / Construction / Cement
UPDATE l1.duns_entity_dim SET
    sic_code   = '6512',
    naics_code = '531110',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Real Estate%'
       OR business_name ILIKE '%Property%'
       OR business_name ILIKE '%REIT%'
       OR business_name ILIKE '%Infrastructure%'
       OR business_name ILIKE '%Water%'
       OR business_name ILIKE '%Construction%'
       OR business_name ILIKE '%Constructora%'
       OR business_name ILIKE '%Cement%'
       OR business_name ILIKE '%Transit%');

-- Transport / Logistics / Shipping / Freight / Aviation / Airlines / Railway / Leasing
UPDATE l1.duns_entity_dim SET
    sic_code   = '4512',
    naics_code = '481111',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Transport%'
       OR business_name ILIKE '%Logistics%'
       OR business_name ILIKE '%Shipping%'
       OR business_name ILIKE '%Freight%'
       OR business_name ILIKE '%Aviation%'
       OR business_name ILIKE '%Airlines%'
       OR business_name ILIKE '%Railway%'
       OR business_name ILIKE '%Leasing%'
       OR business_name ILIKE '%Cargo%'
       OR business_name ILIKE '%Maritime%'
       OR business_name ILIKE '%Express%'
       OR business_name ILIKE '%Container%');

-- Retail / Store / Consumer / Fashion / Lifestyle / Department / Grocery / Beverage / Food
UPDATE l1.duns_entity_dim SET
    sic_code   = '5411',
    naics_code = '445110',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Retail%'
       OR business_name ILIKE '%Store%'
       OR business_name ILIKE '%Consumer%'
       OR business_name ILIKE '%Food%'
       OR business_name ILIKE '%Grocery%'
       OR business_name ILIKE '%Fashion%'
       OR business_name ILIKE '%Lifestyle%'
       OR business_name ILIKE '%Department%'
       OR business_name ILIKE '%Beverage%'
       OR business_name ILIKE '%Leather%'
       OR business_name ILIKE '%Luxe%'
       OR business_name ILIKE '%Couture%'
       OR business_name ILIKE '%Packaged Foods%');

-- Agriculture / Farm / Agri / Cattle / Soy / Sugar / Grain / Palm Oil
UPDATE l1.duns_entity_dim SET
    sic_code   = '0100',
    naics_code = '111000',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Agriculture%'
       OR business_name ILIKE '%Farm%'
       OR business_name ILIKE '%Agri%'
       OR business_name ILIKE '%Agro%'
       OR business_name ILIKE '%Cattle%'
       OR business_name ILIKE '%Soy%'
       OR business_name ILIKE '%Sugar%'
       OR business_name ILIKE '%Grain%'
       OR business_name ILIKE '%Palm Oil%'
       OR business_name ILIKE '%Timber%'
       OR business_name ILIKE '%Plantation%');

-- Mining / Mineral / Resources / Gold / Iron / Coal / Bauxite / Rare Earth / Lithium
UPDATE l1.duns_entity_dim SET
    sic_code   = '1000',
    naics_code = '212210',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Mining%'
       OR business_name ILIKE '%Mineral%'
       OR business_name ILIKE '%Resources%'
       OR business_name ILIKE '%Gold%'
       OR business_name ILIKE '%Iron%'
       OR business_name ILIKE '%Coal%'
       OR business_name ILIKE '%Bauxite%'
       OR business_name ILIKE '%Rare Earth%'
       OR business_name ILIKE '%Lithium%');

-- Commodity Trading
UPDATE l1.duns_entity_dim SET
    sic_code   = '5159',
    naics_code = '424590',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Commodity%'
       OR business_name ILIKE '%Commodities%'
       OR business_name ILIKE '%Trading%'
       OR business_name ILIKE '%Export%');

-- Hospitality / Hotel
UPDATE l1.duns_entity_dim SET
    sic_code   = '7011',
    naics_code = '721110',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999'
  AND (   business_name ILIKE '%Hotel%'
       OR business_name ILIKE '%Hospitality%'
       OR business_name ILIKE '%Resort%');

-- Catch-all: anything still at 9999 gets Business Services NEC
UPDATE l1.duns_entity_dim SET
    sic_code   = '7389',
    naics_code = '561499',
    updated_ts = CURRENT_TIMESTAMP
WHERE sic_code = '9999';


-- ============================================================================
-- FIX 11: risk_mitigant_type_dim — Remove orphan RECEIVABLE, rename REC
-- ============================================================================

-- RECEIVABLE has 0 L2 references; REC has 6. Remove the duplicate.
DELETE FROM l1.risk_mitigant_type_dim
WHERE risk_mitigant_subtype_code = 'RECEIVABLE';

-- Give REC a proper display name
UPDATE l1.risk_mitigant_type_dim SET
    subtype_name = 'Receivables',
    updated_ts   = CURRENT_TIMESTAMP
WHERE risk_mitigant_subtype_code = 'REC';


-- ============================================================================
-- FIX 12: dpd_bucket_dim — Fix 90+ label and set audit fields
-- ============================================================================

UPDATE l1.dpd_bucket_dim SET
    bucket_name   = '90+ Days Past Due',
    created_by    = 'SYSTEM',
    record_source = 'OCC_CLASSIFICATION',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts    = CURRENT_TIMESTAMP
WHERE dpd_bucket_code = '90+';

UPDATE l1.dpd_bucket_dim SET
    created_by    = 'SYSTEM',
    record_source = 'OCC_CLASSIFICATION',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts    = CURRENT_TIMESTAMP
WHERE dpd_bucket_code != '90+';


-- ============================================================================
-- FIX 13: fr2590_category_dim — Fix missing timestamps and audit fields
-- ============================================================================

-- Fix the G1_B row with NULL timestamps
UPDATE l1.fr2590_category_dim SET
    created_ts = CURRENT_TIMESTAMP,
    updated_ts = CURRENT_TIMESTAMP
WHERE fr2590_category_code = 'G1_B'
  AND created_ts IS NULL;

-- Set audit fields for ALL rows
UPDATE l1.fr2590_category_dim SET
    created_by    = 'SYSTEM',
    record_source = 'FRB_SCHEDULE',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts    = CURRENT_TIMESTAMP;


-- ============================================================================
-- FIX 14: utilization_status_dim — Fix coverage gap (75-84.99% unmapped)
--   Current: NO_BREACH 0-75, WARNING 85-95, FULLY_UTILIZED 100-100, BREACH 101-999
--   Target:  NO_BREACH 0-74.99, ELEVATED 75-89.99, WARNING 90-99.99,
--            FULLY_UTILIZED 100-100, BREACH 100.01-999
-- ============================================================================

-- Adjust NO_BREACH upper bound
UPDATE l1.utilization_status_dim SET
    utilization_max_pct = 74.990000,
    created_by    = 'SYSTEM',
    record_source = 'LIMIT_MGMT',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts    = CURRENT_TIMESTAMP
WHERE utilization_status_code = 'NO_BREACH';

-- Adjust WARNING to 90-99.99 and shift display_order
UPDATE l1.utilization_status_dim SET
    utilization_min_pct = 90.000000,
    utilization_max_pct = 99.990000,
    display_order = 3,
    created_by    = 'SYSTEM',
    record_source = 'LIMIT_MGMT',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts    = CURRENT_TIMESTAMP
WHERE utilization_status_code = 'WARNING';

-- Adjust FULLY_UTILIZED display_order
UPDATE l1.utilization_status_dim SET
    display_order = 4,
    created_by    = 'SYSTEM',
    record_source = 'LIMIT_MGMT',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts    = CURRENT_TIMESTAMP
WHERE utilization_status_code = 'FULLY_UTILIZED';

-- Adjust BREACH lower bound and display_order
UPDATE l1.utilization_status_dim SET
    utilization_min_pct = 100.010000,
    display_order = 5,
    created_by    = 'SYSTEM',
    record_source = 'LIMIT_MGMT',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts    = CURRENT_TIMESTAMP
WHERE utilization_status_code = 'BREACH';

-- Insert new ELEVATED status (75-89.99%)
INSERT INTO l1.utilization_status_dim (
    utilization_status_code, status_name,
    utilization_min_pct, utilization_max_pct,
    display_order, is_active_flag,
    created_ts, updated_ts,
    created_by, record_source, load_batch_id
) VALUES (
    'ELEVATED', 'Elevated Utilization',
    75.000000, 89.990000,
    2, true,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'SYSTEM', 'LIMIT_MGMT', 'GSIB-INIT-001'
);


COMMIT;
