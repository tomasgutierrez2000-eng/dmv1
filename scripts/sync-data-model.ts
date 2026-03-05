/**
 * Sync all data model sources into the data dictionary JSON.
 *
 * Sources of structural truth:
 *   - L1/L2: scripts/l1/l1-definitions.ts, scripts/l2/l2-definitions.ts
 *   - L3:    sql/l3/01_DDL_all_tables.sql  +  data/l3-tables.ts (metadata)
 *
 * Target (single source for visualizer + Excel export):
 *   - facility-summary-mvp/output/data-dictionary/data-dictionary.json
 *
 * This script:
 *   1. Reads all structural sources
 *   2. Compares against existing data dictionary
 *   3. Adds missing tables and fields (preserving existing descriptions)
 *   4. Writes the updated data dictionary
 *   5. Reports what changed
 *
 * Run:  npx tsx scripts/sync-data-model.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { L1_TABLES } from './l1/l1-definitions';
import { L2_TABLES } from './l2/l2-definitions';
import { L3_TABLES } from '../data/l3-tables';

import type {
  DataDictionary,
  DataDictionaryTable,
  DataDictionaryField,
  DataDictionaryRelationship,
} from '../lib/data-dictionary';

// ═══════════════════════════════════════════════════════════════════════════
// Hardcoded descriptions for tables missing from the data dictionary
// ═══════════════════════════════════════════════════════════════════════════

const FIELD_DESCRIPTIONS: Record<string, Record<string, { description: string; why_required: string }>> = {
  internal_risk_rating_bucket_dim: {
    internal_risk_rating_bucket_code: {
      description: 'Bucket identifier code (e.g. "AAA", "BBB")',
      why_required: 'Primary key for rating bucket lookup',
    },
    bucket_name: {
      description: 'Human-readable name of the rating bucket',
      why_required: 'Display label for reports and dashboards',
    },
    rating_score_min: {
      description: 'Lower bound of the internal rating score range',
      why_required: 'Defines bucket boundaries for rating classification',
    },
    rating_score_max: {
      description: 'Upper bound of the internal rating score range',
      why_required: 'Defines bucket boundaries for rating classification',
    },
    display_order: {
      description: 'Sort order for display in reports',
      why_required: 'Consistent ordering in UI and reports',
    },
    active_flag: {
      description: 'Y/N flag indicating if bucket is currently in use',
      why_required: 'Soft-delete support for reference data',
    },
  },
  pricing_tier_dim: {
    pricing_tier_code: {
      description: 'Unique tier identifier code',
      why_required: 'Primary key for pricing tier lookup',
    },
    tier_name: {
      description: 'Human-readable tier name (e.g. "Investment Grade", "High Yield")',
      why_required: 'Display label for revenue and pricing reports',
    },
    tier_ordinal: {
      description: 'Numeric rank for sorting tiers',
      why_required: 'Defines tier ordering for comparison analytics',
    },
    display_order: {
      description: 'Sort order for display in reports',
      why_required: 'Consistent ordering in UI and reports',
    },
    active_flag: {
      description: 'Y/N flag indicating if tier is currently in use',
      why_required: 'Soft-delete support for reference data',
    },
  },
};

// Category overrides for tables not yet in the data dictionary
const TABLE_CATEGORIES: Record<string, string> = {
  internal_risk_rating_bucket_dim: 'Ratings',
  pricing_tier_dim: 'Facility',
};

// ═══════════════════════════════════════════════════════════════════════════
// L3 DDL Parsing (shared with export-data-model-excel.ts)
// ═══════════════════════════════════════════════════════════════════════════

interface L3Column {
  name: string; type: string; nullable: boolean;
  pk: boolean; fk: string; defaultVal: string;
}
interface L3ParsedTable { name: string; columns: L3Column[]; pkColumns: string[] }

function parseL3DDL(sql: string): L3ParsedTable[] {
  const tables: L3ParsedTable[] = [];
  const tableRegex = /CREATE TABLE IF NOT EXISTS l3\.(\w+)\s*\(([\s\S]*?)\);/g;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const pkMatch = body.match(/PRIMARY KEY\s*\(([^)]+)\)/);
    const pkColumns = pkMatch ? pkMatch[1].split(',').map(c => c.trim()) : [];

    const afterTable = sql.substring(match.index + match[0].length, match.index + match[0].length + 2000);
    const fkMap = new Map<string, string>();
    const fkRegex = /-- FK:\s+(\w+)\s*→\s*(.+)/g;
    let fkMatch: RegExpExecArray | null;
    while ((fkMatch = fkRegex.exec(afterTable)) !== null) {
      if (afterTable.substring(0, fkMatch.index).includes('CREATE TABLE')) break;
      fkMap.set(fkMatch[1], fkMatch[2].trim());
    }

    const columns: L3Column[] = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('PRIMARY KEY') || trimmed.startsWith('--')) continue;
      const colMatch = trimmed.match(/^(\w+)\s+([\w(),.]+(?:\(\d+(?:,\d+)?\))?)\s*(.*?)(?:,\s*)?$/);
      if (!colMatch) continue;
      const rest = colMatch[3] || '';
      const defaultMatch = rest.match(/DEFAULT\s+(.+)/i);
      columns.push({
        name: colMatch[1],
        type: colMatch[2],
        nullable: !rest.includes('NOT NULL'),
        pk: pkColumns.includes(colMatch[1]),
        fk: fkMap.get(colMatch[1]) ?? '',
        defaultVal: defaultMatch ? defaultMatch[1].replace(/,\s*$/, '') : '',
      });
    }
    tables.push({ name: tableName, columns, pkColumns });
  }
  return tables;
}

// ═══════════════════════════════════════════════════════════════════════════
// FK string → relationship parser
// ═══════════════════════════════════════════════════════════════════════════

function parseFkString(fk: string): { layer: string; table: string; field: string } | null {
  // Format: "l1.table_name(field_name)" or "l2.table_name(field_name)"
  const m = fk.match(/^(l[123])\.(\w+)\((\w+)\)$/);
  if (!m) return null;
  return { layer: m[1].toUpperCase(), table: m[2], field: m[3] };
}

// ═══════════════════════════════════════════════════════════════════════════
// Convert a TS definition column to a DataDictionaryField
// ═══════════════════════════════════════════════════════════════════════════

function tsColToField(
  tableName: string,
  col: { name: string; type: string; nullable?: boolean; pk?: boolean; fk?: string },
): DataDictionaryField {
  const desc = FIELD_DESCRIPTIONS[tableName]?.[col.name];
  const fkTarget = col.fk ? parseFkString(col.fk) : undefined;

  return {
    name: col.name,
    description: desc?.description ?? '',
    why_required: desc?.why_required ?? '',
    data_type: col.type,
    ...(col.pk || fkTarget ? {
      pk_fk: {
        is_pk: !!col.pk,
        is_composite: false,
        ...(fkTarget ? { fk_target: fkTarget } : {}),
      },
    } : {}),
  };
}

function l3ColToField(
  tableName: string,
  col: L3Column,
): DataDictionaryField {
  // Parse L3 FK comment format: "L1.table_name.field_name" or similar
  let fkTarget: { layer: string; table: string; field: string } | undefined;
  if (col.fk) {
    const m = col.fk.match(/^(L[123])\.(\w+)\.(\w+)/);
    if (m) {
      fkTarget = { layer: m[1], table: m[2], field: m[3] };
    }
  }

  return {
    name: col.name,
    description: '',
    data_type: col.type,
    ...(col.pk || fkTarget ? {
      pk_fk: {
        is_pk: col.pk,
        is_composite: false,
        ...(fkTarget ? { fk_target: fkTarget } : {}),
      },
    } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Sync Logic
// ═══════════════════════════════════════════════════════════════════════════

interface SyncReport {
  tablesAdded: string[];
  fieldsAdded: string[];
  l3ManifestWarnings: string[];
}

export function syncDataModel(): SyncReport {
  const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');
  const DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');

  // Read existing data dictionary
  const dd: DataDictionary = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));

  const report: SyncReport = { tablesAdded: [], fieldsAdded: [], l3ManifestWarnings: [] };

  // Build lookup of existing DD tables by layer.name
  const ddTableMap: Record<string, Map<string, DataDictionaryTable>> = {
    L1: new Map(dd.L1.map(t => [t.name, t])),
    L2: new Map(dd.L2.map(t => [t.name, t])),
    L3: new Map(dd.L3.map(t => [t.name, t])),
  };

  // Build existing relationships set for dedup
  const relSet = new Set(
    dd.relationships.map(r => `${r.from_layer}.${r.from_table}.${r.from_field}->${r.to_layer}.${r.to_table}.${r.to_field}`)
  );

  // ── Sync L1 ──
  for (const table of L1_TABLES) {
    const existing = ddTableMap.L1.get(table.tableName);
    if (!existing) {
      // Add entire table
      const category = TABLE_CATEGORIES[table.tableName] ?? 'Uncategorized';
      const newTable: DataDictionaryTable = {
        name: table.tableName,
        layer: 'L1',
        category,
        fields: table.columns.map(c => tsColToField(table.tableName, c)),
      };
      dd.L1.push(newTable);
      ddTableMap.L1.set(table.tableName, newTable);
      report.tablesAdded.push(`L1.${table.tableName}`);

      // Add relationships for FK columns
      for (const col of table.columns) {
        if (col.fk) {
          const fk = parseFkString(col.fk);
          if (fk) {
            const relKey = `L1.${table.tableName}.${col.name}->${fk.layer}.${fk.table}.${fk.field}`;
            if (!relSet.has(relKey)) {
              dd.relationships.push({
                from_layer: 'L1', from_table: table.tableName, from_field: col.name,
                to_layer: fk.layer, to_table: fk.table, to_field: fk.field,
              });
              relSet.add(relKey);
            }
          }
        }
      }
    } else {
      // Table exists — check for missing fields and relationships
      const existingFields = new Set(existing.fields.map(f => f.name));
      for (const col of table.columns) {
        if (!existingFields.has(col.name)) {
          existing.fields.push(tsColToField(table.tableName, col));
          report.fieldsAdded.push(`L1.${table.tableName}.${col.name}`);
        }
        // Ensure FK relationships exist for all FK columns (even pre-existing ones)
        if (col.fk) {
          const fk = parseFkString(col.fk);
          if (fk) {
            const relKey = `L1.${table.tableName}.${col.name}->${fk.layer}.${fk.table}.${fk.field}`;
            if (!relSet.has(relKey)) {
              dd.relationships.push({
                from_layer: 'L1', from_table: table.tableName, from_field: col.name,
                to_layer: fk.layer, to_table: fk.table, to_field: fk.field,
              });
              relSet.add(relKey);
            }
          }
        }
      }
    }
  }

  // ── Sync L2 ──
  for (const table of L2_TABLES) {
    const existing = ddTableMap.L2.get(table.tableName);
    if (!existing) {
      const newTable: DataDictionaryTable = {
        name: table.tableName,
        layer: 'L2',
        category: 'Uncategorized',
        fields: table.columns.map(c => tsColToField(table.tableName, c)),
      };
      dd.L2.push(newTable);
      ddTableMap.L2.set(table.tableName, newTable);
      report.tablesAdded.push(`L2.${table.tableName}`);

      for (const col of table.columns) {
        if (col.fk) {
          const fk = parseFkString(col.fk);
          if (fk) {
            const relKey = `L2.${table.tableName}.${col.name}->${fk.layer}.${fk.table}.${fk.field}`;
            if (!relSet.has(relKey)) {
              dd.relationships.push({
                from_layer: 'L2', from_table: table.tableName, from_field: col.name,
                to_layer: fk.layer, to_table: fk.table, to_field: fk.field,
              });
              relSet.add(relKey);
            }
          }
        }
      }
    } else {
      const existingFields = new Set(existing.fields.map(f => f.name));
      for (const col of table.columns) {
        if (!existingFields.has(col.name)) {
          existing.fields.push(tsColToField(table.tableName, col));
          report.fieldsAdded.push(`L2.${table.tableName}.${col.name}`);
        }
        // Ensure FK relationships exist for all FK columns (even pre-existing ones)
        if (col.fk) {
          const fk = parseFkString(col.fk);
          if (fk) {
            const relKey = `L2.${table.tableName}.${col.name}->${fk.layer}.${fk.table}.${fk.field}`;
            if (!relSet.has(relKey)) {
              dd.relationships.push({
                from_layer: 'L2', from_table: table.tableName, from_field: col.name,
                to_layer: fk.layer, to_table: fk.table, to_field: fk.field,
              });
              relSet.add(relKey);
            }
          }
        }
      }
    }
  }

  // ── Sync L3 (from DDL) ──
  const ddlSql = fs.readFileSync(DDL_PATH, 'utf-8');
  const l3Parsed = parseL3DDL(ddlSql);
  const l3MetaMap = new Map(L3_TABLES.map(t => [t.name, t]));

  for (const table of l3Parsed) {
    const existing = ddTableMap.L3.get(table.name);
    const meta = l3MetaMap.get(table.name);

    if (!existing) {
      const newTable: DataDictionaryTable = {
        name: table.name,
        layer: 'L3',
        category: meta?.category ?? 'Uncategorized',
        fields: table.columns.map(c => l3ColToField(table.name, c)),
      };
      dd.L3.push(newTable);
      ddTableMap.L3.set(table.name, newTable);
      report.tablesAdded.push(`L3.${table.name}`);
    } else {
      // Sync category from l3-tables.ts manifest
      if (meta && existing.category !== meta.category) {
        report.fieldsAdded.push(`L3.${table.name} category: ${existing.category} → ${meta.category}`);
        existing.category = meta.category;
      }

      const existingFields = new Set(existing.fields.map(f => f.name));
      for (const col of table.columns) {
        if (!existingFields.has(col.name)) {
          existing.fields.push(l3ColToField(table.name, col));
          report.fieldsAdded.push(`L3.${table.name}.${col.name}`);
        }
      }
    }

    // Check L3 manifest
    if (!meta) {
      report.l3ManifestWarnings.push(
        `${table.name} exists in DDL but missing from data/l3-tables.ts manifest`
      );
    }
  }

  // ── Write updated data dictionary ──
  const ddDir = path.dirname(DD_PATH);
  if (!fs.existsSync(ddDir)) fs.mkdirSync(ddDir, { recursive: true });
  fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf-8');

  return report;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI entry point
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  console.log('\n  Syncing data model sources → data dictionary...\n');

  const report = syncDataModel();

  if (report.tablesAdded.length > 0) {
    console.log(`  Added ${report.tablesAdded.length} tables:`);
    for (const t of report.tablesAdded) console.log(`    + ${t}`);
  }

  if (report.fieldsAdded.length > 0) {
    console.log(`  Added ${report.fieldsAdded.length} fields:`);
    for (const f of report.fieldsAdded) console.log(`    + ${f}`);
  }

  if (report.l3ManifestWarnings.length > 0) {
    console.log(`\n  L3 Manifest warnings:`);
    for (const w of report.l3ManifestWarnings) console.log(`    ! ${w}`);
  }

  if (report.tablesAdded.length === 0 && report.fieldsAdded.length === 0) {
    console.log('  All sources in sync. No changes needed.');
  }

  // Final counts
  const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');
  const dd: DataDictionary = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
  const l1Fields = dd.L1.reduce((s, t) => s + t.fields.length, 0);
  const l2Fields = dd.L2.reduce((s, t) => s + t.fields.length, 0);
  const l3Fields = dd.L3.reduce((s, t) => s + t.fields.length, 0);

  console.log(`\n  Data dictionary totals:`);
  console.log(`    L1: ${dd.L1.length} tables, ${l1Fields} fields`);
  console.log(`    L2: ${dd.L2.length} tables, ${l2Fields} fields`);
  console.log(`    L3: ${dd.L3.length} tables, ${l3Fields} fields`);
  console.log(`    Total: ${dd.L1.length + dd.L2.length + dd.L3.length} tables, ${l1Fields + l2Fields + l3Fields} fields`);
  console.log(`    Relationships: ${dd.relationships.length}`);
  console.log('');
}

// Run if called directly (not imported)
const isDirectRun = process.argv[1]?.includes('sync-data-model');
if (isDirectRun) main();
