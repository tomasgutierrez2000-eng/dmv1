import { NextResponse } from 'next/server';
import { LIBRARY_SHEET_NAMES } from '@/lib/metric-library/excel-template';
import { getDomains, getParentMetrics, getVariants } from '@/lib/metric-library/store';
import type { MetricDomain, ParentMetric, MetricVariant } from '@/lib/metric-library/types';

/** GET: export current Data Catalogue to Excel. */
export async function GET() {
  const XLSX = await import('xlsx');

  const instructionsData = [
    ['Data Catalogue — Exported data. Edit and re-import via Import from Excel.'],
    [],
    ['Sheets: Domains, ParentMetrics, Variants. Required columns must be present.'],
  ];

  const domainsHeaders = ['domain_id', 'domain_name', 'domain_description', 'icon', 'color', 'regulatory_relevance', 'primary_stakeholders'];
  const domains = getDomains();
  const domainsRows: unknown[][] = domains.map((d: MetricDomain) => [
    d.domain_id,
    d.domain_name,
    d.domain_description ?? '',
    d.icon ?? '',
    d.color ?? '',
    Array.isArray(d.regulatory_relevance) ? d.regulatory_relevance.join(', ') : '',
    Array.isArray(d.primary_stakeholders) ? d.primary_stakeholders.join(', ') : '',
  ]);

  const parentHeaders = [
    'metric_id', 'metric_name', 'definition', 'generic_formula',
    'metric_class', 'unit_type', 'direction', 'rollup_philosophy',
    'domain_ids', 'regulatory_references',
  ];
  const parents = getParentMetrics();
  const parentRows: unknown[][] = parents.map((p: ParentMetric) => [
    p.metric_id,
    p.metric_name,
    p.definition ?? '',
    p.generic_formula ?? '',
    p.metric_class,
    p.unit_type,
    p.direction,
    p.rollup_philosophy ?? '',
    Array.isArray(p.domain_ids) ? p.domain_ids.join(', ') : '',
    Array.isArray(p.regulatory_references) ? p.regulatory_references.join(', ') : '',
  ]);

  const variantHeaders = [
    'variant_id', 'variant_name', 'parent_metric_id', 'variant_type', 'status',
    'formula_display', 'rollup_facility', 'rollup_counterparty', 'rollup_desk',
    'rollup_portfolio', 'rollup_lob', 'weighting_basis',
    'source_table', 'source_field', 'executable_metric_id',
  ];
  const variants = getVariants();
  const variantRows: unknown[][] = variants.map((v: MetricVariant) => [
    v.variant_id,
    v.variant_name,
    v.parent_metric_id,
    v.variant_type,
    v.status,
    v.formula_display ?? '',
    v.rollup_logic?.facility ?? '',
    v.rollup_logic?.counterparty ?? '',
    v.rollup_logic?.desk ?? '',
    v.rollup_logic?.portfolio ?? '',
    v.rollup_logic?.lob ?? '',
    v.weighting_basis ?? '',
    v.source_table ?? '',
    v.source_field ?? '',
    v.executable_metric_id ?? '',
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructionsData), LIBRARY_SHEET_NAMES.INSTRUCTIONS);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([domainsHeaders, ...domainsRows]), LIBRARY_SHEET_NAMES.DOMAINS);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([parentHeaders, ...parentRows]), LIBRARY_SHEET_NAMES.PARENT_METRICS);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([variantHeaders, ...variantRows]), LIBRARY_SHEET_NAMES.VARIANTS);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="metric-library-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
