import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import type { DataModel } from '@/types/model';
import { getL1Category, L1_CATEGORY_ORDER } from '@/lib/l1-table-categories';

const SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l1/output/sample-data.json');

export async function GET() {
  if (!fs.existsSync(SAMPLE_DATA_PATH)) {
    return NextResponse.json(
      { error: 'Run: npx tsx scripts/l1/generate.ts to generate sample data first.' },
      { status: 404 }
    );
  }

  const data = JSON.parse(fs.readFileSync(SAMPLE_DATA_PATH, 'utf-8'));
  const tables: DataModel['tables'] = {};
  const categorySet = new Set<string>();
  const tableKeys = Object.keys(data) as string[];

  for (const tableKey of tableKeys) {
    const entry = data[tableKey];
    const columns: string[] = entry?.columns ?? [];
    const tableName = tableKey.includes('.') ? tableKey.split('.')[1] : tableKey;
    const category = getL1Category(tableName);
    categorySet.add(category);
    tables[tableKey] = {
      key: tableKey,
      name: tableName,
      layer: 'L1',
      category,
      fields: columns.map((name, i) => ({
        name,
        description: '',
        isPK: i === 0,
        isFK: false,
      })),
    };
  }

  // Use canonical category order so the main view groups tables in a logical order
  const categories = (L1_CATEGORY_ORDER as readonly string[]).filter((c) => categorySet.has(c));
  const remaining = Array.from(categorySet).filter((c) => !categories.includes(c)).sort();
  const model: DataModel = {
    tables,
    relationships: [],
    categories: [...categories, ...remaining],
    layers: ['L1'],
  };

  return NextResponse.json(model);
}
