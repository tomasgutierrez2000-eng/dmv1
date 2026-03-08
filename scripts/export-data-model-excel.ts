/**
 * Export the GSIB Credit Risk data model to a professionally formatted Excel workbook.
 * Reads ALL data from the data dictionary JSON (post-introspection from PostgreSQL).
 *
 * Produces output/data-model-reference.xlsx with 4 tabs:
 *   1. Summary       — Model overview, category breakdowns, table index
 *   2. L1             — Reference & Master Data (field-level detail)
 *   3. L2             — Snapshot & Event Data (field-level detail)
 *   4. L3             — Derived Metrics (field-level detail)
 *
 * Run:  npx tsx scripts/export-data-model-excel.ts
 */

import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

import { L3_TABLES } from '../data/l3-tables';
import { L1_META_MAP } from '../data/l1-table-meta';
import { L2_META_MAP } from '../data/l2-table-meta';
import { syncDataModel } from './sync-data-model';

// ═══════════════════════════════════════════════════════════════════════════
// Data Dictionary (single source for all layers)
// ═══════════════════════════════════════════════════════════════════════════

const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');

interface DDField {
  name: string;
  description?: string;
  why_required?: string;
  category?: string;
  data_type?: string;
  pk_fk?: {
    is_pk?: boolean;
    is_composite?: boolean;
    fk_target?: { layer: string; table: string; field: string };
  };
}
interface DDTable { name: string; layer: string; category: string; fields: DDField[] }
interface DDRelationship { from_layer: string; from_table: string; from_field: string; to_layer: string; to_table: string; to_field: string }
interface DataDict { L1: DDTable[]; L2: DDTable[]; L3: DDTable[]; relationships: DDRelationship[] }

let dd: DataDict;

function loadDataDictionary() {
  dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
}

// ═══════════════════════════════════════════════════════════════════════════
// Styling Constants
// ═══════════════════════════════════════════════════════════════════════════

const DARK_BLUE = '1F4E79';
const ACCENT_BLUE = '2E75B6';
const LIGHT_BLUE = 'D6E4F0';
const BORDER_GRAY = 'B0B0B0';
const WHITE = 'FFFFFF';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER_GRAY } },
  bottom: { style: 'thin', color: { argb: BORDER_GRAY } },
  left: { style: 'thin', color: { argb: BORDER_GRAY } },
  right: { style: 'thin', color: { argb: BORDER_GRAY } },
};

const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
const headerFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
const headerAlignment: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };

const bodyFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10 };
const bodyAlignment: Partial<ExcelJS.Alignment> = { vertical: 'top', wrapText: true };

const altFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
const whiteFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };

function applyHeaderRow(ws: ExcelJS.Worksheet, rowNum: number): void {
  const row = ws.getRow(rowNum);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = headerAlignment;
    cell.border = thinBorder;
  });
  row.height = 30;
}

function applyBodyCell(cell: ExcelJS.Cell, isAlt: boolean): void {
  cell.font = bodyFont;
  cell.alignment = bodyAlignment;
  cell.border = thinBorder;
  cell.fill = isAlt ? altFill : whiteFill;
}

// ═══════════════════════════════════════════════════════════════════════════
// Build Detail Sheet Data (all from data dictionary)
// ═══════════════════════════════════════════════════════════════════════════

type Row = (string | undefined)[];

const L1L2_HEADERS = ['Table Name', 'Category', 'SCD Type', 'Field Name', 'Description', 'Why Required', 'Data Type', 'Nullable', 'PK', 'FK Reference', 'Default'];
const L3_HEADERS = ['Table Name', 'Category', 'Tier', 'Field Name', 'Description', 'Why Required', 'Data Type', 'Nullable', 'PK', 'FK Reference', 'Default'];

const COL_WIDTHS: Record<string, number> = {
  'Table Name': 34, 'Category': 30, 'SCD Type': 13, 'Tier': 10,
  'Field Name': 34, 'Description': 52, 'Why Required': 46,
  'Data Type': 20, 'Nullable': 10, 'PK': 7, 'FK Reference': 48, 'Default': 18,
};

