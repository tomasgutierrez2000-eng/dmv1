import { NextResponse } from 'next/server';
import { LIBRARY_SHEET_NAMES } from '@/lib/metric-library/excel-template';

/** GET: download Metric Library Excel template with headers and example rows. */
export async function GET() {
  const XLSX = await import('xlsx');

  const instructionsData = [
    ['Metric Library — Bulk Import Template'],
    [],
    ['Sheets: Domains, ParentMetrics, Variants. Process order: Domains first, then ParentMetrics, then Variants.'],
    ['parent_metric_id in Variants must match a metric_id in ParentMetrics (or in the same file).'],
    [],
    ['Domains — required: domain_id, domain_name'],
    ['ParentMetrics — required: metric_id, metric_name, definition, generic_formula, metric_class, unit_type, direction, domain_ids (comma-separated)'],
    ['Variants — required: variant_id, variant_name, parent_metric_id, variant_type, status, version, effective_date, formula_display'],
    [],
    ['metric_class: SOURCED | CALCULATED | HYBRID'],
    ['unit_type: RATIO | PERCENTAGE | CURRENCY | COUNT | RATE | ORDINAL | DAYS | INDEX'],
    ['direction: HIGHER_BETTER | LOWER_BETTER | NEUTRAL'],
    ['variant_type: SOURCED | CALCULATED'],
    ['status: ACTIVE | DRAFT | DEPRECATED | PROPOSED | INACTIVE'],
    ['Rollup columns (optional): rollup_facility, rollup_counterparty, rollup_desk, rollup_portfolio, rollup_lob'],
  ];

  const domainsHeaders = ['domain_id', 'domain_name', 'domain_description', 'icon', 'color', 'regulatory_relevance', 'primary_stakeholders'];
  const domainsExample: unknown[][] = [
    ['PR', 'Portfolio Risk', 'Portfolio and credit risk metrics', 'shield', '#6366f1', 'FR2590', 'Risk, Finance'],
  ];

  const parentHeaders = [
    'metric_id',
    'metric_name',
    'definition',
    'generic_formula',
    'metric_class',
    'unit_type',
    'direction',
    'risk_appetite_relevant',
    'rollup_philosophy',
    'rollup_description',
    'domain_ids',
    'regulatory_references',
  ];
  const parentExample: unknown[][] = [
    [
      'DSCR',
      'Debt Service Coverage Ratio',
      'NOI or EBITDA over debt service.',
      'NOI / Debt Service',
      'CALCULATED',
      'RATIO',
      'HIGHER_BETTER',
      false,
      'Weighted average by exposure',
      '',
      'PR',
      'CRE underwriting',
    ],
  ];

  const variantHeaders = [
    'variant_id',
    'variant_name',
    'parent_metric_id',
    'variant_type',
    'status',
    'version',
    'effective_date',
    'formula_display',
    'formula_specification',
    'detailed_description',
    'rollup_facility',
    'rollup_counterparty',
    'rollup_desk',
    'rollup_portfolio',
    'rollup_lob',
    'weighting_basis',
    'executable_metric_id',
    'owner_team',
    'approver',
    'review_cycle',
    'source_system',
    'source_field_name',
    'refresh_frequency',
    'used_by_dashboards',
    'regulatory_references',
  ];
  const variantExample: unknown[][] = [
    [
      'DSCR-CRE-NOI',
      'DSCR (CRE, NOI)',
      'DSCR',
      'CALCULATED',
      'ACTIVE',
      'v1.0',
      new Date().toISOString().slice(0, 10),
      'NOI / Debt Service',
      '',
      'CRE multifamily NOI-based DSCR',
      'Value at facility',
      'Weighted avg',
      'Weighted avg',
      'Distribution',
      'Sum',
      'BY_EAD',
      '',
      'Risk',
      '',
      'ANNUAL',
      '',
      '',
      '',
      '',
      '',
    ],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(instructionsData),
    LIBRARY_SHEET_NAMES.INSTRUCTIONS
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([domainsHeaders, ...domainsExample]),
    LIBRARY_SHEET_NAMES.DOMAINS
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([parentHeaders, ...parentExample]),
    LIBRARY_SHEET_NAMES.PARENT_METRICS
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([variantHeaders, ...variantExample]),
    LIBRARY_SHEET_NAMES.VARIANTS
  );

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="metric-library-template.xlsx"',
    },
  });
}
