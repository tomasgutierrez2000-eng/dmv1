/**
 * Export the GSIB Credit Risk data model to a professionally formatted Excel workbook.
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

import { L1_TABLES } from './l1/l1-definitions';
import { L2_TABLES } from './l2/l2-definitions';
import { L3_TABLES } from '../data/l3-tables';
import { syncDataModel } from './sync-data-model';

// ═══════════════════════════════════════════════════════════════════════════
// Data Dictionary (descriptions + why_required)
// ═══════════════════════════════════════════════════════════════════════════

const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');
interface DDField {
  name: string;
  description?: string;
  why_required?: string;
  category?: string;
  data_type?: string;
}
interface DDTable { name: string; layer: string; category: string; fields: DDField[] }
interface DataDictionary { L1: DDTable[]; L2: DDTable[]; L3: DDTable[] }

const dd: DataDictionary = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));

type FieldMeta = { description: string; why_required: string; category: string };
const fieldLookup = new Map<string, FieldMeta>();
const tableCategoryLookup = new Map<string, string>();

for (const layer of ['L1', 'L2', 'L3'] as const) {
  for (const table of dd[layer]) {
    tableCategoryLookup.set(`${layer}.${table.name}`, table.category);
    for (const f of table.fields) {
      fieldLookup.set(`${layer}.${table.name}.${f.name}`, {
        description: f.description ?? '',
        why_required: f.why_required ?? '',
        category: table.category,
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// L3 DDL Parsing
// ═══════════════════════════════════════════════════════════════════════════

const DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');
const ddlSql = fs.readFileSync(DDL_PATH, 'utf-8');

interface L3Column {
  name: string; type: string; nullable: boolean;
  pk: boolean; fk: string; defaultVal: string;
}
interface L3ParsedTable { name: string; columns: L3Column[]; pkColumns: string[] }

function parseL3DDL(sql: string): L3ParsedTable[] {
  const tables: L3ParsedTable[] = [];
  const tableRegex = /CREATE TABLE IF NOT EXISTS l3\.(\w+)\s*\(([\s\S]*?)\);/g;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const pkMatch = body.match(/PRIMARY KEY\s*\(([^)]+)\)/);
    const pkColumns = pkMatch ? pkMatch[1].split(',').map(c => c.trim()) : [];

    const afterTable = sql.substring(match.index + match[0].length, match.index + match[0].length + 2000);
    const fkMap = new Map<string, string>();
    const fkRegex = /-- FK:\s+(\w+)\s*→\s*(.+)/g;
    let fkMatch: RegExpExecArray | null;
    while ((fkMatch = fkRegex.exec(afterTable)) !== null) {
      if (afterTable.substring(0, fkMatch.index).includes('CREATE TABLE')) break;
      fkMap.set(fkMatch[1], fkMatch[2].trim());
    }

    const columns: L3Column[] = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('PRIMARY KEY') || trimmed.startsWith('--')) continue;
      const colMatch = trimmed.match(/^(\w+)\s+([\w(),.]+(?:\(\d+(?:,\d+)?\))?)\s*(.*?)(?:,\s*)?$/);
      if (!colMatch) continue;
      const colName = colMatch[1];
      const rest = colMatch[3] || '';
      const defaultMatch = rest.match(/DEFAULT\s+(.+)/i);
      columns.push({
        name: colName,
        type: colMatch[2],
        nullable: !rest.includes('NOT NULL'),
        pk: pkColumns.includes(colName),
        fk: fkMap.get(colName) ?? '',
        defaultVal: defaultMatch ? defaultMatch[1].replace(/,\s*$/, '') : '',
      });
    }
    tables.push({ name: tableName, columns, pkColumns });
  }
  return tables;
}

const l3Parsed = parseL3DDL(ddlSql);
const l3MetaMap = new Map(L3_TABLES.map(t => [t.name, t]));

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
// Build Detail Sheet Data
// ═══════════════════════════════════════════════════════════════════════════

type Row = (string | undefined)[];

function buildL1L2Rows(
  tables: Array<{ tableName: string; scd: string; columns: Array<{ name: string; type: string; nullable?: boolean; pk?: boolean; fk?: string; default?: string }> }>,
  layer: 'L1' | 'L2',
): Row[] {
  const rows: Row[] = [];
  for (const table of tables) {
    const cat = tableCategoryLookup.get(`${layer}.${table.tableName}`) ?? 'Uncategorized';
    for (const col of table.columns) {
      const meta = fieldLookup.get(`${layer}.${table.tableName}.${col.name}`);
      rows.push([
        table.tableName, cat, table.scd, col.name,
        meta?.description ?? '', meta?.why_required ?? '',
        col.type,
        col.nullable === false ? 'No' : 'Yes',
        col.pk ? 'Yes' : '',
        col.fk ?? '',
        col.default ?? '',
      ]);
    }
  }
  return rows;
}

function buildL3Rows(): Row[] {
  const rows: Row[] = [];
  for (const table of l3Parsed) {
    const meta = l3MetaMap.get(table.name);
    const cat = tableCategoryLookup.get(`L3.${table.name}`) ?? meta?.category ?? 'Uncategorized';
    const tier = meta ? `Tier ${meta.tier}` : '';
    for (const col of table.columns) {
      const fieldMeta = fieldLookup.get(`L3.${table.name}.${col.name}`);
      rows.push([
        table.name, cat, tier, col.name,
        fieldMeta?.description ?? '', fieldMeta?.why_required ?? '',
        col.type,
        col.nullable ? 'Yes' : 'No',
        col.pk ? 'Yes' : '',
        col.fk,
        col.defaultVal,
      ]);
    }
  }
  return rows;
}

const L1L2_HEADERS = ['Table Name', 'Category', 'SCD Type', 'Field Name', 'Description', 'Why Required', 'Data Type', 'Nullable', 'PK', 'FK Reference', 'Default'];
const L3_HEADERS = ['Table Name', 'Category', 'Tier', 'Field Name', 'Description', 'Why Required', 'Data Type', 'Nullable', 'PK', 'FK Reference', 'Default'];

const COL_WIDTHS: Record<string, number> = {
  'Table Name': 34, 'Category': 30, 'SCD Type': 13, 'Tier': 10,
  'Field Name': 34, 'Description': 52, 'Why Required': 46,
  'Data Type': 20, 'Nullable': 10, 'PK': 7, 'FK Reference': 48, 'Default': 18,
};

// ═══════════════════════════════════════════════════════════════════════════
// Create Detail Worksheet
// ═══════════════════════════════════════════════════════════════════════════

function addDetailSheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: Row[]): void {
  const ws = wb.addWorksheet(name);

  // Column definitions
  ws.columns = headers.map(h => ({ header: h, width: COL_WIDTHS[h] ?? 15 }));

  // Style header row
  applyHeaderRow(ws, 1);

  // Add data rows with alternating fills per table group
  let prevTable = '';
  let colorIndex = 0;
  for (const row of rows) {
    const tableName = row[0] ?? '';
    if (tableName !== prevTable) { colorIndex++; prevTable = tableName; }
    const isAlt = colorIndex % 2 === 0;
    const excelRow = ws.addRow(row);
    excelRow.eachCell({ includeEmpty: true }, (cell) => applyBodyCell(cell, isAlt));
  }

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  // Auto-filter
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: headers.length } };
}

// ═══════════════════════════════════════════════════════════════════════════
// Compute Stats for Summary
// ═══════════════════════════════════════════════════════════════════════════

interface LayerStats {
  tableCount: number;
  fieldCount: number;
  pkCount: number;
  fkCount: number;
  categories: Map<string, number>; // category -> table count
  tableIndex: Array<{ table: string; category: string; scdOrTier: string; fieldCount: number }>;
}

function computeL1L2Stats(
  tables: Array<{ tableName: string; scd: string; columns: Array<{ pk?: boolean; fk?: string }> }>,
  layer: 'L1' | 'L2',
): LayerStats {
  const categories = new Map<string, number>();
  const tableIndex: LayerStats['tableIndex'] = [];
  let pkCount = 0, fkCount = 0;

  for (const t of tables) {
    const cat = tableCategoryLookup.get(`${layer}.${t.tableName}`) ?? 'Uncategorized';
    categories.set(cat, (categories.get(cat) ?? 0) + 1);
    let tPk = 0, tFk = 0;
    for (const c of t.columns) {
      if (c.pk) { pkCount++; tPk++; }
      if (c.fk) { fkCount++; tFk++; }
    }
    tableIndex.push({ table: t.tableName, category: cat, scdOrTier: t.scd, fieldCount: t.columns.length });
  }
  return { tableCount: tables.length, fieldCount: tables.reduce((s, t) => s + t.columns.length, 0), pkCount, fkCount, categories, tableIndex };
}

function computeL3Stats(): LayerStats {
  const categories = new Map<string, number>();
  const tableIndex: LayerStats['tableIndex'] = [];
  let pkCount = 0, fkCount = 0;

  for (const t of l3Parsed) {
    const meta = l3MetaMap.get(t.name);
    const cat = tableCategoryLookup.get(`L3.${t.name}`) ?? meta?.category ?? 'Uncategorized';
    categories.set(cat, (categories.get(cat) ?? 0) + 1);
    for (const c of t.columns) {
      if (c.pk) pkCount++;
      if (c.fk) fkCount++;
    }
    tableIndex.push({
      table: t.name,
      category: cat,
      scdOrTier: meta ? `Tier ${meta.tier}` : '',
      fieldCount: t.columns.length,
    });
  }
  return {
    tableCount: l3Parsed.length,
    fieldCount: l3Parsed.reduce((s, t) => s + t.columns.length, 0),
    pkCount, fkCount, categories, tableIndex,
  };
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

  // ── Title ──
  let r = 1;
  ws.mergeCells(r, 1, r, 5);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = 'GSIB Credit Risk Data Model — Reference Summary';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: DARK_BLUE } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(r).height = 32;

  // ── Section A: Model Overview ──
  r += 2; // row 3
  ws.getCell(r, 1).value = 'Model Overview';
  ws.getCell(r, 1).font = sectionFont;
  ws.getRow(r).height = 22;

  r += 1; // row 4 — header
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
      cell.font = i === 0
        ? { name: 'Calibri', size: 10, bold: true }
        : { name: 'Calibri', size: 10 };
      cell.alignment = i === 0
        ? { horizontal: 'left', vertical: 'middle' }
        : { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      cell.fill = isAlt ? altFill : whiteFill;
    });
  }

  // ── Section B: Category Breakdowns (side by side) ──
  r += 2;
  ws.getCell(r, 1).value = 'Categories by Layer';
  ws.getCell(r, 1).font = sectionFont;
  ws.getRow(r).height = 22;

  r++;
  // Three side-by-side tables: cols 1-2 (L1), cols 4-5 (L2), cols 7-8 (L3)
  const catSections: Array<{ label: string; cats: Map<string, number>; startCol: number }> = [
    { label: 'L1 Category', cats: l1.categories, startCol: 1 },
    { label: 'L2 Category', cats: l2.categories, startCol: 4 },
    { label: 'L3 Category', cats: l3.categories, startCol: 7 },
  ];

  const catHeaderRow = r;
  for (const sec of catSections) {
    const hdrCell = ws.getCell(catHeaderRow, sec.startCol);
    hdrCell.value = sec.label;
    hdrCell.fill = subHeaderFill;
    hdrCell.font = subHeaderFont;
    hdrCell.alignment = { horizontal: 'left', vertical: 'middle' };
    hdrCell.border = thinBorder;

    const cntCell = ws.getCell(catHeaderRow, sec.startCol + 1);
    cntCell.value = 'Tables';
    cntCell.fill = subHeaderFill;
    cntCell.font = subHeaderFont;
    cntCell.alignment = { horizontal: 'center', vertical: 'middle' };
    cntCell.border = thinBorder;
  }

  const maxCats = Math.max(l1.categories.size, l2.categories.size, l3.categories.size);
  for (let ci = 0; ci < maxCats; ci++) {
    const dataRow = catHeaderRow + 1 + ci;
    const isAlt = ci % 2 === 0;
    for (const sec of catSections) {
      const entries = [...sec.cats.entries()];
      if (ci < entries.length) {
        const catCell = ws.getCell(dataRow, sec.startCol);
        catCell.value = entries[ci][0];
        catCell.font = bodyFont;
        catCell.alignment = { horizontal: 'left', vertical: 'middle' };
        catCell.border = thinBorder;
        catCell.fill = isAlt ? altFill : whiteFill;

        const cntCell = ws.getCell(dataRow, sec.startCol + 1);
        cntCell.value = entries[ci][1];
        cntCell.font = bodyFont;
        cntCell.alignment = { horizontal: 'center', vertical: 'middle' };
        cntCell.border = thinBorder;
        cntCell.fill = isAlt ? altFill : whiteFill;
      }
    }
  }

  // ── Section C: Table Index ──
  r = catHeaderRow + maxCats + 3;
  ws.getCell(r, 1).value = 'Table Index';
  ws.getCell(r, 1).font = sectionFont;
  ws.getRow(r).height = 22;

  r++;
  const indexHeaders = ['Layer', 'Table Name', 'Category', 'SCD / Tier', 'Field Count'];
  indexHeaders.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    cell.fill = subHeaderFill;
    cell.font = subHeaderFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
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
      cell.value = val;
      cell.font = bodyFont;
      cell.alignment = i === 4
        ? { horizontal: 'center', vertical: 'middle' }
        : { horizontal: 'left', vertical: 'middle' };
      cell.border = thinBorder;
      cell.fill = isAlt ? altFill : whiteFill;
    });
  }

  // Column widths for summary sheet
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 30;
  ws.getColumn(4).width = 26;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 4;  // spacer
  ws.getColumn(7).width = 30;
  ws.getColumn(8).width = 12;

  // Freeze panes at row 2 (below title)
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  // Sync all sources → data dictionary before export
  console.log('  Syncing data model sources...');
  const syncReport = syncDataModel();
  if (syncReport.tablesAdded.length > 0 || syncReport.fieldsAdded.length > 0) {
    console.log(`  Sync: added ${syncReport.tablesAdded.length} tables, ${syncReport.fieldsAdded.length} fields`);
    // Re-read the data dictionary after sync to pick up new descriptions
    const updatedDD: DataDictionary = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
    fieldLookup.clear();
    tableCategoryLookup.clear();
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of updatedDD[layer]) {
        tableCategoryLookup.set(`${layer}.${table.name}`, table.category);
        for (const f of table.fields) {
          fieldLookup.set(`${layer}.${table.name}.${f.name}`, {
            description: f.description ?? '',
            why_required: f.why_required ?? '',
            category: table.category,
          });
        }
      }
    }
  } else {
    console.log('  All sources in sync.');
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'GSIB Data Model Generator';
  wb.created = new Date();

  // Compute data
  const l1Rows = buildL1L2Rows(L1_TABLES, 'L1');
  const l2Rows = buildL1L2Rows(L2_TABLES, 'L2');
  const l3Rows = buildL3Rows();

  const l1Stats = computeL1L2Stats(L1_TABLES, 'L1');
  const l2Stats = computeL1L2Stats(L2_TABLES, 'L2');
  const l3Stats = computeL3Stats();

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

  // Console summary
  console.log(`\n  Data Model Reference Excel generated`);
  console.log(`  ${outPath}\n`);
  console.log(`  Summary tab:`);
  console.log(`    L1: ${l1Stats.tableCount} tables, ${l1Stats.fieldCount} fields, ${l1Stats.categories.size} categories`);
  console.log(`    L2: ${l2Stats.tableCount} tables, ${l2Stats.fieldCount} fields, ${l2Stats.categories.size} categories`);
  console.log(`    L3: ${l3Stats.tableCount} tables, ${l3Stats.fieldCount} fields, ${l3Stats.categories.size} categories`);
  console.log(`    Total: ${l1Stats.tableCount + l2Stats.tableCount + l3Stats.tableCount} tables, ${l1Stats.fieldCount + l2Stats.fieldCount + l3Stats.fieldCount} fields`);
}

main().catch(err => { console.error(err); process.exit(1); });
