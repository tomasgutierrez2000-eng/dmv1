import type { SchemaExport, SchemaFieldRow, SchemaRelationshipRow } from '../types/schemaExport';

// ── colour palette ────────────────────────────────────────────
const COLORS = {
  darkNavy: '1B2A4A',
  navy: '2C3E6B',
  white: 'FFFFFF',
  lightGray: 'F5F6F8',
  medGray: 'E2E4E9',
  borderGray: 'D0D3DA',
  accent: '3B82F6', // blue-500
  accentLight: 'EBF2FF',
  l1Color: '0D9488', // teal-600
  l1Light: 'ECFDF5',
  l2Color: '7C3AED', // violet-600
  l2Light: 'F5F3FF',
  l3Color: 'EA580C', // orange-600
  l3Light: 'FFF7ED',
  relColor: '64748B', // slate-500
  relLight: 'F8FAFC',
  summaryHeader: '1E3A5F',
  summaryLight: 'F0F4FA',
  black: '000000',
};

type ExcelJS = typeof import('exceljs');

// ── column definitions per layer ──────────────────────────────

interface ColDef {
  header: string;
  key: keyof SchemaFieldRow;
  width: number;
}

const L1_COLUMNS: ColDef[] = [
  { header: 'Table Name', key: 'tableName', width: 28 },
  { header: 'Category', key: 'category', width: 22 },
  { header: 'Field Name', key: 'fieldName', width: 28 },
  { header: 'Data Type', key: 'dataType', width: 14 },
  { header: 'Description', key: 'description', width: 48 },
  { header: 'PK', key: 'isPK', width: 6 },
  { header: 'FK', key: 'isFK', width: 6 },
  { header: 'FK Target Layer', key: 'fkTargetLayer', width: 14 },
  { header: 'FK Target Table', key: 'fkTargetTable', width: 22 },
  { header: 'FK Target Field', key: 'fkTargetField', width: 22 },
  { header: 'Why Required', key: 'whyRequired', width: 36 },
];

const L2_COLUMNS: ColDef[] = [
  { header: 'Table Name', key: 'tableName', width: 28 },
  { header: 'Category', key: 'category', width: 22 },
  { header: 'Field Name', key: 'fieldName', width: 28 },
  { header: 'Data Type', key: 'dataType', width: 14 },
  { header: 'Description', key: 'description', width: 48 },
  { header: 'PK', key: 'isPK', width: 6 },
  { header: 'FK', key: 'isFK', width: 6 },
  { header: 'FK Target Layer', key: 'fkTargetLayer', width: 14 },
  { header: 'FK Target Table', key: 'fkTargetTable', width: 22 },
  { header: 'FK Target Field', key: 'fkTargetField', width: 22 },
  { header: 'Simplification Note', key: 'simplificationNote', width: 40 },
];

const L3_COLUMNS: ColDef[] = [
  { header: 'Table Name', key: 'tableName', width: 28 },
  { header: 'Category', key: 'category', width: 22 },
  { header: 'Field Name', key: 'fieldName', width: 28 },
  { header: 'Data Type', key: 'dataType', width: 14 },
  { header: 'Description', key: 'description', width: 48 },
  { header: 'Formula', key: 'formula', width: 40 },
  { header: 'Source Tables', key: 'sourceTables', width: 30 },
  { header: 'Source Fields', key: 'sourceFields', width: 30 },
  { header: 'Derivation Logic', key: 'derivationLogic', width: 44 },
  { header: 'Dashboard Usage', key: 'dashboardUsage', width: 28 },
  { header: 'Grain', key: 'grain', width: 18 },
  { header: 'Notes', key: 'notes', width: 36 },
];

// ── helpers ───────────────────────────────────────────────────

function boolToExcel(v: boolean): string {
  return v ? 'Y' : '';
}

function applyHeaderStyle(
  row: import('exceljs').Row,
  bgColor: string,
  colCount: number,
) {
  row.height = 28;
  row.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum > colCount) return;
    cell.font = { bold: true, size: 11, color: { argb: COLORS.white } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'thin', color: { argb: COLORS.borderGray } },
    };
  });
}

