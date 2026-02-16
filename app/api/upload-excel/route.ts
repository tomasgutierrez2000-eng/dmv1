import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { EXCEL_TEMPLATE_COLUMN_MAPPING } from '../../../EXCEL_TEMPLATE_CONFIG';
import { findColumnIndex, getDetectedColumns } from './column-mapping';

interface FieldDefinition {
  name: string;
  description: string;
  category?: string;
  pk_fk?: {
    is_pk: boolean;
    is_composite: boolean;
    fk_target?: {
      layer: string;
      table: string;
      field: string;
    };
  };
  why_required?: string;
  simplification_note?: string;
  data_type?: string;
  formula?: string;
  source_tables?: Array<{ layer: string; table: string }>;
  source_fields?: string;
  dashboard_usage?: string;
  grain?: string;
  notes?: string;
}

interface TableDefinition {
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: FieldDefinition[];
}

interface Relationship {
  from_table: string;
  from_field: string;
  to_table: string;
  to_field: string;
  from_layer: string;
  to_layer: string;
}

interface DataDictionary {
  L1: TableDefinition[];
  L2: TableDefinition[];
  L3: TableDefinition[];
  relationships: Relationship[];
  derivation_dag: Record<string, string[]>; // table -> dependencies
}

const OUTPUT_ROOT = path.join(process.cwd(), 'facility-summary-mvp', 'output', 'data-dictionary');

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Parse PK/FK mapping column
const parsePKFK = (pkFkValue: string | null | undefined): FieldDefinition['pk_fk'] | null => {
  if (!pkFkValue || typeof pkFkValue !== 'string') return null;

  const value = pkFkValue.trim();
  if (!value) return null;

  // Pattern: "PK" or "PK (part)" or "FK → L1.table.field" or "PK & FK → L1.table.field"
  const isPK = value.includes('PK');
  const isComposite = value.includes('PK (part)');
  
  // Extract FK target: "FK → L1.table.field" or "PK & FK → L1.table.field"
  const fkMatch = value.match(/FK\s*→\s*(L[12])\.(\w+)\.(\w+)/);
  
  let fkTarget: { layer: string; table: string; field: string } | undefined;
  if (fkMatch) {
    fkTarget = {
      layer: fkMatch[1],
      table: fkMatch[2],
      field: fkMatch[3],
    };
  }

  if (isPK || fkTarget) {
    return {
      is_pk: isPK,
      is_composite: isComposite,
      fk_target: fkTarget,
    };
  }

  return null;
};

