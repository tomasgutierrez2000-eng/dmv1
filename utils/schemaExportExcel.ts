import type { SchemaExport, SchemaFieldRow, SchemaRelationshipRow } from '../types/schemaExport';

const FIELD_HEADERS: (keyof SchemaFieldRow)[] = [
  'level',
  'tableName',
  'category',
  'fieldName',
  'dataType',
  'description',
  'isPK',
  'isFK',
  'fkTargetLayer',
  'fkTargetTable',
  'fkTargetField',
  'whyRequired',
  'grain',
  'derivationLogic',
  'formula',
  'sourceTables',
  'sourceFields',
  'dashboardUsage',
  'simplificationNote',
  'notes',
];

const REL_HEADERS: (keyof SchemaRelationshipRow)[] = [
  'sourceLayer',
  'sourceTable',
  'sourceField',
  'targetLayer',
  'targetTable',
  'targetField',
  'relationshipType',
];

function boolToExcel(v: boolean): string {
  return v ? 'Y' : 'N';
}

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
