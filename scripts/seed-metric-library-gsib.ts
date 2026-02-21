/**
 * Seed Metric Library with GSIB-realistic data.
 * Writes: data/metric-library/*.json and sql/metric-library/02_SEED_GSIB.sql
 * Run: npx tsx scripts/seed-metric-library-gsib.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MetricDomain, ParentMetric, MetricVariant, LineageNodeRef } from '../lib/metric-library/types';

const ROOT = path.join(process.cwd());
const DATA_DIR = path.join(ROOT, 'data', 'metric-library');
const SQL_DIR = path.join(ROOT, 'sql', 'metric-library');

const effectiveDate = '2025-01-01';
const now = new Date().toISOString();

// ---------- Domains (8 GSIB domains) ----------
const DOMAINS: MetricDomain[] = [
  { domain_id: 'CQ', domain_name: 'Credit Quality', domain_description: 'PD, Rating, DSCR, LTV, Criticized', icon: 'BarChart3', color: '#1e40af', regulatory_relevance: ['FR Y-14Q', 'SNC', 'Interagency CRE'], primary_stakeholders: ['CRO', 'Credit Committee'] },
  { domain_id: 'EX', domain_name: 'Exposure', domain_description: 'Outstanding, Committed, Utilized, Undrawn, EAD', icon: 'Wallet', color: '#7c3aed', regulatory_relevance: ['FR Y-14Q', 'Basel SA'], primary_stakeholders: ['CRO', 'Treasury'] },
  { domain_id: 'PR', domain_name: 'Profitability', domain_description: 'Revenue, NIM, ROE, ROA, All-In Rate, Spread', icon: 'TrendingUp', color: '#059669', regulatory_relevance: ['Pillar 3', 'SEC'], primary_stakeholders: ['CFO', 'Desk Heads'] },
  { domain_id: 'LP', domain_name: 'Loss & Provision', domain_description: 'EL Rate, EL Dollar, LGD, CECL Allowance', icon: 'AlertTriangle', color: '#dc2626', regulatory_relevance: ['ASC 326', 'IFRS 9', 'FR Y-14Q'], primary_stakeholders: ['CFO', 'CRO'] },
  { domain_id: 'CA', domain_name: 'Capital', domain_description: 'RWA, Capital Allocated, Leverage Ratio', icon: 'Building2', color: '#b45309', regulatory_relevance: ['Basel III', 'FR Y-14Q', 'CCAR'], primary_stakeholders: ['CFO', 'Treasury'] },
  { domain_id: 'PC', domain_name: 'Pricing', domain_description: 'Spread, Fee Rate, All-In Rate, Pricing Exceptions', icon: 'Tag', color: '#0891b2', regulatory_relevance: ['SR 13-3', 'Pillar 3'], primary_stakeholders: ['Desk Heads', 'CRO'] },
  { domain_id: 'PO', domain_name: 'Portfolio Composition', domain_description: 'Tenor, Concentration, Collateral, Maturity', icon: 'Target', color: '#6d28d9', regulatory_relevance: ['FR Y-14Q', 'Concentration limits'], primary_stakeholders: ['CRO'] },
  { domain_id: 'EW', domain_name: 'Early Warning', domain_description: 'Rating Migration, PD Divergence, Utilization Trend, Amendment Activity', icon: 'Bell', color: '#e11d48', regulatory_relevance: ['SR 11-7', 'OCC Handbook'], primary_stakeholders: ['CRO', 'Special Assets'] },
];

// ---------- Parent metrics (canonical concepts) ----------
const PARENTS: ParentMetric[] = [
  { metric_id: 'PD', metric_name: 'Probability of Default (PD)', definition: 'The likelihood that a borrower will default on obligations within a specified time horizon. The most fundamental credit risk parameter — feeds EL, capital, pricing, and provisioning.', generic_formula: 'Model Output → Rating → Master Scale → PD', metric_class: 'SOURCED', unit_type: 'PERCENTAGE', direction: 'LOWER_BETTER', risk_appetite_relevant: true, rollup_philosophy: 'Weighted Average by EAD + Distribution by rating grade.', rollup_description: 'PD is an OBLIGOR-level attribute inherited by all facilities. At desk/portfolio/LoB we report EAD-weighted average and rating distribution.', domain_ids: ['CQ', 'LP'], regulatory_references: ['Basel IRB (BCBS 128)', 'SR 11-7', 'FR Y-14Q'] },
  { metric_id: 'DSCR', metric_name: 'Debt Service Coverage Ratio (DSCR)', definition: 'Measures a borrower\'s ability to service debt from operating cash flow. The most fundamental credit quality metric for income-producing lending.', generic_formula: 'Cash Flow / Debt Service', metric_class: 'CALCULATED', unit_type: 'RATIO', direction: 'HIGHER_BETTER', risk_appetite_relevant: true, rollup_philosophy: 'Exposure-Weighted Average + Distribution (% < 1.0x, 1.0–1.2x, 1.2–1.5x, >1.5x).', rollup_description: 'At facility: calculated per facility. At counterparty and above: exposure-weighted average plus distribution buckets for risk appetite.', domain_ids: ['CQ'], regulatory_references: ['Interagency CRE Guidance', 'FR Y-14Q', 'SNC', 'SR 13-3'] },
  { metric_id: 'LTV', metric_name: 'Loan to Value (LTV)', definition: 'Measures the relationship between the bank\'s exposure and the collateral value. The primary collateral coverage metric.', generic_formula: 'Exposure / Collateral Value', metric_class: 'CALCULATED', unit_type: 'PERCENTAGE', direction: 'LOWER_BETTER', risk_appetite_relevant: true, rollup_philosophy: 'Exposure-Weighted Average + Distribution by LTV bucket aligned with supervisory limits.', rollup_description: 'Per facility at facility level; EAD-weighted average and distribution at counterparty, desk, portfolio, LoB.', domain_ids: ['CQ'], regulatory_references: ['Interagency CRE Guidance', 'FDIC LTV limits', 'FR Y-14Q'] },
  { metric_id: 'LGD', metric_name: 'Loss Given Default (LGD)', definition: 'Expected percentage of EAD lost upon default after recovery. Drives EL, RWA, and CECL allowance.', generic_formula: '1 − Recovery Rate', metric_class: 'SOURCED', unit_type: 'PERCENTAGE', direction: 'LOWER_BETTER', risk_appetite_relevant: true, rollup_philosophy: 'EAD-weighted average; recovery model or historical by segment.', rollup_description: 'Obligor/collateral-level attribute; rolled up by EAD weight.', domain_ids: ['CQ', 'LP'], regulatory_references: ['Basel IRB', 'SR 11-7', 'FR Y-14Q'] },
  { metric_id: 'ALL_IN_RATE', metric_name: 'All-In Rate', definition: 'Total effective interest rate (base + spread + fees) earned on exposure. Core profitability and pricing metric.', generic_formula: 'Σ(Interest + Fees) / Average Exposure', metric_class: 'CALCULATED', unit_type: 'PERCENTAGE', direction: 'NEUTRAL', risk_appetite_relevant: false, rollup_philosophy: 'Exposure-weighted average at all levels.', rollup_description: 'Calculated at facility; exposure-weighted average at counterparty, desk, portfolio, LoB.', domain_ids: ['PR', 'PC'], regulatory_references: ['Pillar 3', 'SR 13-3'] },
  { metric_id: 'ROE', metric_name: 'Return on Equity (ROE)', definition: 'Net income attributable to segment as a percentage of allocated equity. Key performance metric for capital allocation.', generic_formula: 'Net Income / Allocated Equity', metric_class: 'CALCULATED', unit_type: 'PERCENTAGE', direction: 'HIGHER_BETTER', risk_appetite_relevant: false, rollup_philosophy: 'Sum income; equity allocated by methodology; ratio at each level.', rollup_description: 'Income and equity rolled by allocation rules; ratio computed at desk, portfolio, LoB.', domain_ids: ['PR'], regulatory_references: ['Pillar 3', 'SEC'] },
  { metric_id: 'EXPECTED_LOSS', metric_name: 'Expected Loss (EL)', definition: 'Probability-weighted credit loss (PD × LGD × EAD). Core risk and provisioning metric.', generic_formula: 'PD × LGD × EAD', metric_class: 'HYBRID', unit_type: 'CURRENCY', direction: 'LOWER_BETTER', risk_appetite_relevant: true, rollup_philosophy: 'Sum at facility/counterparty; sum or model at higher levels.', rollup_description: 'EL dollars sum from facility up; EL rate as EL/EAD at each level.', domain_ids: ['LP', 'CQ'], regulatory_references: ['Basel IRB', 'ASC 326', 'FR Y-14Q'] },
  { metric_id: 'UTILIZATION', metric_name: 'Utilization Rate', definition: 'Drawn exposure as a percentage of committed exposure. Key early warning and liquidity metric.', generic_formula: 'Drawn / Committed', metric_class: 'CALCULATED', unit_type: 'PERCENTAGE', direction: 'NEUTRAL', risk_appetite_relevant: true, rollup_philosophy: 'Exposure-weighted average or sum(drawn)/sum(committed).', rollup_description: 'Facility-level ratio; at higher levels either WAvg or ratio of sums.', domain_ids: ['EX', 'EW'], regulatory_references: ['FR Y-14Q', 'Liquidity monitoring'] },
  { metric_id: 'EAD', metric_name: 'Exposure at Default (EAD)', definition: 'Expected exposure at time of default. Drives RWA and EL; on- and off-balance-sheet.', generic_formula: 'Drawn + CCF × Undrawn (or model)', metric_class: 'CALCULATED', unit_type: 'CURRENCY', direction: 'NEUTRAL', risk_appetite_relevant: true, rollup_philosophy: 'Sum at all levels.', rollup_description: 'EAD sums from facility to LoB.', domain_ids: ['EX', 'LP'], regulatory_references: ['Basel IRB', 'FR Y-14Q'] },
  { metric_id: 'RWA', metric_name: 'Risk-Weighted Assets (RWA)', definition: 'Exposure weighted by regulatory risk weights. Basis for capital requirements.', generic_formula: 'Σ(EAD × Risk Weight)', metric_class: 'CALCULATED', unit_type: 'CURRENCY', direction: 'NEUTRAL', risk_appetite_relevant: true, rollup_philosophy: 'Sum at all levels.', rollup_description: 'RWA sums from facility to legal entity/LoB.', domain_ids: ['CA'], regulatory_references: ['Basel III', 'FR Y-14Q', 'CCAR'] },
  { metric_id: 'CONCENTRATION', metric_name: 'Concentration', definition: 'Exposure concentration by counterparty, industry, geography, or product. Single-name and sector limits.', generic_formula: 'Exposure / Portfolio or Limit', metric_class: 'CALCULATED', unit_type: 'PERCENTAGE', direction: 'LOWER_BETTER', risk_appetite_relevant: true, rollup_philosophy: 'Distribution and top-N at portfolio/LoB.', rollup_description: 'Concentration ratios and top exposures at desk, portfolio, LoB.', domain_ids: ['PO', 'CQ'], regulatory_references: ['FR Y-14Q', 'Large exposure limits'] },
  { metric_id: 'RATING_MIGRATION', metric_name: 'Rating Migration', definition: 'Movement of obligors across rating grades over time. Early warning and portfolio drift metric.', generic_formula: 'Count or % by from-rating → to-rating', metric_class: 'CALCULATED', unit_type: 'COUNT', direction: 'NEUTRAL', risk_appetite_relevant: true, rollup_philosophy: 'Migration matrix at portfolio/LoB; drill to desk/counterparty.', rollup_description: 'Aggregate migration matrices and deterioration rates.', domain_ids: ['EW', 'CQ'], regulatory_references: ['SR 11-7', 'OCC Handbook'] },
];

// ---------- Helper: base variant fields ----------
function v(
  variant_id: string,
  variant_name: string,
  parent_metric_id: string,
  variant_type: 'SOURCED' | 'CALCULATED',
  formula_display: string,
  detailed_description: string,
  opts: Partial<MetricVariant> = {}
): MetricVariant {
  const rollup: MetricVariant['rollup_logic'] = {
    facility: opts.rollup_logic?.facility ?? 'Native at facility.',
    counterparty: opts.rollup_logic?.counterparty ?? 'EAD-weighted average.',
    desk: opts.rollup_logic?.desk ?? 'EAD-weighted average + distribution.',
    portfolio: opts.rollup_logic?.portfolio ?? 'Same + trend.',
    lob: opts.rollup_logic?.lob ?? 'Same + cross-segment.',
  };
  return {
    variant_id,
    variant_name,
    parent_metric_id,
    variant_type,
    status: 'ACTIVE',
    version: 'v2.1',
    effective_date: effectiveDate,
    formula_display,
    detailed_description,
    rollup_logic: rollup,
    used_by_dashboards: opts.used_by_dashboards ?? [],
    used_by_reports: opts.used_by_reports ?? [],
    regulatory_references: opts.regulatory_references ?? [],
    validation_rules: opts.validation_rules ?? [],
    upstream_inputs: opts.upstream_inputs ?? [],
    downstream_consumers: opts.downstream_consumers ?? [],
    owner_team: opts.owner_team ?? 'Credit Risk Analytics',
    approver: opts.approver ?? 'Head of Credit Risk',
    review_cycle: opts.review_cycle ?? 'ANNUAL',
    companion_fields: opts.companion_fields,
    source_system: opts.source_system,
    refresh_frequency: opts.refresh_frequency,
    created_at: now,
    updated_at: now,
    ...opts,
  };
}

// ---------- Variants (GSIB-realistic, ~60) ----------
const VARIANTS: MetricVariant[] = [
  // PD
  v('PD_TTC_INTERNAL', 'TTC PD (Internal Rating)', 'PD', 'SOURCED', 'Scorecard → Rating Grade → Master Scale Lookup → TTC PD', 'Through-the-Cycle PD from internal credit rating system. Long-run average annual default probability.', { source_system: 'Internal Rating Engine → Risk Data Warehouse', refresh_frequency: 'Annual credit review (12–18 months)', used_by_dashboards: ['CRO Dashboard', 'Risk Appetite', 'Credit Committee'], used_by_reports: ['FR Y-14Q', 'Basel RWA', 'Pricing/RAROC'], regulatory_references: ['Basel IRB (BCBS 128)', 'SR 11-7', 'SR 98-18', 'FR Y-14Q'], validation_rules: [{ description: 'Range: 0.01% to 100%', severity: 'ERROR', rule_type: 'RANGE' }, { description: 'Basel floor ≥ 0.03% for corporate', severity: 'WARNING', rule_type: 'RANGE' }, { description: 'Staleness: pd_as_of_date within 15 months', severity: 'WARNING', rule_type: 'STALENESS' }], companion_fields: ['pd_rating_grade', 'pd_model_id', 'pd_master_scale_version', 'pd_as_of_date'], upstream_inputs: ['Internal Rating Scorecard', 'Master Scale', 'Credit Officer Override'], downstream_consumers: ['EL Rate', 'RWA', 'RAROC', 'WAvg PD (portfolio)'] }),
  v('PD_PIT_CECL_1Y', 'PIT PD (CECL 1-Year)', 'PD', 'SOURCED', 'PIT PD = Σ(PD_scenario × Weight) across macro scenarios', 'Point-in-Time 1-year PD reflecting current macroeconomic conditions. Scenario-weighted.', { source_system: 'CECL Provisioning Engine', refresh_frequency: 'Quarterly', used_by_dashboards: ['CFO CECL Dashboard', 'Allowance Committee'], used_by_reports: ['SEC Disclosures', 'Stage Classification'], regulatory_references: ['ASC 326 (CECL)', 'FR Y-14Q'], companion_fields: ['pd_cecl_scenario_weights', 'pd_pit_by_scenario'], upstream_inputs: ['CECL Macro Model', 'Scenario Weights'], downstream_consumers: ['CECL EL', 'Stage Classification', 'Allowance'] }),
  v('PD_REG_FLOORED', 'Regulatory PD (Basel Floored)', 'PD', 'SOURCED', 'Regulatory PD = MAX(Internal TTC PD, 0.03%) × Conservatism Scalar', 'TTC PD with Basel regulatory floors and conservatism adjustments. Drives RWA.', { source_system: 'Basel Capital Engine', refresh_frequency: 'Monthly/Quarterly (RWA cycle)', used_by_dashboards: ['RWA Dashboard', 'Capital Management'], used_by_reports: ['FR Y-14Q', 'Pillar 3'], regulatory_references: ['Basel III IRB', 'B3E Endgame'], validation_rules: [{ description: 'Regulatory PD ≥ Internal TTC PD', severity: 'ERROR' }, { description: 'Regulatory PD ≥ 0.03%', severity: 'ERROR' }] }),
  v('PD_VENDOR_EDF', 'Vendor PD (Moody\'s EDF)', 'PD', 'SOURCED', 'EDF = f(Equity Value, Volatility, Liabilities) — Merton model', 'Third-party market-implied PD from Moody\'s KMV. Benchmarking and challenger model.', { source_system: 'Moody\'s CreditEdge Feed', refresh_frequency: 'Daily', used_by_dashboards: ['Model Validation', 'Early Warning'], regulatory_references: ['SR 11-7 (challenger)', 'OCC Model Risk'] }),
  // DSCR — with L1/L2 lineage to show build from atomic data
  v('DSCR_CRE_NOI', 'CRE DSCR (NOI-Based)', 'DSCR', 'CALCULATED', 'DSCR = NOI / Annual Debt Service', 'Property-level Net Operating Income divided by annual debt service. For CRE income-producing facilities.', {
    used_by_dashboards: ['CRE Dashboard', 'CRO Overview'], used_by_reports: ['FR Y-14Q', 'SNC Exam'], regulatory_references: ['Interagency CRE Guidance', 'FR Y-14Q', 'SNC'],
    validation_rules: [{ description: 'Range: -5.0x to 50.0x', severity: 'ERROR' }, { description: 'DSCR < 1.0x AND non-criticized → investigate', severity: 'WARNING' }],
    companion_fields: ['noi_amount', 'debt_service_amount', 'financial_stmt_date'],
    numerator_field_refs: ['credit_spreading.noi_amount'], denominator_field_refs: ['credit_spreading.debt_service_amt'],
    upstream_inputs: [
      { node_id: 'l1-facility-dscr', node_name: 'Facility scope', node_type: 'FIELD', data_tier: 'L1', table: 'facility_master', field: 'facility_id', description: 'Facility and product scope for CRE' },
      { node_id: 'l2-noi', node_name: 'Net Operating Income', node_type: 'FIELD', data_tier: 'L2', table: 'credit_spreading', field: 'noi_amount', description: 'From spreading / financial statements' },
      { node_id: 'l2-debt-svc', node_name: 'Annual Debt Service', node_type: 'FIELD', data_tier: 'L2', table: 'credit_spreading', field: 'debt_service_amt', description: 'From servicing / credit agreement' },
    ] as LineageNodeRef[],
    downstream_consumers: ['WAvg DSCR (portfolio)', 'Risk Appetite', 'Criticized Analysis'],
  }),
  v('DSCR_CI_EBITDA', 'C&I DSCR (EBITDA)', 'DSCR', 'CALCULATED', 'DSCR = EBITDA / Total Debt Service (all borrower debt)', 'GAAP EBITDA divided by total borrower debt service. For C&I term loans.', { used_by_dashboards: ['C&I Dashboard', 'CRO Overview'], used_by_reports: ['FR Y-14Q'], regulatory_references: ['OCC Handbook', 'FR Y-14Q'], companion_fields: ['ebitda_amount', 'total_debt_service'], upstream_inputs: ['EBITDA (from spreading)', 'Total Debt Service'], downstream_consumers: ['WAvg DSCR', 'Leverage Analysis'] }),
  v('DSCR_CI_ADJEB', 'C&I DSCR (Adjusted EBITDA)', 'DSCR', 'CALCULATED', 'DSCR = Adjusted EBITDA / Total Fixed Charges', 'Adjusted EBITDA with approved add-backs. For leveraged lending.', { used_by_dashboards: ['Leveraged Lending Dashboard'], used_by_reports: ['SR 13-3 Monitoring'], regulatory_references: ['SR 13-3', 'Interagency Leveraged Lending'], validation_rules: [{ description: 'Add-back ratio > 30% of GAAP EBITDA → flag', severity: 'WARNING' }] }),
  v('DSCR_COVENANT', 'Covenant DSCR (Per Agreement)', 'DSCR', 'CALCULATED', 'Per credit agreement — facility-specific definitions', 'DSCR as defined in the specific credit agreement. Covenant compliance.', { used_by_dashboards: ['Covenant Compliance', 'Workout/Special Assets'], regulatory_references: ['SR 13-3', 'OCC Handbook (Workouts)'], companion_fields: ['covenant_minimum', 'covenant_headroom', 'compliance_status'] }),
  v('DSCR_STRESSED', 'Stressed DSCR (Scenario)', 'DSCR', 'CALCULATED', 'Stressed Cash Flow / Stressed Debt Service per macro scenario', 'DSCR projected under CCAR/DFAST stress scenarios.', { source_system: 'Stress Testing Platform', refresh_frequency: 'Semi-annual (CCAR)', used_by_dashboards: ['CCAR Submission', 'Capital Planning'], regulatory_references: ['CCAR/DFAST', 'SR 15-18'], companion_fields: ['scenario_id', 'stress_horizon'] }),
  // LTV — L1/L2 lineage
  v('LTV_CRE_OUT', 'CRE LTV (Outstanding)', 'LTV', 'CALCULATED', 'Outstanding / Appraised Value × 100', 'Current funded balance vs most recent appraisal.', {
    used_by_dashboards: ['CRE Dashboard'], used_by_reports: ['FR Y-14Q', 'Regulatory LTV Compliance'], regulatory_references: ['Interagency CRE Guidance', 'FDIC LTV limits'],
    validation_rules: [{ description: 'Range: 0–200%', severity: 'ERROR' }, { description: 'Appraisal > 24 months → stale', severity: 'WARNING' }],
    companion_fields: ['appraised_value', 'appraisal_date', 'valuation_type'],
    numerator_field_refs: ['position_detail.balance_amount'], denominator_field_refs: ['collateral_valuation.appraised_value'],
    upstream_inputs: [
      { node_id: 'l2-outstanding', node_name: 'Outstanding Balance', node_type: 'FIELD', data_tier: 'L2', table: 'position_detail', field: 'balance_amount', description: 'Current drawn exposure' },
      { node_id: 'l1-appraisal', node_name: 'Appraised Value', node_type: 'FIELD', data_tier: 'L1', table: 'collateral_valuation', field: 'appraised_value', description: 'Most recent appraisal' },
    ] as LineageNodeRef[],
    downstream_consumers: ['LGD Estimation', 'Risk Appetite', 'Regulatory Compliance'],
  }),
  v('LTV_CRE_COMMITTED', 'CRE LTV (Committed)', 'LTV', 'CALCULATED', 'Committed / Appraised Value × 100', 'Committed exposure vs collateral value. Used at origination and limit monitoring.', { used_by_dashboards: ['CRE Dashboard', 'Origination'], regulatory_references: ['Interagency CRE Guidance'] }),
  // LGD
  v('LGD_IRB', 'LGD (IRB Model)', 'LGD', 'SOURCED', 'Collateral model + recovery curve → LGD', 'Internal LGD from IRB models. Facility/collateral-level.', { source_system: 'Basel Capital Engine / Risk Data Warehouse', refresh_frequency: 'Quarterly', used_by_dashboards: ['CRO Dashboard', 'RWA'], used_by_reports: ['FR Y-14Q', 'Pillar 3'], regulatory_references: ['Basel IRB', 'SR 11-7'], companion_fields: ['lgd_model_id', 'recovery_rate', 'collateral_type'] }),
  v('LGD_STANDARD', 'LGD (Standardized)', 'LGD', 'SOURCED', 'Supervisory LGD by asset class', 'Regulatory standard LGD for SA book.', { source_system: 'Regulatory Reporting Engine', refresh_frequency: 'Monthly', regulatory_references: ['Basel SA'] }),
  // ALL_IN_RATE
  v('ALL_IN_RATE_WAVG', 'All-In Rate (Exposure-Weighted)', 'ALL_IN_RATE', 'CALCULATED', 'Σ(All-In Rate × EAD) / Σ(EAD)', 'Portfolio exposure-weighted all-in yield.', { used_by_dashboards: ['Pricing Dashboard', 'NIM Report'], used_by_reports: ['Pillar 3'], rollup_logic: { facility: 'Per facility (interest + fees / avg balance).', counterparty: 'EAD-weighted average.', desk: 'EAD-weighted average.', portfolio: 'EAD-weighted average.', lob: 'EAD-weighted average.' } }),
  v('ALL_IN_RATE_COMMITTED', 'All-In Rate (Committed-Weighted)', 'ALL_IN_RATE', 'CALCULATED', 'Σ(Rate × Committed) / Σ(Committed)', 'Committed-weighted all-in rate for pipeline and limit view.', { used_by_dashboards: ['Pricing Dashboard'] }),
  // ROE
  v('ROE_RAROC', 'ROE (RAROC)', 'ROE', 'CALCULATED', 'Net Income / Capital Allocated (RAROC)', 'Return on risk-adjusted capital. Primary performance metric for desks.', { used_by_dashboards: ['Desk P&L', 'Board Reporting'], used_by_reports: ['Pillar 3'], regulatory_references: ['Pillar 3'] }),
  // EXPECTED_LOSS — L2 + L3 inputs (PD/LGD/EAD are L3 or sourced)
  v('EL_ANNUAL', 'Expected Loss (Annual)', 'EXPECTED_LOSS', 'CALCULATED', 'EL = PD × LGD × EAD', 'One-year expected loss from PD, LGD, EAD.', {
    used_by_dashboards: ['CRO Dashboard', 'Risk Appetite'], used_by_reports: ['FR Y-14Q'], regulatory_references: ['Basel IRB', 'FR Y-14Q'],
    upstream_inputs: [
      { node_id: 'l3-pd', node_name: 'PD', node_type: 'METRIC_VARIANT', data_tier: 'L3', description: 'Probability of default (TTC or PIT)' },
      { node_id: 'l3-lgd', node_name: 'LGD', node_type: 'METRIC_VARIANT', data_tier: 'L3', description: 'Loss given default' },
      { node_id: 'l2-ead', node_name: 'EAD', node_type: 'FIELD', data_tier: 'L2', table: 'position_detail', field: 'ead_amt', description: 'Exposure at default (or from EAD metric)' },
    ] as LineageNodeRef[],
    downstream_consumers: ['CECL Allowance', 'RAROC', 'Pricing'],
  }),
  v('EL_CECL_LIFETIME', 'Expected Loss (CECL Lifetime)', 'EXPECTED_LOSS', 'CALCULATED', 'Lifetime EL = Σ(PD_t × LGD × EAD_t)', 'CECL lifetime expected loss. Drives allowance.', { source_system: 'CECL Provisioning Engine', refresh_frequency: 'Quarterly', used_by_dashboards: ['CFO CECL Dashboard'], regulatory_references: ['ASC 326'], upstream_inputs: ['PIT PD term structure', 'LGD', 'EAD'], downstream_consumers: ['CECL Allowance'] }),
  // UTILIZATION — L1/L2 lineage
  v('UTIL_FACILITY', 'Utilization (Facility)', 'UTILIZATION', 'CALCULATED', 'Outstanding / Committed × 100', 'Facility-level utilization. Core early warning metric.', {
    used_by_dashboards: ['Portfolio Dashboard', 'Early Warning'], used_by_reports: ['FR Y-14Q'], regulatory_references: ['FR Y-14Q'],
    numerator_field_refs: ['position_detail.balance_amount'], denominator_field_refs: ['facility_master.committed_amt'],
    upstream_inputs: [
      { node_id: 'l2-out-util', node_name: 'Outstanding', node_type: 'FIELD', data_tier: 'L2', table: 'position_detail', field: 'balance_amount', description: 'Current drawn' },
      { node_id: 'l1-comm-util', node_name: 'Committed', node_type: 'FIELD', data_tier: 'L1', table: 'facility_master', field: 'committed_amt', description: 'Facility commitment' },
    ] as LineageNodeRef[],
    downstream_consumers: ['Concentration', 'Liquidity Monitoring'],
  }),
  v('UTIL_COUNTERPARTY', 'Utilization (Counterparty)', 'UTILIZATION', 'CALCULATED', 'Σ(Outstanding) / Σ(Committed) per counterparty', 'Counterparty-level utilization across all facilities.', { used_by_dashboards: ['Counterparty Risk', 'Early Warning'] }),
  // EAD — L1/L2 lineage
  v('EAD_DRAWN_CCF', 'EAD (Drawn + CCF × Undrawn)', 'EAD', 'CALCULATED', 'EAD = Drawn + CCF × Undrawn', 'Standard regulatory EAD for credit lines.', {
    used_by_dashboards: ['Exposure Dashboard', 'RWA'], used_by_reports: ['FR Y-14Q'], regulatory_references: ['Basel IRB'],
    upstream_inputs: [
      { node_id: 'l2-drawn', node_name: 'Drawn Amount', node_type: 'FIELD', data_tier: 'L2', table: 'position_detail', field: 'drawn_amt', description: 'Current funded balance' },
      { node_id: 'l2-undrawn', node_name: 'Undrawn Amount', node_type: 'FIELD', data_tier: 'L2', table: 'position_detail', field: 'undrawn_amt', description: 'Available to draw' },
      { node_id: 'l1-ccf', node_name: 'Credit Conversion Factor', node_type: 'FIELD', data_tier: 'L1', table: 'facility_master', field: 'ccf_pct', description: 'Regulatory CCF by product' },
    ] as LineageNodeRef[],
    downstream_consumers: ['RWA', 'EL', 'Concentration'],
  }),
  v('EAD_SA', 'EAD (Standardized)', 'EAD', 'CALCULATED', 'EAD per Basel SA rules', 'Exposure at default for standardized approach.', { source_system: 'Regulatory Reporting Engine', regulatory_references: ['Basel SA'] }),
  // RWA
  v('RWA_IRB', 'RWA (IRB)', 'RWA', 'CALCULATED', 'RWA = f(EAD, PD, LGD, M)', 'Risk-weighted assets under IRB approach.', { used_by_dashboards: ['Capital Dashboard', 'RWA Report'], used_by_reports: ['FR Y-14Q', 'Pillar 3', 'CCAR'], regulatory_references: ['Basel III IRB', 'FR Y-14Q'], upstream_inputs: ['EAD', 'PD', 'LGD', 'Maturity'], downstream_consumers: ['Capital Ratio', 'Pillar 3'] }),
  v('RWA_SA', 'RWA (Standardized)', 'RWA', 'CALCULATED', 'RWA = EAD × Supervisory Risk Weight', 'Risk-weighted assets under standardized approach.', { regulatory_references: ['Basel SA'] }),
  // CONCENTRATION
  v('CONC_SINGLE_NAME', 'Single-Name Concentration', 'CONCENTRATION', 'CALCULATED', 'Counterparty EAD / Total Portfolio EAD × 100', 'Largest single-name exposures as % of portfolio.', { used_by_dashboards: ['Concentration Dashboard', 'CRO'], used_by_reports: ['FR Y-14Q'], regulatory_references: ['Large exposure limits', 'FR Y-14Q'], validation_rules: [{ description: 'Flag when > 10% of portfolio', severity: 'WARNING' }] }),
  v('CONC_INDUSTRY', 'Industry Concentration', 'CONCENTRATION', 'CALCULATED', 'Industry EAD / Total EAD × 100', 'Exposure concentration by industry (NAICS/SIC).', { used_by_dashboards: ['Concentration Dashboard'], regulatory_references: ['FR Y-14Q'] }),
  // RATING_MIGRATION
  v('RATING_MIG_MATRIX', 'Rating Migration Matrix', 'RATING_MIGRATION', 'CALCULATED', 'Count or % by from-rating → to-rating', 'Migration matrix: counts and rates by rating grade.', { used_by_dashboards: ['Portfolio Quality', 'Early Warning'], regulatory_references: ['SR 11-7', 'OCC Handbook'], upstream_inputs: ['Rating history', 'Master Scale'], downstream_consumers: ['PD calibration', 'Stress testing'] }),
];

// ---------- Write JSON files ----------
function writeJsonFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const parentsWithCount = PARENTS.map((p) => ({
    ...p,
    variant_count: VARIANTS.filter((v) => v.parent_metric_id === p.metric_id).length,
  }));
  fs.writeFileSync(path.join(DATA_DIR, 'domains.json'), JSON.stringify(DOMAINS, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'parent-metrics.json'), JSON.stringify(parentsWithCount, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'variants.json'), JSON.stringify(VARIANTS, null, 2));
  console.log('Wrote data/metric-library/domains.json, parent-metrics.json, variants.json');
}

// ---------- Escape for SQL ----------
function sqlStr(s: string): string {
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function sqlJson(arr: unknown): string {
  return sqlStr(JSON.stringify(arr ?? []));
}

// ---------- Write SQL seed ----------
function writeSqlSeed() {
  if (!fs.existsSync(SQL_DIR)) fs.mkdirSync(SQL_DIR, { recursive: true });
  const lines: string[] = [
    '-- ============================================================',
    '-- Metric Library — GSIB seed data',
    '-- Run after 01_DDL.sql. Target: PostgreSQL.',
    '-- ============================================================',
    '',
    'TRUNCATE metric_library.metric_variants, metric_library.parent_metrics, metric_library.domains CASCADE;',
    '',
  ];

  for (const d of DOMAINS) {
    lines.push(`INSERT INTO metric_library.domains (domain_id, domain_name, domain_description, icon, color, regulatory_relevance, primary_stakeholders)`);
    lines.push(`VALUES (${sqlStr(d.domain_id)}, ${sqlStr(d.domain_name)}, ${sqlStr(d.domain_description ?? '')}, ${sqlStr(d.icon ?? '')}, ${sqlStr(d.color ?? '')}, ${sqlJson(d.regulatory_relevance)}, ${sqlJson(d.primary_stakeholders)});`);
    lines.push('');
  }

  for (const p of PARENTS) {
    lines.push(`INSERT INTO metric_library.parent_metrics (metric_id, metric_name, definition, generic_formula, metric_class, unit_type, direction, risk_appetite_relevant, rollup_philosophy, rollup_description, domain_ids, variant_count, regulatory_references)`);
    const cnt = VARIANTS.filter((v) => v.parent_metric_id === p.metric_id).length;
    lines.push(`VALUES (${sqlStr(p.metric_id)}, ${sqlStr(p.metric_name)}, ${sqlStr(p.definition)}, ${sqlStr(p.generic_formula ?? '')}, ${sqlStr(p.metric_class)}, ${sqlStr(p.unit_type)}, ${sqlStr(p.direction)}, ${p.risk_appetite_relevant}, ${sqlStr(p.rollup_philosophy ?? '')}, ${sqlStr(p.rollup_description ?? '')}, ${sqlJson(p.domain_ids)}, ${cnt}, ${sqlJson(p.regulatory_references ?? [])});`);
    lines.push('');
  }

  for (const v of VARIANTS) {
    lines.push(`INSERT INTO metric_library.metric_variants (variant_id, variant_name, parent_metric_id, variant_type, status, version, effective_date, formula_display, detailed_description, rollup_logic, used_by_dashboards, used_by_reports, regulatory_references, validation_rules, upstream_inputs, downstream_consumers, owner_team, approver, review_cycle, companion_fields, source_system, refresh_frequency)`);
    lines.push(`VALUES (${sqlStr(v.variant_id)}, ${sqlStr(v.variant_name)}, ${sqlStr(v.parent_metric_id)}, ${sqlStr(v.variant_type)}, ${sqlStr(v.status)}, ${sqlStr(v.version)}, ${sqlStr(v.effective_date)}, ${sqlStr(v.formula_display)}, ${sqlStr(v.detailed_description ?? '')}, ${sqlJson(v.rollup_logic)}, ${sqlJson(v.used_by_dashboards)}, ${sqlJson(v.used_by_reports)}, ${sqlJson(v.regulatory_references)}, ${sqlJson(v.validation_rules)}, ${sqlJson(v.upstream_inputs)}, ${sqlJson(v.downstream_consumers)}, ${sqlStr(v.owner_team ?? '')}, ${sqlStr(v.approver ?? '')}, ${sqlStr(v.review_cycle ?? '')}, ${sqlJson(v.companion_fields)}, ${v.source_system ? sqlStr(v.source_system) : 'NULL'}, ${v.refresh_frequency ? sqlStr(v.refresh_frequency) : 'NULL'});`);
    lines.push('');
  }

  fs.writeFileSync(path.join(SQL_DIR, '02_SEED_GSIB.sql'), lines.join('\n'));
  console.log('Wrote sql/metric-library/02_SEED_GSIB.sql');
}

// ---------- Main ----------
function main() {
  writeJsonFiles();
  writeSqlSeed();
  console.log('Done. Metric Library seeded with', DOMAINS.length, 'domains,', PARENTS.length, 'parent metrics,', VARIANTS.length, 'variants.');
}

main();
