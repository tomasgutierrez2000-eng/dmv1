/**
 * Generate an Excel workbook of 18 GSIB Capital & Liquidity metrics
 * in the same 4-sheet format as metrics-upload-template.xlsx.
 *
 * Run: npx tsx scripts/generate-capital-liquidity-metrics.ts [output-path]
 * Default output: capital-liquidity-metrics.xlsx
 */

import path from 'path';
import XLSX from 'xlsx';

const outputPath =
  process.argv[2] || path.join(process.cwd(), 'capital-liquidity-metrics.xlsx');

// ── Instructions sheet ──────────────────────────────────────────────────

const instructions: unknown[][] = [
  ['Capital & Liquidity Metrics — GSIB Upload Template'],
  ['18 metrics across two new domains: CA (Capital Adequacy) and LQ (Liquidity Risk)'],
  [],
  ['This workbook has 4 sheets:'],
  ['  1. Instructions      – You are here. Read this first.'],
  ['  2. Metrics           – One row per metric with per-dimension pseudocode/rollup logic.'],
  ['  3. IngredientFields  – All atomic source fields that feed into each metric (L1 + L2).'],
  ['  4. DimensionSources  – Per-dimension source references (which fields are used at each rollup level).'],
  [],
  ['═══════════════════════════════════════════════════════════════════════'],
  ['  METRICS SHEET — Core Definition + Per-Dimension Pseudocode'],
  ['═══════════════════════════════════════════════════════════════════════'],
  [],
  ['REQUIRED COLUMNS:'],
  ['  metric_id           – Unique identifier (e.g., RWA, CET1_RATIO, LCR)'],
  ['  metric_name         – Human-readable name (e.g., Risk-Weighted Assets)'],
  ['  definition          – Full description of what the metric measures and why it matters'],
  ['  generic_formula     – High-level formula (e.g., SUM(ead_amt * risk_weight_pct / 100))'],
  [],
  ['OPTIONAL COLUMNS:'],
  ['  metric_class        – SOURCED | CALCULATED | HYBRID'],
  ['  unit_type           – RATIO | PERCENTAGE | CURRENCY | COUNT | RATE | ORDINAL | DAYS | INDEX'],
  ['  direction           – HIGHER_BETTER | LOWER_BETTER | NEUTRAL'],
  ['  domain_ids          – Comma-separated domain codes (see below)'],
  ['  rollup_philosophy   – How the metric aggregates up the hierarchy'],
  ['  weighting_basis     – BY_EAD | BY_OUTSTANDING | BY_COMMITTED  (for weighted-avg metrics)'],
  ['  regulatory_references – Comma-separated regulatory citations'],
  ['  display_format      – Excel/dashboard format string (e.g., 0.00%, $#,##0.0M)'],
  ['  normalized_de_name  – Business glossary canonical name'],
  ['  data_element_in_dm  – Physical data model column name'],
  ['  spec_definition     – Alternate definition from specification document'],
  [],
  ['PER-DIMENSION BLOCKS (5 dimensions x 5 columns each):'],
  ['  Dimensions: Facility → Counterparty → Desk (L3) → Portfolio (L2) → Business Segment (L1)'],
  ['  For each dimension, fill in these 5 columns:'],
  ['    {dim}_in_record      – Y or N  (is this metric available at this aggregation level?)'],
  ['    {dim}_sourcing_type  – Raw | Calc | Agg | Avg'],
  ['    {dim}_level_logic    – PSEUDOCODE: step-by-step formula at this level'],
  ['    {dim}_display_name   – Dashboard label at this level'],
  ['    {dim}_spec_formula   – (Optional) Per-level formula text from spec'],
  [],
  ['DIMENSION PATTERNS FOR CAPITAL/LIQUIDITY:'],
  ['  Bottom-up metrics (RWA, RWA_DENSITY, CAP_ALLOC, HQLA, UNENC_RATIO):'],
  ['    Facility-level calculation → Counterparty/Desk/Portfolio/LoB via SUM rollup'],
  ['  Entity-level ratios (CET1_RATIO, T1_RATIO, TOTAL_CAP_RATIO, LEV_RATIO, TLAC_RATIO, LCR, NSFR):'],
  ['    Facility/Counterparty = N/A. Desk/Portfolio/LoB = entity numerator allocated via legal_entity.business_line_id'],
  [],
  ['═══════════════════════════════════════════════════════════════════════'],
  ['  INGREDIENT FIELDS SHEET — Atomic Source Fields'],
  ['═══════════════════════════════════════════════════════════════════════'],
  [],
  ['One row per source field per metric. Lists ALL tables/fields the metric needs.'],
  ['  metric_id    – FK to the Metrics sheet'],
  ['  ord          – Display order (1, 2, 3, ...)'],
  ['  layer        – L1 (master/reference) or L2 (snapshot/transactional)'],
  ['  table        – Source table name'],
  ['  field        – Source column name'],
  ['  data_type    – Column type (e.g., DECIMAL(18,2), BIGINT)'],
  ['  description  – What this field represents'],
  ['  sample_value – Example value for testing'],
  [],
  ['═══════════════════════════════════════════════════════════════════════'],
  ['  DIMENSION SOURCES SHEET — Per-Level Source References'],
  ['═══════════════════════════════════════════════════════════════════════'],
  [],
  ['One row per source field per metric per dimension.'],
  ['  metric_id   – FK to the Metrics sheet'],
  ['  dimension   – facility | counterparty | desk | portfolio | lob'],
  ['  ord         – Order within this dimension block'],
  ['  layer       – L1 or L2'],
  ['  table       – Source table name'],
  ['  field       – Source column name'],
  ['  description – Role of this field at this dimension level'],
  [],
  ['═══════════════════════════════════════════════════════════════════════'],
  ['  ALLOWED ENUM VALUES'],
  ['═══════════════════════════════════════════════════════════════════════'],
  [],
  ['metric_class     : SOURCED | CALCULATED | HYBRID'],
  ['unit_type        : RATIO | PERCENTAGE | CURRENCY | COUNT | RATE | ORDINAL | DAYS | INDEX'],
  ['direction        : HIGHER_BETTER | LOWER_BETTER | NEUTRAL'],
  ['sourcing_type    : Raw (direct lookup) | Calc (formula) | Agg (SUM) | Avg (weighted average)'],
  ['weighting_basis  : BY_EAD | BY_OUTSTANDING | BY_COMMITTED | BY_RWA'],
  ['domain_ids:'],
  ['  CA – Capital Adequacy                LQ – Liquidity Risk'],
  ['  CR – Credit Risk                     EL – Exposure & Limits'],
  ['  FP – Financial Performance           CM – Collateral & Mitigation'],
  ['  PA – Portfolio Analytics             GO – Governance & Operations'],
  [],
  ['═══════════════════════════════════════════════════════════════════════'],
  ['  IMPORT ENDPOINTS'],
  ['═══════════════════════════════════════════════════════════════════════'],
  [],
  ['Metric Library API : POST /api/metrics/library/import  (Domains / ParentMetrics / Variants sheets)'],
  ['CLI script         : npx tsx scripts/import-metrics-replace.ts <this-file.xlsx>'],
  ['Dimensions loader  : Place as data/metrics_dimensions_filled.xlsx and restart'],
];

// ── Metrics sheet ───────────────────────────────────────────────────────

const metricsHeaders = [
  'metric_id',
  'metric_name',
  'definition',
  'generic_formula',
  'metric_class',
  'unit_type',
  'direction',
  'domain_ids',
  'rollup_philosophy',
  'weighting_basis',
  'regulatory_references',
  'display_format',
  'normalized_de_name',
  'data_element_in_dm',
  'spec_definition',
  // Facility
  'facility_in_record',
  'facility_sourcing_type',
  'facility_level_logic',
  'facility_display_name',
  'facility_spec_formula',
  // Counterparty
  'counterparty_in_record',
  'counterparty_sourcing_type',
  'counterparty_level_logic',
  'counterparty_display_name',
  'counterparty_spec_formula',
  // Desk (L3)
  'desk_in_record',
  'desk_sourcing_type',
  'desk_level_logic',
  'desk_display_name',
  'desk_spec_formula',
  // Portfolio (L2)
  'portfolio_in_record',
  'portfolio_sourcing_type',
  'portfolio_level_logic',
  'portfolio_display_name',
  'portfolio_spec_formula',
  // Business Segment (L1)
  'lob_in_record',
  'lob_sourcing_type',
  'lob_level_logic',
  'lob_display_name',
  'lob_spec_formula',
];

