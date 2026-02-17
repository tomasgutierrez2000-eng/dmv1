import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import type { DataModel, Relationship, TableDef, Field } from '@/types/model';
import { getL1Category, L1_CATEGORY_ORDER } from '@/lib/l1-table-categories';
import { getL2Category, L2_CATEGORY_ORDER } from '@/lib/l2-table-categories';
import { L3_TABLES } from '@/data/l3-tables';

const L1_OUTPUT_DIR = path.join(process.cwd(), 'scripts/l1/output');
const L2_OUTPUT_DIR = path.join(process.cwd(), 'scripts/l2/output');
const L3_OUTPUT_DIR = path.join(process.cwd(), 'scripts/l3/output');
const L1_SAMPLE_DATA_PATH = path.join(L1_OUTPUT_DIR, 'sample-data.json');
const L1_RELATIONSHIPS_PATH = path.join(L1_OUTPUT_DIR, 'relationships.json');
const L1_METADATA_PATH = path.join(L1_OUTPUT_DIR, 'table-metadata.json');
const L2_SAMPLE_DATA_PATH = path.join(L2_OUTPUT_DIR, 'sample-data.json');
const L2_RELATIONSHIPS_PATH = path.join(L2_OUTPUT_DIR, 'relationships.json');
const L2_METADATA_PATH = path.join(L2_OUTPUT_DIR, 'table-metadata.json');
const L3_TABLE_FIELDS_PATH = path.join(L3_OUTPUT_DIR, 'l3-table-fields.json');

/** Formulas for key L3 derived fields (from population scripts) */
const L3_FIELD_FORMULAS: Record<string, Record<string, { formula?: string; derivationLogic?: string }>> = {
  limit_current_state: {
    utilized_amt: { formula: 'SUM(L2.limit_contribution_snapshot.contribution_amt)', derivationLogic: 'Sum of contributions to this limit' },
    available_amt: { formula: 'limit_amt - utilized_amt', derivationLogic: 'Headroom' },
    utilization_pct: { formula: 'utilized_amt / limit_amt * 100', derivationLogic: 'Percent of limit used' },
    status_code: { formula: "CASE WHEN utilized > limit THEN 'BREACH' WHEN utilized/limit >= 0.9 THEN 'WARN' ELSE 'OK'", derivationLogic: 'From utilization vs threshold' },
    classification_code: { formula: "RED if >=100%, AMBER if >=75%, GREEN else", derivationLogic: 'Tier from utilization %' },
    utilization_tier_code: { formula: "'<50%' | '50-75%' | '75-90%' | '>90%'", derivationLogic: 'From utilization_pct' },
  },
  limit_utilization_timeseries: {
    utilization_pct: { formula: 'utilized_amt / (utilized_amt + available_amt) * 100', derivationLogic: 'Snapshot utilization %' },
  },
};

type ColumnMeta = { type: string; pk: boolean; fk: string | null; nullable: boolean };
type TableMetadata = Record<string, Record<string, ColumnMeta>>;

function loadJsonIfExists<T>(filePath: string, defaultValue: T): T {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return defaultValue;
  }
}

function buildTablesFromData(
  data: Record<string, { columns: string[]; rows: unknown[][] }>,
  relationships: Relationship[],
  layer: 'L1' | 'L2',
  getCategory: (tableName: string) => string
): DataModel['tables'] {
  const sourceFieldSet = new Set(relationships.map((r) => `${r.source.tableKey}.${r.source.field}`));
  const tables: DataModel['tables'] = {};
  for (const tableKey of Object.keys(data)) {
    const entry = data[tableKey];
    const columns: string[] = entry?.columns ?? [];
    const tableName = tableKey.includes('.') ? tableKey.split('.')[1] : tableKey;
    const category = getCategory(tableName);
    const fkTargetByField = new Map<string, { layer: string; table: string; field: string }>();
    for (const r of relationships) {
      if (r.source.tableKey === tableKey) {
        fkTargetByField.set(r.source.field, {
          layer: r.target.layer,
          table: r.target.table,
          field: r.target.field,
        });
      }
    }
    tables[tableKey] = {
      key: tableKey,
      name: tableName,
      layer,
      category,
      fields: columns.map((name, i) => {
        const isFK = sourceFieldSet.has(`${tableKey}.${name}`);
        const fkTarget = fkTargetByField.get(name);
        return {
          name,
          description: '',
          isPK: i === 0,
          isFK,
          ...(fkTarget && { fkTarget }),
        };
      }),
    };
  }
  return tables;
}

type L3FieldSpec = { name: string; dataType?: string; fkTarget?: { layer: string; table: string; field: string }; sourceFields?: string };
type L3TableFieldsJson = Record<string, { category: string; fields: L3FieldSpec[] }>;

