import type { DataModel, TableDef, Field, Relationship } from '../types/model';
import type { SchemaExport, SchemaFieldRow, SchemaRelationshipRow } from '../types/schemaExport';

export function modelToSchemaExport(model: DataModel): SchemaExport {
  const fields: SchemaFieldRow[] = [];
  for (const table of Object.values(model.tables)) {
    for (const f of table.fields) {
      fields.push({
        level: table.layer,
        tableName: table.name,
        category: table.category,
        fieldName: f.name,
        dataType: f.dataType ?? '',
        description: f.description ?? '',
        isPK: f.isPK,
        isFK: f.isFK,
        fkTargetLayer: f.fkTarget?.layer ?? '',
        fkTargetTable: f.fkTarget?.table ?? '',
        fkTargetField: f.fkTarget?.field ?? '',
        whyRequired: f.whyRequired,
        grain: f.grain,
        derivationLogic: f.derivationLogic,
        formula: f.formula,
        sourceTables: f.sourceTables?.map((st) => `${st.layer}.${st.table}`).join('; '),
        sourceFields: f.sourceFields,
        dashboardUsage: f.dashboardUsage,
        simplificationNote: f.simplificationNote,
        notes: f.notes,
      });
    }
  }
  const relationships: SchemaRelationshipRow[] = model.relationships.map((r) => ({
    sourceLayer: r.source.layer,
    sourceTable: r.source.table,
    sourceField: r.source.field,
    targetLayer: r.target.layer,
    targetTable: r.target.table,
    targetField: r.target.field,
    relationshipType: r.relationshipType,
  }));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    fields,
    relationships,
  };
}

export function schemaExportToModel(exported: SchemaExport): DataModel {
  const tables: Record<string, TableDef> = {};
  const categorySet = new Set<string>();
  const layerSet = new Set<string>();

  const tableKeyToFields = new Map<string, Field[]>();
  for (const row of exported.fields) {
    const tableKey = `${row.level}.${row.tableName}`;
    layerSet.add(row.level);
    categorySet.add(row.category || 'Uncategorized');
    const fkTarget =
      row.isFK && row.fkTargetTable
        ? {
            layer: row.fkTargetLayer || row.level,
            table: row.fkTargetTable,
            field: row.fkTargetField,
          }
        : undefined;
    const field: Field = {
      name: row.fieldName,
      description: row.description ?? '',
      dataType: row.dataType || undefined,
      isPK: row.isPK,
      isFK: row.isFK,
      ...(fkTarget && { fkTarget }),
      whyRequired: row.whyRequired || undefined,
      grain: row.grain || undefined,
      derivationLogic: row.derivationLogic || undefined,
      formula: row.formula || undefined,
      sourceFields: row.sourceFields || undefined,
      dashboardUsage: row.dashboardUsage || undefined,
      simplificationNote: row.simplificationNote || undefined,
      notes: row.notes || undefined,
    };
    if (row.sourceTables) {
      field.sourceTables = row.sourceTables
        .split(';')
        .map((s) => {
          const [layer, table] = s.trim().split('.');
          return layer && table ? { layer, table } : null;
        })
        .filter(Boolean) as Array<{ layer: string; table: string }>;
    }
    const list = tableKeyToFields.get(tableKey) ?? [];
    list.push(field);
    tableKeyToFields.set(tableKey, list);
  }

  for (const [tableKey, fields] of tableKeyToFields) {
    const [level, tableName] = tableKey.split('.');
    const category =
      exported.fields.find((r) => r.tableName === tableName && r.level === level)?.category ?? 'Uncategorized';
    tables[tableKey] = {
      key: tableKey,
      name: tableName,
      layer: level as 'L1' | 'L2' | 'L3',
      category,
      fields,
    };
  }

  const relationships: Relationship[] = exported.relationships.map((r) => {
    const sourceTableKey = `${r.sourceLayer}.${r.sourceTable}`;
    const targetTableKey = `${r.targetLayer}.${r.targetTable}`;
    return {
      id: `${sourceTableKey}.${r.sourceField}->${targetTableKey}.${r.targetField}`,
      source: {
        layer: r.sourceLayer,
        table: r.sourceTable,
        field: r.sourceField,
        tableKey: sourceTableKey,
      },
      target: {
        layer: r.targetLayer,
        table: r.targetTable,
        field: r.targetField,
        tableKey: targetTableKey,
      },
      isCrossLayer: r.sourceLayer !== r.targetLayer,
      relationshipType: r.relationshipType ?? 'primary',
    };
  });

  return {
    tables,
    relationships,
    categories: Array.from(categorySet),
    layers: Array.from(layerSet).sort(),
  };
}
