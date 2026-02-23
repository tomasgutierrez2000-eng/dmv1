import { useState, useCallback, useRef, useEffect } from 'react';
import type { DataModel, TableDef, Field, Relationship } from '../types/model';
import { mapColumnsForLayer, getDetectedColumns } from '../utils/columnMapper';
import { parsePKFK, parseSourceTables } from '../utils/pkFkParser';

interface ParseResult {
  model: DataModel | null;
  error: string | null;
  statistics: {
    tables: number;
    fields: number;
    relationships: number;
    categories: number;
  } | null;
}

export function useExcelParser() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult>({
    model: null,
    error: null,
    statistics: null,
  });
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const parseExcel = useCallback(async (file: File) => {
    setLoading(true);
    setResult({ model: null, error: null, statistics: null });

    console.log('🔍 [DEBUG] Starting Excel file parsing...');
    console.log('🔍 [DEBUG] File name:', file.name);
    console.log('🔍 [DEBUG] File size:', file.size, 'bytes');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const XLSXModule = await import('xlsx');
      const workbook = XLSXModule.read(buffer, { type: 'buffer' });

      console.log('🔍 [DEBUG] Workbook loaded. Sheet names:', workbook.SheetNames);

      // Find sheets containing L1, L2, L3 (case-insensitive)
      const sheetMap: { L1?: string; L2?: string; L3?: string } = {};
      workbook.SheetNames.forEach((sheetName) => {
        const upper = sheetName.toUpperCase();
        if (upper.includes('L1')) sheetMap.L1 = sheetName;
        if (upper.includes('L2')) sheetMap.L2 = sheetName;
        if (upper.includes('L3')) sheetMap.L3 = sheetName;
      });

      console.log('🔍 [DEBUG] Detected sheets:', sheetMap);

      if (!sheetMap.L1 && !sheetMap.L2) {
        throw new Error('No L1 or L2 sheets found. Sheets must contain "L1" or "L2" in the name.');
      }

      const tables: Record<string, TableDef> = {};
      const relationships: Relationship[] = [];
      const categories: Set<string> = new Set<string>();
      const errors: string[] = [];

      // Process L1 sheet
      if (sheetMap.L1) {
        console.log('🔍 [DEBUG] Processing L1 sheet:', sheetMap.L1);
        const worksheet = workbook.Sheets[sheetMap.L1];
        const jsonData = XLSXModule.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
        });

        console.log('🔍 [DEBUG] L1 sheet has', jsonData.length, 'rows');

        if (jsonData.length >= 2) {
          const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim());
          const detectedColumns = getDetectedColumns(headers);
          
          console.log('🔍 [DEBUG] L1 Headers detected:', detectedColumns);
          console.log('🔍 [DEBUG] L1 Headers (raw):', headers);
          
          try {
            let colMap: Record<string, number>;
            try {
              colMap = mapColumnsForLayer(headers, 'L1');
              console.log('🔍 [DEBUG] L1 Column mapping result:', colMap);
            } catch (mapError) {
              // Safely extract error message without referencing any variables
              let mapErrorMessage: string;
              try {
                if (mapError instanceof Error) {
                  mapErrorMessage = mapError.message;
                } else {
                  mapErrorMessage = String(mapError);
                }
              } catch (e) {
                mapErrorMessage = 'Failed to map columns (unknown error)';
              }
              console.error('❌ [DEBUG] L1 Column mapping failed:', mapErrorMessage);
              throw new Error(`Failed to map columns: ${mapErrorMessage}`);
            }
            const tableMap = new Map<string, { fields: Field[]; category: string }>();

            let processedRows = 0;
            let skippedRows = 0;

            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              
              // Safely get column indices
              const tableNameIndex = colMap.tableName >= 0 ? colMap.tableName : -1;
              const dataElementIndex = colMap.dataElement >= 0 ? colMap.dataElement : -1;
              const categoryIndex = colMap.category >= 0 ? colMap.category : -1;
              
              if (i === 1) {
                console.log('🔍 [DEBUG] L1 First data row sample:', row.slice(0, 5));
                console.log('🔍 [DEBUG] L1 Column indices - tableName:', tableNameIndex, 'dataElement:', dataElementIndex, 'category:', categoryIndex);
              }
              
              const tableName = tableNameIndex >= 0 && row[tableNameIndex] ? String(row[tableNameIndex]).trim() : null;
              const fieldName = dataElementIndex >= 0 && row[dataElementIndex] ? String(row[dataElementIndex]).trim() : null;

              if (!tableName || !fieldName) {
                skippedRows++;
                if (i <= 3) {
                  console.log('🔍 [DEBUG] L1 Skipping row', i, '- tableName:', tableName, 'fieldName:', fieldName);
                }
                continue;
              }
              
              processedRows++;

              const rowCategory = categoryIndex >= 0 && row[categoryIndex] ? String(row[categoryIndex]).trim() : 'Uncategorized';
              if (rowCategory && rowCategory !== 'Uncategorized') {
                categories.add(rowCategory);
              }

              // Safely get optional column indices
              const descriptionIndex = colMap.description >= 0 ? colMap.description : -1;
              const whyRequiredIndex = colMap.whyRequired >= 0 ? colMap.whyRequired : -1;
              const pkFkIndex = colMap.pkFk >= 0 ? colMap.pkFk : -1;

              const field: Field = {
                name: fieldName,
                description: descriptionIndex >= 0 && row[descriptionIndex] ? String(row[descriptionIndex]).trim() : '',
                whyRequired: whyRequiredIndex >= 0 && row[whyRequiredIndex] ? String(row[whyRequiredIndex]).trim() : undefined,
                pkFk: pkFkIndex >= 0 && row[pkFkIndex] ? String(row[pkFkIndex]).trim() : undefined,
                isPK: false,
                isFK: false,
              };

              const pkFkValue = pkFkIndex >= 0 && row[pkFkIndex] ? String(row[pkFkIndex]).trim() : null;
              const pkFk = parsePKFK(pkFkValue);
              if (pkFk) {
                field.isPK = pkFk.isPK;
                field.isFK = !!pkFk.fkTarget;
                if (pkFk.fkTarget) {
                  field.fkTarget = {
                    layer: pkFk.fkTarget.layer || 'L1',
                    table: pkFk.fkTarget.table,
                    field: pkFk.fkTarget.field,
                  };

                  const tableKey = `L1.${tableName}`;
                  const targetLayer = pkFk.fkTarget.layer || 'L1';
                  const targetTableKey = `${targetLayer}.${pkFk.fkTarget.table}`;
                  
                  // Determine relationship type: Primary = direct/same-layer, Secondary = cross-layer skipping
                  const sourceLayerNum = parseInt('L1'.replace('L', ''));
                  const targetLayerNum = parseInt(targetLayer.replace('L', ''));
                  const layerDiff = Math.abs(targetLayerNum - sourceLayerNum);
                  const relationshipType: 'primary' | 'secondary' = 
                    layerDiff <= 1 ? 'primary' : 'secondary'; // Primary if same or adjacent layer

                  relationships.push({
                    id: `${tableKey}.${fieldName}->${targetTableKey}.${pkFk.fkTarget.field}`,
                    source: {
                      layer: 'L1',
                      table: tableName,
                      field: fieldName,
                      tableKey,
                    },
                    target: {
                      layer: targetLayer,
                      table: pkFk.fkTarget.table,
                      field: pkFk.fkTarget.field,
                      tableKey: targetTableKey,
                    },
                    isCrossLayer: targetLayer !== 'L1',
                    relationshipType,
                  });
                }
              }

              if (!tableMap.has(tableName)) {
                tableMap.set(tableName, { fields: [], category: rowCategory });
              }
              const tableData = tableMap.get(tableName)!;
              tableData.fields.push(field);
              // Update category if we found one
              if (rowCategory && rowCategory !== 'Uncategorized') {
                tableData.category = rowCategory;
              }
            }

            console.log('🔍 [DEBUG] L1 Processed', processedRows, 'rows, skipped', skippedRows, 'rows');
            console.log('🔍 [DEBUG] L1 Found', tableMap.size, 'tables');
            
            tableMap.forEach((tableData, tableName) => {
              const tableKey = `L1.${tableName}`;
              tables[tableKey] = {
                key: tableKey,
                name: tableName,
                layer: 'L1',
                category: tableData.category,
                fields: tableData.fields,
              };
              console.log('🔍 [DEBUG] L1 Table:', tableName, '-', tableData.fields.length, 'fields, category:', tableData.category);
            });
          } catch (error) {
            // Safely get error message without referencing any variables that might not exist
            let errorMessage: string;
            try {
              errorMessage = error instanceof Error ? error.message : String(error);
            } catch (e) {
              errorMessage = 'Unknown error occurred';
            }
            
            console.error('❌ [DEBUG] L1 Error:', error);
            console.error('❌ [DEBUG] L1 Error message:', errorMessage);
            if (error instanceof Error) {
              console.error('❌ [DEBUG] L1 Error stack:', error.stack);
            }
            errors.push(`L1 sheet column mapping error: ${errorMessage}`);
            if (detectedColumns && detectedColumns.length > 0) {
              errors.push(`Detected columns: ${detectedColumns.join(', ')}`);
            }
          }
        } else {
          console.warn('⚠️ [DEBUG] L1 sheet has less than 2 rows (no data)');
        }
      } else {
        console.log('⚠️ [DEBUG] No L1 sheet found');
      }

      // Process L2 sheet (similar logic)
      if (sheetMap.L2) {
        console.log('🔍 [DEBUG] Processing L2 sheet:', sheetMap.L2);
        const worksheet = workbook.Sheets[sheetMap.L2];
        const jsonData = XLSXModule.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
        });

        console.log('🔍 [DEBUG] L2 sheet has', jsonData.length, 'rows');

        if (jsonData.length >= 2) {
          const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim());
          const detectedColumns = getDetectedColumns(headers);
          
          console.log('🔍 [DEBUG] L2 Headers detected:', detectedColumns);
          console.log('🔍 [DEBUG] L2 Headers (raw):', headers);
          
          try {
            let colMap: Record<string, number>;
            try {
              colMap = mapColumnsForLayer(headers, 'L2');
              console.log('🔍 [DEBUG] L2 Column mapping result:', colMap);
            } catch (mapError) {
              // Safely extract error message without referencing any variables
              let mapErrorMessage: string;
              try {
                if (mapError instanceof Error) {
                  mapErrorMessage = mapError.message;
                } else {
                  mapErrorMessage = String(mapError);
                }
              } catch (e) {
                mapErrorMessage = 'Failed to map columns (unknown error)';
              }
              console.error('❌ [DEBUG] L2 Column mapping failed:', mapErrorMessage);
              throw new Error(`Failed to map columns: ${mapErrorMessage}`);
            }
            const tableMap = new Map<string, { fields: Field[]; category: string }>();

            let processedRows = 0;
            let skippedRows = 0;

            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              
              // Safely get column indices
              const tableNameIndex = colMap.tableName >= 0 ? colMap.tableName : -1;
              const dataElementIndex = colMap.dataElement >= 0 ? colMap.dataElement : -1;
              const categoryIndex = colMap.category >= 0 ? colMap.category : -1;
              
              if (i === 1) {
                console.log('🔍 [DEBUG] L2 First data row sample:', row.slice(0, 5));
                console.log('🔍 [DEBUG] L2 Column indices - tableName:', tableNameIndex, 'dataElement:', dataElementIndex, 'category:', categoryIndex);
              }
              
              const tableName = tableNameIndex >= 0 && row[tableNameIndex] ? String(row[tableNameIndex]).trim() : null;
              const fieldName = dataElementIndex >= 0 && row[dataElementIndex] ? String(row[dataElementIndex]).trim() : null;

              if (!tableName || !fieldName) {
                skippedRows++;
                if (i <= 3) {
                  console.log('🔍 [DEBUG] L2 Skipping row', i, '- tableName:', tableName, 'fieldName:', fieldName);
                }
                continue;
              }
              
              processedRows++;

              const rowCategory = categoryIndex >= 0 && row[categoryIndex] ? String(row[categoryIndex]).trim() : 'Uncategorized';
              if (rowCategory && rowCategory !== 'Uncategorized') {
                categories.add(rowCategory);
              }

              // Safely get optional column indices
              const descriptionIndex = colMap.description >= 0 ? colMap.description : -1;
              const whyRequiredIndex = colMap.whyRequired >= 0 ? colMap.whyRequired : -1;
              const simplificationNoteIndex = colMap.simplificationNote >= 0 ? colMap.simplificationNote : -1;
              const pkFkIndex = colMap.pkFk >= 0 ? colMap.pkFk : -1;

              const field: Field = {
                name: fieldName,
                description: descriptionIndex >= 0 && row[descriptionIndex] ? String(row[descriptionIndex]).trim() : '',
                whyRequired: whyRequiredIndex >= 0 && row[whyRequiredIndex] ? String(row[whyRequiredIndex]).trim() : undefined,
                simplificationNote: simplificationNoteIndex >= 0 && row[simplificationNoteIndex] ? String(row[simplificationNoteIndex]).trim() : undefined,
                pkFk: pkFkIndex >= 0 && row[pkFkIndex] ? String(row[pkFkIndex]).trim() : undefined,
                isPK: false,
                isFK: false,
              };

              const pkFkValue = pkFkIndex >= 0 && row[pkFkIndex] ? String(row[pkFkIndex]).trim() : null;
              const pkFk = parsePKFK(pkFkValue);
              if (pkFk) {
                field.isPK = pkFk.isPK;
                field.isFK = !!pkFk.fkTarget;
                if (pkFk.fkTarget) {
                  field.fkTarget = {
                    layer: pkFk.fkTarget.layer || 'L2',
                    table: pkFk.fkTarget.table,
                    field: pkFk.fkTarget.field,
                  };

                  const tableKey = `L2.${tableName}`;
                  const targetLayer = pkFk.fkTarget.layer || 'L2';
                  const targetTableKey = `${targetLayer}.${pkFk.fkTarget.table}`;
                  
                  // Determine relationship type: Primary = direct/same-layer, Secondary = cross-layer skipping
                  const sourceLayerNum = parseInt('L2'.replace('L', ''));
                  const targetLayerNum = parseInt(targetLayer.replace('L', ''));
                  const layerDiff = Math.abs(targetLayerNum - sourceLayerNum);
                  const relationshipType: 'primary' | 'secondary' = 
                    layerDiff <= 1 ? 'primary' : 'secondary'; // Primary if same or adjacent layer

                  relationships.push({
                    id: `${tableKey}.${fieldName}->${targetTableKey}.${pkFk.fkTarget.field}`,
                    source: {
                      layer: 'L2',
                      table: tableName,
                      field: fieldName,
                      tableKey,
                    },
                    target: {
                      layer: targetLayer,
                      table: pkFk.fkTarget.table,
                      field: pkFk.fkTarget.field,
                      tableKey: targetTableKey,
                    },
                    isCrossLayer: targetLayer !== 'L2',
                    relationshipType,
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

            console.log('🔍 [DEBUG] L2 Processed', processedRows, 'rows, skipped', skippedRows, 'rows');
            console.log('🔍 [DEBUG] L2 Found', tableMap.size, 'tables');
            
            tableMap.forEach((tableData, tableName) => {
              const tableKey = `L2.${tableName}`;
              tables[tableKey] = {
                key: tableKey,
                name: tableName,
                layer: 'L2',
                category: tableData.category,
                fields: tableData.fields,
              };
              console.log('🔍 [DEBUG] L2 Table:', tableName, '-', tableData.fields.length, 'fields, category:', tableData.category);
            });
          } catch (error) {
            // Safely get error message without referencing any variables that might not exist
            let errorMessage: string;
            try {
              errorMessage = error instanceof Error ? error.message : String(error);
            } catch (e) {
              errorMessage = 'Unknown error occurred';
            }
            
            console.error('❌ [DEBUG] L2 Error:', error);
            console.error('❌ [DEBUG] L2 Error message:', errorMessage);
            if (error instanceof Error) {
              console.error('❌ [DEBUG] L2 Error stack:', error.stack);
            }
            errors.push(`L2 sheet column mapping error: ${errorMessage}`);
            if (detectedColumns && detectedColumns.length > 0) {
              errors.push(`Detected columns: ${detectedColumns.join(', ')}`);
            }
          }
        } else {
          console.warn('⚠️ [DEBUG] L2 sheet has less than 2 rows (no data)');
        }
      } else {
        console.log('⚠️ [DEBUG] No L2 sheet found');
      }

      // Process L3 sheet
      if (sheetMap.L3) {
        console.log('🔍 [DEBUG] Processing L3 sheet:', sheetMap.L3);
        const worksheet = workbook.Sheets[sheetMap.L3];
        const jsonData = XLSXModule.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
        });

        console.log('🔍 [DEBUG] L3 sheet has', jsonData.length, 'rows');

        if (jsonData.length >= 2) {
          const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').trim());
          const detectedColumns = getDetectedColumns(headers);
          
          console.log('🔍 [DEBUG] L3 Headers detected:', detectedColumns);
          console.log('🔍 [DEBUG] L3 Headers (raw):', headers);
          
          try {
            let colMap: Record<string, number>;
            try {
              colMap = mapColumnsForLayer(headers, 'L3');
              console.log('🔍 [DEBUG] L3 Column mapping result:', colMap);
            } catch (mapError) {
              // Safely extract error message without referencing any variables
              let mapErrorMessage: string;
              try {
                if (mapError instanceof Error) {
                  mapErrorMessage = mapError.message;
                } else {
                  mapErrorMessage = String(mapError);
                }
              } catch (e) {
                mapErrorMessage = 'Failed to map columns (unknown error)';
              }
              console.error('❌ [DEBUG] L3 Column mapping failed:', mapErrorMessage);
              throw new Error(`Failed to map columns: ${mapErrorMessage}`);
            }
            const tableMap = new Map<string, { fields: Field[]; category: string }>();

            let processedRows = 0;
            let skippedRows = 0;
            
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              
              // Safely get column indices
              const tableNameIndex = colMap.tableName >= 0 ? colMap.tableName : -1;
              const fieldIndex = colMap.field >= 0 ? colMap.field : -1;
              const categoryIndex = colMap.category >= 0 ? colMap.category : -1;
              
              if (i === 1) {
                console.log('🔍 [DEBUG] L3 First data row sample:', row.slice(0, 5));
                console.log('🔍 [DEBUG] L3 Column indices - tableName:', tableNameIndex, 'field:', fieldIndex, 'category:', categoryIndex);
              }
              
              const tableName = tableNameIndex >= 0 && row[tableNameIndex] ? String(row[tableNameIndex]).trim() : null;
              const fieldName = fieldIndex >= 0 && row[fieldIndex] ? String(row[fieldIndex]).trim() : null;

              if (!tableName || !fieldName) {
                skippedRows++;
                if (i <= 3) {
                  console.log('🔍 [DEBUG] L3 Skipping row', i, '- tableName:', tableName, 'fieldName:', fieldName);
                }
                continue;
              }
              
              processedRows++;

              const rowCategory = categoryIndex >= 0 && row[categoryIndex] ? String(row[categoryIndex]).trim() : 'Uncategorized';
              if (rowCategory && rowCategory !== 'Uncategorized') {
                categories.add(rowCategory);
              }

              // Safely get optional column indices for L3
              const sourceTablesIndex = colMap.sourceTables >= 0 ? colMap.sourceTables : -1;
              const derivationLogicIndex = colMap.derivationLogic >= 0 ? colMap.derivationLogic : -1;
              const dataTypeIndex = colMap.dataType >= 0 ? colMap.dataType : -1;
              const formulaIndex = colMap.formula >= 0 ? colMap.formula : -1;
              const sourceFieldsIndex = colMap.sourceFields >= 0 ? colMap.sourceFields : -1;
              const dashboardUsageIndex = colMap.dashboardUsage >= 0 ? colMap.dashboardUsage : -1;
              const grainIndex = colMap.grain >= 0 ? colMap.grain : -1;
              const notesIndex = colMap.notes >= 0 ? colMap.notes : -1;

              const sourceTablesValue = sourceTablesIndex >= 0 && row[sourceTablesIndex] ? String(row[sourceTablesIndex]).trim() : null;
              const sourceTables = parseSourceTables(sourceTablesValue);

              const field: Field = {
                name: fieldName,
                description: derivationLogicIndex >= 0 && row[derivationLogicIndex] ? String(row[derivationLogicIndex]).trim() : '',
                dataType: dataTypeIndex >= 0 && row[dataTypeIndex] ? String(row[dataTypeIndex]).trim() : undefined,
                formula: formulaIndex >= 0 && row[formulaIndex] ? String(row[formulaIndex]).trim() : undefined,
                sourceTables: sourceTables.length > 0 ? sourceTables : undefined,
                sourceFields: sourceFieldsIndex >= 0 && row[sourceFieldsIndex] ? String(row[sourceFieldsIndex]).trim() : undefined,
                derivationLogic: derivationLogicIndex >= 0 && row[derivationLogicIndex] ? String(row[derivationLogicIndex]).trim() : undefined,
                dashboardUsage: dashboardUsageIndex >= 0 && row[dashboardUsageIndex] ? String(row[dashboardUsageIndex]).trim() : undefined,
                grain: grainIndex >= 0 && row[grainIndex] ? String(row[grainIndex]).trim() : undefined,
                notes: notesIndex >= 0 && row[notesIndex] ? String(row[notesIndex]).trim() : undefined,
                isPK: false,
                isFK: false,
              };

              if (!tableMap.has(tableName)) {
                tableMap.set(tableName, { fields: [], category: rowCategory });
              }
              const tableData = tableMap.get(tableName)!;
              tableData.fields.push(field);
              if (rowCategory && rowCategory !== 'Uncategorized') {
                tableData.category = rowCategory;
              }
            }

            console.log('🔍 [DEBUG] L3 Processed', processedRows, 'rows, skipped', skippedRows, 'rows');
            console.log('🔍 [DEBUG] L3 Found', tableMap.size, 'tables');
            
            tableMap.forEach((tableData, tableName) => {
              const tableKey = `L3.${tableName}`;
              tables[tableKey] = {
                key: tableKey,
                name: tableName,
                layer: 'L3',
                category: tableData.category,
                fields: tableData.fields,
              };
              console.log('🔍 [DEBUG] L3 Table:', tableName, '-', tableData.fields.length, 'fields, category:', tableData.category);
            });
          } catch (error) {
            // Safely get error message without referencing any variables that might not exist
            let errorMessage: string;
            try {
              errorMessage = error instanceof Error ? error.message : String(error);
            } catch (e) {
              errorMessage = 'Unknown error occurred';
            }
            
            console.error('❌ [DEBUG] L3 Error:', error);
            console.error('❌ [DEBUG] L3 Error message:', errorMessage);
            if (error instanceof Error) {
              console.error('❌ [DEBUG] L3 Error stack:', error.stack);
            }
            errors.push(`L3 sheet column mapping error: ${errorMessage}`);
            if (detectedColumns && detectedColumns.length > 0) {
              errors.push(`Detected columns: ${detectedColumns.join(', ')}`);
            }
          }
        } else {
          console.warn('⚠️ [DEBUG] L3 sheet has less than 2 rows (no data)');
        }
      } else {
        console.log('⚠️ [DEBUG] No L3 sheet found (optional)');
      }

      console.log('🔍 [DEBUG] Summary after parsing:');
      console.log('🔍 [DEBUG] - Total tables found:', Object.keys(tables).length);
      console.log('🔍 [DEBUG] - Total relationships found:', relationships.length);
      // Safely access categories
      try {
        console.log('🔍 [DEBUG] - Total categories found:', categories ? categories.size : 0);
      } catch (e) {
        console.log('🔍 [DEBUG] - Total categories found: 0 (error accessing categories)');
      }
      console.log('🔍 [DEBUG] - Total errors:', errors.length);
      
      if (errors.length > 0) {
        console.error('❌ [DEBUG] Errors encountered:', errors);
      }

      if (Object.keys(tables).length === 0) {
        const errorMsg = 'No tables found in Excel file. ' + (errors.length > 0 ? errors.join('; ') : '');
        console.error('❌ [DEBUG]', errorMsg);
        throw new Error(errorMsg);
      }

      // Validate relationships - remove any that reference non-existent tables
      const validRelationships = relationships.filter((rel) => {
        const sourceExists = !!tables[rel.source.tableKey];
        const targetExists = !!tables[rel.target.tableKey];
        if (!sourceExists || !targetExists) {
          console.warn(`⚠️ [DEBUG] Invalid relationship: ${rel.source.tableKey} -> ${rel.target.tableKey} (table not found)`);
          return false;
        }
        return true;
      });

      console.log('🔍 [DEBUG] Valid relationships:', validRelationships.length, 'out of', relationships.length);

      const model: DataModel = {
        tables,
        relationships: validRelationships,
        categories: Array.from(categories),
        layers: Object.keys(sheetMap).filter(Boolean),
      };

      const totalFields = Object.values(tables).reduce((sum, table) => sum + table.fields.length, 0);
      console.log('🔍 [DEBUG] Total fields across all tables:', totalFields);
      
      // Log relationship statistics for debugging
      // Debug logging (only if everything succeeded)
      if (Object.keys(tables).length > 0) {
        console.log('Parsed model:', {
          tables: Object.keys(tables).length,
          relationships: validRelationships.length,
          invalidRelationships: relationships.length - validRelationships.length,
          categories: categories.size,
          sampleRelationships: validRelationships.slice(0, 5).map((r) => ({
            from: r.source.tableKey,
            to: r.target.tableKey,
          })),
        });
      }

      // Ensure categories is always defined
      const categoriesSize = categories ? categories.size : 0;
      
      console.log('✅ [DEBUG] Parsing completed successfully!');
      console.log('✅ [DEBUG] Final statistics:', {
        tables: Object.keys(tables).length,
        fields: totalFields,
        relationships: validRelationships.length,
        categories: categoriesSize,
      });

      if (!mountedRef.current) return;
      setResult({
        model,
        error: errors.length > 0 ? errors.join('; ') : null,
        statistics: {
          tables: Object.keys(tables).length,
          fields: totalFields,
          relationships: validRelationships.length,
          categories: categoriesSize,
        },
      });
    } catch (error) {
      console.error('[useExcelParser] Parse error:', error instanceof Error ? error.message : String(error));

      if (!mountedRef.current) return;
      setResult({
        model: null,
        error: error instanceof Error ? error.message : 'Failed to parse Excel file',
        statistics: null,
      });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  return { parseExcel, loading, result };
}
