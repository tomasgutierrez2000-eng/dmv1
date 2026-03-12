#!/usr/bin/env npx tsx
/**
 * Generate FK constraint migration SQL files from data dictionary relationships.
 * Reads DD relationships[] and produces 3 migration files split by originating layer.
 *
 * Output:
 *   sql/migrations/008a-fk-constraints-l1.sql
 *   sql/migrations/008b-fk-constraints-l2.sql
 *   sql/migrations/008c-fk-constraints-l3.sql
 */

import fs from 'fs';
import path from 'path';

interface Relationship {
  from_layer: string;
  from_table: string;
  from_field: string;
  to_layer: string;
  to_table: string;
  to_field: string;
}

// ── Abbreviation map for constraint names (63-char NAMEDATALEN limit) ──
const ABBREVS: Record<string, string> = {
  credit_agreement: 'ca',
  counterparty: 'cp',
  facility: 'fac',
  collateral: 'coll',
  instrument: 'instr',
  netting: 'net',
  protection: 'prot',
  relationship: 'rel',
  interdependence: 'interdep',
  economic: 'econ',
  observation: 'obs',
  snapshot: 'snap',
  participation: 'part',
  allocation: 'alloc',
  assignment: 'assign',
  contribution: 'contrib',
  utilization: 'util',
  attribution: 'attr',
  delinquency: 'delinq',
  profitability: 'profit',
  financial: 'fin',
  amendment: 'amend',
  exposure: 'exp',
  agreement: 'agr',
  hierarchy: 'hier',
  master: 'mstr',
  calculation: 'calc',
  regulatory: 'reg',
  capital: 'cap',
  consumption: 'cons',
  movement: 'mov',
  summary: 'summ',
  binding: 'bind',
  constraint: 'constr',
  portfolio: 'port',
  segment: 'seg',
  position: 'pos',
  quality: 'qual',
  impairment: 'impair',
  provision: 'prov',
  allowance: 'allow',
  watchlist: 'watch',
  forbearance: 'forb',
  category: 'cat',
  mitigant: 'mitig',
  staging: 'stg',
  pipeline: 'pipe',
  exception: 'excpt',
  approval: 'appr',
  payment: 'pay',
  ledger: 'ldgr',
  journal: 'jrnl',
  account: 'acct',
  balance: 'bal',
  pricing: 'pric',
  lender: 'lndr',
};

function abbreviateTable(name: string): string {
  let result = name;
  const sorted = Object.entries(ABBREVS).sort((a, b) => b[0].length - a[0].length);
  for (const [full, abbr] of sorted) {
    result = result.replace(new RegExp(full, 'g'), abbr);
  }
  return result;
}

function fkConstraintName(fromTable: string, fromField: string): string {
  const base = `fk_${fromTable}_${fromField}`;
  if (base.length <= 63) return base;
  const abbr = `fk_${abbreviateTable(fromTable)}_${fromField}`;
  if (abbr.length <= 63) return abbr;
  return abbr.substring(0, 63);
}