function buildL3TablesAndRelationships(
  l3FieldsByTable: L3TableFieldsJson,
  existingTableKeys: Set<string>
): { tables: DataModel['tables']; relationships: Relationship[]; categories: string[] } {
  const tables: DataModel['tables'] = {};
  const relationships: Relationship[] = [];
  const categorySet = new Set<string>();

  for (const l3Table of L3_TABLES) {
    const tableName = l3Table.name;
    const key = `L3.${tableName}`;
    const spec = l3FieldsByTable[tableName];
    const category = spec?.category ?? l3Table.category;
    categorySet.add(category);

    const rawFields: L3FieldSpec[] = spec?.fields ?? [{ name: 'id', dataType: 'VARCHAR' }];
    const fields: Field[] = rawFields.map((f, i) => {
      const formulas = L3_FIELD_FORMULAS[tableName]?.[f.name];
      const isPK = i === 0;
      const isFK = !!f.fkTarget;
      return {
        name: f.name,
        description: '',
        isPK,
        isFK,
        dataType: f.dataType ?? '',
        ...(f.fkTarget && { fkTarget: f.fkTarget }),
        ...(f.sourceFields && { sourceFields: f.sourceFields }),
        ...(formulas?.formula && { formula: formulas.formula }),
        ...(formulas?.derivationLogic && { derivationLogic: formulas.derivationLogic }),
      };
    });

    tables[key] = {
      key,
      name: tableName,
      layer: 'L3',
      category,
      fields,
    };

    for (const f of rawFields) {
      if (!f.fkTarget) continue;
      const { layer, table: srcTable, field: srcField } = f.fkTarget;
      const sourceTableKey = `${layer}.${srcTable}`;
      if (!existingTableKeys.has(sourceTableKey)) continue;
      const relId = `deriv-${sourceTableKey}-${srcField}-${key}-${f.name}`;
      relationships.push({
        id: relId,
        source: { layer, table: srcTable, field: srcField, tableKey: sourceTableKey },
        target: { layer: 'L3', table: tableName, field: f.name, tableKey: key },
        isCrossLayer: true,
        relationshipType: 'secondary',
      });
    }
  }

  return { tables, relationships, categories: Array.from(categorySet).sort() };
}

export async function GET() {
  if (!fs.existsSync(L1_SAMPLE_DATA_PATH)) {
    return NextResponse.json(
      { error: 'Run: npx tsx scripts/l1/generate.ts to generate L1 sample data first.' },
      { status: 404 }
    );
  }

  const l1Data = loadJsonIfExists<Record<string, { columns: string[]; rows: unknown[][] }>>(
    L1_SAMPLE_DATA_PATH,
    {}
  );
  let l1Relationships: Relationship[] = loadJsonIfExists(L1_RELATIONSHIPS_PATH, []);
  const l1Meta: TableMetadata = loadJsonIfExists(L1_METADATA_PATH, {});

  let l2Data: Record<string, { columns: string[]; rows: unknown[][] }> = {};
  let l2Relationships: Relationship[] = [];
  let l2Meta: TableMetadata = {};
  const hasL2 = fs.existsSync(L2_SAMPLE_DATA_PATH);
  if (hasL2) {
    l2Data = loadJsonIfExists(L2_SAMPLE_DATA_PATH, {});
    l2Relationships = loadJsonIfExists(L2_RELATIONSHIPS_PATH, []);
    l2Meta = loadJsonIfExists(L2_METADATA_PATH, {});
  }

  const data = { ...l1Data, ...l2Data };
  const relationships = [...l1Relationships, ...l2Relationships];
  const allMeta: TableMetadata = { ...l1Meta, ...l2Meta };

  const tables: DataModel['tables'] = {};
  const categorySet = new Set<string>();

  for (const tableKey of Object.keys(data)) {
    const layer = tableKey.startsWith('L2.') ? 'L2' : 'L1';
    const getCategory = layer === 'L2' ? getL2Category : getL1Category;
    const entry = data[tableKey];
    const columns: string[] = entry?.columns ?? [];
    const tableName = tableKey.includes('.') ? tableKey.split('.')[1] : tableKey;
    const category = getCategory(tableName);
    categorySet.add(category);
    const sourceFieldSet = new Set(relationships.map((r) => `${r.source.tableKey}.${r.source.field}`));
    const fkTargetByField = new Map<string, { layer: string; table: string; field: string }>();
    for (const r of relationships) {
      if (r.source.tableKey === tableKey) {
        fkTargetByField.set(r.source.field, {
          layer: r.target.layer,
          table: r.target.table,
          field: r.target.field,
        });
      }
    }
    const tableMeta = allMeta[tableKey] ?? {};
    tables[tableKey] = {
      key: tableKey,
      name: tableName,
      layer: layer as 'L1' | 'L2',
      category,
      fields: columns.map((name, i) => {
        const meta = tableMeta[name];
        const isFK = sourceFieldSet.has(`${tableKey}.${name}`) || (meta?.fk ? true : false);
        const fkTarget = fkTargetByField.get(name);
        return {
          name,
          description: '',
          isPK: meta ? meta.pk : (i === 0),
          isFK,
          dataType: meta?.type ?? '',
          ...(fkTarget && { fkTarget }),
        };
      }),
    };
  }

  const l1Categories = (L1_CATEGORY_ORDER as readonly string[]).filter((c) => categorySet.has(c));
  const l2Categories = (L2_CATEGORY_ORDER as readonly string[]).filter((c) => categorySet.has(c));
  const remaining = Array.from(categorySet).filter(
    (c) => !l1Categories.includes(c) && !l2Categories.includes(c)
  ).sort();
  let categories = [...l1Categories, ...l2Categories, ...remaining];
  let layers: string[] = hasL2 ? ['L1', 'L2'] : ['L1'];

  const existingTableKeys = new Set(Object.keys(tables));
  const l3FieldsByTable = loadJsonIfExists<L3TableFieldsJson>(L3_TABLE_FIELDS_PATH, {});
  if (Object.keys(l3FieldsByTable).length > 0) {
    const l3Result = buildL3TablesAndRelationships(l3FieldsByTable, existingTableKeys);
    Object.assign(tables, l3Result.tables);
    relationships.push(...l3Result.relationships);
    const l3Cats = l3Result.categories.filter((c) => !categories.includes(c));
    categories = [...categories, ...l3Cats];
    layers = [...layers, 'L3'];
  }

  const model: DataModel = {
    tables,
    relationships,
    categories,
    layers,
  };

  return NextResponse.json(model);
}
