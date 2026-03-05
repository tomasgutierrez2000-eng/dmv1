import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';

const ALL_DIMS: CalculationDimension[] = ['facility', 'counterparty', 'L3', 'L2', 'L1'];

const DIM_GROUP_EXPR: Record<CalculationDimension, string> = {
  facility: 'fes.facility_id',
  counterparty: 'fes.counterparty_id',
  // Desk/Portfolio/Department resolve through enterprise business taxonomy.
  L3: "COALESCE(ebt.segment_name, 'Unmapped Desk')",
  L2: "COALESCE(ebt_parent.segment_name, ebt.segment_name, 'Unmapped Portfolio')",
  L1: "COALESCE(ebt_root.segment_name, ebt_parent.segment_name, ebt.segment_name, 'Unmapped Department')",
};

const TAXONOMY_JOINS =
  " LEFT JOIN L1.enterprise_business_taxonomy ebt ON ebt.managed_segment_id = fm.lob_segment_id" +
  " LEFT JOIN L1.enterprise_business_taxonomy ebt_parent ON ebt_parent.managed_segment_id = ebt.parent_segment_id" +
  " LEFT JOIN L1.enterprise_business_taxonomy ebt_root ON ebt_root.managed_segment_id = ebt_parent.parent_segment_id";

function buildGroupedFormula(
  baseFormula: string,
  metricExpr: string,
  fromAndJoin: string,
  where: string
): L3Metric['formulasByDimension'] {
  const out: NonNullable<L3Metric['formulasByDimension']> = {};
  for (const dim of ALL_DIMS) {
    const groupExpr = DIM_GROUP_EXPR[dim];
    out[dim] = {
      formula: `${baseFormula} GROUP BY ${groupExpr}`,
      formulaSQL: `SELECT ${groupExpr} AS dimension_value, ${metricExpr} AS metric_value ${fromAndJoin}${TAXONOMY_JOINS} ${where} GROUP BY ${groupExpr}`,
    };
  }
  return out;
}

