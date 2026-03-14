/**
 * Comprehensive data model validation — 55+ checks across 11 groups.
 *
 * Validates cross-referential integrity between all source-of-truth files
 * (L1/L2/L3 definitions, DDL, data dictionary, metrics, catalogue, domains,
 * variants, lineage, sample data) and the surfaces that consume them
 * (visualizations, exports, SQL execution, APIs).
 *
 * Run:
 *   npx tsx scripts/validate-data-model.ts            # all groups
 *   npx tsx scripts/validate-data-model.ts --group=3   # group 3 only
 *   npx tsx scripts/validate-data-model.ts --fix       # sync first, then validate
 */

import fs from 'node:fs';
import path from 'node:path';

import { L3_TABLES } from '../data/l3-tables';
import {
  CALCULATION_DIMENSIONS,
  DASHBOARD_PAGES,
  type L3Metric,
  type CalculationDimension,
} from '../data/l3-metrics';
import { parseDDL } from '../lib/ddl-parser';
import { getMergedMetrics } from '../lib/metrics-store';
import {
  readDataDictionary,
  type DataDictionary,
  type DataDictionaryTable,
} from '../lib/data-dictionary';
import {
  getCatalogueItems,
  getDomains,
  getVariants,
  getParentMetrics,
} from '../lib/metric-library/store';
import { ROLLUP_HIERARCHY_LEVELS } from '../lib/metric-library/types';
import { L1_TABLE_META } from '../data/l1-table-meta';
import { L2_TABLE_META } from '../data/l2-table-meta';
import { varcharIdFieldNames } from '../data/naming-exceptions';
import { metricWithLineage } from '../lib/lineage-generator';
import {
  resolveFormulaForDimension,
  resolveAllowedDimensions,
  getMetricForCalculation,
  runMetricCalculation,
} from '../lib/metrics-calculation';
import { getTableKeysForMetric } from '../lib/metrics-calculation/table-resolver';
import { getSchemaBundle } from '../lib/schema-bundle';
import { syncDataModel } from './sync-data-model';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type Severity = 'PASS' | 'WARN' | 'FAIL';

interface CheckResult {
  id: string;
  group: number;
  name: string;
  severity: Severity;
  details: string[];
}

export interface ValidationReport {
  checks: CheckResult[];
  totalChecks: number;
  passes: number;
  warnings: number;
  failures: number;
  durationMs: number;
}

export interface CliOptions {
  fix: boolean;
  group: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Console Reporter
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  reset:  '\x1b[0m',
};

function severityColor(s: Severity): string {
  if (s === 'PASS') return C.green;
  if (s === 'WARN') return C.yellow;
  return C.red;
}

function printCheck(check: CheckResult): void {
  const color = severityColor(check.severity);
  console.log(`  ${color}[${check.severity}]${C.reset} ${check.id} ${check.name}`);
  const maxDetails = 10;
  for (const detail of check.details.slice(0, maxDetails)) {
    console.log(`       ${C.dim}${detail}${C.reset}`);
  }
  if (check.details.length > maxDetails) {
    console.log(`       ${C.dim}... and ${check.details.length - maxDetails} more${C.reset}`);
  }
}

