#!/usr/bin/env npx tsx
/**
 * Generates schema-manifest.yaml from the golden-source data dictionary.
 * Run: npx tsx .claude/config/generate-schema-manifest.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const DD_PATH = path.resolve(__dirname, '../../facility-summary-mvp/output/data-dictionary/data-dictionary.json');
const OUTPUT_PATH = path.resolve(__dirname, 'schema-manifest.yaml');

interface DDField {
  name: string;
  description?: string;
  data_type?: string;
  category?: string;
  pk_fk?: {
    is_pk?: boolean;
    is_composite?: boolean;
    fk_target?: { layer: string; table: string; field: string };
  };
}

interface DDTable {
  name: string;
  layer: string;
  category?: string;
  fields: DDField[];
}

const RISK_STRIPE_MAP: Record<string, string> = {
  'Exposure & Position': 'credit_risk',
  'Exposure & Limits': 'credit_risk',
  'Credit Risk': 'credit_risk',
  'Credit Events': 'credit_risk',
  'Collateral & Mitigation': 'credit_risk',
  'Pricing & Terms': 'credit_risk',
  'Financial Performance': 'credit_risk',
  'Delinquency & Default': 'credit_risk',
  'Portfolio Analytics': 'credit_risk',
  'Risk Scoring': 'credit_risk',
  'Counterparty': 'credit_risk',
  'Capital': 'capital_risk',
  'Regulatory Capital': 'capital_risk',
  'Market Risk': 'market_risk',
  'Liquidity': 'liquidity_risk',
  'Operational': 'operational_risk',
  'Reference Data': 'reference',
  'Configuration': 'reference',
  'Hierarchy': 'reference',
};

function inferRiskStripe(category: string | undefined, tableName: string): string {
  if (category && RISK_STRIPE_MAP[category]) return RISK_STRIPE_MAP[category];
  if (tableName.includes('capital') || tableName.includes('rwa')) return 'capital_risk';
  if (tableName.includes('stress')) return 'credit_risk';
  if (tableName.includes('collateral')) return 'credit_risk';
  if (tableName.includes('exposure') || tableName.includes('facility')) return 'credit_risk';
  if (tableName.includes('dim') || tableName.includes('type_dim')) return 'reference';
  if (tableName.includes('counterparty')) return 'credit_risk';
  return 'unclassified';
}

function yamlEscape(s: string): string {
  if (/[:#\[\]{}&*!|>'"%@`]/.test(s) || s.includes('\n')) {
    return JSON.stringify(s);
  }
  return s;
}

function toYamlLine(indent: number, key: string, value: string | number | boolean | null): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return `${pad}${key}: null`;
  if (typeof value === 'boolean') return `${pad}${key}: ${value}`;
  if (typeof value === 'number') return `${pad}${key}: ${value}`;
  return `${pad}${key}: ${yamlEscape(String(value))}`;
}

function main() {
  if (!fs.existsSync(DD_PATH)) {
    console.error(`Data dictionary not found at: ${DD_PATH}`);
    console.error('Run "npm run db:introspect" or "npm run sync:data-model" first.');
    process.exit(1);
  }

  const dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
  const lines: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  let totalTables = 0;
  const layerCounts: Record<string, number> = { L1: 0, L2: 0, L3: 0 };
  let unclassifiedCount = 0;

  // Collect all tables first for counting
  interface TableEntry {
    table: DDTable;
    layer: string;
    riskStripe: string;
  }
  const allTables: TableEntry[] = [];

  for (const layer of ['L1', 'L2', 'L3']) {
    const ddTables: DDTable[] = dd[layer] || [];
    for (const t of ddTables) {
      const riskStripe = inferRiskStripe(t.category, t.name);
      allTables.push({ table: t, layer, riskStripe });
      totalTables++;
      layerCounts[layer]++;
      if (riskStripe === 'unclassified') unclassifiedCount++;
    }
  }

  // Header
  lines.push(`# Schema Manifest — auto-generated from data dictionary`);
  lines.push(`# Regenerate: npx tsx .claude/config/generate-schema-manifest.ts`);
  lines.push(`# Source: facility-summary-mvp/output/data-dictionary/data-dictionary.json`);
  lines.push(``);
  lines.push(toYamlLine(0, 'schema_version', '1.0.0'));
  lines.push(toYamlLine(0, 'generated_from', 'facility-summary-mvp/output/data-dictionary/data-dictionary.json'));
  lines.push(toYamlLine(0, 'last_updated', today));
  lines.push(``);
  lines.push(`summary:`);
  lines.push(toYamlLine(1, 'total_tables', totalTables));
  lines.push(toYamlLine(1, 'l1_tables', layerCounts.L1));
  lines.push(toYamlLine(1, 'l2_tables', layerCounts.L2));
  lines.push(toYamlLine(1, 'l3_tables', layerCounts.L3));
  lines.push(toYamlLine(1, 'unclassified_tables', unclassifiedCount));
  lines.push(``);
  lines.push(`tables:`);

  // Emit each table
  for (const { table, layer, riskStripe } of allTables) {
    lines.push(`  - name: ${table.name}`);
    lines.push(`    schema: ${layer.toLowerCase()}`);
    lines.push(`    layer: ${layer}`);
    lines.push(`    category: ${yamlEscape(table.category || 'Unknown')}`);
    lines.push(`    column_count: ${table.fields.length}`);
    lines.push(`    columns:`);

    for (const f of table.fields) {
      lines.push(`      - name: ${f.name}`);
      lines.push(`        type: ${yamlEscape(f.data_type || 'VARCHAR(64)')}`);
      lines.push(`        nullable: ${!(f.pk_fk?.is_pk)}`);
      if (f.pk_fk?.is_pk) {
        lines.push(`        pk: true`);
      }
      if (f.pk_fk?.fk_target) {
        const fk = f.pk_fk.fk_target;
        lines.push(`        fk_ref: ${fk.layer.toLowerCase()}.${fk.table}.${fk.field}`);
      }
    }

    lines.push(`    row_estimate: unknown`);
    lines.push(`    risk_stripe: ${riskStripe}`);
    lines.push(`    regulatory_refs: []`);
    lines.push(`    notes: ""`);
  }

  fs.writeFileSync(OUTPUT_PATH, lines.join('\n') + '\n');
  console.log(`Schema manifest written to ${OUTPUT_PATH}`);
  console.log(`  Total tables: ${totalTables}`);
  console.log(`  L1: ${layerCounts.L1}, L2: ${layerCounts.L2}, L3: ${layerCounts.L3}`);
  console.log(`  Unclassified: ${unclassifiedCount} (review needed)`);
}

main();
