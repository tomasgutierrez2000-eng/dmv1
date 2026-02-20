/**
 * Load metrics from data/metrics_dimensions_filled.xlsx.
 * Sheet "Definitions, KPI,Calc& Insights":
 * - Col 0: Data Element (metric id)
 * - Col 1: Definition, Col 2: Example KPI, Col 3: KPI Formula/Description
 * - Per dimension (Facility, Counterparty, L3 Desk, L2 Portfolio, L1 Department/LoB): 4 columns each
 *   - In Record / Level? (Y/N), Sourcing Type, Level Logic (formula), Dashboard Display Name
 */

import fs from 'fs';
import path from 'path';
import type { L3Metric, CalculationDimension } from '@/data/l3-metrics';

const EXCEL_PATH = path.join(process.cwd(), 'data', 'metrics_dimensions_filled.xlsx');

const DIMENSION_BLOCKS: { key: CalculationDimension; col: number }[] = [
  { key: 'facility', col: 7 },
  { key: 'counterparty', col: 11 },
  { key: 'L3', col: 15 },
  { key: 'L2', col: 19 },
  { key: 'L1', col: 23 },
];

function isInRecord(value: unknown): boolean {
  const s = String(value ?? '').trim().toUpperCase();
  return s === 'Y' || s === 'YES' || s === '1';
}

export function loadMetricsFromExcel(): L3Metric[] | null {
  if (!fs.existsSync(EXCEL_PATH)) return null;
  try {
    const XLSX = require('xlsx');
    const wb = XLSX.read(fs.readFileSync(EXCEL_PATH), { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return null;
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 }) as string[][];
    const metrics: L3Metric[] = [];
    for (let r = 2; r < raw.length; r++) {
      const row = raw[r];
      if (!row || !Array.isArray(row)) continue;
      const dataElement = String(row[0] ?? '').trim();
      if (!dataElement) continue;

      const definition = String(row[1] ?? '').trim();
      const exampleKpi = String(row[2] ?? '').trim();
      const kpiFormulaDesc = String(row[3] ?? '').trim();

      const allowedDimensions: CalculationDimension[] = [];
      const formulasByDimension: Partial<Record<CalculationDimension, { formula: string; formulaSQL?: string }>> = {};
      const displayNameByDimension: Partial<Record<CalculationDimension, string>> = {};
      let defaultFormula = kpiFormulaDesc;

      for (const { key, col } of DIMENSION_BLOCKS) {
        const inRecord = isInRecord(row[col]);
        const formula = String(row[col + 2] ?? '').trim();
        const displayName = String(row[col + 3] ?? '').trim();
        if (inRecord) allowedDimensions.push(key);
        if (formula) formulasByDimension[key] = { formula };
        if (displayName) displayNameByDimension[key] = displayName;
        if (formula && !defaultFormula) defaultFormula = formula;
      }

      const name = exampleKpi || displayNameByDimension.facility || displayNameByDimension.counterparty || dataElement;

      metrics.push({
        id: dataElement,
        name,
        page: 'P1',
        section: 'From Excel',
        metricType: 'Derived',
        formula: defaultFormula || '—',
        description: definition,
        displayFormat: '',
        sampleValue: '',
        sourceFields: [],
        dimensions: [],
        allowedDimensions: allowedDimensions.length > 0 ? allowedDimensions : undefined,
        formulasByDimension: Object.keys(formulasByDimension).length > 0 ? formulasByDimension : undefined,
        displayNameByDimension: Object.keys(displayNameByDimension).length > 0 ? displayNameByDimension : undefined,
      });
    }
    return metrics;
  } catch (e) {
    console.warn('loadMetricsFromExcel failed', e);
    return null;
  }
}
