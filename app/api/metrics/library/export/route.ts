import { NextResponse } from 'next/server';
import { LIBRARY_SHEET_NAMES } from '@/lib/metric-library/excel-template';
import { getDomains, getParentMetrics, getVariants } from '@/lib/metric-library/store';
import type { MetricDomain, ParentMetric, MetricVariant } from '@/lib/metric-library/types';

/** GET: export current Metric Library to Excel (same format as template). */
export async function GET() {
  const XLSX = await import('xlsx');

  const instructionsData = [
    ['Metric Library — Exported data. Edit and re-import via Import from Excel.'],
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
  const parents = getParentMetrics();
  const parentRows: unknown[][] = parents.map((p: ParentMetric) => [
    p.metric_id,
    p.metric_name,
    p.definition ?? '',
    p.generic_formula ?? '',
    p.metric_class,
    p.unit_type,
    p.direction,
    p.risk_appetite_relevant ?? false,
    p.rollup_philosophy ?? '',
    p.rollup_description ?? '',
    Array.isArray(p.domain_ids) ? p.domain_ids.join(', ') : '',
    Array.isArray(p.regulatory_references) ? p.regulatory_references.join(', ') : '',
  ]);

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
  const variants = getVariants();
  const variantRows: unknown[][] = variants.map((v: MetricVariant) => [
    v.variant_id,
    v.variant_name,
    v.parent_metric_id,
    v.variant_type,
    v.status,
    v.version,
    v.effective_date,
    v.formula_display ?? '',
    v.formula_specification ?? '',
    v.detailed_description ?? '',
    v.rollup_logic?.facility ?? '',
    v.rollup_logic?.counterparty ?? '',
    v.rollup_logic?.desk ?? '',
    v.rollup_logic?.portfolio ?? '',
    v.rollup_logic?.lob ?? '',
    v.weighting_basis ?? '',
    v.executable_metric_id ?? '',
    v.owner_team ?? '',
    v.approver ?? '',
    v.review_cycle ?? '',
    v.source_system ?? '',
    v.source_field_name ?? '',
    v.refresh_frequency ?? '',
    Array.isArray(v.used_by_dashboards) ? v.used_by_dashboards.join(', ') : '',
    Array.isArray(v.regulatory_references) ? v.regulatory_references.join(', ') : '',
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(instructionsData),
    LIBRARY_SHEET_NAMES.INSTRUCTIONS
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([domainsHeaders, ...domainsRows]),
    LIBRARY_SHEET_NAMES.DOMAINS
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([parentHeaders, ...parentRows]),
    LIBRARY_SHEET_NAMES.PARENT_METRICS
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([variantHeaders, ...variantRows]),
    LIBRARY_SHEET_NAMES.VARIANTS
  );

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="metric-library-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
