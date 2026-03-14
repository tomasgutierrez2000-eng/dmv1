/**
 * Enrich data-dictionary.json with is_fk / fk_target metadata.
 *
 * Reads the `relationships[]` array from data-dictionary.json and
 * patches every matching field entry with `pk_fk.is_fk`, `pk_fk.fk_target_table`,
 * `pk_fk.fk_target_column`, and `pk_fk.fk_target_layer`.
 *
 * Usage: npx tsx scripts/enrich-fk-metadata.ts [--dry-run]
 */

import fs from 'fs';
import path from 'path';

const DD_PATH = path.resolve(
  __dirname,
  '../facility-summary-mvp/output/data-dictionary/data-dictionary.json',
);

interface Relationship {
  from_layer: string;
  from_table: string;
  from_field: string;
  to_layer: string;
  to_table: string;
  to_field: string;
}

interface Field {
  name: string;
  description?: string;
  data_type?: string;
  pk_fk?: {
    is_pk?: boolean;
    is_composite?: boolean;
    is_fk?: boolean;
    fk_target?: {
      layer: string;
      table: string;
      field: string;
    };
  };
  [key: string]: unknown;
}

interface Table {
  name: string;
  layer: string;
  fields: Field[];
  [key: string]: unknown;
}

interface DataDictionary {
  L1: Table[];
  L2: Table[];
  L3: Table[];
  relationships: Relationship[];
  [key: string]: unknown;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const raw = fs.readFileSync(DD_PATH, 'utf-8');
  const dd: DataDictionary = JSON.parse(raw);

  const allTables: Table[] = [
    ...(dd.L1 ?? []),
    ...(dd.L2 ?? []),
    ...(dd.L3 ?? []),
  ];

  const tableMap = new Map<string, Table>();
  for (const t of allTables) {
    tableMap.set(`${t.layer}.${t.name}`, t);
  }

  let enriched = 0;
  let skipped = 0;

  for (const rel of dd.relationships ?? []) {
    const key = `${rel.from_layer}.${rel.from_table}`;
    const table = tableMap.get(key);
    if (!table) {
      skipped++;
      continue;
    }
    const field = table.fields.find((f) => f.name === rel.from_field);
    if (!field) {
      skipped++;
      continue;
    }

    if (!field.pk_fk) {
      field.pk_fk = {};
    }
    field.pk_fk.is_fk = true;
    field.pk_fk.fk_target = {
      layer: rel.to_layer,
      table: rel.to_table,
      field: rel.to_field,
    };
    enriched++;
  }

  console.log(`Enriched ${enriched} fields with FK metadata (${skipped} relationships skipped)`);

  if (dryRun) {
    console.log('[DRY RUN] No file written.');
    return;
  }

  fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2) + '\n', 'utf-8');
  console.log(`Written to ${DD_PATH}`);
}

main();
