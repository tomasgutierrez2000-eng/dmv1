/**
 * Sync data model from golden source (PostgreSQL or DDL files) into data dictionary JSON.
 *
 * Golden source priority:
 *   1. Live PostgreSQL database (if DATABASE_URL is set) — via introspect-db.ts
 *   2. DDL files (offline fallback):
 *      - L1: sql/gsib-export/01-l1-ddl.sql
 *      - L2: sql/gsib-export/02-l2-ddl.sql
 *      - L3: sql/l3/01_DDL_all_tables.sql
 *
 * Table metadata (SCD type, category) from:
 *   - data/l1-table-meta.ts, data/l2-table-meta.ts, data/l3-tables.ts
 *
 * Target (single source for visualizer + Excel export):
 *   - facility-summary-mvp/output/data-dictionary/data-dictionary.json
 *
 * Run:  npx tsx scripts/sync-data-model.ts
 *       (runs db:introspect first if DATABASE_URL is set)
 */

import * as fs from 'fs';
import * as path from 'path';

import { L3_TABLES } from '../data/l3-tables';
import { L1_META_MAP } from '../data/l1-table-meta';
import { L2_META_MAP } from '../data/l2-table-meta';
import { parseDDL, parseFkReference } from '../lib/ddl-parser';

import type {
  DataDictionary,
  DataDictionaryTable,
  DataDictionaryField,
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
    is_active_flag: {
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
    is_active_flag: {
      description: 'Y/N flag indicating if tier is currently in use',
      why_required: 'Soft-delete support for reference data',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Convert parsed DDL column to a DataDictionaryField
// ═══════════════════════════════════════════════════════════════════════════

function parsedColToField(
  tableName: string,
  col: { name: string; type: string; pk: boolean; fk: string },
  isComposite: boolean,
): DataDictionaryField {
  const desc = FIELD_DESCRIPTIONS[tableName]?.[col.name];
  const fkTarget = col.fk ? parseFkReference(col.fk) : undefined;

  return {
    name: col.name,
    description: desc?.description ?? '',
    why_required: desc?.why_required ?? '',
    data_type: col.type,
    ...(col.pk || fkTarget ? {
      pk_fk: {
        is_pk: col.pk,
        is_composite: isComposite && col.pk,
        ...(fkTarget ? { fk_target: fkTarget } : {}),
      },
    } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DDL-based sync (offline fallback when DATABASE_URL not available)
// ═══════════════════════════════════════════════════════════════════════════

interface SyncReport {
  tablesAdded: string[];
  fieldsAdded: string[];
  typesUpdated: string[];
  l3ManifestWarnings: string[];
}

export function syncDataModel(): SyncReport {
  const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');
  const L1_DDL_PATH = path.resolve(__dirname, '../sql/gsib-export/01-l1-ddl.sql');
  const L2_DDL_PATH = path.resolve(__dirname, '../sql/gsib-export/02-l2-ddl.sql');
  const L3_DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');

  // Read existing data dictionary
  let dd: DataDictionary;
  if (fs.existsSync(DD_PATH)) {
    dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
  } else {
    dd = { L1: [], L2: [], L3: [], relationships: [], derivation_dag: {} };
  }

  const report: SyncReport = { tablesAdded: [], fieldsAdded: [], typesUpdated: [], l3ManifestWarnings: [] };

  // Build existing relationships set for dedup
  const relSet = new Set(
    dd.relationships.map(r => `${r.from_layer}.${r.from_table}.${r.from_field}->${r.to_layer}.${r.to_table}.${r.to_field}`)
  );

  // Parse all DDL files
  const l1Parsed = parseDDL(fs.readFileSync(L1_DDL_PATH, 'utf-8'), 'l1');
  const l2Parsed = parseDDL(fs.readFileSync(L2_DDL_PATH, 'utf-8'), 'l2');
  const l3Parsed = parseDDL(fs.readFileSync(L3_DDL_PATH, 'utf-8'), 'l3');

  // Sync helper: process parsed tables for a given layer
  function syncLayer(
    layer: 'L1' | 'L2' | 'L3',
    parsed: ReturnType<typeof parseDDL>,
    getCategoryFn: (tableName: string) => string,
  ) {
    const ddTableMap = new Map(dd[layer].map(t => [t.name, t]));

    for (const table of parsed) {
      const isComposite = table.pkColumns.length > 1;
      const existing = ddTableMap.get(table.name);

      if (!existing) {
        // New table from DDL
        const newTable: DataDictionaryTable = {
          name: table.name,
          layer,
          category: getCategoryFn(table.name),
          fields: table.columns.map(c => parsedColToField(table.name, c, isComposite)),
        };
        dd[layer].push(newTable);
        report.tablesAdded.push(`${layer}.${table.name}`);
      } else {
        // Update existing table: update types, add missing fields
        const existingFieldMap = new Map(existing.fields.map(f => [f.name, f]));

        for (const col of table.columns) {
          const existingField = existingFieldMap.get(col.name);
          if (!existingField) {
            existing.fields.push(parsedColToField(table.name, col, isComposite));
            report.fieldsAdded.push(`${layer}.${table.name}.${col.name}`);
          } else {
            // Update data_type from DDL (golden source)
            if (existingField.data_type !== col.type) {
              report.typesUpdated.push(
                `${layer}.${table.name}.${col.name}: ${existingField.data_type ?? '(none)'} → ${col.type}`,
              );
              existingField.data_type = col.type;
            }

            // Update PK/FK from DDL
            const fkTarget = col.fk ? parseFkReference(col.fk) : undefined;
            if (col.pk || fkTarget) {
              existingField.pk_fk = {
                is_pk: col.pk,
                is_composite: isComposite && col.pk,
                ...(fkTarget ? { fk_target: fkTarget } : {}),
              };
            }
          }
        }

        // Sync category from metadata
        const metaCategory = getCategoryFn(table.name);
        if (metaCategory !== 'Uncategorized' && existing.category !== metaCategory) {
          existing.category = metaCategory;
        }
      }

      // Add FK relationships
      for (const col of table.columns) {
        if (col.fk) {
          const fkTarget = parseFkReference(col.fk);
          if (fkTarget) {
            const relKey = `${layer}.${table.name}.${col.name}->${fkTarget.layer}.${fkTarget.table}.${fkTarget.field}`;
            if (!relSet.has(relKey)) {
              dd.relationships.push({
                from_layer: layer,
                from_table: table.name,
                from_field: col.name,
                to_layer: fkTarget.layer,
                to_table: fkTarget.table,
                to_field: fkTarget.field,
              });
              relSet.add(relKey);
            }
          }
        }
      }
    }
  }

  // Sync all layers from DDL
  syncLayer('L1', l1Parsed, (name) => L1_META_MAP.get(name)?.category ?? 'Uncategorized');
  syncLayer('L2', l2Parsed, (name) => L2_META_MAP.get(name)?.category ?? 'Uncategorized');

  const l3MetaMap = new Map(L3_TABLES.map(t => [t.name, t]));
  syncLayer('L3', l3Parsed, (name) => l3MetaMap.get(name)?.category ?? 'Uncategorized');

  // Check L3 manifest
  for (const table of l3Parsed) {
    if (!l3MetaMap.has(table.name)) {
      report.l3ManifestWarnings.push(
        `${table.name} exists in DDL but missing from data/l3-tables.ts manifest`,
      );
    }
  }

  // Write updated data dictionary
  const ddDir = path.dirname(DD_PATH);
  if (!fs.existsSync(ddDir)) fs.mkdirSync(ddDir, { recursive: true });
  fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf-8');

  return report;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI entry point
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  // If DATABASE_URL is available, use introspection (the golden source)
  const hasDb = !!process.env.DATABASE_URL;

  if (hasDb) {
    console.log('\n  DATABASE_URL detected — running introspection from live PostgreSQL...\n');
    const { execSync } = await import('child_process');
    try {
      execSync('npx tsx scripts/introspect-db.ts', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        env: process.env,
      });
      console.log('  Introspection complete. Data dictionary updated from PostgreSQL.\n');
      return;
    } catch (err) {
      console.error('  Introspection failed, falling back to DDL parsing...\n');
    }
  }

  console.log('\n  Syncing data model from DDL files → data dictionary...\n');

  const report = syncDataModel();

  if (report.tablesAdded.length > 0) {
    console.log(`  Added ${report.tablesAdded.length} tables:`);
    for (const t of report.tablesAdded) console.log(`    + ${t}`);
  }

  if (report.fieldsAdded.length > 0) {
    console.log(`  Added ${report.fieldsAdded.length} fields:`);
    for (const f of report.fieldsAdded) console.log(`    + ${f}`);
  }

  if (report.typesUpdated.length > 0) {
    console.log(`  Updated ${report.typesUpdated.length} types:`);
    for (const t of report.typesUpdated.slice(0, 20)) console.log(`    ~ ${t}`);
    if (report.typesUpdated.length > 20) console.log(`    ... and ${report.typesUpdated.length - 20} more`);
  }

  if (report.l3ManifestWarnings.length > 0) {
    console.log(`\n  L3 Manifest warnings:`);
    for (const w of report.l3ManifestWarnings) console.log(`    ! ${w}`);
  }

  if (report.tablesAdded.length === 0 && report.fieldsAdded.length === 0 && report.typesUpdated.length === 0) {
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
if (isDirectRun) {
  // Load dotenv for DATABASE_URL detection
  try { require('dotenv/config'); } catch { /* not critical */ }
  main();
}
