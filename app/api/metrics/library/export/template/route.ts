import { NextResponse } from 'next/server';
import { LIBRARY_SHEET_NAMES } from '@/lib/metric-library/excel-template';

/** GET: download Data Catalogue Excel template with headers and example rows. */
export async function GET() {
  const XLSX = await import('xlsx');

  const instructionsData = [
    ['Data Catalogue — Bulk Import Template'],
    [],
    ['Sheets: Domains, ParentMetrics, Variants. Process order: Domains first, then ParentMetrics, then Variants.'],
    ['parent_metric_id in Variants must match a metric_id in ParentMetrics (or in the same file).'],
    [],
    ['Domains — required: domain_id, domain_name'],
    ['ParentMetrics — required: metric_id, metric_name, definition, generic_formula, metric_class, unit_type, direction, domain_ids (comma-separated)'],
    ['Variants — required: variant_id, variant_name, parent_metric_id, variant_type, status, formula_display'],
    [],
    ['metric_class: SOURCED | CALCULATED | HYBRID'],
    ['unit_type: RATIO | PERCENTAGE | CURRENCY | COUNT | RATE | ORDINAL | DAYS | INDEX'],
    ['direction: HIGHER_BETTER | LOWER_BETTER | NEUTRAL'],
    ['variant_type: SOURCED | CALCULATED'],
    ['status: ACTIVE | DRAFT | DEPRECATED'],
    ['weighting_basis: BY_EAD | BY_OUTSTANDING | BY_COMMITTED'],
    ['Rollup columns: rollup_facility, rollup_counterparty, rollup_desk, rollup_portfolio, rollup_lob'],
  ];

  const domainsHeaders = ['domain_id', 'domain_name', 'domain_description', 'icon', 'color', 'regulatory_relevance', 'primary_stakeholders'];
  const domainsExample: unknown[][] = [
    ['PR', 'Portfolio Risk', 'Portfolio and credit risk metrics', 'BarChart3', '#6366f1', 'FR2590', 'Risk, Finance'],
  ];

  const parentHeaders = [
    'metric_id', 'metric_name', 'definition', 'generic_formula',
    'metric_class', 'unit_type', 'direction', 'rollup_philosophy',
    'domain_ids', 'regulatory_references',
  ];
  const parentExample: unknown[][] = [
    ['DSCR', 'Debt Service Coverage Ratio', 'NOI or EBITDA over debt service.', 'NOI / Debt Service', 'CALCULATED', 'RATIO', 'HIGHER_BETTER', 'Weighted average by exposure', 'PR', 'CRE underwriting'],
  ];

  const variantHeaders = [
    'variant_id', 'variant_name', 'parent_metric_id', 'variant_type', 'status',
    'formula_display', 'rollup_facility', 'rollup_counterparty', 'rollup_desk',
    'rollup_portfolio', 'rollup_lob', 'weighting_basis',
    'source_table', 'source_field', 'executable_metric_id',
  ];
  const variantExample: unknown[][] = [
    [
      'DSCR', 'Debt Service Coverage Ratio', 'DSCR', 'CALCULATED', 'ACTIVE',
      'Cashflow / Total Debt Service',
      'Raw calculated value',
      'SUM(dscr * facility_ead) / SUM(facility_ead)',
      'SUM(dscr * cpty_ead) / SUM(cpty_ead)',
      'SUM(dscr * desk_ead) / SUM(desk_ead)',
      'SUM(dscr * portfolio_ead) / SUM(portfolio_ead)',
      'BY_EAD',
      '', '', '',
    ],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructionsData), LIBRARY_SHEET_NAMES.INSTRUCTIONS);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([domainsHeaders, ...domainsExample]), LIBRARY_SHEET_NAMES.DOMAINS);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([parentHeaders, ...parentExample]), LIBRARY_SHEET_NAMES.PARENT_METRICS);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([variantHeaders, ...variantExample]), LIBRARY_SHEET_NAMES.VARIANTS);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="metric-library-template.xlsx"',
    },
  });
}
