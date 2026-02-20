/**
 * One-off: import metrics from Excel with replace (and ModelGaps).
 * Run from project root: npx tsx scripts/import-metrics-replace.ts
 * Expects metrics_import_FINAL_2026-02-17.xlsx in project root (or pass path as first arg).
 */

import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { writeCustomMetrics } from '../lib/metrics-store';
import { writeModelGaps } from '../lib/model-gaps-store';
import type { L3Metric, SourceField } from '../data/l3-metrics';
import {
  METRIC_TYPES,
  PAGES,
  normalizeMetric,
  parseDimensions,
  parseToggles,
  validateMetric,
} from '../lib/metrics-calculation';

const excelPath = process.argv[2] || path.join(process.cwd(), 'metrics_import_FINAL_2026-02-17.xlsx');

if (!fs.existsSync(excelPath)) {
  console.error('File not found:', excelPath);
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(excelPath), { type: 'buffer' });
const metricsSheet = wb.Sheets['Metrics'] || wb.Sheets[wb.SheetNames[0]];
const sourceSheet = wb.Sheets['SourceFields'] || wb.Sheets[wb.SheetNames[1]];
const modelGapsSheet = wb.Sheets['ModelGaps'];

if (!metricsSheet) {
  console.error('Excel must have a "Metrics" sheet.');
  process.exit(1);
}

const metricsRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(metricsSheet, { defval: '' });
const sourceRows = sourceSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sourceSheet, { defval: '' }) : [];

const sourceByMetric = new Map<string, SourceField[]>();
for (const row of sourceRows) {
  const metricId = String(row['metric_id'] ?? '').trim();
  if (!metricId) continue;
  const ord = Number(row['ord']) || 0;
  const layer = String(row['layer'] ?? '').trim();
  const table = String(row['table'] ?? '').trim();
  const field = String(row['field'] ?? '').trim();
  if (!table || !field) continue;
  if (layer !== 'L1' && layer !== 'L2') continue;
  const list = sourceByMetric.get(metricId) ?? [];
  list[ord - 1] = {
    layer: layer as 'L1' | 'L2',
    table,
    field,
    description: String(row['description'] ?? '').trim() || undefined,
    sampleValue: String(row['sampleValue'] ?? '').trim() || undefined,
  };
  sourceByMetric.set(metricId, list);
}
for (const [mid, list] of sourceByMetric) {
  sourceByMetric.set(mid, list.filter(Boolean));
}

const toImport: L3Metric[] = [];
const errors: { row: number; sheet?: string; message: string }[] = [];
let rowNum = 0;
for (const row of metricsRows) {
  rowNum++;
  const id = String(row['id'] ?? '').trim();
  const name = String(row['name'] ?? '').trim();
  const formula = String(row['formula'] ?? '').trim();
  if (!name) { errors.push({ row: rowNum, sheet: 'Metrics', message: 'name is required' }); continue; }
  if (!formula) { errors.push({ row: rowNum, sheet: 'Metrics', message: 'formula is required' }); continue; }
  if (!id) {
    errors.push({ row: rowNum, sheet: 'Metrics', message: 'id is required' });
    continue;
  }
  const sourceFields = sourceByMetric.get(id) ?? [];
  if (sourceFields.length === 0) {
    errors.push({ row: rowNum, sheet: 'Metrics', message: 'at least one source field required' });
    continue;
  }
  const page = String(row['page'] ?? 'P1').trim();
  const metricType = String(row['metricType'] ?? 'Derived').trim();
  const dimensions = parseDimensions(String(row['dimensions'] ?? ''));
  const toggles = parseToggles(String(row['toggles'] ?? ''));
  const normalized = normalizeMetric({
    id,
    name,
    page: PAGES.includes(page as L3Metric['page']) ? (page as L3Metric['page']) : 'P1',
    section: String(row['section'] ?? '').trim(),
    metricType: METRIC_TYPES.includes(metricType as L3Metric['metricType']) ? (metricType as L3Metric['metricType']) : 'Derived',
    formula,
    formulaSQL: String(row['formulaSQL'] ?? '').trim() || undefined,
    description: String(row['description'] ?? '').trim(),
    displayFormat: String(row['displayFormat'] ?? '').trim(),
    sampleValue: String(row['sampleValue'] ?? '').trim(),
    sourceFields,
    dimensions,
    toggles: toggles.length ? toggles : undefined,
    notes: String(row['notes'] ?? '').trim() || undefined,
  }, id);
  const validation = validateMetric(normalized);
  if (!validation.ok) {
    errors.push({ row: rowNum, sheet: 'Metrics', message: validation.error ?? 'invalid metric' });
    continue;
  }
  toImport.push(normalized);
}

if (modelGapsSheet) {
  const gapRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(modelGapsSheet, { defval: '' });
  const gaps = gapRows
    .map(row => ({
      gapItem: String(row['Gap Item'] ?? '').trim(),
      targetTable: String(row['Target Table / Scope'] ?? '').trim(),
      fieldsRequired: String(row['Fields Required'] ?? '').trim(),
      rationale: String(row['Rationale'] ?? '').trim(),
      impactedMetrics: String(row['Impacted Metrics'] ?? '').trim(),
    }))
    .filter(g => g.gapItem || g.targetTable);
  writeModelGaps(gaps);
  console.log('Model Gaps:', gaps.length, 'rows written to data/model-gaps.json');
}

writeCustomMetrics(toImport);
console.log('Replaced custom metrics:', toImport.length, 'metrics written to data/metrics-custom.json');
if (errors.length > 0) {
  console.warn('Errors (skipped rows):', errors.length);
  errors.forEach(e => console.warn('  Row', e.row, e.sheet, e.message));
}