function applyDataRowStyle(
  row: import('exceljs').Row,
  rowIndex: number,
  lightColor: string,
  colCount: number,
) {
  row.height = 20;
  const isEven = rowIndex % 2 === 0;
  row.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum > colCount) return;
    cell.font = { size: 10, color: { argb: '333333' } };
    if (isEven) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: lightColor },
      };
    }
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = {
      bottom: { style: 'hair', color: { argb: COLORS.medGray } },
    };
  });
}

// ── build layer sheet ─────────────────────────────────────────

function buildLayerSheet(
  workbook: import('exceljs').Workbook,
  sheetName: string,
  columns: ColDef[],
  fields: SchemaFieldRow[],
  headerColor: string,
  stripeColor: string,
) {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }],
  });

  // Set columns
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  // Style header row
  applyHeaderStyle(ws.getRow(1), headerColor, columns.length);

  // Add auto-filter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // Add data rows
  fields.forEach((f, idx) => {
    const rowData: Record<string, unknown> = {};
    for (const col of columns) {
      const val = f[col.key];
      if (typeof val === 'boolean') {
        rowData[col.key] = boolToExcel(val);
      } else {
        rowData[col.key] = val ?? '';
      }
    }
    const row = ws.addRow(rowData);
    applyDataRowStyle(row, idx, stripeColor, columns.length);
  });

  return ws;
}

// ── build relationships sheet ─────────────────────────────────

function buildRelationshipsSheet(
  workbook: import('exceljs').Workbook,
  exported: SchemaExport,
) {
  const ws = workbook.addWorksheet('Relationships', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }],
  });

  const relCols = [
    { header: 'Source Layer', key: 'sourceLayer', width: 14 },
    { header: 'Source Table', key: 'sourceTable', width: 28 },
    { header: 'Source Field', key: 'sourceField', width: 24 },
    { header: 'Target Layer', key: 'targetLayer', width: 14 },
    { header: 'Target Table', key: 'targetTable', width: 28 },
    { header: 'Target Field', key: 'targetField', width: 24 },
    { header: 'Type', key: 'relationshipType', width: 14 },
  ];

  ws.columns = relCols.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  applyHeaderStyle(ws.getRow(1), COLORS.relColor, relCols.length);

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: relCols.length },
  };

  exported.relationships.forEach((r, idx) => {
    const row = ws.addRow({
      sourceLayer: r.sourceLayer,
      sourceTable: r.sourceTable,
      sourceField: r.sourceField,
      targetLayer: r.targetLayer,
      targetTable: r.targetTable,
      targetField: r.targetField,
      relationshipType: r.relationshipType,
    });
    applyDataRowStyle(row, idx, COLORS.relLight, relCols.length);
  });

  return ws;
}

// ── build summary sheet ───────────────────────────────────────