// Parse source table references from L3
const parseSourceTables = (sourceTablesValue: string | null | undefined): Array<{ layer: string; table: string }> => {
  if (!sourceTablesValue || typeof sourceTablesValue !== 'string') return [];

  // Example: "L2.position, L1.fx_rate" or "L3.facility_profitability_derived, L2.facility_profitability_snapshot"
  return sourceTablesValue
    .split(',')
    .map((ref) => ref.trim())
    .filter((ref) => ref)
    .map((ref) => {
      const parts = ref.split('.');
      if (parts.length === 2) {
        return {
          layer: parts[0].trim(),
          table: parts[1].trim(),
        };
      }
      return null;
    })
    .filter((ref): ref is { layer: string; table: string } => ref !== null);
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Use dynamic import for xlsx to handle Next.js server-side requirements
    const XLSXModule = await import('xlsx');
    const workbook = XLSXModule.read(buffer, { type: 'buffer' });

    // Verify required sheets exist (L1 and L2 are required, L3 is optional)
    const requiredSheets = ['L1', 'L2'];
    const missingSheets = requiredSheets.filter((sheet) => !workbook.SheetNames.includes(sheet));

    if (missingSheets.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required sheets: ${missingSheets.join(', ')}. L3 is optional.`,
        },
        { status: 400 }
      );
    }

    const dataDictionary: DataDictionary = {
      L1: [],
      L2: [],
      L3: [],
      relationships: [],
      derivation_dag: {},
    };

    const errors: string[] = [];
    const warnings: string[] = [];
    const categories = new Set<string>();

    // Process L1 sheet
    if (workbook.SheetNames.includes('L1')) {
      const worksheet = workbook.Sheets['L1'];
      const jsonData = XLSXModule.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
      });

      if (jsonData.length < 2) {
        errors.push('L1 sheet has no data rows');
      } else {
        // First row is headers - map to column indices
        const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim());
        const detectedColumns = getDetectedColumns(headers);
        
        try {
          const uniIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L1.category);
          const tableNameIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L1.tableName, true);
          const dataElementIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L1.dataElement, true);
          const descriptionIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L1.description);
          const whyRequiredIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L1.whyRequired);
          const pkFkIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L1.pkFk);

          // Group by table name
          const tableMap = new Map<string, { fields: FieldDefinition[]; category: string }>();

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            const tableName = row[tableNameIdx] ? String(row[tableNameIdx]).trim() : null;
            const fieldName = row[dataElementIdx] ? String(row[dataElementIdx]).trim() : null;

            if (!tableName || !fieldName) continue;

            const rowCategory = row[uniIdx] ? String(row[uniIdx]).trim() : 'Uncategorized';
            if (rowCategory && rowCategory !== 'Uncategorized') {
              categories.add(rowCategory);
            }

            const field: FieldDefinition = {
              name: fieldName,
              description: row[descriptionIdx] ? String(row[descriptionIdx]).trim() : '',
              category: rowCategory,
              why_required: row[whyRequiredIdx] ? String(row[whyRequiredIdx]).trim() : undefined,
            };

            const pkFkValue = row[pkFkIdx] ? String(row[pkFkIdx]).trim() : null;
            const pkFk = parsePKFK(pkFkValue);
            if (pkFk) {
              field.pk_fk = pkFk;
              
              // Build relationship if FK
              if (pkFk.fk_target) {
                dataDictionary.relationships.push({
                  from_table: tableName,
                  from_field: fieldName,
                  to_table: pkFk.fk_target.table,
                  to_field: pkFk.fk_target.field,
                  from_layer: 'L1',
                  to_layer: pkFk.fk_target.layer,
                });
              }
            }

            if (!tableMap.has(tableName)) {
              tableMap.set(tableName, { fields: [], category: rowCategory });
            }
            const tableData = tableMap.get(tableName)!;
            tableData.fields.push(field);
            if (rowCategory && rowCategory !== 'Uncategorized') {
              tableData.category = rowCategory;
            }
          }

          // Convert to table definitions
          tableMap.forEach((tableData, tableName) => {
            dataDictionary.L1.push({
              name: tableName,
              layer: 'L1',
              category: tableData.category,
              fields: tableData.fields,
            });
          });
        } catch (error) {
          errors.push(`L1 sheet column mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errors.push(`Detected columns: ${detectedColumns.join(', ')}`);
        }
      }
    }

    // Process L2 sheet
    if (workbook.SheetNames.includes('L2')) {
      const worksheet = workbook.Sheets['L2'];
      const jsonData = XLSXModule.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
      });

      if (jsonData.length < 2) {
        errors.push('L2 sheet has no data rows');
      } else {
        const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim());
        const detectedColumns = getDetectedColumns(headers);
        
        try {
          const categoryIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L2.category);
          const tableNameIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L2.tableName, true);
          const dataElementIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L2.dataElement, true);
          const descriptionIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L2.description);
          const whyRequiredIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L2.whyRequired);
          const pkFkIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L2.pkFk);
          const simplificationIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L2.simplificationNote);

          const tableMap = new Map<string, { fields: FieldDefinition[]; category: string }>();

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            const tableName = row[tableNameIdx] ? String(row[tableNameIdx]).trim() : null;
            const fieldName = row[dataElementIdx] ? String(row[dataElementIdx]).trim() : null;

            if (!tableName || !fieldName) continue;

            const rowCategory = row[categoryIdx] ? String(row[categoryIdx]).trim() : 'Uncategorized';
            if (rowCategory && rowCategory !== 'Uncategorized') {
              categories.add(rowCategory);
            }

            const field: FieldDefinition = {
              name: fieldName,
              description: row[descriptionIdx] ? String(row[descriptionIdx]).trim() : '',
              category: rowCategory,
              why_required: row[whyRequiredIdx] ? String(row[whyRequiredIdx]).trim() : undefined,
              simplification_note: row[simplificationIdx] ? String(row[simplificationIdx]).trim() : undefined,
            };

            const pkFkValue = row[pkFkIdx] ? String(row[pkFkIdx]).trim() : null;
            const pkFk = parsePKFK(pkFkValue);
            if (pkFk) {
              field.pk_fk = pkFk;
              
              if (pkFk.fk_target) {
                dataDictionary.relationships.push({
                  from_table: tableName,
                  from_field: fieldName,
                  to_table: pkFk.fk_target.table,
                  to_field: pkFk.fk_target.field,
                  from_layer: 'L2',
                  to_layer: pkFk.fk_target.layer,
                });
              }
            }

            if (!tableMap.has(tableName)) {
              tableMap.set(tableName, { fields: [], category: rowCategory });
            }
            const tableData = tableMap.get(tableName)!;
            tableData.fields.push(field);
            if (rowCategory && rowCategory !== 'Uncategorized') {
              tableData.category = rowCategory;
            }
          }

          tableMap.forEach((tableData, tableName) => {
            dataDictionary.L2.push({
              name: tableName,
              layer: 'L2',
              category: tableData.category,
              fields: tableData.fields,
            });
          });
        } catch (error) {
          errors.push(`L2 sheet column mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errors.push(`Detected columns: ${detectedColumns.join(', ')}`);
        }
      }
    }

    // Process L3 sheet
    if (workbook.SheetNames.includes('L3')) {
      const worksheet = workbook.Sheets['L3'];
      const jsonData = XLSXModule.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
      });

      if (jsonData.length < 2) {
        errors.push('L3 sheet has no data rows');
      } else {
        const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim());
        const detectedColumns = getDetectedColumns(headers);
        
        try {
          const categoryIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.category);
          const tableNameIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.tableName, true);
          const fieldIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.field, true);
          const dataTypeIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.dataType);
          const formulaIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.formula);
          const sourceTablesIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.sourceTables);
          const sourceFieldsIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.sourceFields);
          const derivationLogicIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.derivationLogic);
          const dashboardUsageIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.dashboardUsage);
          const grainIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.grain);
          const notesIdx = findColumnIndex(headers, EXCEL_TEMPLATE_COLUMN_MAPPING.L3.notes);

          const tableMap = new Map<string, { fields: FieldDefinition[]; category: string }>();

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            const tableName = row[tableNameIdx] ? String(row[tableNameIdx]).trim() : null;
            const fieldName = row[fieldIdx] ? String(row[fieldIdx]).trim() : null;

            if (!tableName || !fieldName) continue;

            const rowCategory = row[categoryIdx] ? String(row[categoryIdx]).trim() : 'Uncategorized';
            if (rowCategory && rowCategory !== 'Uncategorized') {
              categories.add(rowCategory);
            }

            const field: FieldDefinition = {
              name: fieldName,
              description: row[derivationLogicIdx] ? String(row[derivationLogicIdx]).trim() : '',
              category: rowCategory,
              data_type: row[dataTypeIdx] ? String(row[dataTypeIdx]).trim() : undefined,
              formula: row[formulaIdx] ? String(row[formulaIdx]).trim() : undefined,
              source_fields: row[sourceFieldsIdx] ? String(row[sourceFieldsIdx]).trim() : undefined,
              dashboard_usage: row[dashboardUsageIdx] ? String(row[dashboardUsageIdx]).trim() : undefined,
              grain: row[grainIdx] ? String(row[grainIdx]).trim() : undefined,
              notes: row[notesIdx] ? String(row[notesIdx]).trim() : undefined,
            };

            const sourceTablesValue = row[sourceTablesIdx] ? String(row[sourceTablesIdx]).trim() : null;
            const sourceTables = parseSourceTables(sourceTablesValue);
            if (sourceTables.length > 0) {
              field.source_tables = sourceTables;
              
              // Build derivation DAG
              if (!dataDictionary.derivation_dag[tableName]) {
                dataDictionary.derivation_dag[tableName] = [];
              }
              sourceTables.forEach((src) => {
                const depKey = `${src.layer}.${src.table}`;
                if (!dataDictionary.derivation_dag[tableName].includes(depKey)) {
                  dataDictionary.derivation_dag[tableName].push(depKey);
                }
              });
            }

            if (!tableMap.has(tableName)) {
              tableMap.set(tableName, { fields: [], category: rowCategory });
            }
            const tableData = tableMap.get(tableName)!;
            tableData.fields.push(field);
            if (rowCategory && rowCategory !== 'Uncategorized') {
              tableData.category = rowCategory;
            }
          }

          tableMap.forEach((tableData, tableName) => {
            dataDictionary.L3.push({
              name: tableName,
              layer: 'L3',
              category: tableData.category,
              fields: tableData.fields,
            });
          });
        } catch (error) {
          errors.push(`L3 sheet column mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errors.push(`Detected columns: ${detectedColumns.join(', ')}`);
        }
      }
    }

    // Save data dictionary
    ensureDir(OUTPUT_ROOT);
    fs.writeFileSync(
      path.join(OUTPUT_ROOT, 'data-dictionary.json'),
      JSON.stringify(dataDictionary, null, 2)
    );

    // Generate summary statistics
    const stats = {
      L1_tables: dataDictionary.L1.length,
      L2_tables: dataDictionary.L2.length,
      L3_tables: dataDictionary.L3.length,
      total_relationships: dataDictionary.relationships.length,
      derivation_dependencies: Object.keys(dataDictionary.derivation_dag).length,
      L1_fields: dataDictionary.L1.reduce((sum, t) => sum + t.fields.length, 0),
      L2_fields: dataDictionary.L2.reduce((sum, t) => sum + t.fields.length, 0),
      L3_fields: dataDictionary.L3.reduce((sum, t) => sum + t.fields.length, 0),
    };

    return NextResponse.json({
      success: errors.length === 0,
      message: errors.length === 0
        ? `Successfully parsed data dictionary: ${stats.L1_tables} L1, ${stats.L2_tables} L2, ${stats.L3_tables} L3 tables`
        : `Parsed with ${errors.length} error(s)`,
      details: {
        statistics: stats,
        tables: {
          L1: dataDictionary.L1.map((t) => ({ name: t.name, fields: t.fields.length, category: t.category })),
          L2: dataDictionary.L2.map((t) => ({ name: t.name, fields: t.fields.length, category: t.category })),
          L3: dataDictionary.L3.map((t) => ({ name: t.name, fields: t.fields.length, category: t.category })),
        },
        relationships: dataDictionary.relationships.length,
        derivation_dag: dataDictionary.derivation_dag,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('Excel parsing error:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