const metricsExamples: unknown[][] = [
  // ═══════════════════════════════════════════════════════════════════════
  // CAPITAL METRICS (CA) — 9 metrics
  // ═══════════════════════════════════════════════════════════════════════

  // ── 1. RWA ──
  [
    'RWA',
    'Risk-Weighted Assets',
    'Total exposure multiplied by regulatory risk weight. Core Basel III metric for minimum capital requirement calculation. For credit risk: EAD x risk_weight. RWA is additive — rolls up via SUM from facility to entity. Drives CET1 ratio denominator and capital allocation.',
    'SUM(ead_amt * risk_weight_pct / 100)',
    'CALCULATED',
    'CURRENCY',
    'LOWER_BETTER',
    'CA',
    'Sum across children',
    '',
    'Basel III, FR Y-9C Schedule HC-R, CCAR, FR 2590',
    '$#,##0.0M',
    'Risk-Weighted Assets',
    'rwa_amt',
    '',
    // Facility
    'Y',
    'Calc',
    'For each DISTINCT(facility_id) THEN lookup [ead_amt] and [risk_weight_pct] from facility_risk_snapshot WHERE IS(facility_id). CALC: [ead_amt] * [risk_weight_pct] / 100. FALLBACK: lookup [current_credit_exposure_amt] and [risk_weight_pct] from regulatory_capital_exposure WHERE IS(facility_id). CALC: [current_credit_exposure_amt] * [risk_weight_pct] / 100',
    'Facility RWA ($)',
    '',
    // Counterparty
    'Y',
    'Agg',
    'For each [counterparty_id] THEN SUM(facility.rwa) WHERE IS([counterparty_id])',
    'Counterparty RWA ($)',
    '',
    // Desk
    'Y',
    'Agg',
    'For each [L3 Business Segment], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. SUM(facility.rwa) for all facilities WHERE IS([lob_segment_id])',
    'Desk RWA ($)',
    '',
    // Portfolio
    'Y',
    'Agg',
    'For each [L2 Business Segment], SUM(facility.rwa) for all facilities under L2 segment including all child L3 segments via parent_segment_id traversal',
    'Portfolio RWA ($)',
    '',
    // LoB
    'Y',
    'Agg',
    'For each [L1 Business Segment], SUM(facility.rwa) for all facilities under L1 department including all descendant L2/L3 segments via recursive parent_segment_id traversal',
    'LoB RWA ($)',
    '',
  ],

  // ── 2. RWA_DENSITY ──
  [
    'RWA_DENSITY',
    'RWA Density',
    'RWA as a percentage of total exposure. Measures capital intensity per unit of exposure. Lower density indicates more favorable risk weight mix. Useful for comparing capital efficiency across portfolios and business lines.',
    'RWA / Total_Exposure * 100',
    'CALCULATED',
    'PERCENTAGE',
    'LOWER_BETTER',
    'CA',
    'Exposure-weighted ratio at each level',
    'BY_EAD',
    'Basel III, Pillar 3 Disclosures',
    '0.00%',
    'RWA Density',
    'rwa_density_pct',
    '',
    // Facility
    'Y',
    'Calc',
    'For each DISTINCT(facility_id) THEN [rwa_amt] / [ead_amt] * 100 from facility_risk_snapshot WHERE IS(facility_id)',
    'Facility RWA Density (%)',
    '',
    // Counterparty
    'Y',
    'Calc',
    'For each [counterparty_id] THEN SUM(facility.rwa_amt) / SUM(facility.ead_amt) * 100 WHERE IS([counterparty_id])',
    'Counterparty RWA Density (%)',
    '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. CALC: SUM(facility.rwa_amt) / SUM(facility.ead_amt) * 100 for all facilities WHERE IS([lob_segment_id])',
    'Desk RWA Density (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], SUM(facility.rwa_amt) / SUM(facility.ead_amt) * 100 for all facilities under L2 segment including child L3 segments via parent_segment_id traversal',
    'Portfolio RWA Density (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], SUM(facility.rwa_amt) / SUM(facility.ead_amt) * 100 for all facilities under L1 department including all descendant L2/L3 segments via recursive parent_segment_id traversal',
    'LoB RWA Density (%)',
    '',
  ],

  // ── 3. CAP_ALLOC ──
  [
    'CAP_ALLOC',
    'Capital Allocated',
    'Regulatory or economic capital assigned to each exposure. Calculated as RWA times minimum capital requirement percentage, looked up from metric_threshold WHERE metric_id=\'CET1_RATIO\'. The threshold is entity-specific: Basel III 4.5% CET1 min + 2.5% CCB + GSIB surcharge (1.0-3.5%) + SCB. Additive rollup via SUM. Used for RAROC and economic profit calculations.',
    'RWA * [min_capital_pct] FROM metric_threshold WHERE metric_id = \'CET1_RATIO\'',
    'CALCULATED',
    'CURRENCY',
    'NEUTRAL',
    'CA, FP',
    'Sum across children',
    '',
    'Basel III, CCAR, Internal RAROC',
    '$#,##0.0M',
    'Capital Allocated',
    'capital_req_amt',
    '',
    // Facility
    'Y',
    'Calc',
    'For each DISTINCT(facility_id) THEN lookup [min_capital_pct] from metric_threshold WHERE [metric_id]=\'CET1_RATIO\' AND [legal_entity_id] matches facility entity. CALC: [rwa_amt] * [min_capital_pct] from facility_risk_snapshot WHERE IS(facility_id). The threshold is entity-specific (e.g., 10.5% = 4.5% CET1 min + 2.5% CCB + 3.5% GSIB surcharge, or higher if SCB exceeds CCB).',
    'Facility Capital Allocated ($)',
    '',
    // Counterparty
    'Y',
    'Agg',
    'For each [counterparty_id] THEN SUM(facility.cap_alloc) WHERE IS([counterparty_id])',
    'Counterparty Capital Allocated ($)',
    '',
    // Desk
    'Y',
    'Agg',
    'For each [L3 Business Segment], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. SUM(facility.cap_alloc) for all facilities WHERE IS([lob_segment_id])',
    'Desk Capital Allocated ($)',
    '',
    // Portfolio
    'Y',
    'Agg',
    'For each [L2 Business Segment], SUM(facility.cap_alloc) for all facilities under L2 segment including all child L3 segments via parent_segment_id traversal',
    'Portfolio Capital Allocated ($)',
    '',
    // LoB
    'Y',
    'Agg',
    'For each [L1 Business Segment], SUM(facility.cap_alloc) for all facilities under L1 department including all descendant L2/L3 segments via recursive parent_segment_id traversal',
    'LoB Capital Allocated ($)',
    '',
  ],

  // ── 4. CET1_RATIO ──
  [
    'CET1_RATIO',
    'CET1 Capital Ratio',
    'Common Equity Tier 1 capital divided by total risk-weighted assets. Primary measure of bank capital strength under Basel III. Minimum requirement: 4.5% + 2.5% conservation buffer + GSIB surcharge (1.0-3.5%). US GSIBs typically target 11-13%. Reported quarterly on FR Y-9C.',
    'SUM(regulatory_capital_amt WHERE capital_tier_treatment_code = \'CET1\') / SUM(RWA) * 100',
    'CALCULATED',
    'PERCENTAGE',
    'HIGHER_BETTER',
    'CA',
    'Entity-level ratio — not additive',
    '',
    'Basel III, FR Y-9C Schedule HC-R, CCAR, Pillar 3',
    '0.00%',
    'CET1 Capital Ratio',
    'capital_adequacy_ratio_pct',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. Numerator: SUM(regulatory_capital_amt) from regulatory_capital_instrument WHERE [capital_tier_treatment_code]=\'CET1\' AND legal_entity.basel_business_line_level1 maps to [lob_segment_id]. Denominator: SUM(facility.rwa) for all facilities WHERE IS([lob_segment_id]). CALC: Numerator / Denominator * 100',
    'Desk CET1 Ratio (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: SUM(CET1 capital) allocated to L2 segment via legal_entity.basel_business_line_level1 mapping including child L3 segments via parent_segment_id traversal. Denominator: SUM(facility.rwa) for all facilities under L2 segment. CALC: Numerator / Denominator * 100',
    'Portfolio CET1 Ratio (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: SUM(CET1 capital) allocated to L1 segment via legal_entity.basel_business_line_level1 mapping including all descendant L2/L3 segments via recursive parent_segment_id traversal. Denominator: SUM(facility.rwa) for all facilities under L1 department. CALC: Numerator / Denominator * 100',
    'LoB CET1 Ratio (%)',
    '',
  ],

  // ── 5. T1_RATIO ──
  [
    'T1_RATIO',
    'Tier 1 Capital Ratio',
    'Tier 1 capital (CET1 + Additional Tier 1 instruments) divided by total RWA. Basel III minimum 6%. AT1 includes perpetual non-cumulative preferred stock and qualifying subordinated debt with write-down/conversion features.',
    'SUM(regulatory_capital_amt WHERE capital_tier_treatment_code IN (\'CET1\',\'AT1\')) / SUM(RWA) * 100',
    'CALCULATED',
    'PERCENTAGE',
    'HIGHER_BETTER',
    'CA',
    'Entity-level ratio — not additive',
    '',
    'Basel III, FR Y-9C Schedule HC-R, CCAR',
    '0.00%',
    'Tier 1 Capital Ratio',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. Numerator: SUM(regulatory_capital_amt) from regulatory_capital_instrument WHERE [capital_tier_treatment_code] IN (\'CET1\',\'AT1\') AND legal_entity.basel_business_line_level1 maps to [lob_segment_id]. Denominator: SUM(facility.rwa) for all facilities WHERE IS([lob_segment_id]). CALC: Numerator / Denominator * 100',
    'Desk T1 Ratio (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: SUM(CET1 + AT1 capital) allocated to L2 segment via legal_entity mapping including child L3 segments via parent_segment_id traversal. Denominator: SUM(facility.rwa). CALC: Numerator / Denominator * 100',
    'Portfolio T1 Ratio (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: SUM(CET1 + AT1 capital) allocated to L1 segment including all descendant segments. Denominator: SUM(facility.rwa). CALC: Numerator / Denominator * 100',
    'LoB T1 Ratio (%)',
    '',
  ],

  // ── 6. TOTAL_CAP_RATIO ──
  [
    'TOTAL_CAP_RATIO',
    'Total Capital Ratio',
    'Total regulatory capital (CET1 + AT1 + Tier 2) divided by total RWA. Basel III minimum 8%. Tier 2 includes subordinated debt with original maturity >= 5 years and general loan-loss provisions (up to 1.25% of credit RWA under standardized approach).',
    'SUM(regulatory_capital_amt) / SUM(RWA) * 100',
    'CALCULATED',
    'PERCENTAGE',
    'HIGHER_BETTER',
    'CA',
    'Entity-level ratio — not additive',
    '',
    'Basel III, FR Y-9C Schedule HC-R, CCAR',
    '0.00%',
    'Total Capital Ratio',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. Numerator: SUM(regulatory_capital_amt) from regulatory_capital_instrument WHERE [capital_tier_treatment_code] IN (\'CET1\',\'AT1\',\'T2\') AND legal_entity.basel_business_line_level1 maps to [lob_segment_id]. Denominator: SUM(facility.rwa) for all facilities WHERE IS([lob_segment_id]). CALC: Numerator / Denominator * 100',
    'Desk Total Capital Ratio (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: SUM(all capital tiers) allocated to L2 segment via legal_entity mapping including child L3 segments. Denominator: SUM(facility.rwa). CALC: Numerator / Denominator * 100',
    'Portfolio Total Capital Ratio (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: SUM(all capital tiers) allocated to L1 segment including all descendant segments. Denominator: SUM(facility.rwa). CALC: Numerator / Denominator * 100',
    'LoB Total Capital Ratio (%)',
    '',
  ],

  // ── 7. LEV_RATIO ──
  [
    'LEV_RATIO',
    'Supplementary Leverage Ratio',
    'Tier 1 capital divided by total leverage exposure (on-balance sheet assets + off-balance sheet exposures + derivative exposures + SFT exposures). Not risk-weighted — pure leverage constraint. US GSIB minimum: 5% (3% base + 2% buffer). Prevents excessive leverage regardless of risk weights.',
    'Tier1_Capital / Total_Leverage_Exposure * 100',
    'CALCULATED',
    'PERCENTAGE',
    'HIGHER_BETTER',
    'CA',
    'Entity-level ratio — not additive',
    '',
    'Basel III SLR, FR Y-9C, Enhanced SLR for GSIBs, 12 CFR 217',
    '0.00%',
    'Supplementary Leverage Ratio',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. Numerator: SUM(regulatory_capital_amt) from regulatory_capital_instrument WHERE [capital_tier_treatment_code] IN (\'CET1\',\'AT1\') AND legal_entity.basel_business_line_level1 maps to [lob_segment_id]. Denominator: SUM(facility.gross_exposure_usd) from facility_exposure_snapshot + SUM(notional_amt) from derivative_position_detail + SUM(carrying_amount) from sft_position_detail for positions WHERE legal_entity maps to desk. CALC: Numerator / Denominator * 100',
    'Desk Leverage Ratio (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: SUM(Tier 1 capital) allocated to L2 segment via legal_entity mapping including child L3 segments. Denominator: SUM(on-BS exposure + derivative notional + SFT exposure) for all positions under L2 segment. CALC: Numerator / Denominator * 100',
    'Portfolio Leverage Ratio (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: SUM(Tier 1 capital) allocated to L1 segment including all descendant segments. Denominator: SUM(on-BS + off-BS + derivative + SFT exposure) for all positions under L1 department. CALC: Numerator / Denominator * 100',
    'LoB Leverage Ratio (%)',
    '',
  ],

  // ── 8. TLAC_RATIO ──
  [
    'TLAC_RATIO',
    'TLAC Ratio',
    'Total Loss-Absorbing Capacity (eligible instruments) divided by RWA. Ensures sufficient bail-in capacity in resolution. US GSIB minimum: 22% of RWA (18% external TLAC + buffers). Includes CET1, AT1, T2, and eligible long-term unsecured debt with remaining maturity > 1 year.',
    'SUM(regulatory_capital_amt WHERE capital_tier_treatment_code IN (\'CET1\',\'AT1\',\'T2\',\'TLAC_ELIGIBLE\')) / SUM(RWA) * 100',
    'CALCULATED',
    'PERCENTAGE',
    'HIGHER_BETTER',
    'CA',
    'Entity-level ratio — not additive',
    '',
    'FSB TLAC Standard, 12 CFR 252 Subpart G, FR Y-9C',
    '0.00%',
    'TLAC Ratio',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. Numerator: SUM(regulatory_capital_amt) from regulatory_capital_instrument WHERE [capital_tier_treatment_code] IN (\'CET1\',\'AT1\',\'T2\') + SUM(notional_amt) from regulatory_capital_instrument WHERE [instrument_type_code]=\'SENIOR_UNSECURED\' AND remaining_maturity > 1yr AND legal_entity.basel_business_line_level1 maps to [lob_segment_id]. Denominator: SUM(facility.rwa) for all facilities WHERE IS([lob_segment_id]). CALC: Numerator / Denominator * 100',
    'Desk TLAC Ratio (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: SUM(TLAC-eligible instruments) allocated to L2 segment via legal_entity mapping including child L3 segments. Denominator: SUM(facility.rwa). CALC: Numerator / Denominator * 100',
    'Portfolio TLAC Ratio (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: SUM(TLAC-eligible instruments) allocated to L1 segment including all descendant segments. Denominator: SUM(facility.rwa). CALC: Numerator / Denominator * 100',
    'LoB TLAC Ratio (%)',
    '',
  ],

  // ── 9. SCB ──
  [
    'SCB',
    'Stress Capital Buffer',
    'Difference between CET1 ratio at the beginning of the CCAR planning horizon and the minimum projected CET1 ratio during the severely adverse scenario, plus four quarters of planned common stock dividends. Fed-determined annually. Minimum 2.5%. Replaces fixed capital conservation buffer for US GSIBs.',
    'CET1_ratio_begin - CET1_ratio_trough + planned_dividends_pct',
    'CALCULATED',
    'PERCENTAGE',
    'LOWER_BETTER',
    'CA',
    'Entity-level — single value from CCAR cycle',
    '',
    'CCAR, 12 CFR 225 Subpart H, Fed Stress Testing Rules',
    '0.00%',
    'Stress Capital Buffer',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Raw',
    'For each [L3 Business Segment], SCB is an entity-level value sourced from the annual CCAR/DFAST cycle. Lookup [capital_impact_pct] from stress_test_result_summary WHERE [scenario_type]=\'SEVERELY_ADVERSE\'. Entity-wide SCB reported at desk for context — same value across all desks within entity.',
    'Desk SCB (%)',
    '',
    // Portfolio
    'Y',
    'Raw',
    'For each [L2 Business Segment], same entity-level SCB. Lookup [capital_impact_pct] from stress_test_result_summary WHERE [scenario_type]=\'SEVERELY_ADVERSE\'. Same value across all portfolios within entity.',
    'Portfolio SCB (%)',
    '',
    // LoB
    'Y',
    'Raw',
    'For each [L1 Business Segment], same entity-level SCB. Lookup [capital_impact_pct] from stress_test_result_summary WHERE [scenario_type]=\'SEVERELY_ADVERSE\'. SCB = MAX(CET1_decline_under_stress + planned_dividends_4Q, 2.5%).',
    'LoB SCB (%)',
    '',
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // LIQUIDITY METRICS (LQ) — 9 metrics
  // ═══════════════════════════════════════════════════════════════════════

  // ── 10. HQLA ──
  [
    'HQLA',
    'High Quality Liquid Assets',
    'Stock of unencumbered high-quality liquid assets per LCR rule. Level 1 (central bank reserves, government securities) at 100%, Level 2A (GSE debt, covered bonds) at 85% after haircut, Level 2B (corporate bonds, equities) at 50% after haircut. Level 2 assets capped at 40% of total HQLA. LCR numerator.',
    'SUM(L1_assets) + SUM(L2A_assets * 0.85) + SUM(L2B_assets * 0.50)',
    'CALCULATED',
    'CURRENCY',
    'HIGHER_BETTER',
    'LQ',
    'Sum across children',
    '',
    'Basel III LCR, FR 2052a, 12 CFR 329',
    '$#,##0.0M',
    'High Quality Liquid Assets',
    '',
    '',
    // Facility (position-level, not facility-linked)
    'Y',
    'Calc',
    'For each DISTINCT(position_id) in bond_security_position_detail WHERE [pledged_flag]=\'N\', CASE WHEN [liquid_assets_collateral_level]=\'L1\' THEN [fair_value_amt] * 1.00 WHEN [liquid_assets_collateral_level]=\'L2A\' THEN [fair_value_amt] * 0.85 WHEN [liquid_assets_collateral_level]=\'L2B\' THEN [fair_value_amt] * 0.50 ELSE 0 END. PLUS: SUM(balance_amount) from cash_position_detail WHERE [cash_item_type_code] IN (\'FED_RESERVE\',\'CORRESPONDENT\') as Level 1 assets (100%).',
    'Position HQLA ($)',
    '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Agg',
    'For each [L3 Business Segment], lookup positions via legal_entity cost_center_id mapping to [lob_segment_id] in enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. SUM(position.hqla) for all positions booked to legal entities WHERE IS([lob_segment_id])',
    'Desk HQLA ($)',
    '',
    // Portfolio
    'Y',
    'Agg',
    'For each [L2 Business Segment], SUM(position.hqla) for all positions under L2 segment including child L3 segments via parent_segment_id traversal',
    'Portfolio HQLA ($)',
    '',
    // LoB
    'Y',
    'Agg',
    'For each [L1 Business Segment], SUM(position.hqla) for all positions under L1 department including all descendant L2/L3 segments via recursive parent_segment_id traversal',
    'LoB HQLA ($)',
    '',
  ],

  // ── 11. NET_CASH_OUT ──
  [
    'NET_CASH_OUT',
    'Net Cash Outflows',
    'Total expected cash outflows minus capped inflows over 30-day stress horizon. Inflows are capped at 75% of total outflows per LCR rule. Outflows include: deposit runoff (by category), maturing wholesale funding, derivative collateral calls, credit/liquidity facility drawdowns. LCR denominator.',
    'Total_Outflows - MIN(Total_Inflows, 0.75 * Total_Outflows)',
    'CALCULATED',
    'CURRENCY',
    'LOWER_BETTER',
    'LQ',
    'Entity-level — recalculate with inflow cap at each level',
    '',
    'Basel III LCR, FR 2052a, 12 CFR 329',
    '$#,##0.0M',
    'Net Cash Outflows',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], Outflows: SUM(deposit.balance_amount * runoff_factor) from deposit_position_detail WHERE legal_entity maps to desk + SUM(carrying_amount) from borrowing_position_detail WHERE maturity_date <= as_of_date + 30 + SUM(principal_cashflow_amt + interest_cashflow_amt) from cash_flow WHERE [flow_direction]=\'OUT\' AND [cash_flow_date] <= as_of_date + 30. Inflows: SUM(principal_cashflow_amt + interest_cashflow_amt) from cash_flow WHERE [flow_direction]=\'IN\' AND [cash_flow_date] <= as_of_date + 30. CALC: Outflows - MIN(Inflows, 0.75 * Outflows)',
    'Desk Net Cash Outflows ($)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], same outflow/inflow calculation including child L3 segments via parent_segment_id traversal. Outflows: deposit runoff + maturing borrowings + scheduled outflows from cash_flow. Inflows: scheduled inflows from cash_flow. CALC: Outflows - MIN(Inflows, 0.75 * Outflows)',
    'Portfolio Net Cash Outflows ($)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], same outflow/inflow calculation including all descendant L2/L3 segments. Outflows: deposit runoff + maturing borrowings + scheduled outflows. Inflows: scheduled inflows. CALC: Outflows - MIN(Inflows, 0.75 * Outflows)',
    'LoB Net Cash Outflows ($)',
    '',
  ],

  // ── 12. LCR ──
  [
    'LCR',
    'Liquidity Coverage Ratio',
    'HQLA divided by 30-day net cash outflows under stress. Ensures sufficient liquid assets to survive a 30-day liquidity stress event. Basel III minimum 100%. Reported daily to regulators by US GSIBs. Composite metric built from HQLA (numerator) and NET_CASH_OUT (denominator).',
    'HQLA / Net_Cash_Outflows * 100',
    'CALCULATED',
    'PERCENTAGE',
    'HIGHER_BETTER',
    'LQ',
    'Entity-level ratio — not additive',
    '',
    'Basel III LCR, FR 2052a, 12 CFR 329',
    '0.00%',
    'Liquidity Coverage Ratio',
    'lcr_pct',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], Numerator: desk.HQLA (see HQLA metric — SUM of HQLA positions mapped to desk). Denominator: desk.NET_CASH_OUT (see NET_CASH_OUT metric — outflows minus capped inflows). CALC: Numerator / Denominator * 100',
    'Desk LCR (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: portfolio.HQLA. Denominator: portfolio.NET_CASH_OUT. CALC: Numerator / Denominator * 100. Includes child L3 segments via parent_segment_id traversal.',
    'Portfolio LCR (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: lob.HQLA. Denominator: lob.NET_CASH_OUT. CALC: Numerator / Denominator * 100. Includes all descendant L2/L3 segments.',
    'LoB LCR (%)',
    '',
  ],

  // ── 13. ASF ──
  [
    'ASF',
    'Available Stable Funding',
    'Weighted sum of liabilities and capital by their stability factor for NSFR calculation. Capital instruments at 100%, stable retail deposits (insured + operational) at 95%, less stable retail at 90%, wholesale funding >1yr at 100%, 6mo-1yr at 50%, <6mo at 0%. NSFR numerator.',
    'SUM(funding_amount * ASF_factor)',
    'CALCULATED',
    'CURRENCY',
    'HIGHER_BETTER',
    'LQ',
    'Entity-level weighted sum',
    '',
    'Basel III NSFR, 12 CFR 329, FR 2052a',
    '$#,##0.0M',
    'Available Stable Funding',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], SUM across funding sources mapped to desk via legal_entity: (1) regulatory_capital_instrument: regulatory_capital_amt * 1.00 (100% ASF for all capital). (2) deposit_position_detail: balance_amount * CASE WHEN [operational_flag]=\'Y\' AND [fdic_insured_balance_amt] > 0 THEN 0.95 WHEN [stability_code]=\'STABLE\' THEN 0.95 WHEN [stability_code]=\'LESS_STABLE\' THEN 0.90 WHEN [brokered_flag]=\'Y\' THEN 0.50 ELSE 0.50 END. (3) borrowing_position_detail: carrying_amount * CASE WHEN remaining_maturity >= 1yr THEN 1.00 WHEN remaining_maturity >= 6mo THEN 0.50 ELSE 0.00 END.',
    'Desk ASF ($)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], same ASF calculation across funding sources including child L3 segments via parent_segment_id traversal. Capital at 100%, stable deposits at 95%, less stable at 90%, brokered at 50%, long-term borrowings at 100%, medium-term at 50%, short-term at 0%.',
    'Portfolio ASF ($)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], same ASF calculation including all descendant L2/L3 segments. SUM(funding * ASF_factor) across all capital instruments, deposits, and borrowings mapped to L1 department.',
    'LoB ASF ($)',
    '',
  ],

  // ── 14. RSF ──
  [
    'RSF',
    'Required Stable Funding',
    'Weighted sum of assets and off-balance sheet exposures by their required stable funding factor. Cash and central bank reserves at 0%, government bonds at 5%, performing loans >1yr at 85%, unencumbered equities at 85%, all other assets at 100%. NSFR denominator.',
    'SUM(asset_amount * RSF_factor)',
    'CALCULATED',
    'CURRENCY',
    'LOWER_BETTER',
    'LQ',
    'Entity-level weighted sum',
    '',
    'Basel III NSFR, 12 CFR 329',
    '$#,##0.0M',
    'Required Stable Funding',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], SUM across asset categories mapped to desk via legal_entity: (1) cash_position_detail: balance_amount * 0.00 (0% RSF — coins/banknotes and central bank reserves). (2) bond_security_position_detail: fair_value_amt * CASE WHEN [liquid_assets_collateral_level]=\'L1\' AND [pledged_flag]=\'N\' THEN 0.05 WHEN [liquid_assets_collateral_level]=\'L2A\' AND [pledged_flag]=\'N\' THEN 0.15 WHEN [liquid_assets_collateral_level]=\'L2B\' THEN 0.50 ELSE 0.85 END. (3) facility_exposure_snapshot: gross_exposure_usd * CASE WHEN remaining_maturity >= 1yr THEN 0.85 WHEN remaining_maturity >= 6mo THEN 0.50 ELSE 0.15 END for performing loans.',
    'Desk RSF ($)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], same RSF calculation across asset categories including child L3 segments. Cash at 0%, unencumbered gov bonds at 5%, Level 2A at 15%, loans >1yr at 85%, other assets at 100%.',
    'Portfolio RSF ($)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], same RSF calculation including all descendant L2/L3 segments. SUM(asset * RSF_factor) across all cash, securities, and loan positions mapped to L1 department.',
    'LoB RSF ($)',
    '',
  ],

  // ── 15. NSFR ──
  [
    'NSFR',
    'Net Stable Funding Ratio',
    'Available Stable Funding (ASF) divided by Required Stable Funding (RSF). Ensures sustainable funding structure over 1-year horizon. Basel III minimum 100%. Complements LCR by addressing longer-term structural funding mismatches rather than short-term stress liquidity.',
    'ASF / RSF * 100',
    'CALCULATED',
    'PERCENTAGE',
    'HIGHER_BETTER',
    'LQ',
    'Entity-level ratio — not additive',
    '',
    'Basel III NSFR, 12 CFR 329',
    '0.00%',
    'Net Stable Funding Ratio',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], Numerator: desk.ASF (see ASF metric — weighted sum of funding sources mapped to desk). Denominator: desk.RSF (see RSF metric — weighted sum of assets mapped to desk). CALC: Numerator / Denominator * 100',
    'Desk NSFR (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: portfolio.ASF. Denominator: portfolio.RSF. CALC: Numerator / Denominator * 100. Includes child L3 segments via parent_segment_id traversal.',
    'Portfolio NSFR (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: lob.ASF. Denominator: lob.RSF. CALC: Numerator / Denominator * 100. Includes all descendant L2/L3 segments.',
    'LoB NSFR (%)',
    '',
  ],

  // ── 16. WHOLESALE_FUND ──
  [
    'WHOLESALE_FUND',
    'Wholesale Funding Ratio',
    'Wholesale (non-deposit) funding divided by total funding. Measures funding concentration risk. Higher reliance on wholesale funding (federal funds purchased, FHLB advances, commercial paper, repos) increases liquidity vulnerability during market stress. Monitored by OCC heightened standards.',
    'Wholesale_Funding / (Wholesale_Funding + Retail_Deposits) * 100',
    'CALCULATED',
    'PERCENTAGE',
    'LOWER_BETTER',
    'LQ',
    'Entity-level ratio — not additive',
    '',
    'OCC Heightened Standards, FR 2052a, Basel III NSFR',
    '0.00%',
    'Wholesale Funding Ratio',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], Numerator: SUM(carrying_amount) from borrowing_position_detail WHERE legal_entity maps to desk + SUM(carrying_amount) from sft_position_detail WHERE legal_entity maps to desk. Denominator: Numerator + SUM(balance_amount) from deposit_position_detail WHERE legal_entity maps to desk. CALC: Numerator / Denominator * 100',
    'Desk Wholesale Funding (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: SUM(wholesale borrowings + SFT funding) mapped to L2 segment including child L3 segments. Denominator: Numerator + SUM(deposit balances). CALC: Numerator / Denominator * 100',
    'Portfolio Wholesale Funding (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: SUM(wholesale borrowings + SFT funding) mapped to L1 department including all descendant segments. Denominator: Numerator + SUM(deposit balances). CALC: Numerator / Denominator * 100',
    'LoB Wholesale Funding (%)',
    '',
  ],

  // ── 17. DEP_RUNOFF ──
  [
    'DEP_RUNOFF',
    'Deposit Runoff Rate',
    'Weighted average deposit runoff rate based on deposit category and stability characteristics per LCR rules. Insured operational deposits: 5%, stable retail (insured, established relationship): 3%, less stable retail: 10%, brokered/listing-service: 100%, unsecured wholesale: 25-100%. Key driver of LCR outflows.',
    'SUM(deposit_balance * runoff_factor) / SUM(deposit_balance) * 100',
    'CALCULATED',
    'PERCENTAGE',
    'LOWER_BETTER',
    'LQ',
    'Deposit-balance-weighted average',
    '',
    'Basel III LCR, FR 2052a, 12 CFR 329',
    '0.00%',
    'Deposit Runoff Rate',
    '',
    '',
    // Facility
    'N', '', '', '', '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Avg',
    'For each [L3 Business Segment], lookup deposits via legal_entity cost_center_id mapping to [lob_segment_id]. SUM(deposit.balance_amount * CASE WHEN [operational_flag]=\'Y\' AND [fdic_insured_balance_amt] > 0 THEN 0.05 WHEN [brokered_flag]=\'Y\' OR [deposit_listing_service_flag]=\'Y\' THEN 1.00 WHEN [stability_code]=\'STABLE\' AND [transactional_flag]=\'Y\' THEN 0.03 WHEN [stability_code]=\'LESS_STABLE\' THEN 0.10 ELSE 0.25 END) / SUM(deposit.balance_amount) * 100',
    'Desk Wtd Runoff Rate (%)',
    '',
    // Portfolio
    'Y',
    'Avg',
    'For each [L2 Business Segment], same weighted average runoff calculation including child L3 segments. SUM(balance * runoff_factor) / SUM(balance) * 100. Runoff factors: operational insured 5%, stable retail 3%, less stable 10%, brokered 100%, wholesale 25%.',
    'Portfolio Wtd Runoff Rate (%)',
    '',
    // LoB
    'Y',
    'Avg',
    'For each [L1 Business Segment], same weighted average runoff calculation including all descendant L2/L3 segments. SUM(balance * runoff_factor) / SUM(balance) * 100.',
    'LoB Wtd Runoff Rate (%)',
    '',
  ],

  // ── 18. UNENC_RATIO ──
  [
    'UNENC_RATIO',
    'Unencumbered Asset Ratio',
    'Unencumbered assets divided by total assets. Measures available collateral buffer and contingent liquidity capacity. Unencumbered assets can be pledged for secured borrowing (repo, FHLB advances) or sold in stress. Higher ratio indicates greater funding flexibility. Monitored in Pillar 3 disclosures and FR 2052a.',
    'Unencumbered_Assets / Total_Assets * 100',
    'CALCULATED',
    'PERCENTAGE',
    'HIGHER_BETTER',
    'LQ',
    'Asset-weighted ratio at each level',
    '',
    'Basel III Pillar 3, FR 2052a, OCC Heightened Standards',
    '0.00%',
    'Unencumbered Asset Ratio',
    '',
    '',
    // Facility (position-level)
    'Y',
    'Calc',
    'For each DISTINCT(position_id) in bond_security_position_detail, CASE WHEN [pledged_flag]=\'N\' AND [rehypothecated_flag]=\'N\' THEN [fair_value_amt] ELSE 0 END. Ratio: SUM(unencumbered fair_value) / SUM(total fair_value) * 100. Also include collateral_asset_master WHERE [encumbrance_flag]=\'N\'.',
    'Position Unencumbered Ratio (%)',
    '',
    // Counterparty
    'N', '', '', '', '',
    // Desk
    'Y',
    'Calc',
    'For each [L3 Business Segment], Numerator: SUM(fair_value_amt) from bond_security_position_detail WHERE [pledged_flag]=\'N\' AND [rehypothecated_flag]=\'N\' AND legal_entity maps to desk. Denominator: SUM(fair_value_amt) total for all positions WHERE legal_entity maps to desk. CALC: Numerator / Denominator * 100',
    'Desk Unencumbered Ratio (%)',
    '',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 Business Segment], Numerator: SUM(unencumbered fair_value) including child L3 segments via parent_segment_id traversal. Denominator: SUM(total fair_value). CALC: Numerator / Denominator * 100',
    'Portfolio Unencumbered Ratio (%)',
    '',
    // LoB
    'Y',
    'Calc',
    'For each [L1 Business Segment], Numerator: SUM(unencumbered fair_value) including all descendant L2/L3 segments. Denominator: SUM(total fair_value). CALC: Numerator / Denominator * 100',
    'LoB Unencumbered Ratio (%)',
    '',
  ],
];

