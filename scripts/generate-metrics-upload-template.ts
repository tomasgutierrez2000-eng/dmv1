/**
 * Generate an Excel template for bulk metric upload.
 * Modelled off the LTV metric in metric-library/catalogue.json,
 * including per-dimension pseudocode, source references, rollup logic,
 * and ingredient fields.
 *
 * Run: npx tsx scripts/generate-metrics-upload-template.ts [output-path]
 * Default output: metrics-upload-template.xlsx
 */

import path from 'path';
import XLSX from 'xlsx';

const outputPath =
  process.argv[2] || path.join(process.cwd(), 'metrics-upload-template.xlsx');

// ── Instructions sheet ──────────────────────────────────────────────────

const instructions: unknown[][] = [
  ['Metrics Bulk Upload Template'],
  ['Modelled off: metrics/library/LTV (Loan-to-Value Ratio)'],
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
  ['  metric_id           – Unique identifier (e.g., LTV, PD, EAD, DSCR)'],
  ['  metric_name         – Human-readable name (e.g., Loan-to-Value Ratio)'],
  ['  definition          – Full description of what the metric measures and why it matters'],
  ['  generic_formula     – High-level formula (e.g., Committed_Facility_Amt / Collateral_Value x 100)'],
  [],
  ['OPTIONAL COLUMNS:'],
  ['  metric_class        – SOURCED | CALCULATED | HYBRID'],
  ['  unit_type           – RATIO | PERCENTAGE | CURRENCY | COUNT | RATE | ORDINAL | DAYS | INDEX'],
  ['  direction           – HIGHER_BETTER | LOWER_BETTER | NEUTRAL'],
  ['  domain_ids          – Comma-separated domain codes (see below)'],
  ['  rollup_philosophy   – How the metric aggregates up the hierarchy (e.g., Exposure-weighted average)'],
  ['  weighting_basis     – BY_EAD | BY_OUTSTANDING | BY_COMMITTED  (for weighted-avg metrics)'],
  ['  regulatory_references – Comma-separated regulatory citations (e.g., FR Y-14Q, CCAR)'],
  ['  display_format      – Excel/dashboard format string (e.g., 0.00%, $#,##0.0M, 0.00x)'],
  [],
  ['PER-DIMENSION BLOCKS (5 dimensions x 4 columns each):'],
  ['  Dimensions: Facility → Counterparty → Desk (L3) → Portfolio (L2) → LoB (L1)'],
  ['  For each dimension, fill in these 4 columns:'],
  ['    {dim}_in_record      – Y or N  (is this metric available at this aggregation level?)'],
  ['    {dim}_sourcing_type  – Raw | Calc | Agg | Avg'],
  ['    {dim}_level_logic    – PSEUDOCODE: step-by-step formula at this level'],
  ['                           Use the pattern from LTV:'],
  ['                           "For each [grouping_key] THEN lookup [facility_id] WHERE IS([grouping_key])."'],
  ['                           "For each [facility_id]: formula_expression"'],
  ['    {dim}_display_name   – Dashboard label at this level (e.g., Facility LTV (%))'],
  [],
  ['═══════════════════════════════════════════════════════════════════════'],
  ['  INGREDIENT FIELDS SHEET — Atomic Source Fields'],
  ['═══════════════════════════════════════════════════════════════════════'],
  [],
  ['One row per source field per metric. Lists ALL tables/fields the metric needs.'],
  ['  metric_id    – FK to the Metrics sheet'],
  ['  ord          – Display order (1, 2, 3, ...)'],
  ['  layer        – L1 (master/reference) or L2 (snapshot/transactional)'],
  ['  table        – Source table name (e.g., facility_master, collateral_snapshot)'],
  ['  field        – Source column name (e.g., committed_facility_amt, valuation_amount)'],
  ['  data_type    – Column type (e.g., DECIMAL(18,2), BIGINT, VARCHAR(50))'],
  ['  description  – What this field represents'],
  ['  sample_value – Example value for testing'],
  [],
  ['═══════════════════════════════════════════════════════════════════════'],
  ['  DIMENSION SOURCES SHEET — Per-Level Source References'],
  ['═══════════════════════════════════════════════════════════════════════'],
  [],
  ['One row per source field per metric per dimension.'],
  ['Unlike IngredientFields (which is the full universe), this sheet specifies'],
  ['which subset of fields are referenced at each aggregation level.'],
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
  ['weighting_basis  : BY_EAD | BY_OUTSTANDING | BY_COMMITTED'],
  ['domain_ids:'],
  ['  CR – Credit Risk                    EL – Exposure & Limits'],
  ['  FP – Financial Performance          CM – Collateral & Mitigation'],
  ['  PA – Portfolio Analytics            GO – Governance & Operations'],
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
  // Core fields
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
  // Facility dimension
  'facility_in_record',
  'facility_sourcing_type',
  'facility_level_logic',
  'facility_display_name',
  // Counterparty dimension
  'counterparty_in_record',
  'counterparty_sourcing_type',
  'counterparty_level_logic',
  'counterparty_display_name',
  // Desk (L3) dimension
  'desk_in_record',
  'desk_sourcing_type',
  'desk_level_logic',
  'desk_display_name',
  // Portfolio (L2) dimension
  'portfolio_in_record',
  'portfolio_sourcing_type',
  'portfolio_level_logic',
  'portfolio_display_name',
  // LoB (L1) dimension
  'lob_in_record',
  'lob_sourcing_type',
  'lob_level_logic',
  'lob_display_name',
];