// Build FK lookup from relationships for a given layer+table
function buildFkLookup(layer: string, tableName: string): Map<string, string> {
  const fks = new Map<string, string>();
  for (const r of dd.relationships) {
    if (r.from_layer === layer && r.from_table === tableName) {
      fks.set(r.from_field, `${r.to_layer.toLowerCase()}.${r.to_table}(${r.to_field})`);
    }
  }
  return fks;
}

function buildLayerRows(
  layer: 'L1' | 'L2' | 'L3',
  getScdOrTier: (tableName: string) => string,
): Row[] {
  const rows: Row[] = [];
  for (const table of dd[layer]) {
    const scdOrTier = getScdOrTier(table.name);
    const fkLookup = buildFkLookup(layer, table.name);
    for (const f of table.fields) {
      const fkRef = f.pk_fk?.fk_target
        ? `${f.pk_fk.fk_target.layer.toLowerCase()}.${f.pk_fk.fk_target.table}(${f.pk_fk.fk_target.field})`
        : fkLookup.get(f.name) ?? '';
      rows.push([
        table.name,
        table.category,
        scdOrTier,
        f.name,
        f.description ?? '',
        f.why_required ?? '',
        f.data_type ?? '',
        f.pk_fk?.is_pk ? 'No' : 'Yes',  // PK columns are NOT NULL
        f.pk_fk?.is_pk ? 'Yes' : '',
        fkRef,
        '',  // Default (not stored in data dictionary enrichment)
      ]);
    }
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// Compute Stats
// ═══════════════════════════════════════════════════════════════════════════

interface LayerStats {
  tableCount: number;
  fieldCount: number;
  pkCount: number;
  fkCount: number;
  categories: Map<string, number>;
  tableIndex: Array<{ table: string; category: string; scdOrTier: string; fieldCount: number }>;
}

function computeLayerStats(
  layer: 'L1' | 'L2' | 'L3',
  getScdOrTier: (tableName: string) => string,
): LayerStats {
  const categories = new Map<string, number>();
  const tableIndex: LayerStats['tableIndex'] = [];
  let pkCount = 0, fkCount = 0;

  for (const t of dd[layer]) {
    categories.set(t.category, (categories.get(t.category) ?? 0) + 1);
    const fkLookup = buildFkLookup(layer, t.name);
    for (const f of t.fields) {
      if (f.pk_fk?.is_pk) pkCount++;
      if (f.pk_fk?.fk_target || fkLookup.has(f.name)) fkCount++;
    }
    tableIndex.push({
      table: t.name,
      category: t.category,
      scdOrTier: getScdOrTier(t.name),
      fieldCount: t.fields.length,
    });
  }

  return {
    tableCount: dd[layer].length,
    fieldCount: dd[layer].reduce((s, t) => s + t.fields.length, 0),
    pkCount,
    fkCount,
    categories,
    tableIndex,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Create Detail Worksheet
// ═══════════════════════════════════════════════════════════════════════════

function addDetailSheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: Row[]): void {
  const ws = wb.addWorksheet(name);
  ws.columns = headers.map(h => ({ header: h, width: COL_WIDTHS[h] ?? 15 }));
  applyHeaderRow(ws, 1);

  let prevTable = '';
  let colorIndex = 0;
  for (const row of rows) {
    const tableName = row[0] ?? '';
    if (tableName !== prevTable) { colorIndex++; prevTable = tableName; }
    const isAlt = colorIndex % 2 === 0;
    const excelRow = ws.addRow(row);
    excelRow.eachCell({ includeEmpty: true }, (cell) => applyBodyCell(cell, isAlt));
  }

  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: headers.length } };
}

// ═══════════════════════════════════════════════════════════════════════════
// Build Summary Worksheet
// ═══════════════════════════════════════════════════════════════════════════

function addSummarySheet(wb: ExcelJS.Workbook, l1: LayerStats, l2: LayerStats, l3: LayerStats): void {
  const ws = wb.addWorksheet('Summary');

  const sectionFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 13, bold: true, color: { argb: DARK_BLUE } };
  const subHeaderFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT_BLUE } };
  const subHeaderFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };

  const total = {
    tables: l1.tableCount + l2.tableCount + l3.tableCount,
    fields: l1.fieldCount + l2.fieldCount + l3.fieldCount,
    pk: l1.pkCount + l2.pkCount + l3.pkCount,
    fk: l1.fkCount + l2.fkCount + l3.fkCount,
  };

  let r = 1;
  ws.mergeCells(r, 1, r, 5);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = 'GSIB Credit Risk Data Model — Reference Summary';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: DARK_BLUE } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 32;

  r += 2;
  ws.getCell(r, 1).value = 'Model Overview';
  ws.getCell(r, 1).font = sectionFont;
  ws.getRow(r).height = 22;

  r += 1;
  const overviewHeaders = ['Metric', 'L1 — Reference', 'L2 — Snapshot', 'L3 — Derived', 'Total'];
  overviewHeaders.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    cell.fill = subHeaderFill;
    cell.font = subHeaderFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });
  ws.getRow(r).height = 22;

  const overviewRows = [
    ['Tables', l1.tableCount, l2.tableCount, l3.tableCount, total.tables],
    ['Fields', l1.fieldCount, l2.fieldCount, l3.fieldCount, total.fields],
    ['Primary Keys', l1.pkCount, l2.pkCount, l3.pkCount, total.pk],
    ['FK References', l1.fkCount, l2.fkCount, l3.fkCount, total.fk],
  ];
  for (const rowData of overviewRows) {
    r++;
    const isAlt = (r - 4) % 2 === 0;
    rowData.forEach((val, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = val;
      cell.font = i === 0 ? { name: 'Calibri', size: 10, bold: true } : { name: 'Calibri', size: 10 };
      cell.alignment = i === 0 ? { horizontal: 'left', vertical: 'middle' } : { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      cell.fill = isAlt ? altFill : whiteFill;
    });
  }

  r += 2;
  ws.getCell(r, 1).value = 'Categories by Layer';
  ws.getCell(r, 1).font = sectionFont;
  ws.getRow(r).height = 22;

  r++;
  const catSections: Array<{ label: string; cats: Map<string, number>; startCol: number }> = [
    { label: 'L1 Category', cats: l1.categories, startCol: 1 },
    { label: 'L2 Category', cats: l2.categories, startCol: 4 },
    { label: 'L3 Category', cats: l3.categories, startCol: 7 },
  ];

  const catHeaderRow = r;
  for (const sec of catSections) {
    const hdrCell = ws.getCell(catHeaderRow, sec.startCol);
    hdrCell.value = sec.label;
    hdrCell.fill = subHeaderFill; hdrCell.font = subHeaderFont;
    hdrCell.alignment = { horizontal: 'left', vertical: 'middle' }; hdrCell.border = thinBorder;

    const cntCell = ws.getCell(catHeaderRow, sec.startCol + 1);
    cntCell.value = 'Tables';
    cntCell.fill = subHeaderFill; cntCell.font = subHeaderFont;
    cntCell.alignment = { horizontal: 'center', vertical: 'middle' }; cntCell.border = thinBorder;
  }

  const maxCats = Math.max(l1.categories.size, l2.categories.size, l3.categories.size);
  for (let ci = 0; ci < maxCats; ci++) {
    const dataRow = catHeaderRow + 1 + ci;
    const isAlt = ci % 2 === 0;
    for (const sec of catSections) {
      const entries = [...sec.cats.entries()];
      if (ci < entries.length) {
        const catCell = ws.getCell(dataRow, sec.startCol);
        catCell.value = entries[ci][0]; catCell.font = bodyFont;
        catCell.alignment = { horizontal: 'left', vertical: 'middle' };
        catCell.border = thinBorder; catCell.fill = isAlt ? altFill : whiteFill;

        const cntCell = ws.getCell(dataRow, sec.startCol + 1);
        cntCell.value = entries[ci][1]; cntCell.font = bodyFont;
        cntCell.alignment = { horizontal: 'center', vertical: 'middle' };
        cntCell.border = thinBorder; cntCell.fill = isAlt ? altFill : whiteFill;
      }
    }
  }

  r = catHeaderRow + maxCats + 3;
  ws.getCell(r, 1).value = 'Table Index';
  ws.getCell(r, 1).font = sectionFont;
  ws.getRow(r).height = 22;

  r++;
  const indexHeaders = ['Layer', 'Table Name', 'Category', 'SCD / Tier', 'Field Count'];
  indexHeaders.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h; cell.fill = subHeaderFill; cell.font = subHeaderFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = thinBorder;
  });
  ws.getRow(r).height = 22;

  const allTables = [
    ...l1.tableIndex.map(t => ({ layer: 'L1', ...t })),
    ...l2.tableIndex.map(t => ({ layer: 'L2', ...t })),
    ...l3.tableIndex.map(t => ({ layer: 'L3', ...t })),
  ];

  let prevLayer = '';
  let layerColor = 0;
  for (const t of allTables) {
    r++;
    if (t.layer !== prevLayer) { layerColor++; prevLayer = t.layer; }
    const isAlt = layerColor % 2 === 0;
    const vals = [t.layer, t.table, t.category, t.scdOrTier, t.fieldCount];
    vals.forEach((val, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = val; cell.font = bodyFont;
      cell.alignment = i === 4 ? { horizontal: 'center', vertical: 'middle' } : { horizontal: 'left', vertical: 'middle' };
      cell.border = thinBorder; cell.fill = isAlt ? altFill : whiteFill;
    });
  }

  ws.getColumn(1).width = 28; ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 30; ws.getColumn(4).width = 26;
  ws.getColumn(5).width = 16; ws.getColumn(6).width = 4;
  ws.getColumn(7).width = 30; ws.getColumn(8).width = 12;
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  // Sync data dictionary from golden source before export
  console.log('  Syncing data model sources...');
  syncDataModel();
  console.log('  Sync complete.');

  // Load the (now-synced) data dictionary
  loadDataDictionary();

  const l3MetaMap = new Map(L3_TABLES.map(t => [t.name, t]));

  // SCD/Tier lookup functions
  const getL1Scd = (name: string) => L1_META_MAP.get(name)?.scd ?? '';
  const getL2Scd = (name: string) => L2_META_MAP.get(name)?.scd ?? '';
  const getL3Tier = (name: string) => {
    const meta = l3MetaMap.get(name);
    return meta ? `Tier ${meta.tier}` : '';
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'GSIB Data Model Generator';
  wb.created = new Date();

  // Build rows from data dictionary
  const l1Rows = buildLayerRows('L1', getL1Scd);
  const l2Rows = buildLayerRows('L2', getL2Scd);
  const l3Rows = buildLayerRows('L3', getL3Tier);

  // Compute stats
  const l1Stats = computeLayerStats('L1', getL1Scd);
  const l2Stats = computeLayerStats('L2', getL2Scd);
  const l3Stats = computeLayerStats('L3', getL3Tier);

  // Build sheets
  addSummarySheet(wb, l1Stats, l2Stats, l3Stats);
  addDetailSheet(wb, 'L1 - Reference & Master', L1L2_HEADERS, l1Rows);
  addDetailSheet(wb, 'L2 - Snapshot & Event', L1L2_HEADERS, l2Rows);
  addDetailSheet(wb, 'L3 - Derived Metrics', L3_HEADERS, l3Rows);

  // Write
  const outDir = path.resolve(__dirname, '../output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'data-model-reference.xlsx');
  await wb.xlsx.writeFile(outPath);

  console.log(`\n  Data Model Reference Excel generated`);
  console.log(`  ${outPath}\n`);
  console.log(`  Summary tab:`);
  console.log(`    L1: ${l1Stats.tableCount} tables, ${l1Stats.fieldCount} fields, ${l1Stats.categories.size} categories`);
  console.log(`    L2: ${l2Stats.tableCount} tables, ${l2Stats.fieldCount} fields, ${l2Stats.categories.size} categories`);
  console.log(`    L3: ${l3Stats.tableCount} tables, ${l3Stats.fieldCount} fields, ${l3Stats.categories.size} categories`);
  console.log(`    Total: ${l1Stats.tableCount + l2Stats.tableCount + l3Stats.tableCount} tables, ${l1Stats.fieldCount + l2Stats.fieldCount + l3Stats.fieldCount} fields`);
}

main().catch(err => { console.error(err); process.exit(1); });
