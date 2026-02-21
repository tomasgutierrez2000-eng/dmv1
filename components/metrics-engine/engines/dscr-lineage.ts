import type { L3Metric, LineageNode, LineageEdge, SourceField } from '@/data/l3-metrics';

export interface DSCRVariantConfig {
  variantCode: string;
  variantName: string;
  productLabel: string;
  subProduct: string;
  purpose: string;
  numeratorLabel: string;
  denominatorLabel: string;
  scenarios: string[];
  formula: string;
  numeratorSources: { name: string; source: string }[];
  denominatorSources: { name: string; source: string }[];
  dscrValue: number | null;
  sampleValue: string;
}

/**
 * Maps each DSCR logical source to exactly one L2 atomic element (table.column).
 * Atomic element = one column in one L2 table (scripts/l2/l2-definitions.ts).
 * facility_financial_snapshot: noi_amt, total_debt_service_amt, revenue_amt, operating_expense_amt, ebitda_amt, interest_expense_amt, principal_payment_amt.
 * cash_flow: amount, cash_flow_type.
 */
const DSCR_TO_ATOMIC_MAP: Record<string, { table: string; field: string }> = {
  // CRE numerator → one atomic column each
  'property_income_snapshot.gross_potential_rent': { table: 'facility_financial_snapshot', field: 'revenue_amt' },
  'property_income_snapshot.other_income': { table: 'facility_financial_snapshot', field: 'revenue_amt' },
  'property_income_snapshot.vacancy_credit_loss_amt': { table: 'facility_financial_snapshot', field: 'revenue_amt' },
  'property_income_snapshot.operating_expenses': { table: 'facility_financial_snapshot', field: 'operating_expense_amt' },
  'property_income_snapshot.replacement_reserves': { table: 'facility_financial_snapshot', field: 'noi_amt' },
  'property_income_snapshot.noi': { table: 'facility_financial_snapshot', field: 'noi_amt' },
  // CI/PF numerator → one atomic column each
  'counterparty_financial_line_item.NET_INCOME': { table: 'facility_financial_snapshot', field: 'ebitda_amt' },
  'counterparty_financial_line_item.INTEREST_EXPENSE': { table: 'facility_financial_snapshot', field: 'interest_expense_amt' },
  'counterparty_financial_line_item.TAX_PROVISION': { table: 'facility_financial_snapshot', field: 'ebitda_amt' },
  'counterparty_financial_line_item.DEPRECIATION_AMORTIZATION': { table: 'facility_financial_snapshot', field: 'ebitda_amt' },
  'counterparty_financial_line_item.REVENUE': { table: 'facility_financial_snapshot', field: 'revenue_amt' },
  'counterparty_financial_line_item.OPERATING_EXPENSES': { table: 'facility_financial_snapshot', field: 'operating_expense_amt' },
  // Denominator → one atomic column each
  'cash_flow.interest': { table: 'cash_flow', field: 'amount' },
  'cash_flow.principal': { table: 'cash_flow', field: 'amount' },
  'counterparty_debt_schedule.debt_service': { table: 'facility_financial_snapshot', field: 'total_debt_service_amt' },
};

function parseSourceTableField(source: string): { table: string; field: string } {
  const normalized = source.trim().replace(/\s+/g, '_');
  const mapped = DSCR_TO_ATOMIC_MAP[normalized];
  if (mapped) return mapped;
  const dot = source.indexOf('.');
  if (dot >= 0) {
    const table = source.slice(0, dot).trim().replace(/\s+/g, '_') || 'unknown';
    const rest = source.slice(dot + 1).trim();
    const field = rest.split(/\s/)[0].replace(/\s+/g, '_') || 'value';
    return { table, field };
  }
  const tokens = source.split(/[\s.]+/).filter(Boolean);
  return {
    table: tokens[0]?.replace(/\s+/g, '_') || 'unknown',
    field: tokens[1]?.replace(/\s+/g, '_') || 'value',
  };
}

/** Fallback atomic element when a source string is not in the map (avoid sending invalid table/field). */
const FALLBACK_ATOMIC = { table: 'facility_financial_snapshot', field: 'noi_amt' } as const;

/**
 * Build sourceFields for DSCR variant: one entry per component, each mapped to one L2 atomic element (table.column).
 * So "Atomic Source Fields" in the catalog shows each DSCR component → one L2 table.field.
 */
