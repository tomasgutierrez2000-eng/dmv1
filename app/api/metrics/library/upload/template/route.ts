/**
 * GET /api/metrics/library/upload/template
 *
 * Downloads an Excel template for metric creation.
 * 4 sheets: Instructions, Metrics, SourceFields, Data Dictionary Reference.
 */

import { NextResponse } from 'next/server';
import { readDataDictionary } from '@/lib/data-dictionary';
import { getDomains } from '@/lib/metric-library/store';

export async function GET() {
  const XLSX = await import('xlsx');

  // ── Sheet 1: Instructions ──────────────────────────────────────────
  const domains = getDomains();
  const domainList = domains.map((d) => d.domain_id).join(', ');

  const instructionsData = [
    ['Metric Upload Template'],
    [],
    ['How to use this template:'],
    ['1. Fill in the "Metrics" sheet — one row per metric you want to create.'],
    ['2. Fill in the "SourceFields" sheet — list the source fields each metric uses (at least 1 per metric).'],
    ['3. The "DD Reference" sheet shows all available tables and fields in the data dictionary. Use it to find correct table/field names.'],
    ['4. Upload the filled template at /metrics/library/upload in the platform.'],
    [],
    ['Tip: You can paste the DD Reference sheet into ChatGPT/Claude and ask it to help fill out your metrics.'],
    [],
    ['─── Column Reference: Metrics Sheet ───'],
    ['Column', 'Required', 'Description', 'Valid Values'],
    ['metric_id', 'Yes', 'Unique ID in format DOMAIN-NNN', 'e.g. EXP-050, RSK-012, CAP-005'],
    ['name', 'Yes', 'Human-readable metric name', ''],
    ['domain', 'Yes', 'Business domain', domainList],
    ['abbreviation', 'Yes', 'Short display name', 'e.g. LTV, DSCR, NIM'],
    ['definition', 'Yes', 'Business definition (1-3 sentences)', ''],
    ['generic_formula', 'Yes', 'Human-readable formula', 'e.g. Drawn / Committed * 100'],
    ['unit_type', 'Yes', 'Type of value', 'CURRENCY, PERCENTAGE, RATIO, COUNT, RATE, BPS, DAYS, INDEX'],
    ['direction', 'Yes', 'What direction is good?', 'HIGHER_BETTER, LOWER_BETTER, NEUTRAL'],
    ['metric_class', 'Yes', 'How is it sourced?', 'SOURCED, CALCULATED, HYBRID'],
    ['insight', 'No', 'Why this metric matters', ''],
    ['rollup_strategy', 'No', 'How to aggregate across levels', 'direct-sum, sum-ratio, weighted-avg'],
    [],
    ['─── Column Reference: SourceFields Sheet ───'],
    ['Column', 'Required', 'Description', 'Valid Values'],
    ['metric_id', 'Yes', 'Must match a metric_id from Metrics sheet', ''],
    ['layer', 'Yes', 'Data model layer', 'L1, L2, L3'],
    ['table', 'Yes', 'Table name (see DD Reference)', ''],
    ['field', 'Yes', 'Field name (see DD Reference)', ''],
    ['role', 'No', 'Role in the formula', 'MEASURE, DIMENSION, FILTER, JOIN_KEY'],
    ['description', 'No', 'What this field represents', ''],
    [],
    ['─── Domain Descriptions ───'],
    ...domains.map((d) => [d.domain_id, d.domain_name, d.domain_description]),
  ];

  // ── Sheet 2: Metrics (with example row) ────────────────────────────
  const metricsHeaders = [
    'metric_id', 'name', 'domain', 'abbreviation', 'definition', 'generic_formula',
    'unit_type', 'direction', 'metric_class', 'insight',
    'rollup_strategy',
  ];
  const metricsExample = [
    'EXP-099', 'Example: Total Drawn Exposure', 'exposure', 'DRAWN',
    'Total drawn amount across all facilities in the portfolio.',
    'SUM(drawn_amount)',
    'CURRENCY', 'NEUTRAL', 'CALCULATED',
    'Core exposure metric tracking total utilization.',
    'direct-sum',
  ];

  // ── Sheet 3: SourceFields (with example rows) ──────────────────────
  const sourceFieldsHeaders = ['metric_id', 'layer', 'table', 'field', 'role', 'description'];
  const sourceFieldsExample = [
    ['EXP-099', 'L2', 'facility_exposure_snapshot', 'drawn_amount', 'MEASURE', 'Per-facility drawn exposure amount'],
    ['EXP-099', 'L2', 'facility_exposure_snapshot', 'facility_id', 'JOIN_KEY', 'Facility identifier'],
    ['EXP-099', 'L2', 'facility_exposure_snapshot', 'as_of_date', 'FILTER', 'Snapshot date'],
  ];

  // ── Sheet 4: DD Reference (auto-generated) ─────────────────────────
  const ddHeaders = ['Layer', 'Table', 'Field', 'Type', 'Is PK', 'Description'];
  const ddRows: unknown[][] = [];

  const dd = readDataDictionary();
  if (dd) {
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      const tables = dd[layer];
      for (const table of tables) {
        for (const field of table.fields) {
          ddRows.push([
            layer,
            table.name,
            field.name,
            field.data_type ?? '',
            field.pk_fk?.is_pk ? 'PK' : '',
            field.description ?? '',
          ]);
        }
      }
    }
  }

  // ── Build workbook ────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  const wsInstr = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  const wsMetrics = XLSX.utils.aoa_to_sheet([metricsHeaders, metricsExample]);
  XLSX.utils.book_append_sheet(wb, wsMetrics, 'Metrics');

  const wsSF = XLSX.utils.aoa_to_sheet([sourceFieldsHeaders, ...sourceFieldsExample]);
  XLSX.utils.book_append_sheet(wb, wsSF, 'SourceFields');

  const wsDD = XLSX.utils.aoa_to_sheet([ddHeaders, ...ddRows]);
  XLSX.utils.book_append_sheet(wb, wsDD, 'DD Reference');

  // ── Return as download ────────────────────────────────────────────
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="metric_upload_template_${date}.xlsx"`,
    },
  });
}
