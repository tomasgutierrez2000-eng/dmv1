import type { WorkBook, WorkSheet } from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedMetric {
  metric_id: string;
  name: string;
  domain: string;
  abbreviation: string;
  definition: string;
  generic_formula: string;
  unit_type: string;
  direction: string;
  metric_class: string;
  insight: string;
  rollup_strategy: string;
}

export interface ParsedSourceField {
  metric_id: string;
  layer: string;
  table: string;
  field: string;
  role: string;
  description: string;
}

export interface ParseError {
  sheet: string;
  row: number;
  message: string;
}

export interface ParsedUpload {
  metrics: ParsedMetric[];
  sourceFields: ParsedSourceField[];
  errors: ParseError[];
}

export interface MetricWithSources extends ParsedMetric {
  sources: ParsedSourceField[];
}

// ---------------------------------------------------------------------------
// Column definitions (order must match the Excel template)
// ---------------------------------------------------------------------------

const METRIC_COLUMNS: (keyof ParsedMetric)[] = [
  'metric_id',
  'name',
  'domain',
  'abbreviation',
  'definition',
  'generic_formula',
  'unit_type',
  'direction',
  'metric_class',
  'insight',
  'rollup_strategy',
];

const SOURCE_FIELD_COLUMNS: (keyof ParsedSourceField)[] = [
  'metric_id',
  'layer',
  'table',
  'field',
  'role',
  'description',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Case-insensitive sheet lookup; returns the actual sheet name or null. */
function findSheet(
  workbook: WorkBook,
  targetName: string,
): string | null {
  const lower = targetName.toLowerCase();
  return (
    workbook.SheetNames.find((n) => n.toLowerCase() === lower) ?? null
  );
}

/** Read a cell value as a trimmed string. Returns '' for null/undefined. */
function cellStr(sheet: WorkSheet, row: number, col: number): string {
  // xlsx uses A1-style addresses internally; convert (row, col) to address
  const addr = cellAddress(row, col);
  const cell = sheet[addr];
  if (cell == null) return '';
  const v = cell.v;
  if (v == null) return '';
  return String(v).trim();
}

/** Convert 0-based (row, col) to an A1 address (e.g. 0,0 -> "A1"). */
function cellAddress(row: number, col: number): string {
  let colStr = '';
  let c = col;
  while (true) {
    colStr = String.fromCharCode(65 + (c % 26)) + colStr;
    c = Math.floor(c / 26) - 1;
    if (c < 0) break;
  }
  return `${colStr}${row + 1}`;
}

/** Check whether every cell in a row is empty. */
function isRowEmpty(
  sheet: WorkSheet,
  row: number,
  colCount: number,
): boolean {
  for (let c = 0; c < colCount; c++) {
    if (cellStr(sheet, row, c) !== '') return false;
  }
  return true;
}

/** Determine the last used row index (0-based) using the sheet's !ref range. */
function lastRow(sheet: WorkSheet): number {
  if (!sheet['!ref']) return 0;
  // Parse "A1:Z100" style ref — extract the row number from the end part
  const parts = sheet['!ref'].split(':');
  const endPart = parts[1] || parts[0];
  const rowMatch = endPart.match(/(\d+)$/);
  if (!rowMatch) return 0;
  return parseInt(rowMatch[1], 10) - 1; // convert 1-based to 0-based
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseMetricsSheet(
  sheet: WorkSheet,
  sheetLabel: string,
): { metrics: ParsedMetric[]; errors: ParseError[] } {
  const metrics: ParsedMetric[] = [];
  const errors: ParseError[] = [];
  const endRow = lastRow(sheet);

  // Row 0 = header, data starts at row 1
  for (let r = 1; r <= endRow; r++) {
    // Skip entirely empty rows
    if (isRowEmpty(sheet, r, METRIC_COLUMNS.length)) continue;

    const excelRow = r + 1; // 1-based row number for error reporting

    // Build a record from positional columns
    const record: Record<string, string> = {};
    for (let c = 0; c < METRIC_COLUMNS.length; c++) {
      record[METRIC_COLUMNS[c]] = cellStr(sheet, r, c);
    }

    // Validation
    if (!record.metric_id) {
      errors.push({
        sheet: sheetLabel,
        row: excelRow,
        message: 'Missing metric_id',
      });
      continue;
    }
    if (!record.name) {
      errors.push({
        sheet: sheetLabel,
        row: excelRow,
        message: `Missing name for metric_id "${record.metric_id}"`,
      });
      continue;
    }

    metrics.push(record as unknown as ParsedMetric);
  }

  return { metrics, errors };
}

function parseSourceFieldsSheet(
  sheet: WorkSheet,
  sheetLabel: string,
): { sourceFields: ParsedSourceField[]; errors: ParseError[] } {
  const sourceFields: ParsedSourceField[] = [];
  const errors: ParseError[] = [];
  const endRow = lastRow(sheet);

  for (let r = 1; r <= endRow; r++) {
    if (isRowEmpty(sheet, r, SOURCE_FIELD_COLUMNS.length)) continue;

    const excelRow = r + 1;

    const record: Record<string, string> = {};
    for (let c = 0; c < SOURCE_FIELD_COLUMNS.length; c++) {
      record[SOURCE_FIELD_COLUMNS[c]] = cellStr(sheet, r, c);
    }

    // Skip rows without metric_id (intentionally blank linking rows)
    if (!record.metric_id) continue;

    sourceFields.push(record as unknown as ParsedSourceField);
  }

  return { sourceFields, errors };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an uploaded Excel metric template buffer into structured data.
 *
 * Expects two sheets:
 *   - "Metrics"      (columns: metric_id, name, domain, ...)
 *   - "SourceFields"  (columns: metric_id, layer, table, field, role, description)
 *
 * Sheet lookup is case-insensitive. Falls back to first/second sheet if
 * the named sheets are not found.
 */
export async function parseMetricTemplate(
  buffer: Buffer,
): Promise<ParsedUpload> {
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const errors: ParseError[] = [];

  // --- Metrics sheet ---
  const metricsSheetName =
    findSheet(workbook, 'Metrics') ?? workbook.SheetNames[0] ?? null;

  let metrics: ParsedMetric[] = [];
  if (metricsSheetName && workbook.Sheets[metricsSheetName]) {
    const result = parseMetricsSheet(
      workbook.Sheets[metricsSheetName],
      metricsSheetName,
    );
    metrics = result.metrics;
    errors.push(...result.errors);
  } else {
    errors.push({
      sheet: 'Metrics',
      row: 0,
      message: 'Metrics sheet not found in workbook',
    });
  }

  // --- SourceFields sheet ---
  const sourceSheetName =
    findSheet(workbook, 'SourceFields') ?? workbook.SheetNames[1] ?? null;

  let sourceFields: ParsedSourceField[] = [];
  if (sourceSheetName && workbook.Sheets[sourceSheetName]) {
    const result = parseSourceFieldsSheet(
      workbook.Sheets[sourceSheetName],
      sourceSheetName,
    );
    sourceFields = result.sourceFields;
    errors.push(...result.errors);
  }
  // SourceFields sheet is optional — no error if missing

  return { metrics, sourceFields, errors };
}

/**
 * Group source fields by metric_id and attach them to their parent metric.
 */
export function linkSourceFieldsToMetrics(
  parsed: ParsedUpload,
): MetricWithSources[] {
  // Build a lookup: metric_id -> ParsedSourceField[]
  const sourcesByMetric = new Map<string, ParsedSourceField[]>();
  for (const sf of parsed.sourceFields) {
    const key = sf.metric_id;
    if (!sourcesByMetric.has(key)) {
      sourcesByMetric.set(key, []);
    }
    sourcesByMetric.get(key)!.push(sf);
  }

  return parsed.metrics.map((metric) => ({
    ...metric,
    sources: sourcesByMetric.get(metric.metric_id) ?? [],
  }));
}
