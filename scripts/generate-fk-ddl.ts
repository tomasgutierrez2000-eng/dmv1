/**
 * Generate FK constraint DDL from data dictionary relationships.
 *
 * Reads all 269 relationships from data-dictionary.json and generates
 * per-layer FK DDL files in sql/fk/ using idempotent DO $$ blocks.
 *
 * Run:  npx tsx scripts/generate-fk-ddl.ts
 *   or: npm run generate:fk
 *
 * Output:
 *   sql/fk/fk-l1.sql  — L1 internal FK constraints
 *   sql/fk/fk-l2.sql  — L2→L1/L2 FK constraints
 *   sql/fk/fk-l3.sql  — L3→L1/L2/L3 FK constraints
 */

import fs from 'node:fs';
import path from 'node:path';
import { readDataDictionary } from '../lib/data-dictionary';
import { buildForeignKey } from '../lib/ddl-generator';

const FK_DIR = path.resolve(__dirname, '../sql/fk');

interface Relationship {
  from_layer: string;
  from_table: string;
  from_field: string;
  to_layer: string;
  to_table: string;
  to_field: string;
}

function main() {
  const dd = readDataDictionary();
  if (!dd) {
    console.error('ERROR: data-dictionary.json not found. Run: npm run db:introspect');
    process.exit(1);
  }

  const rels = (dd as Record<string, unknown>).relationships as Relationship[] | undefined;
  if (!rels || rels.length === 0) {
    console.error('ERROR: No relationships found in data dictionary.');
    process.exit(1);
  }

  console.log(`Found ${rels.length} relationships in data dictionary.`);

  // Group by originating layer
  const byLayer: Record<string, Relationship[]> = { L1: [], L2: [], L3: [] };
  for (const rel of rels) {
    const layer = rel.from_layer.toUpperCase();
    if (layer in byLayer) {
      byLayer[layer].push(rel);
    }
  }

  // Create output directory
  if (!fs.existsSync(FK_DIR)) {
    fs.mkdirSync(FK_DIR, { recursive: true });
  }

  // Generate per-layer FK DDL
  for (const [layer, layerRels] of Object.entries(byLayer)) {
    if (layerRels.length === 0) continue;

    const searchPath =
      layer === 'L3' ? 'SET search_path TO l1, l2, l3, public;\n\n' :
      layer === 'L2' ? 'SET search_path TO l1, l2, public;\n\n' :
      'SET search_path TO l1, public;\n\n';

    const header =
      `-- ${layer} Foreign Key Constraints\n` +
      `-- Generated from data-dictionary.json (${layerRels.length} relationships)\n` +
      `-- Idempotent: safe to re-run (uses EXCEPTION WHEN OTHERS)\n` +
      `--\n` +
      `-- To apply: psql -f sql/fk/fk-${layer.toLowerCase()}.sql\n\n` +
      searchPath;

    const body = layerRels
      .map(rel => buildForeignKey(rel))
      .join('\n\n');

    const outFile = path.join(FK_DIR, `fk-${layer.toLowerCase()}.sql`);
    fs.writeFileSync(outFile, header + body + '\n');
    console.log(`  ${outFile}: ${layerRels.length} FK constraints`);
  }

  console.log(`\nDone. Apply with:`);
  console.log(`  psql -f sql/fk/fk-l1.sql`);
  console.log(`  psql -f sql/fk/fk-l2.sql`);
  console.log(`  psql -f sql/fk/fk-l3.sql`);
}

main();