// ── IngredientFields sheet ──────────────────────────────────────────────

const ingredientHeaders = [
  'metric_id',
  'ord',
  'layer',
  'table',
  'field',
  'data_type',
  'description',
  'sample_value',
];

// Helper: common hierarchy fields used by bottom-up metrics
const hierarchyFields = (metricId: string, startOrd: number): unknown[][] => [
  [metricId, startOrd, 'L1', 'facility_master', 'facility_id', 'BIGINT', 'Primary key — grain of facility-level calculation', '12345'],
  [metricId, startOrd + 1, 'L1', 'facility_master', 'counterparty_id', 'BIGINT', 'FK to counterparty — grouping key for counterparty rollup', '67890'],
  [metricId, startOrd + 2, 'L1', 'facility_master', 'lob_segment_id', 'BIGINT', 'FK to enterprise_business_taxonomy — desk/portfolio/LoB resolution', '303'],
  [metricId, startOrd + 3, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'BIGINT', 'Hierarchy node ID — links facility to organizational segment', '303'],
  [metricId, startOrd + 4, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'BIGINT', 'Self-referential FK — traverses L3→L2→L1 hierarchy', '302'],
  [metricId, startOrd + 5, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'INT', 'Hierarchy depth (1=LoB, 2=Portfolio, 3=Desk)', '3'],
];

