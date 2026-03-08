#!/usr/bin/env tsx
/**
 * Sync YAML metric definitions → Excel (metrics_dimensions_filled.xlsx)
 *
 * Option C: YAML is source of truth. This script generates the business-facing
 * Excel file that getMergedMetrics() loads when present.
 *
 * Usage: npx tsx scripts/calc-engine/sync-yaml-to-excel.ts [--output path]
 *
 * Output format matches lib/metrics-from-excel.ts expectations:
 * - Sheet "Definitions, KPI,Calc& Insights"
 * - Col 0: Data Element (metric_id)
 * - Col 1: Definition, Col 2: Example KPI, Col 3: KPI Formula
 * - Per dimension (facility, counterparty, L3, L2, L1): In Record, Sourcing Type, Level Logic, Display Name
 */

import path from 'path';
import fs from 'fs';
import { loadMetricDefinitions } from './loader';
import { getMetricsExcelPath } from '../../lib/config';

const YAML_TO_EXCEL_LEVEL: Record<string, { col: number; excelLabel: string }> = {
  facility: { col: 7, excelLabel: 'Facility' },
  counterparty: { col: 11, excelLabel: 'Counterparty' },
  desk: { col: 15, excelLabel: 'L3 Desk' },
  portfolio: { col: 19, excelLabel: 'L2 Portfolio' },
  business_segment: { col: 23, excelLabel: 'L1 Department/Business Segment' },
};

function aggregationToSourcing(agg: string): string {
  switch (agg) {
    case 'RAW':
      return 'Raw';
    case 'WEIGHTED_AVG':
      return 'Avg';
    case 'SUM':
    case 'COUNT':
    case 'COUNT_DISTINCT':
    case 'MIN':
    case 'MAX':
    case 'MEDIAN':
      return 'Agg';
    default:
      return 'Calc';
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--output');
  const outputPath =
    outIdx >= 0 && args[outIdx + 1] ? path.resolve(args[outIdx + 1]) : getMetricsExcelPath();

  const { metrics, errors } = loadMetricDefinitions();
  if (errors.length > 0) {
    console.error('YAML load errors:');
    errors.forEach((e) => console.error('  ', e));
    process.exit(1);
  }

  const active = metrics.filter((m) => m.status === 'ACTIVE' || m.status === 'DRAFT');
  if (active.length === 0) {
    console.log('No ACTIVE/DRAFT metrics to sync.');
    process.exit(0);
  }

  // Build rows for "Definitions, KPI,Calc& Insights" format
  const headers = [
    'Data Element',
    'Definition',
    'Example KPI',
    'KPI Formula/Description',
    '', // spacer
    '', // spacer
    '', // spacer
    'Facility In Record',
    'Facility Sourcing',
    'Facility Level Logic',
    'Facility Display Name',
    'Counterparty In Record',
    'Counterparty Sourcing',
    'Counterparty Level Logic',
    'Counterparty Display Name',
    'L3 Desk In Record',
    'L3 Desk Sourcing',
    'L3 Desk Level Logic',
    'L3 Desk Display Name',
    'L2 Portfolio In Record',
    'L2 Portfolio Sourcing',
    'L2 Portfolio Level Logic',
    'L2 Portfolio Display Name',
    'L1 Department In Record',
    'L1 Department Sourcing',
    'L1 Department Level Logic',
    'L1 Department Display Name',
  ];

  const rows: (string | number)[][] = [headers, []];

  for (const m of active) {
    const row: (string | number)[] = new Array(28).fill('');
    row[0] = m.metric_id;
    row[1] = m.description;
    row[2] = m.name;
    row[3] = m.levels.facility?.formula_text ?? m.description;

    for (const [level, { col }] of Object.entries(YAML_TO_EXCEL_LEVEL)) {
      const formula = m.levels[level as keyof typeof m.levels];
      if (!formula) continue;

      const inRecord = formula.formula_sql ? 'Y' : '';
      const sourcing = aggregationToSourcing(formula.aggregation_type);
      const levelLogic = formula.formula_text;
      const displayName = `${m.name} (${level})`;

      row[col] = inRecord;
      row[col + 1] = sourcing;
      row[col + 2] = levelLogic;
      row[col + 3] = displayName;
    }

    rows.push(row);
  }

  const XLSX = require('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Definitions, KPI,Calc& Insights');

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  XLSX.writeFile(wb, outputPath);

  console.log(`Synced ${active.length} metrics to ${outputPath}`);
}

main();