const metricsExamples: unknown[][] = [
  // ── LTV (primary example — the model metric) ──
  [
    'LTV',
    'Loan-to-Value Ratio',
    'Committed facility amount divided by collateral value, expressed as a percentage. Measures the degree of leverage on a secured facility. A key underwriting and ongoing monitoring KPI for secured lending, required in FR Y-14Q CRE Schedule and OCC Comptroller\'s Handbook. Higher LTV indicates greater loss severity risk if the borrower defaults and collateral must be liquidated.',
    'Committed_Facility_Amt / Collateral_Value x 100',
    'CALCULATED',
    'PERCENTAGE',
    'LOWER_BETTER',
    'CM, CR',
    'Exposure-weighted average',
    'BY_EAD',
    'FR Y-14Q, CCAR, CRE underwriting, OCC Comptroller\'s Handbook',
    '0.00%',
    // Facility
    'Y',
    'Calc',
    'For each DISTINCT(facility_id) THEN [committed_facility_amt] / [collateral_value] x 100',
    'Facility LTV (%)',
    // Counterparty
    'Y',
    'Calc',
    'For each [counterparty_id] THEN lookup [facility_id] WHERE IS([counterparty_id]). For each [facility_id]: SUM(committed_facility_amt) / SUM(collateral_value) x 100',
    'Counterparty LTV (%)',
    // Desk
    'Y',
    'Calc',
    'For each [L3 LoB], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\' AND [segment_name]=[L3 LoB], THEN lookup [facility_id] in facility_master WHERE IS([lob_segment_id]). For each [facility_id]: SUM(committed_facility_amt) / SUM(collateral_value) x 100',
    'Desk LTV (%)',
    // Portfolio
    'Y',
    'Calc',
    'For each [L2 LoB], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L2\' AND [segment_name]=[L2 LoB], THEN lookup [facility_id] in facility_master WHERE IS([lob_segment_id]) — including all child L3 segments via parent_segment_id traversal. For each [facility_id]: SUM(committed_facility_amt) / SUM(collateral_value) x 100',
    'Portfolio LTV (%)',
    // LoB
    'Y',
    'Calc',
    'For each [L1 LoB], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L1\' AND [segment_name]=[L1 LoB], THEN lookup [facility_id] in facility_master WHERE IS([lob_segment_id]) — including all descendant L2/L3 segments via recursive parent_segment_id traversal. For each [facility_id]: SUM(committed_facility_amt) / SUM(collateral_value) x 100',
    'LTV',
  ],

  // ── EAD (SUM rollup example — contrast with weighted avg) ──
  [
    'EAD',
    'Exposure at Default',
    'Estimated credit exposure if the counterparty defaults. For drawn facilities: outstanding balance. For undrawn: drawn + CCF * (committed - drawn). Fundamental input to Expected Loss (EL = PD x LGD x EAD) and regulatory capital calculations under Basel III IRB.',
    'drawn_amount + ccf * (committed_amount - drawn_amount)',
    'HYBRID',
    'CURRENCY',
    'LOWER_BETTER',
    'EL, CR',
    'Sum across children',
    '',
    'Basel III IRB, FR Y-14Q',
    '$#,##0.0M',
    // Facility
    'Y',
    'Calc',
    'For each DISTINCT(facility_id) THEN [drawn_amount] + [ccf] * ([committed_facility_amt] - [drawn_amount])',
    'Facility EAD ($)',
    // Counterparty
    'Y',
    'Agg',
    'For each [counterparty_id] THEN SUM(facility.ead) WHERE IS([counterparty_id])',
    'Counterparty EAD ($)',
    // Desk
    'Y',
    'Agg',
    'For each [L3 LoB], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]=\'L3\'. SUM(facility.ead) for all facilities WHERE IS([lob_segment_id])',
    'Desk EAD ($)',
    // Portfolio
    'Y',
    'Agg',
    'For each [L2 LoB], SUM(facility.ead) for all facilities under L2 segment including all child L3 segments via parent_segment_id traversal',
    'Portfolio EAD ($)',
    // LoB
    'Y',
    'Agg',
    'For each [L1 LoB], SUM(facility.ead) for all facilities under L1 department including all descendant L2/L3 segments via recursive parent_segment_id traversal',
    'LoB Total EAD ($)',
  ],

  // ── DSCR (weighted avg rollup, N/A at LoB) ──
  [
    'DSCR',
    'Debt Service Coverage Ratio',
    'Net Operating Income (NOI) or EBITDA divided by total debt service obligations. Measures borrower\'s ability to service debt from operating cash flow. Core CRE underwriting KPI — values below 1.0x indicate insufficient cash flow. Required in FR Y-14Q and CCAR stress testing.',
    'Cashflow / Total Debt Service',
    'CALCULATED',
    'RATIO',
    'HIGHER_BETTER',
    'FP, CR',
    'Exposure-weighted average',
    'BY_EAD',
    'CRE underwriting, CCAR, FR Y-14Q',
    '0.00x',
    // Facility
    'Y',
    'Calc',
    'For each DISTINCT(facility_id) THEN [noi] / [debt_service] from facility_financial_snapshot',
    'Facility DSCR',
    // Counterparty
    'Y',
    'Avg',
    'For each [counterparty_id] THEN SUM(facility.dscr * facility.gross_exposure_usd) / SUM(facility.gross_exposure_usd) WHERE IS([counterparty_id])',
    'Counterparty Wtd DSCR',
    // Desk
    'Y',
    'Avg',
    'For each [L3 LoB], SUM(facility.dscr * facility.gross_exposure_usd) / SUM(facility.gross_exposure_usd) for all facilities WHERE IS([lob_segment_id])',
    'Desk Wtd DSCR',
    // Portfolio
    'Y',
    'Avg',
    'For each [L2 LoB], SUM(facility.dscr * facility.gross_exposure_usd) / SUM(facility.gross_exposure_usd) for all facilities under L2 segment including child L3 segments',
    'Portfolio Wtd DSCR',
    // LoB
    'N',
    '',
    '',
    '',
  ],

  // ── PD (sourced metric, weighted avg rollup) ──
  [
    'PD',
    'Probability of Default',
    'Annualised probability that the obligor will default within 12 months. PD is inherently a counterparty-level attribute — all facilities under a single counterparty share the same PD. Sourced from internal rating model or counterparty_rating_observation. Basel III IRB regulatory floor is 0.03%.',
    'Model-assigned PD from rating scorecard',
    'SOURCED',
    'PERCENTAGE',
    'LOWER_BETTER',
    'CR',
    'EAD-weighted average',
    'BY_EAD',
    'Basel III IRB, CCAR',
    '0.00%',
    // Facility
    'Y',
    'Raw',
    'For each DISTINCT(facility_id) THEN COALESCE(stressed_pd_pct, counterparty_rating_observation.pd_pct) WHERE rating_source_id = \'INTERNAL\'. Basel floor: MAX(pd, 0.0003)',
    'Facility PD (%)',
    // Counterparty
    'Y',
    'Avg',
    'For each [counterparty_id] THEN SUM(facility.pd * facility.gross_exposure_usd) / SUM(facility.gross_exposure_usd) WHERE IS([counterparty_id])',
    'Counterparty Wtd PD (%)',
    // Desk
    'Y',
    'Avg',
    'For each [L3 LoB], SUM(facility.pd * facility.gross_exposure_usd) / SUM(facility.gross_exposure_usd) for all facilities WHERE IS([lob_segment_id])',
    'Desk Wtd PD (%)',
    // Portfolio
    'Y',
    'Avg',
    'For each [L2 LoB], SUM(facility.pd * facility.gross_exposure_usd) / SUM(facility.gross_exposure_usd) for all facilities under L2 segment including child L3 segments',
    'Portfolio Wtd PD (%)',
    // LoB
    'Y',
    'Avg',
    'For each [L1 LoB], SUM(facility.pd * facility.gross_exposure_usd) / SUM(facility.gross_exposure_usd) for all facilities under L1 department including all descendant segments',
    'LoB Wtd PD (%)',
  ],

  // ── Empty rows for user to fill ──
  ...Array.from({ length: 20 }, () => Array(metricsHeaders.length).fill('')),
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

const ingredientExamples: unknown[][] = [
  // LTV ingredient fields (modelled directly from catalogue.json)
  ['LTV', 1, 'L2', 'position', 'position_id', 'BIGINT', 'Individual exposure identifier — finest grain in the data model', '1'],
  ['LTV', 2, 'L2', 'position', 'facility_id', 'BIGINT', 'FK linking each position to its parent facility', '1'],
  ['LTV', 3, 'L2', 'position', 'balance_amount', 'DECIMAL(18,2)', 'Outstanding balance of the individual position/exposure', '35000000.00'],
  ['LTV', 4, 'L1', 'facility_master', 'facility_id', 'BIGINT', 'Primary key — grain of facility-level calculation', '12345'],
  ['LTV', 5, 'L1', 'facility_master', 'committed_facility_amt', 'DECIMAL(18,2)', 'Total authorized credit line — the committed limit', '50000000.00'],
  ['LTV', 6, 'L2', 'collateral_snapshot', 'valuation_amount', 'DECIMAL(18,2)', 'Raw collateral value (pre-haircut) as of the snapshot date', '75000000.00'],
  ['LTV', 7, 'L1', 'facility_master', 'counterparty_id', 'BIGINT', 'FK to counterparty — grouping key for counterparty-level rollup', '67890'],
  ['LTV', 8, 'L1', 'facility_master', 'lob_segment_id', 'BIGINT', 'FK to enterprise_business_taxonomy — desk/portfolio/lob resolution', '303'],
  ['LTV', 9, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'BIGINT', 'Hierarchy node ID — links facility to organizational segment', '303'],
  ['LTV', 10, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'BIGINT', 'Self-referential FK — traverses L3->L2->L1 hierarchy', '302'],
  ['LTV', 11, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'INT', 'Hierarchy depth (1=LoB, 2=Portfolio, 3=Desk)', '3'],
  ['LTV', 12, 'L1', 'enterprise_business_taxonomy', 'segment_name', 'VARCHAR(200)', 'Human-readable name of the desk/portfolio/lob', 'CRE Lending Desk'],

  // EAD ingredient fields
  ['EAD', 1, 'L2', 'facility_exposure_snapshot', 'drawn_amount', 'DECIMAL(18,2)', 'Current drawn balance', '5000000.00'],
  ['EAD', 2, 'L2', 'facility_exposure_snapshot', 'undrawn_amount', 'DECIMAL(18,2)', 'Undrawn commitment amount', '2000000.00'],
  ['EAD', 3, 'L1', 'facility_master', 'committed_facility_amt', 'DECIMAL(18,2)', 'Total authorized credit line', '7000000.00'],
  ['EAD', 4, 'L2', 'facility_risk_snapshot', 'ccf', 'DECIMAL(6,4)', 'Credit conversion factor for undrawn exposure', '0.45'],
  ['EAD', 5, 'L1', 'facility_master', 'counterparty_id', 'BIGINT', 'FK to counterparty', '67890'],
  ['EAD', 6, 'L1', 'facility_master', 'lob_segment_id', 'BIGINT', 'FK to enterprise_business_taxonomy', '303'],

  // DSCR ingredient fields
  ['DSCR', 1, 'L2', 'facility_financial_snapshot', 'noi', 'DECIMAL(18,2)', 'Net operating income', '1200000.00'],
  ['DSCR', 2, 'L2', 'facility_financial_snapshot', 'debt_service', 'DECIMAL(18,2)', 'Annual total debt service', '900000.00'],
  ['DSCR', 3, 'L2', 'facility_exposure_snapshot', 'gross_exposure_usd', 'DECIMAL(18,2)', 'Gross exposure — weighting basis for rollup', '5000000.00'],
  ['DSCR', 4, 'L1', 'facility_master', 'counterparty_id', 'BIGINT', 'FK to counterparty', '67890'],
  ['DSCR', 5, 'L1', 'facility_master', 'lob_segment_id', 'BIGINT', 'FK to enterprise_business_taxonomy', '303'],

  // PD ingredient fields
  ['PD', 1, 'L2', 'counterparty_rating_observation', 'pd_pct', 'DECIMAL(10,6)', 'Internal PD model output', '0.023400'],
  ['PD', 2, 'L2', 'counterparty_rating_observation', 'rating_source_id', 'VARCHAR(30)', 'Rating source — filter for INTERNAL', 'INTERNAL'],
  ['PD', 3, 'L1', 'counterparty', 'pd_annual', 'DECIMAL(10,6)', 'Fallback PD from counterparty master', '0.025000'],
  ['PD', 4, 'L2', 'facility_exposure_snapshot', 'gross_exposure_usd', 'DECIMAL(18,2)', 'Gross exposure — weighting basis for rollup', '5000000.00'],
  ['PD', 5, 'L1', 'facility_master', 'counterparty_id', 'BIGINT', 'FK to counterparty', '67890'],
  ['PD', 6, 'L1', 'facility_master', 'lob_segment_id', 'BIGINT', 'FK to enterprise_business_taxonomy', '303'],
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

const dimSrcExamples: unknown[][] = [
  // LTV — facility level
  ['LTV', 'facility', 1, 'L1', 'facility_master', 'committed_facility_amt', 'Committed limit'],
  ['LTV', 'facility', 2, 'L2', 'collateral_snapshot', 'valuation_amount', 'Collateral value'],
  ['LTV', 'facility', 3, 'L1', 'facility_master', 'facility_id', 'Primary key — grain of calculation'],

  // LTV — counterparty level
  ['LTV', 'counterparty', 1, 'L1', 'facility_master', 'committed_facility_amt', 'Committed limit'],
  ['LTV', 'counterparty', 2, 'L2', 'collateral_snapshot', 'valuation_amount', 'Collateral value'],
  ['LTV', 'counterparty', 3, 'L1', 'facility_master', 'counterparty_id', 'FK to counterparty — grouping key'],
  ['LTV', 'counterparty', 4, 'L1', 'facility_master', 'facility_id', 'Facility identifier for join'],

  // LTV — desk level
  ['LTV', 'desk', 1, 'L1', 'facility_master', 'committed_facility_amt', 'Committed limit'],
  ['LTV', 'desk', 2, 'L2', 'collateral_snapshot', 'valuation_amount', 'Collateral value'],
  ['LTV', 'desk', 3, 'L1', 'facility_master', 'lob_segment_id', 'FK to LoB taxonomy — desk resolution'],
  ['LTV', 'desk', 4, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'LoB hierarchy node — L3 leaf segment'],
  ['LTV', 'desk', 5, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Hierarchy depth — filter for L3'],
  ['LTV', 'desk', 6, 'L1', 'enterprise_business_taxonomy', 'segment_name', 'Desk name at L3 level'],

  // LTV — portfolio level
  ['LTV', 'portfolio', 1, 'L1', 'facility_master', 'committed_facility_amt', 'Committed limit'],
  ['LTV', 'portfolio', 2, 'L2', 'collateral_snapshot', 'valuation_amount', 'Collateral value'],
  ['LTV', 'portfolio', 3, 'L1', 'facility_master', 'lob_segment_id', 'FK to LoB taxonomy'],
  ['LTV', 'portfolio', 4, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'LoB hierarchy node — L2 parent segment'],
  ['LTV', 'portfolio', 5, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'Self-referential FK — traverse up from L3 to L2'],
  ['LTV', 'portfolio', 6, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Hierarchy depth — filter for L2'],

  // LTV — lob level
  ['LTV', 'lob', 1, 'L1', 'facility_master', 'committed_facility_amt', 'Committed limit'],
  ['LTV', 'lob', 2, 'L2', 'collateral_snapshot', 'valuation_amount', 'Collateral value'],
  ['LTV', 'lob', 3, 'L1', 'facility_master', 'lob_segment_id', 'FK to LoB taxonomy'],
  ['LTV', 'lob', 4, 'L1', 'enterprise_business_taxonomy', 'managed_segment_id', 'LoB hierarchy node — L1 root segment'],
  ['LTV', 'lob', 5, 'L1', 'enterprise_business_taxonomy', 'parent_segment_id', 'Self-referential FK — recursive traversal to collect all descendants'],
  ['LTV', 'lob', 6, 'L1', 'enterprise_business_taxonomy', 'tree_level', 'Hierarchy depth — filter for L1'],
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
console.log('Template written to', outputPath);
console.log('Sheets: Instructions, Metrics (4 examples + 20 blank rows), IngredientFields, DimensionSources');