function quoteId(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function buildFkStatement(rel: Relationship, suffix?: string): string {
  const fromSchema = rel.from_layer.toLowerCase();
  const toSchema = rel.to_layer.toLowerCase();
  let constraintName = fkConstraintName(rel.from_table, rel.from_field);
  if (suffix) constraintName = (constraintName + '_' + suffix).substring(0, 63);
  return (
    `DO $$ BEGIN\n` +
    `  ALTER TABLE ${quoteId(fromSchema)}.${quoteId(rel.from_table)}\n` +
    `    ADD CONSTRAINT ${quoteId(constraintName)}\n` +
    `    FOREIGN KEY (${quoteId(rel.from_field)})\n` +
    `    REFERENCES ${quoteId(toSchema)}.${quoteId(rel.to_table)} (${quoteId(rel.to_field)});\n` +
    `EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', '${rel.from_table}', '${rel.from_field}', SQLERRM;\n` +
    `END $$;`
  );
}

// ── Main ──

const ddPath = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');
const dd = JSON.parse(fs.readFileSync(ddPath, 'utf-8'));
const rels: Relationship[] = dd.relationships || [];

console.log(`Total relationships: ${rels.length}`);

// Group by originating layer
const l1Rels = rels.filter(r => r.from_layer.toUpperCase() === 'L1');
const l2Rels = rels.filter(r => r.from_layer.toUpperCase() === 'L2');
const l3Rels = rels.filter(r => r.from_layer.toUpperCase() === 'L3');

console.log(`L1: ${l1Rels.length}, L2: ${l2Rels.length}, L3: ${l3Rels.length}`);

// Check for constraint name collisions
const allNames = new Set<string>();
const duplicates: string[] = [];
for (const rel of rels) {
  const name = fkConstraintName(rel.from_table, rel.from_field);
  if (allNames.has(name)) {
    duplicates.push(name);
  }
  allNames.add(name);
}
if (duplicates.length > 0) {
  console.warn(`WARNING: ${duplicates.length} constraint name collisions:`, duplicates);
}

// Check for names exceeding 63 chars
const tooLong = [...allNames].filter(n => n.length > 63);
if (tooLong.length > 0) {
  console.warn(`WARNING: ${tooLong.length} constraint names exceed 63 chars:`, tooLong);
}

function generateMigration(layer: string, layerRels: Relationship[], filename: string, description: string): void {
  const searchPath =
    layer === 'L3' ? `SET search_path TO l1, l2, l3, public;\n\n` :
    layer === 'L2' ? `SET search_path TO l1, l2, public;\n\n` :
    '';

  const header =
    `-- Migration 008${filename.charAt(filename.indexOf('008') + 3)}: ${description}\n` +
    `-- Auto-generated from data dictionary relationships.\n` +
    `-- Each constraint wrapped in DO $$ for idempotency.\n` +
    `-- Total constraints: ${layerRels.length}\n\n` +
    searchPath;

  // Detect constraint name collisions within this layer
  const nameCount = new Map<string, number>();
  for (const r of layerRels) {
    const name = fkConstraintName(r.from_table, r.from_field);
    nameCount.set(name, (nameCount.get(name) || 0) + 1);
  }
  const nameSeen = new Map<string, number>();

  const body = layerRels.map(r => {
    const baseName = fkConstraintName(r.from_table, r.from_field);
    let suffix: string | undefined;
    if ((nameCount.get(baseName) || 0) > 1) {
      const seq = (nameSeen.get(baseName) || 0) + 1;
      nameSeen.set(baseName, seq);
      suffix = abbreviateTable(r.to_table);
    }
    const comment = `-- ${r.from_table}.${r.from_field} → ${r.to_table}.${r.to_field}`;
    return `${comment}\n${buildFkStatement(r, suffix)}`;
  }).join('\n\n');

  const outPath = path.resolve(__dirname, `../sql/migrations/${filename}`);
  fs.writeFileSync(outPath, header + body + '\n', 'utf-8');
  console.log(`Wrote ${outPath} (${layerRels.length} constraints)`);
}

generateMigration('L1', l1Rels, '008a-fk-constraints-l1.sql', 'FK constraints for L1 tables');
generateMigration('L2', l2Rels, '008b-fk-constraints-l2.sql', 'FK constraints for L2 tables');
generateMigration('L3', l3Rels, '008c-fk-constraints-l3.sql', 'FK constraints for L3 tables');

console.log('\nDone. Review the generated files, then execute:');
console.log('  npx tsx scripts/run-sql.ts sql/migrations/008a-fk-constraints-l1.sql');
console.log('  npx tsx scripts/run-sql.ts sql/migrations/008b-fk-constraints-l2.sql');
console.log('  npx tsx scripts/run-sql.ts sql/migrations/008c-fk-constraints-l3.sql');