function buildSummarySheet(
  workbook: import('exceljs').Workbook,
  exported: SchemaExport,
) {
  const ws = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: COLORS.accent } },
  });

  // Disable gridlines for a cleaner look
  ws.views = [{ showGridLines: false }];

  // Column widths
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 3;

  const l1Fields = exported.fields.filter((f) => f.level === 'L1');
  const l2Fields = exported.fields.filter((f) => f.level === 'L2');
  const l3Fields = exported.fields.filter((f) => f.level === 'L3');

  const l1Tables = new Set(l1Fields.map((f) => f.tableName));
  const l2Tables = new Set(l2Fields.map((f) => f.tableName));
  const l3Tables = new Set(l3Fields.map((f) => f.tableName));
  const allTables = new Set(exported.fields.map((f) => `${f.level}.${f.tableName}`));

  const crossLayerRels = exported.relationships.filter(
    (r) => r.sourceLayer !== r.targetLayer
  );

  let row = 1;

  // ── Title banner ──
  ws.mergeCells(`B${row}:F${row}`);
  const titleCell = ws.getCell(`B${row}`);
  titleCell.value = 'Data Model Schema — Export Summary';
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkNavy } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(row).height = 40;
  // Fill remaining visible cells in banner row
  for (const col of [2, 3, 4, 5, 6]) {
    const c = ws.getCell(row, col);
    if (col !== 2) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkNavy } };
    }
  }

  row += 1;
  ws.mergeCells(`B${row}:F${row}`);
  const dateCell = ws.getCell(`B${row}`);
  dateCell.value = `Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  dateCell.font = { size: 10, italic: true, color: { argb: '666666' } };
  dateCell.alignment = { horizontal: 'center' };
  ws.getRow(row).height = 22;

  row += 2;

  // ── Overview section ──
  const addSectionHeader = (title: string) => {
    ws.mergeCells(`B${row}:F${row}`);
    const cell = ws.getCell(`B${row}`);
    cell.value = title;
    cell.font = { bold: true, size: 12, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    cell.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 28;
    // Fill all cells in merged range
    for (const col of [3, 4, 5, 6]) {
      ws.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    }
    row++;
  };

  const addMetricRow = (label: string, value: number | string, isEven: boolean) => {
    const labelCell = ws.getCell(`B${row}`);
    const valueCell = ws.getCell(`C${row}`);
    ws.mergeCells(`C${row}:F${row}`);
    labelCell.value = label;
    valueCell.value = value;
    labelCell.font = { size: 11, color: { argb: '333333' } };
    valueCell.font = { size: 11, bold: true, color: { argb: COLORS.darkNavy } };
    valueCell.alignment = { horizontal: 'left', indent: 1 };
    ws.getRow(row).height = 24;
    if (isEven) {
      for (const col of [2, 3, 4, 5, 6]) {
        ws.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryLight } };
      }
    }
    // Add subtle border
    for (const col of [2, 3, 4, 5, 6]) {
      ws.getCell(row, col).border = {
        bottom: { style: 'hair', color: { argb: COLORS.medGray } },
      };
    }
    row++;
  };

  addSectionHeader('Overview');
  addMetricRow('Total Tables', allTables.size, false);
  addMetricRow('Total Fields', exported.fields.length, true);
  addMetricRow('Total Relationships', exported.relationships.length, false);
  addMetricRow('Cross-Layer Relationships', crossLayerRels.length, true);

  row++;

  // ── Layer breakdown ──
  addSectionHeader('Layer Breakdown');

  // Sub-header row
  const subHeaderLabels = ['', 'Layer', 'Tables', 'Fields', 'Avg Fields/Table'];
  for (let i = 0; i < subHeaderLabels.length; i++) {
    const cell = ws.getCell(row, i + 2);
    cell.value = subHeaderLabels[i];
    cell.font = { bold: true, size: 10, color: { argb: '555555' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.medGray } };
    cell.alignment = { horizontal: i >= 2 ? 'center' : 'left', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: COLORS.borderGray } } };
  }
  // Merge col 2 placeholder
  ws.getCell(row, 2).value = '';
  ws.getCell(row, 3).value = 'Layer';
  ws.getCell(row, 4).value = 'Tables';
  ws.getCell(row, 5).value = 'Fields';
  ws.getCell(row, 6).value = 'Avg Fields / Table';
  ws.getRow(row).height = 24;
  row++;

  const layerData = [
    { label: 'L1 — Source / Reference', tables: l1Tables.size, fields: l1Fields.length, color: COLORS.l1Color, light: COLORS.l1Light },
    { label: 'L2 — Staging / Enriched', tables: l2Tables.size, fields: l2Fields.length, color: COLORS.l2Color, light: COLORS.l2Light },
    { label: 'L3 — Analytics / Metrics', tables: l3Tables.size, fields: l3Fields.length, color: COLORS.l3Color, light: COLORS.l3Light },
  ];

  layerData.forEach((ld, idx) => {
    const avg = ld.tables > 0 ? (ld.fields / ld.tables).toFixed(1) : '0';
    // Color indicator in col B
    const indicatorCell = ws.getCell(row, 2);
    indicatorCell.value = '';
    indicatorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ld.color } };

    const labelCell = ws.getCell(row, 3);
    labelCell.value = ld.label;
    labelCell.font = { size: 11, color: { argb: '333333' } };

    const tablesCell = ws.getCell(row, 4);
    tablesCell.value = ld.tables;
    tablesCell.font = { size: 11, bold: true, color: { argb: ld.color } };
    tablesCell.alignment = { horizontal: 'center' };

    const fieldsCell = ws.getCell(row, 5);
    fieldsCell.value = ld.fields;
    fieldsCell.font = { size: 11, bold: true, color: { argb: ld.color } };
    fieldsCell.alignment = { horizontal: 'center' };

    const avgCell = ws.getCell(row, 6);
    avgCell.value = avg;
    avgCell.font = { size: 11, color: { argb: '666666' } };
    avgCell.alignment = { horizontal: 'center' };

    if (idx % 2 === 0) {
      for (const col of [3, 4, 5, 6]) {
        ws.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ld.light } };
      }
    }

    for (const col of [2, 3, 4, 5, 6]) {
      ws.getCell(row, col).border = { bottom: { style: 'hair', color: { argb: COLORS.medGray } } };
    }

    ws.getRow(row).height = 24;
    row++;
  });

  // Totals row
  ws.getCell(row, 2).value = '';
  const totLabelCell = ws.getCell(row, 3);
  totLabelCell.value = 'Total';
  totLabelCell.font = { bold: true, size: 11, color: { argb: COLORS.darkNavy } };

  const totTablesCell = ws.getCell(row, 4);
  totTablesCell.value = allTables.size;
  totTablesCell.font = { bold: true, size: 11, color: { argb: COLORS.darkNavy } };
  totTablesCell.alignment = { horizontal: 'center' };

  const totFieldsCell = ws.getCell(row, 5);
  totFieldsCell.value = exported.fields.length;
  totFieldsCell.font = { bold: true, size: 11, color: { argb: COLORS.darkNavy } };
  totFieldsCell.alignment = { horizontal: 'center' };

  const totAvgCell = ws.getCell(row, 6);
  totAvgCell.value = allTables.size > 0 ? (exported.fields.length / allTables.size).toFixed(1) : '0';
  totAvgCell.font = { bold: true, size: 11, color: { argb: COLORS.darkNavy } };
  totAvgCell.alignment = { horizontal: 'center' };

  for (const col of [2, 3, 4, 5, 6]) {
    ws.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.medGray } };
    ws.getCell(row, col).border = { top: { style: 'thin', color: { argb: COLORS.borderGray } }, bottom: { style: 'thin', color: { argb: COLORS.borderGray } } };
  }
  ws.getRow(row).height = 26;
  row += 2;

  // ── Category Breakdown ──
  addSectionHeader('Categories');

  const catSubHeaders = ['Category', 'L1 Tables', 'L2 Tables', 'L3 Tables', 'Total Fields'];
  for (let i = 0; i < catSubHeaders.length; i++) {
    const cell = ws.getCell(row, i + 2);
    cell.value = catSubHeaders[i];
    cell.font = { bold: true, size: 10, color: { argb: '555555' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.medGray } };
    cell.alignment = { horizontal: i >= 1 ? 'center' : 'left', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: COLORS.borderGray } } };
  }
  ws.getRow(row).height = 24;
  row++;

  // Collect categories
  const categories = new Map<string, { l1Tables: Set<string>; l2Tables: Set<string>; l3Tables: Set<string>; fieldCount: number }>();
  for (const f of exported.fields) {
    const cat = f.category || 'Uncategorized';
    if (!categories.has(cat)) {
      categories.set(cat, { l1Tables: new Set(), l2Tables: new Set(), l3Tables: new Set(), fieldCount: 0 });
    }
    const entry = categories.get(cat)!;
    entry.fieldCount++;
    if (f.level === 'L1') entry.l1Tables.add(f.tableName);
    else if (f.level === 'L2') entry.l2Tables.add(f.tableName);
    else if (f.level === 'L3') entry.l3Tables.add(f.tableName);
  }

  const sortedCategories = Array.from(categories.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  sortedCategories.forEach(([catName, data], idx) => {
    ws.getCell(row, 2).value = catName;
    ws.getCell(row, 2).font = { size: 10, color: { argb: '333333' } };

    ws.getCell(row, 3).value = data.l1Tables.size || '';
    ws.getCell(row, 3).font = { size: 10, color: { argb: COLORS.l1Color } };
    ws.getCell(row, 3).alignment = { horizontal: 'center' };

    ws.getCell(row, 4).value = data.l2Tables.size || '';
    ws.getCell(row, 4).font = { size: 10, color: { argb: COLORS.l2Color } };
    ws.getCell(row, 4).alignment = { horizontal: 'center' };

    ws.getCell(row, 5).value = data.l3Tables.size || '';
    ws.getCell(row, 5).font = { size: 10, color: { argb: COLORS.l3Color } };
    ws.getCell(row, 5).alignment = { horizontal: 'center' };

    ws.getCell(row, 6).value = data.fieldCount;
    ws.getCell(row, 6).font = { size: 10, bold: true, color: { argb: '555555' } };
    ws.getCell(row, 6).alignment = { horizontal: 'center' };

    if (idx % 2 === 0) {
      for (const col of [2, 3, 4, 5, 6]) {
        ws.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryLight } };
      }
    }
    for (const col of [2, 3, 4, 5, 6]) {
      ws.getCell(row, col).border = { bottom: { style: 'hair', color: { argb: COLORS.medGray } } };
    }
    ws.getRow(row).height = 22;
    row++;
  });

  row += 2;

  // ── Tables per layer ──
  const addTableList = (title: string, layer: string, tables: Set<string>, color: string, lightColor: string) => {
    addSectionHeader(`${title} (${tables.size} tables)`);

    // Sub-header
    ws.getCell(row, 2).value = '#';
    ws.getCell(row, 2).font = { bold: true, size: 10, color: { argb: '555555' } };
    ws.getCell(row, 2).alignment = { horizontal: 'center' };

    ws.getCell(row, 3).value = 'Table Name';
    ws.mergeCells(`C${row}:D${row}`);
    ws.getCell(row, 3).font = { bold: true, size: 10, color: { argb: '555555' } };

    ws.getCell(row, 5).value = 'Fields';
    ws.getCell(row, 5).font = { bold: true, size: 10, color: { argb: '555555' } };
    ws.getCell(row, 5).alignment = { horizontal: 'center' };

    ws.getCell(row, 6).value = 'Category';
    ws.getCell(row, 6).font = { bold: true, size: 10, color: { argb: '555555' } };

    for (const col of [2, 3, 4, 5, 6]) {
      ws.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.medGray } };
      ws.getCell(row, col).border = { bottom: { style: 'thin', color: { argb: COLORS.borderGray } } };
    }
    ws.getRow(row).height = 22;
    row++;

    const sortedTables = Array.from(tables).sort();
    sortedTables.forEach((tName, idx) => {
      const fieldsInTable = exported.fields.filter((f) => f.level === layer && f.tableName === tName);
      const cat = fieldsInTable[0]?.category || '';

      ws.getCell(row, 2).value = idx + 1;
      ws.getCell(row, 2).font = { size: 10, color: { argb: '999999' } };
      ws.getCell(row, 2).alignment = { horizontal: 'center' };

      ws.mergeCells(`C${row}:D${row}`);
      ws.getCell(row, 3).value = tName;
      ws.getCell(row, 3).font = { size: 10, color: { argb: '333333' } };

      ws.getCell(row, 5).value = fieldsInTable.length;
      ws.getCell(row, 5).font = { size: 10, bold: true, color: { argb: color } };
      ws.getCell(row, 5).alignment = { horizontal: 'center' };

      ws.getCell(row, 6).value = cat;
      ws.getCell(row, 6).font = { size: 10, color: { argb: '666666' } };

      if (idx % 2 === 0) {
        for (const col of [2, 3, 4, 5, 6]) {
          ws.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightColor } };
        }
      }
      for (const col of [2, 3, 4, 5, 6]) {
        ws.getCell(row, col).border = { bottom: { style: 'hair', color: { argb: COLORS.medGray } } };
      }
      ws.getRow(row).height = 20;
      row++;
    });

    row++;
  };

  addTableList('L1 — Source / Reference', 'L1', l1Tables, COLORS.l1Color, COLORS.l1Light);
  addTableList('L2 — Staging / Enriched', 'L2', l2Tables, COLORS.l2Color, COLORS.l2Light);
  addTableList('L3 — Analytics / Metrics', 'L3', l3Tables, COLORS.l3Color, COLORS.l3Light);

  return ws;
}

// ── main export function ──────────────────────────────────────

export async function exportSchemaToExcel(exported: SchemaExport): Promise<ArrayBuffer> {
  const ExcelJS: ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Data Model Visualizer';
  workbook.created = new Date();

  const l1Fields = exported.fields.filter((f) => f.level === 'L1');
  const l2Fields = exported.fields.filter((f) => f.level === 'L2');
  const l3Fields = exported.fields.filter((f) => f.level === 'L3');

  // Build sheets in order: Summary first, then layers, then relationships
  buildSummarySheet(workbook, exported);
  buildLayerSheet(workbook, 'L1 — Source', L1_COLUMNS, l1Fields, COLORS.l1Color, COLORS.l1Light);
  buildLayerSheet(workbook, 'L2 — Staging', L2_COLUMNS, l2Fields, COLORS.l2Color, COLORS.l2Light);
  buildLayerSheet(workbook, 'L3 — Analytics', L3_COLUMNS, l3Fields, COLORS.l3Color, COLORS.l3Light);
  buildRelationshipsSheet(workbook, exported);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

// ── basic sheet data builders (for test/import) ──────────────

const FIELD_HEADERS: (keyof SchemaFieldRow)[] = [
  'level', 'tableName', 'category', 'fieldName', 'dataType', 'description',
  'isPK', 'isFK', 'fkTargetLayer', 'fkTargetTable', 'fkTargetField',
  'whyRequired', 'grain', 'derivationLogic', 'formula', 'sourceTables',
  'sourceFields', 'dashboardUsage', 'simplificationNote', 'notes',
];

const REL_HEADERS: (keyof SchemaRelationshipRow)[] = [
  'sourceLayer', 'sourceTable', 'sourceField',
  'targetLayer', 'targetTable', 'targetField', 'relationshipType',
];

function excelToBool(v: unknown): boolean {
  if (v === true || v === 'Y' || v === 'y' || v === '1' || v === 'YES' || String(v).toLowerCase() === 'true') return true;
  return false;
}

/** Build Fields sheet data: first row = headers, then one row per field */
export function schemaToFieldsSheetData(exported: SchemaExport): unknown[][] {
  const rows: unknown[][] = [FIELD_HEADERS];
  for (const f of exported.fields) {
    rows.push(
      FIELD_HEADERS.map((h) => {
        const val = f[h];
        if (typeof val === 'boolean') return boolToExcel(val);
        return val ?? '';
      })
    );
  }
  return rows;
}

/** Build Relationships sheet data */
export function schemaToRelationshipsSheetData(exported: SchemaExport): unknown[][] {
  const rows: unknown[][] = [REL_HEADERS];
  for (const r of exported.relationships) {
    rows.push(REL_HEADERS.map((h) => r[h] ?? ''));
  }
  return rows;
}

/** Parse Excel workbook into SchemaExport. Expects sheets "Fields" and "Relationships". */
export function parseSchemaFromWorkbook(
  getSheet: (name: string) => { data: unknown[][] } | null
): SchemaExport {
  const fieldsSheet = getSheet('Fields') ?? getSheet('fields');
  const relSheet = getSheet('Relationships') ?? getSheet('relationships');
  if (!fieldsSheet || fieldsSheet.data.length < 2) {
    throw new Error('Excel must contain a "Fields" sheet with a header row and at least one data row.');
  }

  const rawRows = fieldsSheet.data as unknown[][];
  const headerRow = (rawRows[0] as unknown[]).map((c) => String(c ?? '').trim().toLowerCase());
  const colIndex = (name: string) => {
    const n = name.toLowerCase();
    const i = headerRow.findIndex((h) => h === n || h.replace(/\s/g, '') === n.replace(/\s/g, ''));
    return i >= 0 ? i : -1;
  };
  const get = (row: unknown[], key: keyof SchemaFieldRow): string | boolean => {
    const i = colIndex(key);
    if (i < 0) return key === 'isPK' || key === 'isFK' ? false : '';
    const v = row[i];
    if (key === 'isPK' || key === 'isFK') return excelToBool(v);
    return String(v ?? '').trim();
  };

  const fields: SchemaFieldRow[] = [];
  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r] as unknown[];
    const level = get(row, 'level') as string;
    const tableName = get(row, 'tableName') as string;
    const fieldName = (get(row, 'fieldName') as string) || '';
    if (!tableName || !fieldName) continue;
    fields.push({
      level: level || 'L1',
      tableName,
      category: (get(row, 'category') as string) || 'Uncategorized',
      fieldName,
      dataType: (get(row, 'dataType') as string) || '',
      description: (get(row, 'description') as string) || '',
      isPK: get(row, 'isPK') as boolean,
      isFK: get(row, 'isFK') as boolean,
      fkTargetLayer: (get(row, 'fkTargetLayer') as string) || '',
      fkTargetTable: (get(row, 'fkTargetTable') as string) || '',
      fkTargetField: (get(row, 'fkTargetField') as string) || '',
      whyRequired: (get(row, 'whyRequired') as string) || undefined,
      grain: (get(row, 'grain') as string) || undefined,
      derivationLogic: (get(row, 'derivationLogic') as string) || undefined,
      formula: (get(row, 'formula') as string) || undefined,
      sourceTables: (get(row, 'sourceTables') as string) || undefined,
      sourceFields: (get(row, 'sourceFields') as string) || undefined,
      dashboardUsage: (get(row, 'dashboardUsage') as string) || undefined,
      simplificationNote: (get(row, 'simplificationNote') as string) || undefined,
      notes: (get(row, 'notes') as string) || undefined,
    });
  }

  const relationships: SchemaRelationshipRow[] = [];
  if (relSheet && relSheet.data.length >= 2) {
    const relRows = relSheet.data as unknown[][];
    const relHeader = (relRows[0] as unknown[]).map((c) => String(c ?? '').trim().toLowerCase());
    const relCol = (name: string) => {
      const n = name.toLowerCase();
      const i = relHeader.findIndex((h) => h === n || h.replace(/\s/g, '') === n.replace(/\s/g, ''));
      return i >= 0 ? i : -1;
    };
    for (let r = 1; r < relRows.length; r++) {
      const row = relRows[r] as unknown[];
      const getR = (key: keyof SchemaRelationshipRow) => {
        const i = relCol(key);
        return i < 0 ? '' : String((row as unknown[])[i] ?? '').trim();
      };
      if (!getR('sourceTable') || !getR('targetTable')) continue;
      relationships.push({
        sourceLayer: getR('sourceLayer') || 'L1',
        sourceTable: getR('sourceTable'),
        sourceField: getR('sourceField'),
        targetLayer: getR('targetLayer') || 'L1',
        targetTable: getR('targetTable'),
        targetField: getR('targetField'),
        relationshipType: (getR('relationshipType') === 'secondary' ? 'secondary' : 'primary') as 'primary' | 'secondary',
      });
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    fields,
    relationships,
  };
}