// Helper: entity-level hierarchy fields (legal_entity mapping)
const entityHierarchyFields = (metricId: string, startOrd: number): unknown[][] => [
  [metricId, startOrd, 'L1', 'legal_entity', 'legal_entity_id', 'BIGINT', 'Reporting entity primary key', '1001'],
  [metricId, startOrd + 1, 'L1', 'legal_entity', 'basel_business_line_level1', 'VARCHAR(100)', 'Basel III business line — maps to enterprise_business_taxonomy for desk/portfolio/LoB allocation', 'Commercial Banking'],
  [metricId, startOrd + 2, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'BIGINT', 'Hierarchy node ID', '303'],
  [metricId, startOrd + 3, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'BIGINT', 'Self-referential FK for hierarchy traversal', '302'],
  [metricId, startOrd + 4, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'INT', 'Hierarchy depth (1=LoB, 2=Portfolio, 3=Desk)', '3'],
];

const ingredientExamples: unknown[][] = [
  // ── RWA ──
  ['RWA', 1, 'L2', 'facility_risk_snapshot', 'ead_amt', 'DECIMAL(18,2)', 'Exposure at default amount — RWA numerator component', '5000000.00'],
  ['RWA', 2, 'L2', 'facility_risk_snapshot', 'risk_weight_pct', 'DECIMAL(10,4)', 'Basel regulatory risk weight percentage (0-1250%)', '100.0000'],
  ['RWA', 3, 'L2', 'facility_risk_snapshot', 'rwa_amt', 'DECIMAL(18,2)', 'Pre-calculated RWA if available (fallback)', '5000000.00'],
  ['RWA', 4, 'L2', 'regulatory_capital_exposure', 'current_credit_exposure_amt', 'DECIMAL(18,2)', 'Current credit exposure — fallback when ead_amt unavailable', '5000000.00'],
  ['RWA', 5, 'L2', 'regulatory_capital_exposure', 'risk_weight_pct', 'DECIMAL(10,4)', 'Regulatory risk weight from capital exposure table', '100.0000'],
  ...hierarchyFields('RWA', 6),

  // ── RWA_DENSITY ──
  ['RWA_DENSITY', 1, 'L2', 'facility_risk_snapshot', 'rwa_amt', 'DECIMAL(18,2)', 'Risk-weighted assets — numerator', '5000000.00'],
  ['RWA_DENSITY', 2, 'L2', 'facility_risk_snapshot', 'ead_amt', 'DECIMAL(18,2)', 'Exposure at default — denominator', '5000000.00'],
  ...hierarchyFields('RWA_DENSITY', 3),

  // ── CAP_ALLOC ──
  ['CAP_ALLOC', 1, 'L2', 'facility_risk_snapshot', 'rwa_amt', 'DECIMAL(18,2)', 'Risk-weighted assets — base for capital allocation', '5000000.00'],
  ['CAP_ALLOC', 2, 'L1', 'metric_threshold', 'threshold_value', 'DECIMAL(10,6)', 'Minimum capital requirement pct — looked up WHERE metric_id=CET1_RATIO (entity-specific: CET1 min + CCB + GSIB surcharge + SCB)', '0.1050'],
  ['CAP_ALLOC', 3, 'L1', 'metric_threshold', 'metric_id', 'VARCHAR(64)', 'Filter key — CET1_RATIO threshold drives capital allocation rate', 'CET1_RATIO'],
  ...hierarchyFields('CAP_ALLOC', 4),

  // ── CET1_RATIO ──
  ['CET1_RATIO', 1, 'L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'DECIMAL(18,2)', 'Qualifying regulatory capital amount per instrument', '5000000000.00'],
  ['CET1_RATIO', 2, 'L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'VARCHAR(50)', 'Capital tier classification: CET1, AT1, T2', 'CET1'],
  ['CET1_RATIO', 3, 'L2', 'facility_risk_snapshot', 'rwa_amt', 'DECIMAL(18,2)', 'Risk-weighted assets — denominator', '5000000.00'],
  ...entityHierarchyFields('CET1_RATIO', 4),

  // ── T1_RATIO ──
  ['T1_RATIO', 1, 'L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'DECIMAL(18,2)', 'Qualifying regulatory capital amount per instrument', '5000000000.00'],
  ['T1_RATIO', 2, 'L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'VARCHAR(50)', 'Capital tier: filter for CET1 + AT1', 'CET1'],
  ['T1_RATIO', 3, 'L2', 'facility_risk_snapshot', 'rwa_amt', 'DECIMAL(18,2)', 'Risk-weighted assets — denominator', '5000000.00'],
  ...entityHierarchyFields('T1_RATIO', 4),

  // ── TOTAL_CAP_RATIO ──
  ['TOTAL_CAP_RATIO', 1, 'L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'DECIMAL(18,2)', 'Qualifying regulatory capital amount per instrument', '5000000000.00'],
  ['TOTAL_CAP_RATIO', 2, 'L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'VARCHAR(50)', 'Capital tier: filter for CET1 + AT1 + T2', 'CET1'],
  ['TOTAL_CAP_RATIO', 3, 'L2', 'facility_risk_snapshot', 'rwa_amt', 'DECIMAL(18,2)', 'Risk-weighted assets — denominator', '5000000.00'],
  ...entityHierarchyFields('TOTAL_CAP_RATIO', 4),

  // ── LEV_RATIO ──
  ['LEV_RATIO', 1, 'L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'DECIMAL(18,2)', 'Tier 1 capital amount — numerator', '5000000000.00'],
  ['LEV_RATIO', 2, 'L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'VARCHAR(50)', 'Capital tier: filter for CET1 + AT1', 'CET1'],
  ['LEV_RATIO', 3, 'L2', 'facility_exposure_snapshot', 'gross_exposure_usd', 'DECIMAL(18,2)', 'On-balance sheet exposure for leverage denominator', '5000000.00'],
  ['LEV_RATIO', 4, 'L2', 'derivative_position_detail', 'notional_amt', 'DECIMAL(18,2)', 'Derivative notional for off-BS leverage exposure', '10000000.00'],
  ['LEV_RATIO', 5, 'L2', 'sft_position_detail', 'carrying_amount', 'DECIMAL(18,2)', 'SFT exposure for leverage denominator', '2000000.00'],
  ...entityHierarchyFields('LEV_RATIO', 6),

  // ── TLAC_RATIO ──
  ['TLAC_RATIO', 1, 'L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'DECIMAL(18,2)', 'Qualifying capital/TLAC instrument amount', '5000000000.00'],
  ['TLAC_RATIO', 2, 'L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'VARCHAR(50)', 'Capital tier: CET1, AT1, T2, or TLAC_ELIGIBLE', 'CET1'],
  ['TLAC_RATIO', 3, 'L2', 'regulatory_capital_instrument', 'instrument_type_code', 'VARCHAR(50)', 'Instrument type: filter for SENIOR_UNSECURED eligible debt', 'SENIOR_UNSECURED'],
  ['TLAC_RATIO', 4, 'L2', 'regulatory_capital_instrument', 'maturity_date', 'DATE', 'Maturity date — TLAC requires remaining maturity > 1yr', '2027-06-30'],
  ['TLAC_RATIO', 5, 'L2', 'facility_risk_snapshot', 'rwa_amt', 'DECIMAL(18,2)', 'Risk-weighted assets — denominator', '5000000.00'],
  ...entityHierarchyFields('TLAC_RATIO', 6),

  // ── SCB ──
  ['SCB', 1, 'L3', 'stress_test_result_summary', 'capital_impact_pct', 'DECIMAL(10,6)', 'CET1 ratio decline under severely adverse scenario', '0.035000'],
  ['SCB', 2, 'L3', 'stress_test_result', 'scenario_type', 'VARCHAR(50)', 'Stress scenario type: BASELINE, ADVERSE, SEVERELY_ADVERSE', 'SEVERELY_ADVERSE'],
  ['SCB', 3, 'L3', 'stress_test_result', 'loss_amount', 'DECIMAL(18,2)', 'Projected credit loss under stress', '15000000000.00'],
  ['SCB', 4, 'L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'DECIMAL(18,2)', 'CET1 capital at horizon beginning', '50000000000.00'],
  ...entityHierarchyFields('SCB', 5),

  // ── HQLA ──
  ['HQLA', 1, 'L2', 'bond_security_position_detail', 'fair_value_amt', 'DECIMAL(18,2)', 'Fair value of security position', '50000000.00'],
  ['HQLA', 2, 'L2', 'bond_security_position_detail', 'liquid_assets_collateral_level', 'VARCHAR(20)', 'HQLA classification: L1, L2A, L2B, OTHER', 'L1'],
  ['HQLA', 3, 'L2', 'bond_security_position_detail', 'pledged_flag', 'CHAR(1)', 'Whether asset is pledged/encumbered', 'N'],
  ['HQLA', 4, 'L2', 'cash_position_detail', 'balance_amount', 'DECIMAL(18,2)', 'Cash balance — all cash is Level 1 HQLA', '10000000.00'],
  ['HQLA', 5, 'L2', 'cash_position_detail', 'cash_item_type_code', 'VARCHAR(30)', 'Cash type: FED_RESERVE, CORRESPONDENT, VAULT', 'FED_RESERVE'],
  ...entityHierarchyFields('HQLA', 6),

  // ── NET_CASH_OUT ──
  ['NET_CASH_OUT', 1, 'L2', 'cash_flow', 'principal_cashflow_amt', 'DECIMAL(18,2)', 'Principal cash flow amount', '5000000.00'],
  ['NET_CASH_OUT', 2, 'L2', 'cash_flow', 'interest_cashflow_amt', 'DECIMAL(18,2)', 'Interest cash flow amount', '250000.00'],
  ['NET_CASH_OUT', 3, 'L2', 'cash_flow', 'flow_direction', 'VARCHAR(10)', 'Cash flow direction: IN or OUT', 'OUT'],
  ['NET_CASH_OUT', 4, 'L2', 'cash_flow', 'cash_flow_date', 'DATE', 'Projected cash flow date', '2025-02-15'],
  ['NET_CASH_OUT', 5, 'L2', 'deposit_position_detail', 'stability_code', 'VARCHAR(30)', 'Deposit stability category for runoff rate assignment', 'STABLE'],
  ['NET_CASH_OUT', 6, 'L2', 'deposit_position_detail', 'brokered_flag', 'CHAR(1)', 'Brokered deposit indicator — 100% runoff', 'N'],
  ['NET_CASH_OUT', 7, 'L2', 'deposit_position_detail', 'operational_flag', 'CHAR(1)', 'Operational deposit indicator — 5% runoff', 'Y'],
  ['NET_CASH_OUT', 8, 'L2', 'borrowing_position_detail', 'carrying_amount', 'DECIMAL(18,2)', 'Borrowing balance — maturing within 30 days = outflow', '50000000.00'],
  ['NET_CASH_OUT', 9, 'L2', 'borrowing_position_detail', 'maturity_date', 'DATE', 'Borrowing maturity date', '2025-02-28'],
  ...entityHierarchyFields('NET_CASH_OUT', 10),

  // ── LCR ──
  ['LCR', 1, 'L2', 'bond_security_position_detail', 'fair_value_amt', 'DECIMAL(18,2)', 'HQLA fair value — numerator component', '50000000.00'],
  ['LCR', 2, 'L2', 'bond_security_position_detail', 'liquid_assets_collateral_level', 'VARCHAR(20)', 'HQLA level for haircut', 'L1'],
  ['LCR', 3, 'L2', 'cash_position_detail', 'balance_amount', 'DECIMAL(18,2)', 'Cash balance — Level 1 HQLA', '10000000.00'],
  ['LCR', 4, 'L2', 'cash_flow', 'principal_cashflow_amt', 'DECIMAL(18,2)', 'Cash flow for outflow/inflow calculation', '5000000.00'],
  ['LCR', 5, 'L2', 'cash_flow', 'flow_direction', 'VARCHAR(10)', 'IN or OUT for net cash outflow', 'OUT'],
  ['LCR', 6, 'L2', 'deposit_position_detail', 'stability_code', 'VARCHAR(30)', 'Deposit stability for runoff', 'STABLE'],
  ...entityHierarchyFields('LCR', 7),

  // ── ASF ──
  ['ASF', 1, 'L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'DECIMAL(18,2)', 'Capital instrument amount — 100% ASF factor', '5000000000.00'],
  ['ASF', 2, 'L2', 'deposit_position_detail', 'balance_amount', 'DECIMAL(18,2)', 'Deposit balance — ASF factor varies by stability', '100000000.00'],
  ['ASF', 3, 'L2', 'deposit_position_detail', 'stability_code', 'VARCHAR(30)', 'STABLE=95%, LESS_STABLE=90%', 'STABLE'],
  ['ASF', 4, 'L2', 'deposit_position_detail', 'operational_flag', 'CHAR(1)', 'Operational deposit — 95% ASF', 'Y'],
  ['ASF', 5, 'L2', 'deposit_position_detail', 'fdic_insured_balance_amt', 'DECIMAL(18,2)', 'FDIC insured portion — higher ASF factor', '250000.00'],
  ['ASF', 6, 'L2', 'deposit_position_detail', 'brokered_flag', 'CHAR(1)', 'Brokered — 50% ASF if maturity < 1yr', 'N'],
  ['ASF', 7, 'L2', 'borrowing_position_detail', 'carrying_amount', 'DECIMAL(18,2)', 'Borrowing balance — ASF factor by maturity', '50000000.00'],
  ['ASF', 8, 'L2', 'borrowing_position_detail', 'maturity_date', 'DATE', 'Maturity for ASF factor: >1yr=100%, 6mo-1yr=50%, <6mo=0%', '2026-06-30'],
  ['ASF', 9, 'L2', 'borrowing_position_detail', 'borrowing_type_code', 'VARCHAR(30)', 'Wholesale funding type', 'FHLB'],
  ...entityHierarchyFields('ASF', 10),

  // ── RSF ──
  ['RSF', 1, 'L2', 'cash_position_detail', 'balance_amount', 'DECIMAL(18,2)', 'Cash balance — 0% RSF (coins/banknotes, central bank reserves)', '10000000.00'],
  ['RSF', 2, 'L2', 'bond_security_position_detail', 'fair_value_amt', 'DECIMAL(18,2)', 'Security fair value — RSF factor by HQLA level', '50000000.00'],
  ['RSF', 3, 'L2', 'bond_security_position_detail', 'liquid_assets_collateral_level', 'VARCHAR(20)', 'HQLA level: L1=5% RSF, L2A=15%, L2B=50%, other=85%', 'L1'],
  ['RSF', 4, 'L2', 'bond_security_position_detail', 'pledged_flag', 'CHAR(1)', 'Pledged assets get higher RSF', 'N'],
  ['RSF', 5, 'L2', 'facility_exposure_snapshot', 'gross_exposure_usd', 'DECIMAL(18,2)', 'Loan exposure — RSF factor by maturity', '5000000.00'],
  ['RSF', 6, 'L2', 'facility_exposure_snapshot', 'remaining_maturity_days', 'INT', 'Remaining maturity: >1yr=85%, 6mo-1yr=50%, <6mo=15%', '365'],
  ...entityHierarchyFields('RSF', 7),

  // ── NSFR ──
  ['NSFR', 1, 'L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'DECIMAL(18,2)', 'Capital for ASF numerator — 100% factor', '5000000000.00'],
  ['NSFR', 2, 'L2', 'deposit_position_detail', 'balance_amount', 'DECIMAL(18,2)', 'Deposit balance for ASF — factor by stability', '100000000.00'],
  ['NSFR', 3, 'L2', 'bond_security_position_detail', 'fair_value_amt', 'DECIMAL(18,2)', 'Security value for RSF — factor by HQLA level', '50000000.00'],
  ['NSFR', 4, 'L2', 'facility_exposure_snapshot', 'gross_exposure_usd', 'DECIMAL(18,2)', 'Loan exposure for RSF — factor by maturity', '5000000.00'],
  ...entityHierarchyFields('NSFR', 5),

  // ── WHOLESALE_FUND ──
  ['WHOLESALE_FUND', 1, 'L2', 'borrowing_position_detail', 'carrying_amount', 'DECIMAL(18,2)', 'Wholesale borrowing balance — numerator component', '50000000.00'],
  ['WHOLESALE_FUND', 2, 'L2', 'borrowing_position_detail', 'borrowing_type_code', 'VARCHAR(30)', 'Funding type: FHLB, FED_FUNDS, COMMERCIAL_PAPER, TERM_LOAN', 'FHLB'],
  ['WHOLESALE_FUND', 3, 'L2', 'sft_position_detail', 'carrying_amount', 'DECIMAL(18,2)', 'SFT (repo) funding balance — numerator component', '20000000.00'],
  ['WHOLESALE_FUND', 4, 'L2', 'deposit_position_detail', 'balance_amount', 'DECIMAL(18,2)', 'Deposit balance — denominator component (retail funding)', '100000000.00'],
  ...entityHierarchyFields('WHOLESALE_FUND', 5),

  // ── DEP_RUNOFF ──
  ['DEP_RUNOFF', 1, 'L2', 'deposit_position_detail', 'balance_amount', 'DECIMAL(18,2)', 'Deposit balance — weighting basis for runoff', '100000000.00'],
  ['DEP_RUNOFF', 2, 'L2', 'deposit_position_detail', 'stability_code', 'VARCHAR(30)', 'Stability: STABLE=3%, LESS_STABLE=10%, WHOLESALE=25%', 'STABLE'],
  ['DEP_RUNOFF', 3, 'L2', 'deposit_position_detail', 'operational_flag', 'CHAR(1)', 'Operational deposit — 5% runoff rate', 'Y'],
  ['DEP_RUNOFF', 4, 'L2', 'deposit_position_detail', 'brokered_flag', 'CHAR(1)', 'Brokered deposit — 100% runoff rate', 'N'],
  ['DEP_RUNOFF', 5, 'L2', 'deposit_position_detail', 'transactional_flag', 'CHAR(1)', 'Primary transaction account — lower runoff', 'Y'],
  ['DEP_RUNOFF', 6, 'L2', 'deposit_position_detail', 'fdic_insured_balance_amt', 'DECIMAL(18,2)', 'FDIC insured portion — lower runoff for insured', '250000.00'],
  ['DEP_RUNOFF', 7, 'L2', 'deposit_position_detail', 'deposit_listing_service_flag', 'CHAR(1)', 'Listed on brokerage platform — 100% runoff', 'N'],
  ...entityHierarchyFields('DEP_RUNOFF', 8),

  // ── UNENC_RATIO ──
  ['UNENC_RATIO', 1, 'L2', 'bond_security_position_detail', 'fair_value_amt', 'DECIMAL(18,2)', 'Security fair value — total asset base', '50000000.00'],
  ['UNENC_RATIO', 2, 'L2', 'bond_security_position_detail', 'pledged_flag', 'CHAR(1)', 'Pledged indicator — pledged = encumbered', 'N'],
  ['UNENC_RATIO', 3, 'L2', 'bond_security_position_detail', 'rehypothecated_flag', 'CHAR(1)', 'Rehypothecation indicator — rehypothecated = encumbered', 'N'],
  ['UNENC_RATIO', 4, 'L1', 'collateral_asset_master', 'encumbrance_flag', 'CHAR(1)', 'Collateral encumbrance status', 'N'],
  ['UNENC_RATIO', 5, 'L1', 'collateral_asset_master', 'encumbrance_type_code', 'VARCHAR(30)', 'Regulatory encumbrance classification', 'NONE'],
  ...entityHierarchyFields('UNENC_RATIO', 6),
];

// ── DimensionSources sheet ──────────────────────────────────────────────

const dimSrcHeaders = [
  'metric_id',
  'dimension',
  'ord',
  'layer',
  'table',
  'field',
  'description',
];

// Helper: standard hierarchy dimension sources for bottom-up metrics
const bottomUpDimSources = (metricId: string, calcFields: [string, string, string, string][]): unknown[][] => {
  const rows: unknown[][] = [];

  // Facility level: calc fields
  calcFields.forEach(([layer, table, field, desc], i) => {
    rows.push([metricId, 'facility', i + 1, layer, table, field, desc]);
  });
  rows.push([metricId, 'facility', calcFields.length + 1, 'L1', 'facility_master', 'facility_id', 'Primary key — grain of calculation']);

  // Counterparty level
  calcFields.forEach(([layer, table, field, desc], i) => {
    rows.push([metricId, 'counterparty', i + 1, layer, table, field, desc]);
  });
  rows.push([metricId, 'counterparty', calcFields.length + 1, 'L1', 'facility_master', 'counterparty_id', 'FK to counterparty — grouping key']);
  rows.push([metricId, 'counterparty', calcFields.length + 2, 'L1', 'facility_master', 'facility_id', 'Facility identifier for join']);

  // Desk level
  calcFields.forEach(([layer, table, field, desc], i) => {
    rows.push([metricId, 'desk', i + 1, layer, table, field, desc]);
  });
  rows.push([metricId, 'desk', calcFields.length + 1, 'L1', 'facility_master', 'lob_segment_id', 'FK to Business Segment taxonomy — desk resolution']);
  rows.push([metricId, 'desk', calcFields.length + 2, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'Business Segment hierarchy node — L3 leaf segment']);
  rows.push([metricId, 'desk', calcFields.length + 3, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Hierarchy depth — filter for L3']);

  // Portfolio level
  calcFields.forEach(([layer, table, field, desc], i) => {
    rows.push([metricId, 'portfolio', i + 1, layer, table, field, desc]);
  });
  rows.push([metricId, 'portfolio', calcFields.length + 1, 'L1', 'facility_master', 'lob_segment_id', 'FK to Business Segment taxonomy']);
  rows.push([metricId, 'portfolio', calcFields.length + 2, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'Business Segment hierarchy node — L2 parent segment']);
  rows.push([metricId, 'portfolio', calcFields.length + 3, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'Self-referential FK — traverse L3 to L2']);
  rows.push([metricId, 'portfolio', calcFields.length + 4, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Hierarchy depth — filter for L2']);

  // LoB level
  calcFields.forEach(([layer, table, field, desc], i) => {
    rows.push([metricId, 'lob', i + 1, layer, table, field, desc]);
  });
  rows.push([metricId, 'lob', calcFields.length + 1, 'L1', 'facility_master', 'lob_segment_id', 'FK to Business Segment taxonomy']);
  rows.push([metricId, 'lob', calcFields.length + 2, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'Business Segment hierarchy node — L1 root segment']);
  rows.push([metricId, 'lob', calcFields.length + 3, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'Self-referential FK — recursive traversal for all descendants']);
  rows.push([metricId, 'lob', calcFields.length + 4, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Hierarchy depth — filter for L1']);

  return rows;
};

// Helper: entity-level dimension sources (desk/portfolio/lob only)
const entityDimSources = (metricId: string, calcFields: [string, string, string, string][]): unknown[][] => {
  const rows: unknown[][] = [];

  // Desk level
  calcFields.forEach(([layer, table, field, desc], i) => {
    rows.push([metricId, 'desk', i + 1, layer, table, field, desc]);
  });
  rows.push([metricId, 'desk', calcFields.length + 1, 'L1', 'legal_entity', 'basel_business_line_level1', 'Entity-to-desk mapping via business line']);
  rows.push([metricId, 'desk', calcFields.length + 2, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'L3 hierarchy node']);
  rows.push([metricId, 'desk', calcFields.length + 3, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Filter for L3']);

  // Portfolio level
  calcFields.forEach(([layer, table, field, desc], i) => {
    rows.push([metricId, 'portfolio', i + 1, layer, table, field, desc]);
  });
  rows.push([metricId, 'portfolio', calcFields.length + 1, 'L1', 'legal_entity', 'basel_business_line_level1', 'Entity-to-portfolio mapping']);
  rows.push([metricId, 'portfolio', calcFields.length + 2, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'L2 hierarchy node']);
  rows.push([metricId, 'portfolio', calcFields.length + 3, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'Traverse L3→L2']);
  rows.push([metricId, 'portfolio', calcFields.length + 4, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Filter for L2']);

  // LoB level
  calcFields.forEach(([layer, table, field, desc], i) => {
    rows.push([metricId, 'lob', i + 1, layer, table, field, desc]);
  });
  rows.push([metricId, 'lob', calcFields.length + 1, 'L1', 'legal_entity', 'basel_business_line_level1', 'Entity-to-LoB mapping']);
  rows.push([metricId, 'lob', calcFields.length + 2, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'L1 hierarchy node']);
  rows.push([metricId, 'lob', calcFields.length + 3, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'Recursive traversal for all descendants']);
  rows.push([metricId, 'lob', calcFields.length + 4, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Filter for L1']);

  return rows;
};

const dimSrcExamples: unknown[][] = [
  // ── RWA ──
  ...bottomUpDimSources('RWA', [
    ['L2', 'facility_risk_snapshot', 'ead_amt', 'Exposure at default — RWA numerator component'],
    ['L2', 'facility_risk_snapshot', 'risk_weight_pct', 'Basel risk weight percentage'],
  ]),

  // ── RWA_DENSITY ──
  ...bottomUpDimSources('RWA_DENSITY', [
    ['L2', 'facility_risk_snapshot', 'rwa_amt', 'Risk-weighted assets — ratio numerator'],
    ['L2', 'facility_risk_snapshot', 'ead_amt', 'Exposure at default — ratio denominator'],
  ]),

  // ── CAP_ALLOC ──
  ...bottomUpDimSources('CAP_ALLOC', [
    ['L2', 'facility_risk_snapshot', 'rwa_amt', 'Risk-weighted assets — base for capital allocation'],
    ['L1', 'metric_threshold', 'threshold_value', 'Min capital requirement pct from metric_threshold WHERE metric_id=CET1_RATIO'],
  ]),

  // ── CET1_RATIO ──
  ...entityDimSources('CET1_RATIO', [
    ['L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'CET1 capital amount — numerator'],
    ['L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'Filter for CET1'],
    ['L2', 'facility_risk_snapshot', 'rwa_amt', 'Total RWA — denominator'],
  ]),

  // ── T1_RATIO ──
  ...entityDimSources('T1_RATIO', [
    ['L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'Tier 1 capital amount — numerator'],
    ['L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'Filter for CET1 + AT1'],
    ['L2', 'facility_risk_snapshot', 'rwa_amt', 'Total RWA — denominator'],
  ]),

  // ── TOTAL_CAP_RATIO ──
  ...entityDimSources('TOTAL_CAP_RATIO', [
    ['L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'Total capital amount — numerator'],
    ['L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'Filter for CET1 + AT1 + T2'],
    ['L2', 'facility_risk_snapshot', 'rwa_amt', 'Total RWA — denominator'],
  ]),

  // ── LEV_RATIO ──
  ...entityDimSources('LEV_RATIO', [
    ['L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'Tier 1 capital — numerator'],
    ['L2', 'facility_exposure_snapshot', 'gross_exposure_usd', 'On-BS exposure for leverage denominator'],
    ['L2', 'derivative_position_detail', 'notional_amt', 'Derivative notional for off-BS exposure'],
    ['L2', 'sft_position_detail', 'carrying_amount', 'SFT exposure for leverage denominator'],
  ]),

  // ── TLAC_RATIO ──
  ...entityDimSources('TLAC_RATIO', [
    ['L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'TLAC-eligible capital — numerator'],
    ['L2', 'regulatory_capital_instrument', 'capital_tier_treatment_code', 'Filter for eligible tiers'],
    ['L2', 'regulatory_capital_instrument', 'instrument_type_code', 'Filter for SENIOR_UNSECURED eligible debt'],
    ['L2', 'facility_risk_snapshot', 'rwa_amt', 'Total RWA — denominator'],
  ]),

  // ── SCB ──
  ...entityDimSources('SCB', [
    ['L3', 'stress_test_result_summary', 'capital_impact_pct', 'CET1 decline under severely adverse scenario'],
    ['L3', 'stress_test_result', 'scenario_type', 'Scenario filter: SEVERELY_ADVERSE'],
  ]),

  // ── HQLA (position-level facility + entity desk/portfolio/lob) ──
  // Facility level
  ['HQLA', 'facility', 1, 'L2', 'bond_security_position_detail', 'fair_value_amt', 'Security fair value — HQLA amount component'],
  ['HQLA', 'facility', 2, 'L2', 'bond_security_position_detail', 'liquid_assets_collateral_level', 'HQLA level for haircut (L1=100%, L2A=85%, L2B=50%)'],
  ['HQLA', 'facility', 3, 'L2', 'bond_security_position_detail', 'pledged_flag', 'Encumbrance filter — only unencumbered assets qualify'],
  ['HQLA', 'facility', 4, 'L2', 'cash_position_detail', 'balance_amount', 'Cash balance — Level 1 HQLA at 100%'],
  ['HQLA', 'facility', 5, 'L2', 'cash_position_detail', 'cash_item_type_code', 'Cash type filter for eligible reserves'],
  // Desk/Portfolio/LoB
  ...entityDimSources('HQLA', [
    ['L2', 'bond_security_position_detail', 'fair_value_amt', 'Security fair value — HQLA amount'],
    ['L2', 'bond_security_position_detail', 'liquid_assets_collateral_level', 'HQLA level for haircut'],
    ['L2', 'cash_position_detail', 'balance_amount', 'Cash balance — Level 1 HQLA'],
  ]),

  // ── NET_CASH_OUT ──
  ...entityDimSources('NET_CASH_OUT', [
    ['L2', 'cash_flow', 'principal_cashflow_amt', 'Principal cash flow for outflow/inflow'],
    ['L2', 'cash_flow', 'interest_cashflow_amt', 'Interest cash flow'],
    ['L2', 'cash_flow', 'flow_direction', 'Direction: IN or OUT'],
    ['L2', 'cash_flow', 'cash_flow_date', 'Date filter for 30-day horizon'],
    ['L2', 'deposit_position_detail', 'stability_code', 'Deposit category for runoff rate'],
    ['L2', 'borrowing_position_detail', 'carrying_amount', 'Maturing wholesale funding'],
  ]),

  // ── LCR ──
  ...entityDimSources('LCR', [
    ['L2', 'bond_security_position_detail', 'fair_value_amt', 'HQLA fair value — numerator component'],
    ['L2', 'bond_security_position_detail', 'liquid_assets_collateral_level', 'HQLA level for haircut'],
    ['L2', 'cash_position_detail', 'balance_amount', 'Cash — Level 1 HQLA'],
    ['L2', 'cash_flow', 'principal_cashflow_amt', 'Cash flow for denominator'],
    ['L2', 'cash_flow', 'flow_direction', 'Direction filter for outflows/inflows'],
    ['L2', 'deposit_position_detail', 'stability_code', 'Deposit runoff category'],
  ]),

  // ── ASF ──
  ...entityDimSources('ASF', [
    ['L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'Capital — 100% ASF factor'],
    ['L2', 'deposit_position_detail', 'balance_amount', 'Deposit balance — ASF factor by stability'],
    ['L2', 'deposit_position_detail', 'stability_code', 'Stability category for ASF factor'],
    ['L2', 'borrowing_position_detail', 'carrying_amount', 'Borrowing balance — ASF factor by maturity'],
    ['L2', 'borrowing_position_detail', 'maturity_date', 'Maturity for ASF factor lookup'],
  ]),

  // ── RSF ──
  ...entityDimSources('RSF', [
    ['L2', 'cash_position_detail', 'balance_amount', 'Cash — 0% RSF factor'],
    ['L2', 'bond_security_position_detail', 'fair_value_amt', 'Securities — RSF by HQLA level'],
    ['L2', 'bond_security_position_detail', 'liquid_assets_collateral_level', 'HQLA level for RSF factor'],
    ['L2', 'facility_exposure_snapshot', 'gross_exposure_usd', 'Loan exposure — RSF by maturity'],
  ]),

  // ── NSFR ──
  ...entityDimSources('NSFR', [
    ['L2', 'regulatory_capital_instrument', 'regulatory_capital_amt', 'Capital for ASF numerator'],
    ['L2', 'deposit_position_detail', 'balance_amount', 'Deposits for ASF'],
    ['L2', 'bond_security_position_detail', 'fair_value_amt', 'Securities for RSF'],
    ['L2', 'facility_exposure_snapshot', 'gross_exposure_usd', 'Loans for RSF'],
  ]),

  // ── WHOLESALE_FUND ──
  ...entityDimSources('WHOLESALE_FUND', [
    ['L2', 'borrowing_position_detail', 'carrying_amount', 'Wholesale borrowing — numerator'],
    ['L2', 'sft_position_detail', 'carrying_amount', 'SFT funding — numerator'],
    ['L2', 'deposit_position_detail', 'balance_amount', 'Deposit balance — denominator offset'],
  ]),

  // ── DEP_RUNOFF ──
  ...entityDimSources('DEP_RUNOFF', [
    ['L2', 'deposit_position_detail', 'balance_amount', 'Deposit balance — weighting basis'],
    ['L2', 'deposit_position_detail', 'stability_code', 'Stability for runoff rate'],
    ['L2', 'deposit_position_detail', 'operational_flag', 'Operational deposit — 5% runoff'],
    ['L2', 'deposit_position_detail', 'brokered_flag', 'Brokered — 100% runoff'],
    ['L2', 'deposit_position_detail', 'fdic_insured_balance_amt', 'Insured portion — lower runoff'],
  ]),

  // ── UNENC_RATIO (position facility + entity desk/portfolio/lob) ──
  // Facility level
  ['UNENC_RATIO', 'facility', 1, 'L2', 'bond_security_position_detail', 'fair_value_amt', 'Security fair value — total asset base'],
  ['UNENC_RATIO', 'facility', 2, 'L2', 'bond_security_position_detail', 'pledged_flag', 'Pledged indicator'],
  ['UNENC_RATIO', 'facility', 3, 'L2', 'bond_security_position_detail', 'rehypothecated_flag', 'Rehypothecation indicator'],
  ['UNENC_RATIO', 'facility', 4, 'L1', 'collateral_asset_master', 'encumbrance_flag', 'Collateral encumbrance status'],
  // Desk/Portfolio/LoB
  ...entityDimSources('UNENC_RATIO', [
    ['L2', 'bond_security_position_detail', 'fair_value_amt', 'Security fair value'],
    ['L2', 'bond_security_position_detail', 'pledged_flag', 'Encumbrance filter'],
    ['L2', 'bond_security_position_detail', 'rehypothecated_flag', 'Rehypothecation filter'],
  ]),
];

// ── Build workbook ──────────────────────────────────────────────────────

const wb = XLSX.utils.book_new();

// Instructions
const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
wsInstr['!cols'] = [{ wch: 110 }];
XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

// Metrics
const wsMetrics = XLSX.utils.aoa_to_sheet([metricsHeaders, ...metricsExamples]);
wsMetrics['!cols'] = metricsHeaders.map((h) => ({
  wch: h.includes('level_logic') ? 80
    : h.includes('definition') ? 60
    : h.includes('formula') || h.includes('rollup') ? 45
    : h.includes('regulatory') ? 40
    : 22,
}));
XLSX.utils.book_append_sheet(wb, wsMetrics, 'Metrics');

// IngredientFields
const wsIngr = XLSX.utils.aoa_to_sheet([ingredientHeaders, ...ingredientExamples]);
wsIngr['!cols'] = ingredientHeaders.map((h) => ({
  wch: h === 'description' ? 55 : h === 'data_type' ? 18 : h === 'sample_value' ? 18 : 25,
}));
XLSX.utils.book_append_sheet(wb, wsIngr, 'IngredientFields');

// DimensionSources
const wsDimSrc = XLSX.utils.aoa_to_sheet([dimSrcHeaders, ...dimSrcExamples]);
wsDimSrc['!cols'] = dimSrcHeaders.map((h) => ({
  wch: h === 'description' ? 55 : h === 'dimension' ? 16 : h === 'ord' ? 6 : 28,
}));
XLSX.utils.book_append_sheet(wb, wsDimSrc, 'DimensionSources');

// Write
XLSX.writeFile(wb, outputPath);
console.log('Capital & Liquidity Metrics written to', outputPath);
console.log(`Sheets: Instructions, Metrics (${metricsExamples.length} metrics), IngredientFields (${ingredientExamples.length} rows), DimensionSources (${dimSrcExamples.length} rows)`);
