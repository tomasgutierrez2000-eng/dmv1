import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import type { CalculationDimension, SourceField } from '@/data/l3-metrics';
import { METRICS_DIMENSIONS_FILLED } from '@/data/metrics_dimensions_filled';

export const dynamic = 'force-dynamic';

export interface MetricDimensionFormulaRow {
  metricId: string;
  dimension: CalculationDimension;
  formula: string;
  formulaSQL?: string;
  definition?: string;
  dashboardDisplayName?: string;
  laymanFormula?: string;
  lineageNarrative?: string;
  sourceFields?: SourceField[];
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

const LEVEL_DEFINITION_FILE = path.join(process.cwd(), 'data', 'all_5_metrics_level_definitions.xlsb');
const LEVEL_DEFINITION_JSON_FILE = path.join(process.cwd(), 'data', 'all_5_metrics_level_definitions.json');
const LEVEL_DEFINITION_COLUMNS: {
  dimension: CalculationDimension;
  definitionCol: number;
  laymanFormulaCol: number;
  formulaCol: number;
  lineageCol: number;
  sourceFieldsCol: number;
  displayNameCol: number;
}[] = [
  { dimension: 'facility', definitionCol: 13, laymanFormulaCol: 15, formulaCol: 16, lineageCol: 17, sourceFieldsCol: 18, displayNameCol: 19 },
  { dimension: 'counterparty', definitionCol: 21, laymanFormulaCol: 23, formulaCol: 24, lineageCol: 25, sourceFieldsCol: 26, displayNameCol: 27 },
  { dimension: 'L3', definitionCol: 29, laymanFormulaCol: 31, formulaCol: 32, lineageCol: 33, sourceFieldsCol: 34, displayNameCol: 35 },
  { dimension: 'L2', definitionCol: 37, laymanFormulaCol: 39, formulaCol: 40, lineageCol: 41, sourceFieldsCol: 42, displayNameCol: 43 },
  { dimension: 'L1', definitionCol: 45, laymanFormulaCol: 47, formulaCol: 48, lineageCol: 49, sourceFieldsCol: 50, displayNameCol: 51 },
];

function parseSourceFields(value: unknown): SourceField[] | undefined {
  if (Array.isArray(value)) return value as SourceField[];
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const out = parsed.filter(
      (sf) =>
        sf &&
        (sf.layer === 'L1' || sf.layer === 'L2') &&
        typeof sf.table === 'string' &&
        typeof sf.field === 'string'
    ) as SourceField[];
    return out.length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

/**
 * GET — Return formulas per metric and dimension.
 * Reads metrics_dimensions_filled.xlsx (project root or data/) with sheet "Definitions, KPI,Calc& Insights":
 * - Col 0: Data Element (metric key)
 * - Cols 9,13,17,21,25: Level Logic for Facility, Counterparty, L3 Desk, L2 Portfolio, L1 Department/LoB
 * Metrics engine matches formulas by metric.id or metric.name to Data Element.
 */
export async function GET() {
  const byKey = new Map<string, MetricDimensionFormulaRow>();
  for (const row of METRICS_DIMENSIONS_FILLED) {
    byKey.set(`${row.metricId}\t${row.dimension}`, { ...row });
  }

  // Prefer tracked JSON for stable deployments/environments.
  if (fs.existsSync(LEVEL_DEFINITION_JSON_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(LEVEL_DEFINITION_JSON_FILE, 'utf-8')) as {
        rows?: MetricDimensionFormulaRow[];
      };
      for (const row of raw.rows ?? []) {
        if (!row?.metricId || !row?.dimension) continue;
        const key = `${row.metricId}\t${row.dimension}`;
        const existing = byKey.get(key);
        byKey.set(key, {
          metricId: row.metricId,
          dimension: row.dimension,
          formula: row.formula || existing?.formula || '',
          formulaSQL: row.formulaSQL || existing?.formulaSQL,
          definition: row.definition || existing?.definition,
          laymanFormula: row.laymanFormula || existing?.laymanFormula,
          lineageNarrative: row.lineageNarrative || existing?.lineageNarrative,
          sourceFields: row.sourceFields || existing?.sourceFields,
          dashboardDisplayName: row.dashboardDisplayName || existing?.dashboardDisplayName,
        });
      }
    } catch (e) {
      console.warn('metrics-dimensions-filled: failed to read level definition json', e);
    }
  }

  // Parse the level definitions template (xlsb) for per-dimension definition/formula/display name.
  if (fs.existsSync(LEVEL_DEFINITION_FILE)) {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(fs.readFileSync(LEVEL_DEFINITION_FILE), { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (sheet) {
        const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { defval: '', header: 1 });
        for (let r = 1; r < raw.length; r++) {
          const row = raw[r];
          if (!row || !Array.isArray(row)) continue;
          const metricId = String(row[0] ?? '').trim();
          if (!metricId) continue;
          for (const cols of LEVEL_DEFINITION_COLUMNS) {
            const definition = String(row[cols.definitionCol] ?? '').trim();
            const laymanFormula = String(row[cols.laymanFormulaCol] ?? '').trim();
            const formula = String(row[cols.formulaCol] ?? '').trim();
            const lineageNarrative = String(row[cols.lineageCol] ?? '').trim();
            const sourceFields = parseSourceFields(row[cols.sourceFieldsCol]);
            const dashboardDisplayName = String(row[cols.displayNameCol] ?? '').trim();
            if (!definition && !laymanFormula && !formula && !lineageNarrative && !sourceFields && !dashboardDisplayName) continue;
            const key = `${metricId}\t${cols.dimension}`;
            const existing = byKey.get(key);
            byKey.set(key, {
              metricId,
              dimension: cols.dimension,
              formula: formula || existing?.formula || '',
              formulaSQL: existing?.formulaSQL,
              definition: definition || existing?.definition,
              laymanFormula: laymanFormula || existing?.laymanFormula,
              lineageNarrative: lineageNarrative || existing?.lineageNarrative,
              sourceFields: sourceFields || existing?.sourceFields,
              dashboardDisplayName: dashboardDisplayName || existing?.dashboardDisplayName,
            });
          }
        }
      }
    } catch (e) {
      console.warn('metrics-dimensions-filled: failed to read level definition xlsb', e);
    }
  }

  const cwd = process.cwd();
  const pathsToTry = [
    path.join(cwd, 'data', 'metrics_dimensions_filled.xlsx'),
    path.join(cwd, 'metrics_dimensions_filled.xlsx'),
  ];
  const xlsxPath = pathsToTry.find((p) => fs.existsSync(p));
  const rows: MetricDimensionFormulaRow[] = [];

  if (xlsxPath) {
    try {
      const XLSX = await import('xlsx');
      const buffer = fs.readFileSync(xlsxPath);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      if (!sheet) {
        return NextResponse.json({ formulas: Array.from(byKey.values()) });
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
          const parsedRow: MetricDimensionFormulaRow = {
            metricId: dataElement,
            dimension,
            formula,
          };
          rows.push(parsedRow);
          const key = `${parsedRow.metricId}\t${parsedRow.dimension}`;
          const existing = byKey.get(key);
          byKey.set(key, {
            ...existing,
            ...parsedRow,
            definition: existing?.definition,
            laymanFormula: existing?.laymanFormula,
            dashboardDisplayName: existing?.dashboardDisplayName,
          });
        }
      }
    } catch (e) {
      console.warn('metrics-dimensions-filled: failed to read xlsx', e);
    }
  }

  return NextResponse.json({ formulas: Array.from(byKey.values()) });
}