export function dscrConfigToSourceFields(config: DSCRVariantConfig): SourceField[] {
  const out: SourceField[] = [];
  for (const { source, name } of [...config.numeratorSources, ...config.denominatorSources]) {
    let { table, field } = parseSourceTableField(source);
    if (table === 'unknown' || field === 'value') {
      ({ table, field } = FALLBACK_ATOMIC);
    }
    out.push({
      layer: 'L2',
      table,
      field,
      description: `${name} → L2.${table}.${field}`,
    });
  }
  if (out.length === 0) {
    out.push(
      { layer: 'L2', table: 'facility_financial_snapshot', field: 'noi_amt', description: 'DSCR numerator (NOI)' },
      { layer: 'L2', table: 'facility_financial_snapshot', field: 'total_debt_service_amt', description: 'DSCR denominator (debt service)' },
    );
  }
  return out;
}

/** Build lineage nodes/edges for DSCR variant. Uses same structure as lib/lineage-generator so LineageFlowView renders the same L1→L2→transform→L3 flow. Sources are mapped to L2 data model tables (facility_financial_snapshot, cash_flow). */
export function dscrConfigToLineage(config: DSCRVariantConfig): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  // Group by data-model table and collect data-model field names (so lineage shows real L2 columns)
  const tableToFields = new Map<string, string[]>();
  const add = (source: string) => {
    let { table, field } = parseSourceTableField(source);
    if (table === 'unknown' || field === 'value') {
      ({ table, field } = FALLBACK_ATOMIC);
    }
    if (!tableToFields.has(table)) tableToFields.set(table, []);
    const arr = tableToFields.get(table)!;
    if (!arr.includes(field)) arr.push(field);
  };
  config.numeratorSources.forEach((s) => add(s.source));
  config.denominatorSources.forEach((s) => add(s.source));

  if (tableToFields.size === 0) {
    tableToFields.set('facility_financial_snapshot', ['noi_amt', 'total_debt_service_amt']);
  }

  // Same node id format as lib/lineage-generator: table-{layer}-{table}
  tableToFields.forEach((fieldNames, table) => {
    const id = `table-L2-${table}`.replace(/\s/g, '-');
    nodes.push({
      id,
      layer: 'L2',
      table,
      field: fieldNames.length === 1 ? fieldNames[0] : fieldNames.join(', '),
      fields: fieldNames.length > 1 ? fieldNames : undefined,
      description: fieldNames.length === 1 ? `L2.${table}.${fieldNames[0]}` : `L2.${table}: ${fieldNames.slice(0, 3).join(', ')}${fieldNames.length > 3 ? '…' : ''}`,
      sampleValue: config.sampleValue || '—',
    });
    edges.push({ from: id, to: 'transform-formula', label: fieldNames.length > 1 ? `${fieldNames.length} fields` : '→' });
  });

  nodes.push({
    id: 'transform-formula',
    layer: 'transform',
    table: '',
    field: 'Formula',
    formula: config.formula,
    sampleValue: config.sampleValue || '—',
    description: `DSCR at facility (${config.numeratorLabel} / ${config.denominatorLabel})`,
  });

  nodes.push({
    id: 'l3-output',
    layer: 'L3',
    table: 'metric',
    field: config.variantName,
    sampleValue: config.sampleValue || '—',
    formula: config.formula,
    description: `${config.variantCode} (DSCR variant)`,
  });

  edges.push({ from: 'transform-formula', to: 'l3-output', label: '→' });

  return { nodes, edges };
}

/** Build full L3Metric for saving a DSCR variant (id = variant code, name = variant name). */
export function dscrConfigToMetric(config: DSCRVariantConfig): Partial<L3Metric> {
  const sourceFields = dscrConfigToSourceFields(config);
  const { nodes, edges } = dscrConfigToLineage(config);
  const id = config.variantCode.replace(/\s/g, '-').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'DSCR-variant';
  return {
    id,
    name: config.variantName || config.variantCode,
    page: 'P5',
    section: 'Stress & DSCR',
    metricType: 'Ratio',
    formula: config.formula,
    description: `DSCR variant: ${config.productLabel} → ${config.subProduct}, ${config.numeratorLabel} / ${config.denominatorLabel}. Scenarios: ${config.scenarios.join(', ')}.`,
    displayFormat: '0.00x',
    sampleValue: config.sampleValue,
    sourceFields,
    dimensions: [],
    allowedDimensions: ['facility', 'counterparty'],
    nodes,
    edges,
  };
}
