/**
 * Export DDL-only SQL files from GCP PostgreSQL (no sample data).
 *
 * Pipeline:
 *   1. Introspect live PostgreSQL → update data dictionary
 *   2. Generate CREATE TABLE + FK DDL for L1, L2, L3 from data dictionary
 *   3. Write to sql/gsib-export/ and ~/Downloads/
 *
 * Output files (DDL only — no INSERT statements):
 *   - 01-l1-ddl.sql   (L1 reference tables)
 *   - 02-l2-ddl.sql   (L2 atomic tables)
 *   - 03-l3-ddl.sql   (L3 derived tables)
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/export-ddl-only.ts
 *   # or with .env:
 *   npm run db:export-ddl
 */
import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';

import type { DataDictionary } from '../lib/data-dictionary';
import { readDataDictionary } from '../lib/data-dictionary';
import { runIntrospection } from '../lib/introspect';
import { generateLayerDdl } from '../lib/ddl-generator';

const ROOT = path.resolve(__dirname, '..');
const GSIB_DIR = path.join(ROOT, 'sql', 'gsib-export');
const DOWNLOADS = path.join(os.homedir(), 'Downloads');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  // ── Step 1: Introspect from GCP PostgreSQL (if available) ─────────────
  if (databaseUrl) {
    console.log('\n  Step 1: Introspecting PostgreSQL database...');
    const DD_PATH = path.resolve(ROOT, 'facility-summary-mvp/output/data-dictionary/data-dictionary.json');
    let dd: DataDictionary;
    if (fs.existsSync(DD_PATH)) {
      dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
    } else {
      dd = { L1: [], L2: [], L3: [], relationships: [], derivation_dag: {} };
    }
    const report = await runIntrospection(dd, databaseUrl);
    const ddDir = path.dirname(DD_PATH);
    if (!fs.existsSync(ddDir)) fs.mkdirSync(ddDir, { recursive: true });
    fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf-8');
    console.log(`  Introspected: L1=${report.totalTables.L1} L2=${report.totalTables.L2} L3=${report.totalTables.L3} tables`);
  } else {
    console.log('\n  Step 1: No DATABASE_URL — using existing data dictionary');
  }

  // ── Step 2: Read data dictionary ──────────────────────────────────────
  const dd = readDataDictionary();
  if (!dd) {
    console.error('  ERROR: No data dictionary found. Run db:introspect first.');
    process.exit(1);
  }

  const l1Count = dd.L1.filter(t => t.fields.length > 0).length;
  const l2Count = dd.L2.filter(t => t.fields.length > 0).length;
  const l3Count = dd.L3.filter(t => t.fields.length > 0).length;
  console.log(`\n  Step 2: Data dictionary loaded — L1=${l1Count} L2=${l2Count} L3=${l3Count} tables`);

  // ── Step 3: Generate DDL ──────────────────────────────────────────────
  console.log('\n  Step 3: Generating DDL...');
  const l1Ddl = generateLayerDdl(dd, 'L1');
  const l2Ddl = generateLayerDdl(dd, 'L2');
  const l3Ddl = generateLayerDdl(dd, 'L3');

  // ── Step 4: Write files ───────────────────────────────────────────────
  const files: Array<{ name: string; content: string }> = [
    { name: '01-l1-ddl.sql', content: l1Ddl },
    { name: '02-l2-ddl.sql', content: l2Ddl },
    { name: '03-l3-ddl.sql', content: l3Ddl },
  ];

  // Write to sql/gsib-export/
  fs.mkdirSync(GSIB_DIR, { recursive: true });
  for (const f of files) {
    const p = path.join(GSIB_DIR, f.name);
    fs.writeFileSync(p, f.content, 'utf-8');
  }
  console.log(`  Written to: sql/gsib-export/`);

  // Write combined file to Downloads
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const combinedName = `credit_dw_ddl_only_${timestamp}.sql`;
  const combined = [
    '-- Credit Data Warehouse — DDL Only Export (no sample data)',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source: ${databaseUrl ? 'GCP PostgreSQL (live introspection)' : 'Data dictionary (cached)'}`,
    `-- Tables: L1=${l1Count}, L2=${l2Count}, L3=${l3Count} (${l1Count + l2Count + l3Count} total)`,
    '--',
    '-- Usage: psql -d <target_db> -f this_file.sql',
    '',
    'BEGIN;',
    '',
    '-- ═══════ L1: Reference Data ═══════',
    l1Ddl,
    '',
    '-- ═══════ L2: Atomic Data ═══════',
    l2Ddl,
    '',
    '-- ═══════ L3: Derived Data ═══════',
    l3Ddl,
    '',
    'COMMIT;',
  ].join('\n');

  try {
    fs.mkdirSync(DOWNLOADS, { recursive: true });
    const dlPath = path.join(DOWNLOADS, combinedName);
    fs.writeFileSync(dlPath, combined, 'utf-8');
    console.log(`  Written to: ${dlPath}`);
  } catch {
    console.log('  (Downloads folder not writable — skipped)');
  }

  // Also write to project sql/exports/
  const exportsDir = path.join(ROOT, 'sql', 'exports');
  fs.mkdirSync(exportsDir, { recursive: true });
  const exportPath = path.join(exportsDir, combinedName);
  fs.writeFileSync(exportPath, combined, 'utf-8');
  console.log(`  Written to: ${exportPath}`);

  // ── Summary ───────────────────────────────────────────────────────────
  const totalLines = combined.split('\n').length;
  const totalBytes = Buffer.byteLength(combined, 'utf-8');
  console.log(`\n  ═══ Export Summary ═══`);
  console.log(`  Tables:  L1=${l1Count}  L2=${l2Count}  L3=${l3Count}  Total=${l1Count + l2Count + l3Count}`);
  console.log(`  Fields:  L1=${dd.L1.reduce((s, t) => s + t.fields.length, 0)}  L2=${dd.L2.reduce((s, t) => s + t.fields.length, 0)}  L3=${dd.L3.reduce((s, t) => s + t.fields.length, 0)}`);
  console.log(`  FKs:     ${dd.relationships.length} relationships`);
  console.log(`  Size:    ${(totalBytes / 1024).toFixed(0)} KB (${totalLines} lines)`);
  console.log(`  Data:    NONE (DDL only — CREATE TABLE + FK constraints)`);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
