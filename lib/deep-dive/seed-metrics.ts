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

function mkMetric(metric: L3Metric): L3Metric {
  return metric;
}

export const DEEP_DIVE_SEED_METRICS: L3Metric[] = [
  mkMetric({
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
  mkMetric({
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
  mkMetric({
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
  mkMetric({
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
  mkMetric({
    id: 'C104',
    name: 'LTV (Loan-to-Value %)',
    page: 'P4',
    section: 'Deep Dive',
    metricType: 'Ratio',
    formula: 'SUM(ltv_pct * outstanding_exposure) / SUM(outstanding_exposure)',
    description: 'Exposure-weighted LTV across hierarchy levels.',
    displayFormat: '0.00%',
    sampleValue: '—',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount' },
      { layer: 'L2', table: 'collateral_snapshot', field: 'current_valuation_usd' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    allowedDimensions: ALL_DIMS,
    formulasByDimension: buildGroupedFormula(
      'SUM((drawn_amount / NULLIF(collateral_value, 0)) * outstanding_exposure) / NULLIF(SUM(CASE WHEN collateral_value > 0 THEN outstanding_exposure ELSE 0 END), 0)',
      'SUM((fes.drawn_amount / NULLIF(cs.collateral_value_usd, 0)) * fes.gross_exposure_usd) / NULLIF(SUM(CASE WHEN cs.collateral_value_usd > 0 THEN fes.gross_exposure_usd ELSE 0 END), 0)',
      "FROM L2.facility_exposure_snapshot fes LEFT JOIN (SELECT facility_id, as_of_date, SUM(current_valuation_usd) AS collateral_value_usd FROM L2.collateral_snapshot GROUP BY facility_id, as_of_date) cs ON cs.facility_id = fes.facility_id AND cs.as_of_date = fes.as_of_date LEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id",
      'WHERE fes.as_of_date = :as_of_date'
    ),
  }),
  mkMetric({
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
  mkMetric({
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
  mkMetric({
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
];
