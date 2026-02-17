import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import type { DataModel, Relationship } from '@/types/model';
import { getL1Category, L1_CATEGORY_ORDER } from '@/lib/l1-table-categories';
import { getL2Category, L2_CATEGORY_ORDER } from '@/lib/l2-table-categories';

const L1_OUTPUT_DIR = path.join(process.cwd(), 'scripts/l1/output');
const L2_OUTPUT_DIR = path.join(process.cwd(), 'scripts/l2/output');
const L1_SAMPLE_DATA_PATH = path.join(L1_OUTPUT_DIR, 'sample-data.json');
const L1_RELATIONSHIPS_PATH = path.join(L1_OUTPUT_DIR, 'relationships.json');
const L1_METADATA_PATH = path.join(L1_OUTPUT_DIR, 'table-metadata.json');
const L2_SAMPLE_DATA_PATH = path.join(L2_OUTPUT_DIR, 'sample-data.json');
const L2_RELATIONSHIPS_PATH = path.join(L2_OUTPUT_DIR, 'relationships.json');
const L2_METADATA_PATH = path.join(L2_OUTPUT_DIR, 'table-metadata.json');

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
  const categories = [...l1Categories, ...l2Categories, ...remaining];

  const model: DataModel = {
    tables,
    relationships,
    categories,
    layers: hasL2 ? ['L1', 'L2'] : ['L1'],
  };

  return NextResponse.json(model);
}