function printReport(report: ValidationReport): void {
  console.log(`\n${C.bold}=== Validation Summary ===${C.reset}`);
  console.log(`  Total checks: ${report.totalChecks}`);
  console.log(`  ${C.green}Passed:   ${report.passes}${C.reset}`);
  console.log(`  ${C.yellow}Warnings: ${report.warnings}${C.reset}`);
  console.log(`  ${C.red}Failures: ${report.failures}${C.reset}`);
  console.log(`  Duration: ${report.durationMs}ms\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let group: number | null = null;
  const gArg = args.find(a => a.startsWith('--group='));
  if (gArg) group = parseInt(gArg.split('=')[1], 10);
  return { fix: args.includes('--fix'), group };
}

function check(id: string, group: number, name: string, details: string[], severity?: Severity): CheckResult {
  return {
    id,
    group,
    name,
    severity: severity ?? (details.length > 0 ? 'FAIL' : 'PASS'),
    details,
  };
}

// ── Data Dictionary Lookup ──

interface DDLookup {
  dd: DataDictionary;
  tablesByLayerName: Map<string, DataDictionaryTable>;
  fieldExists: (layer: string, table: string, field: string) => boolean;
  tableExists: (layer: string, table: string) => boolean;
}

function buildDDLookup(dd: DataDictionary): DDLookup {
  const tablesByLayerName = new Map<string, DataDictionaryTable>();
  for (const layer of ['L1', 'L2', 'L3'] as const) {
    for (const t of dd[layer]) {
      tablesByLayerName.set(`${layer}.${t.name}`, t);
    }
  }
  return {
    dd,
    tablesByLayerName,
    tableExists(layer, table) {
      return tablesByLayerName.has(`${layer}.${table}`);
    },
    fieldExists(layer, table, field) {
      const t = tablesByLayerName.get(`${layer}.${table}`);
      if (!t) return false;
      return t.fields.some(f => f.name === field);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: Structural Integrity
// ═══════════════════════════════════════════════════════════════════════════

function validateStructuralIntegrity(ddLookup: DDLookup): CheckResult[] {
  const results: CheckResult[] = [];
  const { dd } = ddLookup;

  const L1_DDL_PATH = path.resolve(__dirname, '../sql/gsib-export/01-l1-ddl.sql');
  const L2_DDL_PATH = path.resolve(__dirname, '../sql/gsib-export/02-l2-ddl.sql');
  const L3_DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');
  const L3_DDL_SUPPLEMENTARY = path.resolve(__dirname, '../sql/l3/09_dashboard_derived_tables.sql');

  // 1.1 L1 DDL <-> data dictionary
  {
    const issues: string[] = [];
    if (!fs.existsSync(L1_DDL_PATH)) {
      issues.push('L1 DDL file not found: sql/gsib-export/01-l1-ddl.sql');
    } else {
      const l1Parsed = parseDDL(fs.readFileSync(L1_DDL_PATH, 'utf-8'), 'l1');
      const ddL1Names = new Set(dd.L1.map(t => t.name));

      for (const table of l1Parsed) {
        if (!ddL1Names.has(table.name)) {
          issues.push(`Missing from DD: L1.${table.name}`);
        } else {
          const ddTable = dd.L1.find(t => t.name === table.name)!;
          const ddFields = new Set(ddTable.fields.map(f => f.name));
          for (const col of table.columns) {
            if (!ddFields.has(col.name)) {
              issues.push(`Missing field in DD: L1.${table.name}.${col.name}`);
            }
          }
        }
      }
      const ddlNames = new Set(l1Parsed.map(t => t.name));
      for (const ddTable of dd.L1) {
        if (!ddlNames.has(ddTable.name)) {
          issues.push(`In DD but not in L1 DDL: L1.${ddTable.name} (may exist only in PostgreSQL)`);
        }
      }
    }
    results.push(check('1.1', 1, 'L1 DDL \u2194 data dictionary', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 1.2 L2 DDL <-> data dictionary
  {
    const issues: string[] = [];
    if (!fs.existsSync(L2_DDL_PATH)) {
      issues.push('L2 DDL file not found: sql/gsib-export/02-l2-ddl.sql');
    } else {
      const l2Parsed = parseDDL(fs.readFileSync(L2_DDL_PATH, 'utf-8'), 'l2');
      const ddL2Names = new Set(dd.L2.map(t => t.name));

      for (const table of l2Parsed) {
        if (!ddL2Names.has(table.name)) {
          issues.push(`Missing from DD: L2.${table.name}`);
        } else {
          const ddTable = dd.L2.find(t => t.name === table.name)!;
          const ddFields = new Set(ddTable.fields.map(f => f.name));
          for (const col of table.columns) {
            if (!ddFields.has(col.name)) {
              issues.push(`Missing field in DD: L2.${table.name}.${col.name}`);
            }
          }
        }
      }
      const ddlNames = new Set(l2Parsed.map(t => t.name));
      for (const ddTable of dd.L2) {
        if (!ddlNames.has(ddTable.name)) {
          issues.push(`In DD but not in L2 DDL: L2.${ddTable.name} (may exist only in PostgreSQL)`);
        }
      }
    }
    results.push(check('1.2', 1, 'L2 DDL \u2194 data dictionary', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 1.3 L3 DDL <-> L3 tables manifest
  {
    const issues: string[] = [];
    if (!fs.existsSync(L3_DDL_PATH)) {
      results.push(check('1.3', 1, 'L3 DDL \u2194 L3 tables manifest', ['DDL file not found: sql/l3/01_DDL_all_tables.sql']));
    } else {
      const l3Parsed = parseDDL(fs.readFileSync(L3_DDL_PATH, 'utf-8'), 'l3');
      if (fs.existsSync(L3_DDL_SUPPLEMENTARY)) {
        l3Parsed.push(...parseDDL(fs.readFileSync(L3_DDL_SUPPLEMENTARY, 'utf-8'), 'l3'));
      }
      const manifestNames = new Set(L3_TABLES.map(t => t.name));
      const ddlNames = new Set(l3Parsed.map(t => t.name));

      for (const t of l3Parsed) {
        if (!manifestNames.has(t.name)) {
          issues.push(`In DDL but missing from L3_TABLES manifest: ${t.name}`);
        }
      }
      for (const t of L3_TABLES) {
        if (!ddlNames.has(t.name)) {
          issues.push(`In L3_TABLES manifest but missing from DDL: ${t.name}`);
        }
      }
      results.push(check('1.3', 1, 'L3 DDL \u2194 L3 tables manifest', issues));
    }
  }

  // 1.4 L3 DDL <-> data dictionary L3
  {
    const issues: string[] = [];
    if (fs.existsSync(L3_DDL_PATH)) {
      const l3Parsed = parseDDL(fs.readFileSync(L3_DDL_PATH, 'utf-8'), 'l3');
      if (fs.existsSync(L3_DDL_SUPPLEMENTARY)) {
        l3Parsed.push(...parseDDL(fs.readFileSync(L3_DDL_SUPPLEMENTARY, 'utf-8'), 'l3'));
      }
      const ddL3Names = new Set(dd.L3.map(t => t.name));

      for (const t of l3Parsed) {
        if (!ddL3Names.has(t.name)) {
          issues.push(`Missing from DD: L3.${t.name}`);
        } else {
          const ddTable = dd.L3.find(dt => dt.name === t.name)!;
          const ddFields = new Set(ddTable.fields.map(f => f.name));
          for (const col of t.columns) {
            if (!ddFields.has(col.name)) {
              issues.push(`Missing field in DD: L3.${t.name}.${col.name}`);
            }
          }
        }
      }
    }
    results.push(check('1.4', 1, 'L3 DDL \u2194 data dictionary L3', issues));
  }

  // 1.5 FK integrity — verify DD relationship targets exist
  {
    const issues: string[] = [];
    for (const rel of dd.relationships) {
      if (!ddLookup.fieldExists(rel.to_layer, rel.to_table, rel.to_field)) {
        issues.push(`${rel.from_layer}.${rel.from_table}.${rel.from_field} FK -> ${rel.to_layer}.${rel.to_table}.${rel.to_field} (target not found)`);
      }
      if (!ddLookup.fieldExists(rel.from_layer, rel.from_table, rel.from_field)) {
        issues.push(`${rel.from_layer}.${rel.from_table}.${rel.from_field} FK source field not found in DD`);
      }
    }
    results.push(check('1.5', 1, 'FK integrity (DD relationships)', issues));
  }

  // 1.6 Sample data alignment — compare sample data against data dictionary
  {
    const issues: string[] = [];
    const L1_SAMPLE = path.resolve(__dirname, 'l1/output/sample-data.json');
    const L2_SAMPLE = path.resolve(__dirname, 'l2/output/sample-data.json');

    if (fs.existsSync(L1_SAMPLE)) {
      try {
        const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = JSON.parse(fs.readFileSync(L1_SAMPLE, 'utf-8'));
        const ddNames = new Set(dd.L1.map(t => t.name));
        for (const rawKey of Object.keys(sampleData)) {
          const key = rawKey.replace(/^L1\./, '');
          if (!ddNames.has(key)) {
            issues.push(`L1 sample data has table "${key}" not in data dictionary`);
          }
        }
        for (const ddTable of dd.L1) {
          const sample = sampleData[ddTable.name] ?? sampleData[`L1.${ddTable.name}`];
          if (sample && sample.columns.length !== ddTable.fields.length) {
            issues.push(`L1.${ddTable.name}: sample has ${sample.columns.length} cols, DD has ${ddTable.fields.length}`);
          }
        }
      } catch { issues.push('Failed to parse L1 sample data JSON'); }
    }

    if (fs.existsSync(L2_SAMPLE)) {
      try {
        const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = JSON.parse(fs.readFileSync(L2_SAMPLE, 'utf-8'));
        const ddNames = new Set(dd.L2.map(t => t.name));
        for (const rawKey of Object.keys(sampleData)) {
          const key = rawKey.replace(/^L2\./, '');
          if (!ddNames.has(key)) {
            issues.push(`L2 sample data has table "${key}" not in data dictionary`);
          }
        }
        for (const ddTable of dd.L2) {
          const sample = sampleData[ddTable.name] ?? sampleData[`L2.${ddTable.name}`];
          if (sample && sample.columns.length !== ddTable.fields.length) {
            issues.push(`L2.${ddTable.name}: sample has ${sample.columns.length} cols, DD has ${ddTable.fields.length}`);
          }
        }
      } catch { issues.push('Failed to parse L2 sample data JSON'); }
    }

    results.push(check('1.6', 1, 'Sample data alignment', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 1.7 DD relationships completeness — every FK in DD fields should have a DD relationship
  {
    const issues: string[] = [];
    const relKeys = new Set(
      dd.relationships.map(r => `${r.from_layer}.${r.from_table}.${r.from_field}->${r.to_layer}.${r.to_table}.${r.to_field}`)
    );

    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        for (const field of table.fields) {
          if (field.pk_fk?.fk_target) {
            const fk = field.pk_fk.fk_target;
            const key = `${layer}.${table.name}.${field.name}->${fk.layer}.${fk.table}.${fk.field}`;
            if (!relKeys.has(key)) {
              issues.push(`Missing DD relationship: ${layer}.${table.name}.${field.name} -> ${fk.layer}.${fk.table}.${fk.field}`);
            }
          }
        }
      }
    }

    results.push(check('1.7', 1, 'DD relationships completeness', issues));
  }

  // 1.8 Sample data column name coverage — DD columns should exist in sample data
  {
    const issues: string[] = [];
    const L1_SAMPLE = path.resolve(__dirname, 'l1/output/sample-data.json');
    const L2_SAMPLE = path.resolve(__dirname, 'l2/output/sample-data.json');

    if (fs.existsSync(L1_SAMPLE)) {
      try {
        const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = JSON.parse(fs.readFileSync(L1_SAMPLE, 'utf-8'));
        for (const ddTable of dd.L1) {
          const sample = sampleData[ddTable.name] ?? sampleData[`L1.${ddTable.name}`];
          if (!sample) continue;
          const sampleCols = new Set(sample.columns);
          for (const field of ddTable.fields) {
            if (!sampleCols.has(field.name)) {
              issues.push(`L1.${ddTable.name}.${field.name}: in DD but missing from sample data columns`);
            }
          }
        }
      } catch { /* parse error already reported in 1.6 */ }
    }

    if (fs.existsSync(L2_SAMPLE)) {
      try {
        const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = JSON.parse(fs.readFileSync(L2_SAMPLE, 'utf-8'));
        for (const ddTable of dd.L2) {
          const sample = sampleData[ddTable.name] ?? sampleData[`L2.${ddTable.name}`];
          if (!sample) continue;
          const sampleCols = new Set(sample.columns);
          for (const field of ddTable.fields) {
            if (!sampleCols.has(field.name)) {
              issues.push(`L2.${ddTable.name}.${field.name}: in DD but missing from sample data columns`);
            }
          }
        }
      } catch { /* parse error already reported in 1.6 */ }
    }

    results.push(check('1.8', 1, 'Sample data column names', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 1.9 L3 table-fields.json alignment — visualizer reads this file, must match DDL
  {
    const issues: string[] = [];
    const L3_FIELDS_PATH = path.resolve(__dirname, 'l3/output/l3-table-fields.json');

    if (!fs.existsSync(L3_FIELDS_PATH)) {
      issues.push('l3-table-fields.json not found (run L3 generation to populate visualizer)');
    } else if (fs.existsSync(L3_DDL_PATH)) {
      try {
        const l3Fields: Record<string, { category: string; fields: { name: string }[] }> =
          JSON.parse(fs.readFileSync(L3_FIELDS_PATH, 'utf-8'));
        const l3Parsed = parseDDL(fs.readFileSync(L3_DDL_PATH, 'utf-8'), 'l3');
        const fieldsTableNames = new Set(Object.keys(l3Fields));

        for (const table of l3Parsed) {
          if (!fieldsTableNames.has(table.name)) {
            issues.push(`L3.${table.name}: in DDL but missing from l3-table-fields.json (visualizer won't show it)`);
          } else {
            const fieldNames = new Set(l3Fields[table.name].fields.map(f => f.name));
            for (const col of table.columns) {
              if (!fieldNames.has(col.name)) {
                issues.push(`L3.${table.name}.${col.name}: in DDL but missing from l3-table-fields.json`);
              }
            }
          }
        }
      } catch { issues.push('Failed to parse l3-table-fields.json'); }
    }

    results.push(check('1.9', 1, 'L3 visualizer field alignment', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 1.10 Data type coverage — check all DD fields have data_type populated (from PostgreSQL)
  {
    const issues: string[] = [];
    let missingCount = 0;
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        for (const field of table.fields) {
          if (!field.data_type) {
            missingCount++;
            if (missingCount <= 10) {
              issues.push(`${layer}.${table.name}.${field.name}: no data_type (run npm run db:introspect)`);
            }
          }
        }
      }
    }
    if (missingCount > 10) {
      issues.push(`... and ${missingCount - 10} more fields missing data_type`);
    }
    results.push(check('1.10', 1, 'Data type coverage', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 2: Metric Definition Integrity
// ═══════════════════════════════════════════════════════════════════════════

function validateMetricDefinitions(ddLookup: DDLookup, mergedMetrics: L3Metric[]): CheckResult[] {
  const results: CheckResult[] = [];
  const validPages = new Set(DASHBOARD_PAGES.map(p => p.id));

  // 2.1 Unique IDs
  {
    const issues: string[] = [];
    const counts = new Map<string, number>();
    for (const m of mergedMetrics) {
      counts.set(m.id, (counts.get(m.id) ?? 0) + 1);
    }
    for (const [id, count] of counts) {
      if (count > 1) issues.push(`Duplicate metric ID: "${id}" appears ${count} times`);
    }
    results.push(check('2.1', 2, 'Unique metric IDs', issues));
  }

  // 2.2 Required fields
  {
    const issues: string[] = [];
    for (const m of mergedMetrics) {
      if (!m.id) issues.push(`Metric missing id`);
      if (!m.name) issues.push(`${m.id}: missing name`);
      if (!m.page || !validPages.has(m.page)) issues.push(`${m.id}: invalid page "${m.page}"`);
      if (!m.formula) issues.push(`${m.id}: missing formula`);
      if (!m.sourceFields || m.sourceFields.length === 0) issues.push(`${m.id}: empty sourceFields`);
    }
    results.push(check('2.2', 2, 'Required fields present', issues));
  }

  // 2.3 sourceFields table references
  {
    const issues: string[] = [];
    for (const m of mergedMetrics) {
      for (const sf of m.sourceFields || []) {
        if (!ddLookup.tableExists(sf.layer, sf.table)) {
          issues.push(`${m.id}: sourceField table not in DD: ${sf.layer}.${sf.table}`);
        } else if (!ddLookup.fieldExists(sf.layer, sf.table, sf.field)) {
          issues.push(`${m.id}: sourceField field not in DD: ${sf.layer}.${sf.table}.${sf.field}`);
        }
      }
    }
    results.push(check('2.3', 2, 'sourceFields table references', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 2.4 formulaSQL table references
  {
    const issues: string[] = [];
    const tableRefRegex = /\b(L[12])\.(\w+)/g;

    function checkSqlRefs(metricId: string, sql: string, label: string) {
      let m: RegExpExecArray | null;
      const re = new RegExp(tableRefRegex.source, tableRefRegex.flags);
      while ((m = re.exec(sql)) !== null) {
        const layer = m[1];
        const table = m[2];
        if (!ddLookup.tableExists(layer, table)) {
          issues.push(`${metricId} ${label}: SQL references unknown table ${layer}.${table}`);
        }
      }
    }

    for (const m of mergedMetrics) {
      if (m.formulaSQL) checkSqlRefs(m.id, m.formulaSQL, 'formulaSQL');
      if (m.formulasByDimension) {
        for (const [dim, formula] of Object.entries(m.formulasByDimension)) {
          if (formula?.formulaSQL) checkSqlRefs(m.id, formula.formulaSQL, `formulasByDimension[${dim}]`);
        }
      }
    }
    results.push(check('2.4', 2, 'formulaSQL table references', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 2.5 allowedDimensions validity
  {
    const issues: string[] = [];
    const validDims = new Set<string>(CALCULATION_DIMENSIONS);
    for (const m of mergedMetrics) {
      if (m.allowedDimensions) {
        for (const d of m.allowedDimensions) {
          if (!validDims.has(d)) {
            issues.push(`${m.id}: invalid allowedDimension "${d}"`);
          }
        }
      }
    }
    results.push(check('2.5', 2, 'allowedDimensions validity', issues));
  }

  // 2.6 formulasByDimension keys
  {
    const issues: string[] = [];
    const validDims = new Set<string>(CALCULATION_DIMENSIONS);
    for (const m of mergedMetrics) {
      if (m.formulasByDimension) {
        for (const key of Object.keys(m.formulasByDimension)) {
          if (!validDims.has(key)) {
            issues.push(`${m.id}: invalid formulasByDimension key "${key}"`);
          }
        }
        if (m.allowedDimensions) {
          for (const dim of m.allowedDimensions) {
            if (!m.formulasByDimension[dim as CalculationDimension]) {
              issues.push(`${m.id}: allowedDimension "${dim}" has no formulasByDimension entry`);
            }
          }
        }
      }
    }
    results.push(check('2.6', 2, 'formulasByDimension keys', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 3: Catalogue <-> Metric Cross-References
// ═══════════════════════════════════════════════════════════════════════════

function validateCatalogueCrossRefs(ddLookup: DDLookup, mergedMetrics: L3Metric[]): CheckResult[] {
  const results: CheckResult[] = [];
  const catalogue = getCatalogueItems();
  const domains = getDomains();
  const metricIds = new Set(mergedMetrics.map(m => m.id));
  const domainIds = new Set(domains.map(d => d.domain_id));

  // 3.1 executable_metric_id links
  {
    const issues: string[] = [];
    for (const item of catalogue) {
      if (item.executable_metric_id && !metricIds.has(item.executable_metric_id)) {
        issues.push(`${item.item_id}: executable_metric_id "${item.executable_metric_id}" not found in metrics`);
      }
    }
    results.push(check('3.1', 3, 'executable_metric_id links', issues));
  }

  // 3.2 domain_ids existence
  {
    const issues: string[] = [];
    for (const item of catalogue) {
      for (const did of item.domain_ids || []) {
        if (!domainIds.has(did)) {
          issues.push(`${item.item_id}: domain_id "${did}" not in domains.json`);
        }
      }
    }
    results.push(check('3.2', 3, 'domain_ids existence', issues));
  }

  // 3.3 ingredient_fields validity
  {
    const issues: string[] = [];
    for (const item of catalogue) {
      for (const f of item.ingredient_fields || []) {
        if (!ddLookup.tableExists(f.layer, f.table)) {
          issues.push(`${item.item_id}: ingredient table not in DD: ${f.layer}.${f.table}`);
        } else if (!ddLookup.fieldExists(f.layer, f.table, f.field)) {
          issues.push(`${item.item_id}: ingredient field not in DD: ${f.layer}.${f.table}.${f.field}`);
        }
      }
    }
    results.push(check('3.3', 3, 'ingredient_fields validity', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 3.4 level_definitions completeness
  {
    const issues: string[] = [];
    const expectedLevels = new Set(ROLLUP_HIERARCHY_LEVELS);
    for (const item of catalogue) {
      const definedLevels = new Set((item.level_definitions || []).map(ld => ld.level));
      for (const level of expectedLevels) {
        if (!definedLevels.has(level)) {
          issues.push(`${item.item_id}: missing level_definition for "${level}"`);
        }
      }
    }
    results.push(check('3.4', 3, 'level_definitions completeness', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 3.5 sourcing_type validity
  {
    const issues: string[] = [];
    const validTypes = new Set(['Raw', 'Calc', 'Agg', 'Avg']);
    for (const item of catalogue) {
      for (const ld of item.level_definitions || []) {
        if (!validTypes.has(ld.sourcing_type)) {
          issues.push(`${item.item_id} level "${ld.level}": invalid sourcing_type "${ld.sourcing_type}"`);
        }
      }
    }
    results.push(check('3.5', 3, 'sourcing_type validity', issues));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 4: Legacy Cross-References
// ═══════════════════════════════════════════════════════════════════════════

function validateLegacyCrossRefs(mergedMetrics: L3Metric[]): CheckResult[] {
  const results: CheckResult[] = [];
  const variants = getVariants();
  const parents = getParentMetrics();
  const domains = getDomains();
  const parentIds = new Set(parents.map(p => p.metric_id));
  const metricIds = new Set(mergedMetrics.map(m => m.id));
  const domainIds = new Set(domains.map(d => d.domain_id));

  // 4.1 Variant -> parent
  {
    const issues: string[] = [];
    for (const v of variants) {
      if (!parentIds.has(v.parent_metric_id)) {
        issues.push(`Variant ${v.variant_id}: parent_metric_id "${v.parent_metric_id}" not found`);
      }
    }
    results.push(check('4.1', 4, 'Variant \u2192 parent metric links', issues));
  }

  // 4.2 Variant executable_metric_id
  {
    const issues: string[] = [];
    for (const v of variants) {
      if (v.executable_metric_id && !metricIds.has(v.executable_metric_id)) {
        issues.push(`Variant ${v.variant_id}: executable_metric_id "${v.executable_metric_id}" not found`);
      }
    }
    results.push(check('4.2', 4, 'Variant executable_metric_id links', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 4.3 Parent metric domain_ids
  {
    const issues: string[] = [];
    for (const p of parents) {
      for (const did of p.domain_ids || []) {
        if (!domainIds.has(did)) {
          issues.push(`Parent ${p.metric_id}: domain_id "${did}" not in domains.json`);
        }
      }
    }
    results.push(check('4.3', 4, 'Parent metric domain_ids', issues));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 5: Lineage Integrity
// ═══════════════════════════════════════════════════════════════════════════

function validateLineageIntegrity(mergedMetrics: L3Metric[]): CheckResult[] {
  const results: CheckResult[] = [];

  // 5.1 Auto-lineage generation
  {
    const issues: string[] = [];
    for (const m of mergedMetrics) {
      if (m.sourceFields && m.sourceFields.length > 0 && (!m.nodes || m.nodes.length === 0)) {
        try {
          const withLineage = metricWithLineage(m);
          if (!withLineage.nodes || withLineage.nodes.length < 2) {
            issues.push(`${m.id}: auto-lineage produced <2 nodes (got ${withLineage.nodes?.length ?? 0})`);
          }
          if (!withLineage.edges || withLineage.edges.length < 1) {
            issues.push(`${m.id}: auto-lineage produced 0 edges`);
          }
        } catch (err: unknown) {
          issues.push(`${m.id}: auto-lineage threw: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    results.push(check('5.1', 5, 'Auto-lineage generation', issues));
  }

  // 5.2 Pre-defined lineage edge integrity
  {
    const issues: string[] = [];
    for (const m of mergedMetrics) {
      if (m.nodes && m.nodes.length > 0 && m.edges && m.edges.length > 0) {
        const nodeIds = new Set(m.nodes.map(n => n.id));
        for (const edge of m.edges) {
          if (!nodeIds.has(edge.from)) {
            issues.push(`${m.id}: edge.from "${edge.from}" not in node IDs`);
          }
          if (!nodeIds.has(edge.to)) {
            issues.push(`${m.id}: edge.to "${edge.to}" not in node IDs`);
          }
        }
      }
    }
    results.push(check('5.2', 5, 'Pre-defined lineage edge integrity', issues));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 6: Calculation Engine Readiness
// ═══════════════════════════════════════════════════════════════════════════

async function validateCalculationEngine(mergedMetrics: L3Metric[]): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 6.1 Formula resolution
  {
    const issues: string[] = [];
    for (const m of mergedMetrics) {
      const allowed = m.allowedDimensions ?? CALCULATION_DIMENSIONS;
      for (const dim of allowed) {
        const resolved = resolveFormulaForDimension(m, dim, { allowLegacyFallback: true });
        if (!resolved?.formulaSQL?.trim()) {
          issues.push(`${m.id}:${dim} formula did not resolve to formulaSQL`);
        }
      }
    }
    results.push(check('6.1', 6, 'Formula resolution', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 6.2 Table resolution
  {
    const issues: string[] = [];
    for (const m of mergedMetrics) {
      const allowed = m.allowedDimensions ?? CALCULATION_DIMENSIONS;
      for (const dim of allowed) {
        const tableKeys = getTableKeysForMetric(m, dim);
        if (tableKeys.length === 0) {
          issues.push(`${m.id}:${dim} resolved 0 input tables`);
        }
      }
    }
    results.push(check('6.2', 6, 'Table resolution', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 6.3 SQL dry-run (only if sample data + sql.js WASM exist)
  {
    const issues: string[] = [];
    const L1_PATH = path.resolve(__dirname, 'l1/output/sample-data.json');
    const L2_PATH = path.resolve(__dirname, 'l2/output/sample-data.json');
    const WASM_PATH = path.resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
    const hasSampleData = fs.existsSync(L1_PATH) && fs.existsSync(L2_PATH);
    const hasWasm = fs.existsSync(WASM_PATH);

    if (!hasSampleData) {
      issues.push('Skipped: sample data files not found (run npm run generate:l1 && npm run generate:l2)');
    } else if (!hasWasm) {
      issues.push('Skipped: sql.js WASM not found (run npm install in project root)');
    } else {
      // Test metrics with allowedDimensions (domain-prefixed IDs: EXP-*, CAP-*, etc.)
      const testableMetrics = mergedMetrics
        .filter(m => m.allowedDimensions && m.allowedDimensions.length > 0 && m.formulaSQL);

      for (const m of testableMetrics) {
        const allowed = m.allowedDimensions ?? CALCULATION_DIMENSIONS;
        const dim = allowed[0];
        if (!dim) continue;
        try {
          const result = await runMetricCalculation({ metric: m, dimension: dim, asOfDate: null });
          if (!result.ok) {
            issues.push(`${m.id}:${dim} SQL execution failed: ${result.error}`);
          }
        } catch (err: unknown) {
          issues.push(`${m.id}:${dim} SQL execution threw: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (testableMetrics.length === 0) {
        issues.push('No metrics with allowedDimensions and formulaSQL found for dry-run (YAML metrics do not include these fields)');
      }
    }

    const hasExecutionFailures = issues.some(i => i.includes('SQL execution'));
    results.push(check('6.3', 6, 'SQL dry-run', issues,
      (!hasSampleData || !hasWasm || !hasExecutionFailures) ? 'WARN' : 'FAIL'));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 7: Export/API Surface Consistency
// ═══════════════════════════════════════════════════════════════════════════

function validateExportSurface(ddLookup: DDLookup): CheckResult[] {
  const results: CheckResult[] = [];

  // 7.1 Schema bundle completeness
  {
    const issues: string[] = [];
    try {
      const bundle = getSchemaBundle();
      if (!bundle.dataDictionary) {
        issues.push('Schema bundle has null dataDictionary');
      }
      if (!bundle.l3Tables || bundle.l3Tables.length === 0) {
        issues.push('Schema bundle has empty l3Tables');
      }
      if (!bundle.l3Metrics || bundle.l3Metrics.length === 0) {
        // This is expected: L3_METRICS static array may be empty; real metrics come from getMergedMetrics()
        // Only warn, don't fail
      }
    } catch (err: unknown) {
      issues.push(`getSchemaBundle() threw: ${err instanceof Error ? err.message : String(err)}`);
    }
    results.push(check('7.1', 7, 'Schema bundle completeness', issues,
      issues.some(i => i.includes('null dataDictionary') || i.includes('threw')) ? 'FAIL'
        : issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 7.2 Export field coverage — DDL fields exist in DD (export reads from DD)
  {
    const issues: string[] = [];
    const L1_DDL_PATH = path.resolve(__dirname, '../sql/gsib-export/01-l1-ddl.sql');
    const L2_DDL_PATH = path.resolve(__dirname, '../sql/gsib-export/02-l2-ddl.sql');

    if (fs.existsSync(L1_DDL_PATH)) {
      const l1Parsed = parseDDL(fs.readFileSync(L1_DDL_PATH, 'utf-8'), 'l1');
      for (const table of l1Parsed) {
        for (const col of table.columns) {
          if (!ddLookup.fieldExists('L1', table.name, col.name)) {
            issues.push(`Export gap: L1.${table.name}.${col.name} not in DD`);
          }
        }
      }
    }

    if (fs.existsSync(L2_DDL_PATH)) {
      const l2Parsed = parseDDL(fs.readFileSync(L2_DDL_PATH, 'utf-8'), 'l2');
      for (const table of l2Parsed) {
        for (const col of table.columns) {
          if (!ddLookup.fieldExists('L2', table.name, col.name)) {
            issues.push(`Export gap: L2.${table.name}.${col.name} not in DD`);
          }
        }
      }
    }

    results.push(check('7.2', 7, 'Export field coverage', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 8: Naming Conventions & Layer Integrity
// ═══════════════════════════════════════════════════════════════════════════

function validateLayerConventions(ddLookup: DDLookup): CheckResult[] {
  const results: CheckResult[] = [];
  const { dd } = ddLookup;

  // 8.1 L1 tables must not have as_of_date (except documented exceptions)
  {
    const ALLOWLIST = new Set(['reporting_calendar_dim', 'run_control', 'sccl_counterparty_group', 'capital_allocation', 'regulatory_capital_requirement']);
    const issues: string[] = [];
    for (const table of dd.L1) {
      if (ALLOWLIST.has(table.name)) continue;
      for (const field of table.fields) {
        if (field.name === 'as_of_date') {
          issues.push(`L1.${table.name}.as_of_date: L1 reference tables should not have as_of_date (use effective_start/end_date for SCD-2)`);
        }
      }
    }
    results.push(check('8.1', 8, 'L1 tables: no as_of_date', issues));
  }

  // 8.2 L2 SCD-2 tables must have complete temporal triple
  {
    const issues: string[] = [];
    const scd2Tables = L2_TABLE_META.filter(t => t.scd === 'SCD-2').map(t => t.name);
    for (const tableName of scd2Tables) {
      const ddTable = dd.L2.find(t => t.name === tableName);
      if (!ddTable) continue; // table not in DD — separate validation concern
      const fieldNames = new Set(ddTable.fields.map(f => f.name));
      const missing: string[] = [];
      if (!fieldNames.has('effective_start_date')) missing.push('effective_start_date');
      if (!fieldNames.has('effective_end_date')) missing.push('effective_end_date');
      if (!fieldNames.has('is_current_flag')) missing.push('is_current_flag');
      if (missing.length > 0) {
        issues.push(`L2.${tableName} (SCD-2): missing ${missing.join(', ')}`);
      }
    }
    results.push(check('8.2', 8, 'L2 SCD-2 temporal triple', issues));
  }

  // 8.3 _pct columns must be NUMERIC(10,6)
  {
    const issues: string[] = [];
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        for (const field of table.fields) {
          if (field.name.endsWith('_pct') && field.data_type) {
            const dt = field.data_type.toLowerCase().replace(/\s/g, '');
            // Accept numeric(10,6) — flag anything else that's numeric with wrong precision
            if (dt.startsWith('numeric') && dt !== 'numeric(10,6)') {
              issues.push(`${layer}.${table.name}.${field.name}: ${field.data_type} (expected NUMERIC(10,6))`);
            }
          }
        }
      }
    }
    results.push(check('8.3', 8, '_pct precision NUMERIC(10,6)', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 8.4 No bare active_flag (must use is_active_flag)
  {
    const issues: string[] = [];
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        for (const field of table.fields) {
          if (field.name === 'active_flag') {
            issues.push(`${layer}.${table.name}.active_flag: should be is_active_flag`);
          }
        }
      }
    }
    results.push(check('8.4', 8, 'No bare active_flag naming', issues));
  }

  // 8.5 No effective_from_date / effective_to_date (must use effective_start/end_date)
  {
    const issues: string[] = [];
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        for (const field of table.fields) {
          if (field.name === 'effective_from_date') {
            issues.push(`${layer}.${table.name}.effective_from_date: should be effective_start_date`);
          }
          if (field.name === 'effective_to_date') {
            issues.push(`${layer}.${table.name}.effective_to_date: should be effective_end_date`);
          }
          if (field.name === 'substatus_effective_to_date') {
            issues.push(`${layer}.${table.name}.substatus_effective_to_date: should be substatus_effective_end_date`);
          }
        }
      }
    }
    results.push(check('8.5', 8, 'No effective_from/to_date naming', issues));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 9: Architecture Compliance (GSIB Remediation — prevents recurrence)
// ═══════════════════════════════════════════════════════════════════════════

function validateArchitectureCompliance(ddLookup: DDLookup): CheckResult[] {
  const results: CheckResult[] = [];
  const { dd } = ddLookup;

  const L1_DDL_PATH = path.resolve(__dirname, '../sql/gsib-export/01-l1-ddl.sql');
  const L2_DDL_PATH = path.resolve(__dirname, '../sql/gsib-export/02-l2-ddl.sql');
  const L3_DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');

  // 9.1 Cross-layer table name uniqueness
  {
    const issues: string[] = [];
    const nameToLayers = new Map<string, string[]>();
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        const existing = nameToLayers.get(table.name) ?? [];
        existing.push(layer);
        nameToLayers.set(table.name, existing);
      }
    }
    for (const [name, layers] of nameToLayers) {
      if (layers.length > 1) {
        issues.push(`${name}: appears in ${layers.join(', ')}`);
      }
    }
    results.push(check('9.1', 9, 'Cross-layer table name uniqueness', issues));
  }

  // 9.2 Duplicate columns within table (data dictionary)
  {
    const issues: string[] = [];
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        const seen = new Set<string>();
        for (const field of table.fields) {
          if (seen.has(field.name)) {
            issues.push(`${layer}.${table.name}.${field.name}: duplicate column`);
          }
          seen.add(field.name);
        }
      }
    }
    results.push(check('9.2', 9, 'No duplicate columns within table', issues));
  }

  // 9.3 L2 calculated overlay compliance (deprecated fields should not exist in DDL)
  {
    const issues: string[] = [];
    for (const table of dd.L2) {
      for (const field of table.fields) {
        const f = field as Record<string, unknown>;
        if (f.deprecated === true) {
          issues.push(`L2.${table.name}.${field.name}: deprecated field still in DD (deprecated_by: ${f.deprecated_by ?? 'unknown'})`);
        }
      }
    }
    results.push(check('9.3', 9, 'L2 calculated overlay compliance', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 9.4 VARCHAR-for-numeric detection
  {
    const numericSuffixes = ['_amt', '_pct', '_count', '_bps'];
    const issues: string[] = [];
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        for (const field of table.fields) {
          if (!field.data_type) continue;
          const dt = field.data_type.toUpperCase();
          if (!dt.startsWith('VARCHAR')) continue;
          for (const suffix of numericSuffixes) {
            if (field.name.endsWith(suffix)) {
              issues.push(`${layer}.${table.name}.${field.name}: ${field.data_type} — suffix ${suffix} implies numeric type`);
              break;
            }
          }
        }
      }
    }
    results.push(check('9.4', 9, 'VARCHAR-for-numeric detection', issues));
  }

  // 9.5 is_active_flag consistency
  {
    const issues: string[] = [];
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        for (const field of table.fields) {
          if (field.name === 'active_flag') {
            issues.push(`${layer}.${table.name}.active_flag: should be is_active_flag`);
          }
        }
      }
    }
    results.push(check('9.5', 9, 'is_active_flag consistency', issues));
  }

  // 9.6 _id VARCHAR exception list
  {
    const issues: string[] = [];
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      for (const table of dd[layer]) {
        for (const field of table.fields) {
          if (!field.name.endsWith('_id')) continue;
          if (!field.data_type) continue;
          if (!field.data_type.toUpperCase().startsWith('VARCHAR')) continue;
          if (varcharIdFieldNames.has(field.name)) continue;
          issues.push(`${layer}.${table.name}.${field.name}: ${field.data_type} — _id field with VARCHAR not in exception list`);
        }
      }
    }
    results.push(check('9.6', 9, '_id VARCHAR exception list', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 9.7 Table meta completeness
  {
    const issues: string[] = [];
    const l1MetaNames = new Set(L1_TABLE_META.map(t => t.name));
    const l2MetaNames = new Set(L2_TABLE_META.map(t => t.name));
    const l3MetaNames = new Set(L3_TABLES.map(t => t.name));

    for (const table of dd.L1) {
      if (!l1MetaNames.has(table.name)) {
        issues.push(`L1.${table.name}: missing from l1-table-meta.ts`);
      }
    }
    for (const table of dd.L2) {
      if (!l2MetaNames.has(table.name)) {
        issues.push(`L2.${table.name}: missing from l2-table-meta.ts`);
      }
    }
    for (const table of dd.L3) {
      if (!l3MetaNames.has(table.name)) {
        issues.push(`L3.${table.name}: missing from l3-tables.ts`);
      }
    }
    results.push(check('9.7', 9, 'Table meta completeness', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 9.8 DDL completeness vs data dictionary
  {
    const issues: string[] = [];
    const ddlFiles = [
      { path: L1_DDL_PATH, layer: 'L1' as const },
      { path: L2_DDL_PATH, layer: 'L2' as const },
      { path: L3_DDL_PATH, layer: 'L3' as const },
    ];
    for (const { path: ddlPath, layer } of ddlFiles) {
      if (!fs.existsSync(ddlPath)) continue;
      const parsed = parseDDL(fs.readFileSync(ddlPath, 'utf-8'), layer.toLowerCase() as 'l1' | 'l2' | 'l3');
      const ddlNames = new Set(parsed.map(t => t.name));
      for (const table of dd[layer]) {
        const f = table as Record<string, unknown>;
        if (f.deprecated === true) continue;
        if (!ddlNames.has(table.name)) {
          issues.push(`${layer}.${table.name}: in DD but not in canonical DDL`);
        }
      }
    }
    results.push(check('9.8', 9, 'DDL completeness vs data dictionary', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 9.9 FK relationship coverage
  {
    const issues: string[] = [];
    const rels = (dd as Record<string, unknown>).relationships as Array<{
      from_layer: string;
      from_table: string;
      from_field: string;
    }> | undefined;

    if (rels) {
      const relKeys = new Set(rels.map(r => `${r.from_layer}.${r.from_table}.${r.from_field}`));
      for (const layer of ['L1', 'L2', 'L3'] as const) {
        for (const table of dd[layer]) {
          for (const field of table.fields) {
            if (!field.name.endsWith('_id')) continue;
            if (field.pk_fk?.is_pk) continue;
            const key = `${layer}.${table.name}.${field.name}`;
            if (!relKeys.has(key) && !field.pk_fk?.fk_target) {
              issues.push(`${key}: _id column has no relationship entry or fk_target`);
            }
          }
        }
      }
    }
    results.push(check('9.9', 9, 'FK relationship coverage', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 9.10 Referential chain coverage (Facility → Counterparty → Desk → Portfolio → Segment)
  {
    const issues: string[] = [];
    const facilityMaster = dd.L2.find(t => t.name === 'facility_master');
    if (facilityMaster) {
      const fieldNames = new Set(facilityMaster.fields.map(f => f.name));
      if (!fieldNames.has('counterparty_id')) issues.push('facility_master: missing counterparty_id (Facility→Counterparty link)');
      if (!fieldNames.has('org_unit_id')) issues.push('facility_master: missing org_unit_id (Facility→Desk link)');
      if (!fieldNames.has('portfolio_id')) issues.push('facility_master: missing portfolio_id (Facility→Portfolio link)');
      if (!fieldNames.has('lob_segment_id')) issues.push('facility_master: missing lob_segment_id (Facility→Segment link)');
    } else {
      issues.push('facility_master: table not found in L2 data dictionary');
    }
    results.push(check('9.10', 9, 'Referential chain coverage', issues));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 10: FK Enforcement & DDL Sync
// ═══════════════════════════════════════════════════════════════════════════

function validateFKEnforcementAndDDLSync(ddLookup: DDLookup): CheckResult[] {
  const results: CheckResult[] = [];
  const dd = ddLookup.dd;
  const rels = (dd as Record<string, unknown>).relationships as Array<{
    from_layer: string; from_table: string; from_field: string;
    to_layer: string; to_table: string; to_field: string;
  }> | undefined;

  // 10.1 FK DDL file existence — every DD relationship should have generated FK DDL
  {
    const issues: string[] = [];
    const fkDir = path.resolve(__dirname, '../sql/fk');
    const fkFiles = ['fk-l1.sql', 'fk-l2.sql', 'fk-l3.sql'];
    for (const f of fkFiles) {
      if (!fs.existsSync(path.join(fkDir, f))) {
        issues.push(`Missing FK DDL file: sql/fk/${f} — run: npm run generate:fk`);
      }
    }
    if (rels && issues.length === 0) {
      // Count relationships vs FK statements in generated files
      let totalFkStatements = 0;
      for (const f of fkFiles) {
        const content = fs.readFileSync(path.join(fkDir, f), 'utf-8');
        totalFkStatements += (content.match(/ADD CONSTRAINT/g) || []).length;
      }
      if (totalFkStatements < rels.length) {
        issues.push(`FK DDL has ${totalFkStatements} constraints but DD defines ${rels.length} relationships — regenerate with npm run generate:fk`);
      }
    }
    results.push(check('10.1', 10, 'FK DDL generation coverage', issues));
  }

  // 10.2 VARCHAR width parity on FK pairs
  {
    const issues: string[] = [];
    if (rels) {
      for (const rel of rels) {
        const fromTable = ddLookup.tablesByLayerName.get(`${rel.from_layer}.${rel.from_table}`);
        const toTable = ddLookup.tablesByLayerName.get(`${rel.to_layer}.${rel.to_table}`);
        if (!fromTable || !toTable) continue;
        const fromField = fromTable.fields.find(f => f.name === rel.from_field);
        const toField = toTable.fields.find(f => f.name === rel.to_field);
        if (!fromField?.data_type || !toField?.data_type) continue;
        const fromMatch = fromField.data_type.match(/VARCHAR\((\d+)\)/i);
        const toMatch = toField.data_type.match(/VARCHAR\((\d+)\)/i);
        if (fromMatch && toMatch) {
          const fromLen = parseInt(fromMatch[1], 10);
          const toLen = parseInt(toMatch[1], 10);
          if (fromLen !== toLen) {
            issues.push(
              `${rel.from_layer}.${rel.from_table}.${rel.from_field} VARCHAR(${fromLen}) ≠ ` +
              `${rel.to_layer}.${rel.to_table}.${rel.to_field} VARCHAR(${toLen})`
            );
          }
        }
      }
    }
    results.push(check('10.2', 10, 'FK VARCHAR width parity', issues));
  }

  // 10.3 FK constraint name length < 63 chars
  {
    const issues: string[] = [];
    if (rels) {
      for (const rel of rels) {
        const name = `fk_${rel.from_table}_${rel.from_field}`;
        if (name.length > 63) {
          issues.push(`${name} (${name.length} chars) exceeds PostgreSQL 63-char NAMEDATALEN limit`);
        }
      }
    }
    results.push(check('10.3', 10, 'FK constraint name length', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 10.6 l3-tables.ts ↔ L3 DDL sync
  {
    const issues: string[] = [];
    const L3_DDL = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');
    if (fs.existsSync(L3_DDL)) {
      const l3Parsed = parseDDL(fs.readFileSync(L3_DDL, 'utf-8'), 'l3');
      const ddlNames = new Set(l3Parsed.map(t => t.name));
      for (const t of L3_TABLES) {
        if (!ddlNames.has(t.name)) {
          issues.push(`L3.${t.name} (${t.id}): in l3-tables.ts but not in L3 DDL`);
        }
      }
    }
    results.push(check('10.6', 10, 'l3-tables.ts ↔ L3 DDL sync', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 10.7 DD L2 tables ↔ L2 DDL sync
  {
    const issues: string[] = [];
    const L2_DDL = path.resolve(__dirname, '../sql/gsib-export/02-l2-ddl.sql');
    if (fs.existsSync(L2_DDL)) {
      const l2Parsed = parseDDL(fs.readFileSync(L2_DDL, 'utf-8'), 'l2');
      const ddlNames = new Set(l2Parsed.map(t => t.name));
      for (const table of dd.L2) {
        const f = table as Record<string, unknown>;
        if (f.deprecated === true) continue;
        if (!ddlNames.has(table.name)) {
          issues.push(`L2.${table.name}: in data dictionary but not in L2 DDL`);
        }
      }
    }
    results.push(check('10.7', 10, 'DD L2 tables ↔ L2 DDL sync', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 10.10 Duplicate CREATE TABLE in DDL
  {
    const issues: string[] = [];
    const ddlFiles = [
      { path: path.resolve(__dirname, '../sql/gsib-export/01-l1-ddl.sql'), label: 'L1' },
      { path: path.resolve(__dirname, '../sql/gsib-export/02-l2-ddl.sql'), label: 'L2' },
      { path: path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql'), label: 'L3' },
    ];
    for (const { path: ddlPath, label } of ddlFiles) {
      if (!fs.existsSync(ddlPath)) continue;
      const content = fs.readFileSync(ddlPath, 'utf-8');
      const tableMatches = [...content.matchAll(/CREATE TABLE[^"]*"[^"]*"\."([^"]+)"/gi)];
      const seen = new Map<string, number>();
      for (const m of tableMatches) {
        const name = m[1];
        seen.set(name, (seen.get(name) || 0) + 1);
      }
      for (const [name, count] of seen) {
        if (count > 1) {
          issues.push(`${label}.${name}: CREATE TABLE appears ${count} times in DDL`);
        }
      }
    }
    results.push(check('10.10', 10, 'No duplicate CREATE TABLE in DDL', issues));
  }

  // 10.11 L3 summary tables have anchor entity relationships
  {
    const issues: string[] = [];
    const summaryTables = dd.L3.filter(t =>
      t.name.includes('summary') || t.name.includes('derived') || t.name.includes('rollup')
    );
    if (rels) {
      const relFromKeys = new Set(rels.map(r => `${r.from_layer}.${r.from_table}`));
      for (const table of summaryTables) {
        if (!relFromKeys.has(`L3.${table.name}`)) {
          issues.push(`L3.${table.name}: summary/derived table has no FK relationships defined`);
        }
      }
    }
    results.push(check('10.11', 10, 'L3 summary tables have anchor FKs', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 11: Metric Governance
// ═══════════════════════════════════════════════════════════════════════════

function validateMetricGovernance(ddLookup: DDLookup): CheckResult[] {
  const results: CheckResult[] = [];
  const catalogue = getCatalogueItems();

  // 11.1 Calc/Agg/Avg level_definitions should have formula_sql
  {
    const issues: string[] = [];
    let totalNonRaw = 0;
    let missingFormula = 0;
    for (const item of catalogue) {
      for (const ld of item.level_definitions || []) {
        if (ld.sourcing_type === 'Raw') continue;
        totalNonRaw++;
        if (!ld.formula_sql) {
          missingFormula++;
          // Only report first 20 to keep output manageable
          if (issues.length < 20) {
            issues.push(`${item.item_id} level "${ld.level}" (${ld.sourcing_type}): missing formula_sql`);
          }
        }
      }
    }
    if (missingFormula > 20) {
      issues.push(`... and ${missingFormula - 20} more (${missingFormula}/${totalNonRaw} total missing)`);
    }
    results.push(check('11.1', 11, `formula_sql coverage (${totalNonRaw - missingFormula}/${totalNonRaw} non-Raw have SQL)`, issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 11.2 No empty ingredient_fields
  {
    const issues: string[] = [];
    for (const item of catalogue) {
      if (!item.ingredient_fields || item.ingredient_fields.length === 0) {
        issues.push(`${item.item_id} (${item.item_name}): empty ingredient_fields`);
      }
    }
    results.push(check('11.2', 11, 'ingredient_fields populated', issues));
  }

  // 11.3 DRAFT/ACTIVE status ratio
  {
    const statusCounts = new Map<string, number>();
    for (const item of catalogue) {
      const s = item.status || 'UNKNOWN';
      statusCounts.set(s, (statusCounts.get(s) || 0) + 1);
    }
    const details: string[] = [];
    for (const [status, count] of [...statusCounts.entries()].sort((a, b) => b[1] - a[1])) {
      details.push(`${status}: ${count}/${catalogue.length} (${Math.round(count / catalogue.length * 100)}%)`);
    }
    const activeCount = statusCounts.get('ACTIVE') || 0;
    const severity: Severity = activeCount < catalogue.length * 0.1 ? 'WARN' : 'PASS';
    results.push(check('11.3', 11, 'Catalogue status distribution', details, severity));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Orchestrator
// ═══════════════════════════════════════════════════════════════════════════

export async function runValidation(options: CliOptions): Promise<ValidationReport> {
  const startedAt = Date.now();
  const checks: CheckResult[] = [];

  // --fix: run sync before validation
  if (options.fix) {
    console.log(`\n${C.bold}Running --fix: syncing data model...${C.reset}`);
    const syncReport = syncDataModel();
    if (syncReport.tablesAdded.length + syncReport.fieldsAdded.length > 0) {
      console.log(`  Synced: ${syncReport.tablesAdded.length} tables, ${syncReport.fieldsAdded.length} fields added`);
    } else {
      console.log('  All sources already in sync.');
    }
  }

  // Load shared resources
  const dd = readDataDictionary();
  if (!dd) {
    checks.push(check('0.1', 0, 'Data dictionary exists', [
      'File not found: facility-summary-mvp/output/data-dictionary/data-dictionary.json',
      'Run: npm run sync:data-model',
    ]));
    return buildReport(checks, startedAt);
  }

  const ddLookup = buildDDLookup(dd);
  const mergedMetrics = getMergedMetrics();

  const groupRunners: Array<{
    group: number;
    name: string;
    run: () => CheckResult[] | Promise<CheckResult[]>;
  }> = [
    { group: 1, name: 'Structural Integrity',           run: () => validateStructuralIntegrity(ddLookup) },
    { group: 2, name: 'Metric Definition Integrity',    run: () => validateMetricDefinitions(ddLookup, mergedMetrics) },
    { group: 3, name: 'Catalogue Cross-References',     run: () => validateCatalogueCrossRefs(ddLookup, mergedMetrics) },
    { group: 4, name: 'Legacy Cross-References',        run: () => validateLegacyCrossRefs(mergedMetrics) },
    { group: 5, name: 'Lineage Integrity',              run: () => validateLineageIntegrity(mergedMetrics) },
    { group: 6, name: 'Calculation Engine Readiness',   run: () => validateCalculationEngine(mergedMetrics) },
    { group: 7, name: 'Export/API Surface Consistency',  run: () => validateExportSurface(ddLookup) },
    { group: 8, name: 'Naming Conventions & Layer Integrity', run: () => validateLayerConventions(ddLookup) },
    { group: 9, name: 'Architecture Compliance',              run: () => validateArchitectureCompliance(ddLookup) },
    { group: 10, name: 'FK Enforcement & DDL Sync',           run: () => validateFKEnforcementAndDDLSync(ddLookup) },
    { group: 11, name: 'Metric Governance',                   run: () => validateMetricGovernance(ddLookup) },
  ];

  for (const runner of groupRunners) {
    if (options.group !== null && options.group !== runner.group) continue;
    console.log(`\n${C.bold}Group ${runner.group}: ${runner.name}${C.reset}`);
    const groupResults = await runner.run();
    for (const r of groupResults) printCheck(r);
    checks.push(...groupResults);
  }

  return buildReport(checks, startedAt);
}

function buildReport(checks: CheckResult[], startedAt: number): ValidationReport {
  return {
    checks,
    totalChecks: checks.length,
    passes: checks.filter(c => c.severity === 'PASS').length,
    warnings: checks.filter(c => c.severity === 'WARN').length,
    failures: checks.filter(c => c.severity === 'FAIL').length,
    durationMs: Date.now() - startedAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const options = parseArgs();
  console.log(`\n${C.bold}Data Model Validation${C.reset}`);
  if (options.group !== null) console.log(`  Running group ${options.group} only`);
  if (options.fix) console.log(`  --fix mode enabled`);

  const report = await runValidation(options);
  printReport(report);

  process.exit(report.failures > 0 ? 1 : 0);
}

const isDirectRun = process.argv[1]?.includes('validate-data-model');
if (isDirectRun) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
