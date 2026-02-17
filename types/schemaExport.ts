/**
 * Flattened schema format for export/import.
 * One row per field; relationships can be inferred from FK columns or a separate relationships array.
 */
export interface SchemaFieldRow {
  level: string;
  tableName: string;
  category: string;
  fieldName: string;
  dataType: string;
  description: string;
  isPK: boolean;
  isFK: boolean;
  fkTargetLayer: string;
  fkTargetTable: string;
  fkTargetField: string;
  whyRequired?: string;
  grain?: string;
  derivationLogic?: string;
  formula?: string;
  sourceTables?: string;
  sourceFields?: string;
  dashboardUsage?: string;
  simplificationNote?: string;
  notes?: string;
}

export interface SchemaRelationshipRow {
  sourceLayer: string;
  sourceTable: string;
  sourceField: string;
  targetLayer: string;
  targetTable: string;
  targetField: string;
  relationshipType: 'primary' | 'secondary';
}

export interface SchemaExport {
  version: number;
  exportedAt: string;
  fields: SchemaFieldRow[];
  relationships: SchemaRelationshipRow[];
}
