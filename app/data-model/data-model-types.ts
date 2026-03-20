/* Types, constants, and helpers for the Data Model page. */

export interface FieldDefinition {
  name: string;
  description: string;
  category: string;
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

export interface ParsedTableDefinition {
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: FieldDefinition[];
}

export interface DataDictionary {
  L1: ParsedTableDefinition[];
  L2: ParsedTableDefinition[];
  L3: ParsedTableDefinition[];
  relationships: Array<{
    from_table: string;
    from_field: string;
    to_table: string;
    to_field: string;
    from_layer: string;
    to_layer: string;
  }>;
  derivation_dag: Record<string, string[]>;
}

export interface TableDefinition {
  id: string;
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  fields: string[];
  primaryKey: string;
  foreignKeys: { field: string; references: string; table: string }[];
  description?: string;
  category?: string;
}

export interface AddTablePayload {
  layer: 'L1' | 'L2' | 'L3';
  name: string;
  category: string;
  fields: Array<{
    name: string;
    data_type?: string;
    pk_fk?: { is_pk: boolean; fk_target?: { layer: string; table: string; field: string } };
  }>;
}

export const LAYER_COLORS = {
  L1: { bg: '#D04A02', border: '#D04A02', text: '#ffffff', cardBadge: 'bg-white/20 text-white', badge: 'bg-orange-100 text-orange-800' },
  L2: { bg: '#E87722', border: '#E87722', text: '#ffffff', cardBadge: 'bg-white/20 text-white', badge: 'bg-amber-100 text-amber-800' },
  L3: { bg: '#6B7280', border: '#6B7280', text: '#ffffff', cardBadge: 'bg-white/20 text-white', badge: 'bg-gray-100 text-gray-700' },
} as const;

export const DATA_TYPE_OPTIONS = [
  'VARCHAR(64)',
  'VARCHAR(500)',
  'BIGINT',
  'INTEGER',
  'NUMERIC(20,4)',
  'NUMERIC(10,6)',
  'BOOLEAN',
  'DATE',
  'TIMESTAMP',
] as const;

/** Transform parsed data dictionary to visualization format. */
export function transformDataDictionary(dataDict: DataDictionary): TableDefinition[] {
  const tables: TableDefinition[] = [];
  const allTables = [...dataDict.L1, ...dataDict.L2, ...dataDict.L3];

  allTables.forEach((table) => {
    const pkFields = table.fields
      .filter((f) => f.pk_fk?.is_pk)
      .map((f) => f.name);
    const primaryKey = pkFields.length > 0 ? pkFields.join(', ') : 'N/A';

    const foreignKeys = dataDict.relationships
      .filter((rel) => rel.from_table === table.name)
      .map((rel) => ({
        field: rel.from_field,
        references: rel.to_field,
        table: rel.to_table,
      }));

    const fieldNames = table.fields.map((f) => {
      let name = f.name;
      if (f.pk_fk?.is_pk) name += ' (PK)';
      if (f.pk_fk?.fk_target) name += ' (FK)';
      return name;
    });

    const description = table.fields[0]?.description || table.category || '';

    tables.push({
      id: table.name,
      name: table.name,
      layer: table.layer,
      fields: fieldNames,
      primaryKey,
      foreignKeys,
      description,
      category: table.category,
    });
  });

  return tables;
}

/** Get raw table from data dictionary by table name (id). */
export function getTableFromDict(
  dataDict: DataDictionary | null,
  tableId: string
): (ParsedTableDefinition & { layer: 'L1' | 'L2' | 'L3' }) | null {
  if (!dataDict) return null;
  for (const layer of ['L1', 'L2', 'L3'] as const) {
    const t = dataDict[layer].find((x) => x.name === tableId);
    if (t) return { ...t, layer };
  }
  return null;
}
