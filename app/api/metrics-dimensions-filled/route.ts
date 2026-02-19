import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import type { CalculationDimension } from '@/data/l3-metrics';
import { METRICS_DIMENSIONS_FILLED } from '@/data/metrics_dimensions_filled';

export interface MetricDimensionFormulaRow {
  metricId: string;
  dimension: CalculationDimension;
  formula: string;
  formulaSQL?: string;
}

/** Column indices in "Definitions, KPI,Calc& Insights" sheet: row 1 headers, data from row 2. Level Logic per dimension. */
const DATA_ELEMENT_COL = 0;
const LEVEL_LOGIC_COLUMNS: { col: number; dimension: CalculationDimension }[] = [
  { col: 9, dimension: 'facility' },
  { col: 13, dimension: 'counterparty' },
  { col: 17, dimension: 'L3' },
  { col: 21, dimension: 'L2' },
  { col: 25, dimension: 'L1' },
];

/**
 * GET — Return formulas per metric and dimension.
 * Reads metrics_dimensions_filled.xlsx (project root or data/) with sheet "Definitions, KPI,Calc& Insights":
 * - Col 0: Data Element (metric key)
 * - Cols 9,13,17,21,25: Level Logic for Facility, Counterparty, L3 Desk, L2 Portfolio, L1 Department/LoB
 * Metrics engine matches formulas by metric.id or metric.name to Data Element.
 */
export async function GET() {
  const cwd = process.cwd();
  const pathsToTry = [
    path.join(cwd, 'data', 'metrics_dimensions_filled.xlsx'),
    path.join(cwd, 'metrics_dimensions_filled.xlsx'),
  ];
  const xlsxPath = pathsToTry.find((p) => fs.existsSync(p));
  let rows: MetricDimensionFormulaRow[] = [];

  if (xlsxPath) {
    try {
      const XLSX = await import('xlsx');
      const buffer = fs.readFileSync(xlsxPath);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      if (!sheet) {
        return NextResponse.json({ formulas: METRICS_DIMENSIONS_FILLED });
      }
      const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { defval: '', header: 1 });
      // Header rows 0 and 1; data from row 2
      for (let r = 2; r < raw.length; r++) {
        const row = raw[r];
        if (!row || !Array.isArray(row)) continue;
        const dataElement = String(row[DATA_ELEMENT_COL] ?? '').trim();
        if (!dataElement) continue;
        for (const { col, dimension } of LEVEL_LOGIC_COLUMNS) {
          const formula = String(row[col] ?? '').trim();
          if (!formula) continue;
          rows.push({
            metricId: dataElement,
            dimension,
            formula,
          });
        }
      }
    } catch (e) {
      console.warn('metrics-dimensions-filled: failed to read xlsx', e);
      rows = [...METRICS_DIMENSIONS_FILLED];
    }
  } else {
    rows = [...METRICS_DIMENSIONS_FILLED];
  }

  return NextResponse.json({ formulas: rows });
}