export const DEEP_DIVE_SEED_METRICS: L3Metric[] = [
  ({
    id: 'C100',
    name: 'Weighted Average Spread (%)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'SUM(spread_bps * drawn_amount) / SUM(drawn_amount) / 100',
    description: 'Weighted average spread from facility pricing and exposure, calculated across hierarchy levels.',
    displayFormat: '0.00%',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'facility_pricing_snapshot', field: 'spread_bps' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount' },
      { layer: 'L1', table: 'facility_master', field: 'portfolio_id' },
      { layer: 'L1', table: 'facility_master', field: 'lob_segment_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    displayNameByDimension: {
      facility: 'Facility Spread (%)',
      counterparty: 'Counterparty Weighted Avg Spread (%)',
      L3: 'L3 Desk Weighted Avg Spread (%)',
      L2: 'L2 Portfolio Weighted Avg Spread (%)',
      L1: 'L1 Department Weighted Avg Spread (%)',
    },
    formulasByDimension: buildGroupedFormula(
      'SUM((spread_bps / 100.0) * drawn_amount) / NULLIF(SUM(drawn_amount), 0)',
      'SUM((fps.spread_bps / 100.0) * fes.drawn_amount) / NULLIF(SUM(fes.drawn_amount), 0)',
      'FROM L2.facility_exposure_snapshot fes JOIN L2.facility_pricing_snapshot fps ON fps.facility_id = fes.facility_id AND fps.as_of_date = fes.as_of_date LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id',
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C101',
    name: 'DSCR (Debt Service Coverage Ratio)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'SUM(dscr_value * outstanding_exposure) / SUM(outstanding_exposure)',
    description: 'Exposure-weighted DSCR across hierarchy levels.',
    displayFormat: '0.00x',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'facility_financial_snapshot', field: 'noi_amt' },
      { layer: 'L2', table: 'facility_financial_snapshot', field: 'total_debt_service_amt' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    formulasByDimension: buildGroupedFormula(
      'SUM((noi_amt / NULLIF(total_debt_service_amt, 0)) * gross_exposure_usd) / NULLIF(SUM(CASE WHEN total_debt_service_amt > 0 THEN gross_exposure_usd ELSE 0 END), 0)',
      'SUM((ffs.noi_amt / NULLIF(ffs.total_debt_service_amt, 0)) * fes.gross_exposure_usd) / NULLIF(SUM(CASE WHEN ffs.total_debt_service_amt > 0 THEN fes.gross_exposure_usd ELSE 0 END), 0)',
      "FROM L2.facility_exposure_snapshot fes LEFT JOIN L2.facility_financial_snapshot ffs ON ffs.facility_id = fes.facility_id AND ffs.as_of_date = fes.as_of_date LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id",
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C102',
    name: 'Outstanding Exposure ($)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Aggregate',
    formula: 'SUM(gross_exposure_usd)',
    description: 'Total outstanding exposure aggregated at each hierarchy level.',
    displayFormat: '$#,##0.0M',
    sampleValue: '—',
    sourceFields: [{ layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' }],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    formulasByDimension: buildGroupedFormula(
      'SUM(gross_exposure_usd)',
      'SUM(fes.gross_exposure_usd)',
      'FROM L2.facility_exposure_snapshot fes LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id',
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C103',
    name: 'Utilized Exposure ($)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Aggregate',
    formula: 'SUM(drawn_amount)',
    description: 'Total utilized/drawn exposure aggregated at each hierarchy level.',
    displayFormat: '$#,##0.0M',
    sampleValue: '—',
    sourceFields: [{ layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount' }],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    formulasByDimension: buildGroupedFormula(
      'SUM(drawn_amount)',
      'SUM(fes.drawn_amount)',
      'FROM L2.facility_exposure_snapshot fes LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id',
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C104',
    name: 'LTV (Loan-to-Value %)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'SUM(ltv_pct * committed_amount) / SUM(committed_amount)',
    description: 'Weighted average LTV by committed facility amount across hierarchy levels.',
    displayFormat: '0.00%',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount' },
      { layer: 'L2', table: 'collateral_snapshot', field: 'current_valuation_usd' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'committed_amount' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    formulasByDimension: buildGroupedFormula(
      'SUM((drawn_amount / NULLIF(collateral_value, 0)) * committed_amount) / NULLIF(SUM(CASE WHEN collateral_value > 0 THEN committed_amount ELSE 0 END), 0)',
      'SUM((fes.drawn_amount / NULLIF(cs.collateral_value_usd, 0)) * fes.committed_amount) / NULLIF(SUM(CASE WHEN cs.collateral_value_usd > 0 THEN fes.committed_amount ELSE 0 END), 0)',
      "FROM L2.facility_exposure_snapshot fes LEFT JOIN (SELECT facility_id, as_of_date, SUM(current_valuation_usd) AS collateral_value_usd FROM L2.collateral_snapshot GROUP BY facility_id, as_of_date) cs ON cs.facility_id = fes.facility_id AND cs.as_of_date = fes.as_of_date LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id",
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C105',
    name: 'Probability of Default (PD %)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'SUM(pd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0)',
    description: 'Exposure-weighted PD across hierarchy levels.',
    displayFormat: '0.00%',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'financial_metric_observation', field: 'metric_value' },
      { layer: 'L2', table: 'financial_metric_observation', field: 'metric_code' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    formulasByDimension: buildGroupedFormula(
      'SUM(pd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0)',
      'SUM(CAST(fmo.metric_value AS REAL) * fes.gross_exposure_usd) / NULLIF(SUM(fes.gross_exposure_usd), 0)',
      "FROM L2.facility_exposure_snapshot fes JOIN L2.financial_metric_observation fmo ON fmo.facility_id = fes.facility_id AND fmo.as_of_date = fes.as_of_date AND fmo.metric_code = 'PD' LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id",
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C106',
    name: 'Loss Given Default (LGD %)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'SUM(lgd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0)',
    description: 'Exposure-weighted LGD across hierarchy levels.',
    displayFormat: '0.00%',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'financial_metric_observation', field: 'metric_value' },
      { layer: 'L2', table: 'financial_metric_observation', field: 'metric_code' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    formulasByDimension: buildGroupedFormula(
      'SUM(lgd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0)',
      'SUM(CAST(fmo.metric_value AS REAL) * fes.gross_exposure_usd) / NULLIF(SUM(fes.gross_exposure_usd), 0)',
      "FROM L2.facility_exposure_snapshot fes JOIN L2.financial_metric_observation fmo ON fmo.facility_id = fes.facility_id AND fmo.as_of_date = fes.as_of_date AND fmo.metric_code = 'LGD' LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id",
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C107',
    name: 'Expected Loss ($)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Derived',
    formula: 'SUM((pd_pct / 100) * (lgd_pct / 100) * ead_amt)',
    description: 'Expected loss aggregated across hierarchy levels.',
    displayFormat: '$#,##0.0M',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'financial_metric_observation', field: 'metric_value' },
      { layer: 'L2', table: 'financial_metric_observation', field: 'metric_code' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    formulasByDimension: buildGroupedFormula(
      'SUM(expected_loss_usd)',
      'SUM((COALESCE(CAST(pd.metric_value AS REAL), 0) / 100.0) * (COALESCE(CAST(lgd.metric_value AS REAL), 0) / 100.0) * fes.gross_exposure_usd)',
      "FROM L2.facility_exposure_snapshot fes LEFT JOIN L2.financial_metric_observation pd ON pd.facility_id = fes.facility_id AND pd.as_of_date = fes.as_of_date AND pd.metric_code = 'PD' LEFT JOIN L2.financial_metric_observation lgd ON lgd.facility_id = fes.facility_id AND lgd.as_of_date = fes.as_of_date AND lgd.metric_code = 'LGD' LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id",
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C108',
    name: 'Interest Income ($)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Aggregate',
    formula: 'SUM(drawn_amount * all_in_rate_pct / 100)',
    description: 'Annualized gross interest income — drawn balance times all-in rate — summed across hierarchy levels.',
    displayFormat: '$#,##0',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount' },
      { layer: 'L2', table: 'facility_pricing_snapshot', field: 'all_in_rate_pct' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
      { layer: 'L1', table: 'facility_master', field: 'lob_segment_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    displayNameByDimension: {
      facility: 'Facility Interest Income ($)',
      counterparty: 'Counterparty Interest Income ($)',
      L3: 'L3 Desk Interest Income ($)',
      L2: 'L2 Portfolio Interest Income ($)',
      L1: 'L1 Department Interest Income ($)',
    },
    formulasByDimension: buildGroupedFormula(
      'SUM(drawn_amount * all_in_rate_pct / 100)',
      'SUM(fes.drawn_amount * fps.all_in_rate_pct / 100)',
      'FROM L2.facility_exposure_snapshot fes JOIN L2.facility_pricing_snapshot fps ON fps.facility_id = fes.facility_id AND fps.as_of_date = fes.as_of_date LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id',
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C109',
    name: 'Interest Expense ($)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Aggregate',
    formula: 'SUM(drawn_amount * cost_of_funds_pct / 100)',
    description: 'Annualized gross interest expense — drawn balance times FTP cost-of-funds rate — summed across hierarchy levels.',
    displayFormat: '$#,##0',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount' },
      { layer: 'L2', table: 'facility_pricing_snapshot', field: 'cost_of_funds_pct' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
      { layer: 'L1', table: 'facility_master', field: 'lob_segment_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    displayNameByDimension: {
      facility: 'Facility Interest Expense ($)',
      counterparty: 'Counterparty Interest Expense ($)',
      L3: 'L3 Desk Interest Expense ($)',
      L2: 'L2 Portfolio Interest Expense ($)',
      L1: 'L1 Department Interest Expense ($)',
    },
    formulasByDimension: buildGroupedFormula(
      'SUM(drawn_amount * cost_of_funds_pct / 100)',
      'SUM(fes.drawn_amount * fps.cost_of_funds_pct / 100)',
      'FROM L2.facility_exposure_snapshot fes JOIN L2.facility_pricing_snapshot fps ON fps.facility_id = fes.facility_id AND fps.as_of_date = fes.as_of_date LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id',
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  ({
    id: 'C110',
    name: 'Risk Rating Migration Score',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'SUM((rating_value - prior_rating_value) * gross_exposure_usd) / NULLIF(SUM(gross_exposure_usd), 0)',
    description: 'Exposure-weighted average notch change in internal credit risk ratings. Positive = deterioration, negative = improvement.',
    displayFormat: '+0.00',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'counterparty_rating_observation', field: 'rating_value' },
      { layer: 'L2', table: 'counterparty_rating_observation', field: 'prior_rating_value' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
      { layer: 'L1', table: 'facility_master', field: 'lob_segment_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    displayNameByDimension: {
      facility: 'Facility Migration Score',
      counterparty: 'Counterparty Migration Score',
      L3: 'L3 Desk Migration Score',
      L2: 'L2 Portfolio Migration Score',
      L1: 'L1 Department Migration Score',
    },
    formulasByDimension: buildGroupedFormula(
      'SUM((rating_value - prior_rating_value) * gross_exposure_usd) / NULLIF(SUM(CASE WHEN prior_rating_value IS NOT NULL THEN gross_exposure_usd ELSE 0 END), 0)',
      "SUM((CAST(cro.rating_value AS REAL) - CAST(cro.prior_rating_value AS REAL)) * fes.gross_exposure_usd) / NULLIF(SUM(CASE WHEN cro.prior_rating_value IS NOT NULL THEN fes.gross_exposure_usd ELSE 0 END), 0)",
      "FROM L2.facility_exposure_snapshot fes LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id LEFT JOIN L2.counterparty_rating_observation cro ON cro.counterparty_id = fm.counterparty_id AND cro.as_of_date = fes.as_of_date AND cro.rating_type = 'INTERNAL'",
      'WHERE fes.as_of_date = :as_of_date AND cro.prior_rating_value IS NOT NULL'
    ),
  }),
  ({
    id: 'C111',
    name: 'Exception Rate (%)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'COUNT(CASE WHEN exception_flag THEN 1 END) / COUNT(*) * 100',
    description: 'Percentage of facilities with active policy exceptions — pooled count division across hierarchy levels.',
    displayFormat: '0.00%',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'facility_credit_approval', field: 'exception_flag' },
      { layer: 'L2', table: 'facility_credit_approval', field: 'exception_severity' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
      { layer: 'L1', table: 'facility_master', field: 'lob_segment_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    displayNameByDimension: {
      facility: 'Facility Exception Rate (%)',
      counterparty: 'Counterparty Exception Rate (%)',
      L3: 'L3 Desk Exception Rate (%)',
      L2: 'L2 Portfolio Exception Rate (%)',
      L1: 'L1 Department Exception Rate (%)',
    },
    formulasByDimension: buildGroupedFormula(
      'COUNT(CASE WHEN exception_flag THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)',
      'COUNT(CASE WHEN fca.exception_flag THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)',
      'FROM L1.facility_master fm LEFT JOIN L2.facility_credit_approval fca ON fca.facility_id = fm.facility_id AND fca.as_of_date = :as_of_date',
      'WHERE fm.status = :active_status'
    ),
  }),
  ({
    id: 'C112',
    name: 'Counterparty Allocation (%)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'SUM(participation_pct * committed_facility_amt) / SUM(committed_facility_amt)',
    description: 'Counterparty share of facility — Legal (contractual participation_pct) and Economic (legal − CRM adjustment) variants. Exposure-weighted average at counterparty level.',
    displayFormat: '#,##0.00%',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L1', table: 'facility_counterparty_participation', field: 'participation_pct' },
      { layer: 'L2', table: 'counterparty_allocation_snapshot', field: 'economic_allocation_pct' },
      { layer: 'L2', table: 'counterparty_allocation_snapshot', field: 'crm_adjustment_pct' },
      { layer: 'L1', table: 'facility_master', field: 'committed_facility_amt' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ['facility', 'counterparty'] as typeof ALL_DIMS,
    displayNameByDimension: {
      facility: 'Facility Allocation (%)',
      counterparty: 'Counterparty Wtd Allocation (%)',
      L3: 'N/A',
      L2: 'N/A',
      L1: 'N/A',
    },
    formulasByDimension: buildGroupedFormula(
      'SUM(participation_pct * committed_facility_amt) / SUM(committed_facility_amt)',
      'SUM(fcp.participation_pct * fm.committed_facility_amt) / NULLIF(SUM(fm.committed_facility_amt), 0)',
      'FROM L1.facility_counterparty_participation fcp LEFT JOIN L1.facility_master fm ON fm.facility_id = fcp.facility_id',
      'WHERE fm.facility_active_flag = \'Y\''
    ),
  }),
  ({
    id: 'C113',
    name: 'Current Collateral Market Value ($)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Aggregate',
    formula: 'SUM(current_valuation_usd)',
    description: 'Current market value of pledged collateral securing credit exposure. Aggregated from collateral_snapshot per facility, participation-weighted at counterparty level.',
    displayFormat: '$#,##0',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'collateral_snapshot', field: 'current_valuation_usd' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'total_collateral_mv_usd' },
      { layer: 'L1', table: 'facility_counterparty_participation', field: 'participation_pct' },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id' },
      { layer: 'L1', table: 'facility_master', field: 'lob_segment_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    displayNameByDimension: {
      facility: 'Facility Collateral MV ($)',
      counterparty: 'Counterparty Collateral MV ($)',
      L3: 'L3 Desk Collateral MV ($)',
      L2: 'L2 Portfolio Collateral MV ($)',
      L1: 'L1 Department Collateral MV ($)',
    },
    formulasByDimension: buildGroupedFormula(
      'SUM(current_valuation_usd)',
      'SUM(cs.current_valuation_usd)',
      'FROM L2.collateral_snapshot cs LEFT JOIN L1.facility_master fm ON fm.facility_id = cs.facility_id',
      'WHERE cs.as_of_date = :as_of_date'
    ),
  }),
];
