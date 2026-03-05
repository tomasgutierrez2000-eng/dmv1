/**
 * Comprehensive data model validation — 30 checks across 7 groups.
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

import { L1_TABLES } from './l1/l1-definitions';
import { L2_TABLES } from './l2/l2-definitions';
import { L3_TABLES } from '../data/l3-tables';
import {
  CALCULATION_DIMENSIONS,
  DASHBOARD_PAGES,
  type L3Metric,
  type CalculationDimension,
} from '../data/l3-metrics';
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

interface ValidationReport {
  checks: CheckResult[];
  totalChecks: number;
  passes: number;
  warnings: number;
  failures: number;
  durationMs: number;
}

interface CliOptions {
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

// ── L3 DDL Parser (copied from sync-data-model.ts) ──

interface L3ParsedColumn {
  name: string; type: string; nullable: boolean;
  pk: boolean; fk: string; defaultVal: string;
}
interface L3ParsedTable { name: string; columns: L3ParsedColumn[]; pkColumns: string[] }

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

    const columns: L3ParsedColumn[] = [];
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

function parseFkString(fk: string): { layer: string; table: string; field: string } | null {
  const m = fk.match(/^(l[123])\.(\w+)\((\w+)\)$/);
  if (!m) return null;
  return { layer: m[1].toUpperCase(), table: m[2], field: m[3] };
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

  // 1.1 L1 definitions <-> data dictionary
  {
    const issues: string[] = [];
    const ddL1Names = new Set(dd.L1.map(t => t.name));
    for (const table of L1_TABLES) {
      if (!ddL1Names.has(table.tableName)) {
        issues.push(`Missing from DD: L1.${table.tableName}`);
      } else {
        const ddTable = dd.L1.find(t => t.name === table.tableName)!;
        const ddFields = new Set(ddTable.fields.map(f => f.name));
        for (const col of table.columns) {
          if (!ddFields.has(col.name)) {
            issues.push(`Missing field in DD: L1.${table.tableName}.${col.name}`);
          }
        }
      }
    }
    const defL1Names = new Set(L1_TABLES.map(t => t.tableName));
    for (const ddTable of dd.L1) {
      if (!defL1Names.has(ddTable.name)) {
        issues.push(`In DD but not in L1 definitions: L1.${ddTable.name}`);
      }
    }
    results.push(check('1.1', 1, 'L1 definitions \u2194 data dictionary', issues));
  }

  // 1.2 L2 definitions <-> data dictionary
  {
    const issues: string[] = [];
    const ddL2Names = new Set(dd.L2.map(t => t.name));
    for (const table of L2_TABLES) {
      if (!ddL2Names.has(table.tableName)) {
        issues.push(`Missing from DD: L2.${table.tableName}`);
      } else {
        const ddTable = dd.L2.find(t => t.name === table.tableName)!;
        const ddFields = new Set(ddTable.fields.map(f => f.name));
        for (const col of table.columns) {
          if (!ddFields.has(col.name)) {
            issues.push(`Missing field in DD: L2.${table.tableName}.${col.name}`);
          }
        }
      }
    }
    const defL2Names = new Set(L2_TABLES.map(t => t.tableName));
    for (const ddTable of dd.L2) {
      if (!defL2Names.has(ddTable.name)) {
        issues.push(`In DD but not in L2 definitions: L2.${ddTable.name}`);
      }
    }
    results.push(check('1.2', 1, 'L2 definitions \u2194 data dictionary', issues));
  }

  // 1.3 L3 DDL <-> L3 tables manifest
  {
    const issues: string[] = [];
    const DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');
    if (!fs.existsSync(DDL_PATH)) {
      results.push(check('1.3', 1, 'L3 DDL \u2194 L3 tables manifest', ['DDL file not found: sql/l3/01_DDL_all_tables.sql']));
    } else {
      const ddlSql = fs.readFileSync(DDL_PATH, 'utf-8');
      const l3Parsed = parseL3DDL(ddlSql);
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
    const DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');
    if (fs.existsSync(DDL_PATH)) {
      const ddlSql = fs.readFileSync(DDL_PATH, 'utf-8');
      const l3Parsed = parseL3DDL(ddlSql);
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

  // 1.5 FK integrity
  {
    const issues: string[] = [];

    // L1 FKs
    for (const table of L1_TABLES) {
      for (const col of table.columns) {
        if (col.fk) {
          const target = parseFkString(col.fk);
          if (target) {
            if (!ddLookup.fieldExists(target.layer, target.table, target.field)) {
              issues.push(`L1.${table.tableName}.${col.name} FK -> ${col.fk} (target not found)`);
            }
          }
        }
      }
    }

    // L2 FKs
    for (const table of L2_TABLES) {
      for (const col of table.columns) {
        if (col.fk) {
          const target = parseFkString(col.fk);
          if (target) {
            if (!ddLookup.fieldExists(target.layer, target.table, target.field)) {
              issues.push(`L2.${table.tableName}.${col.name} FK -> ${col.fk} (target not found)`);
            }
          }
        }
      }
    }

    // L3 DDL FKs
    const DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');
    if (fs.existsSync(DDL_PATH)) {
      const ddlSql = fs.readFileSync(DDL_PATH, 'utf-8');
      const l3Parsed = parseL3DDL(ddlSql);
      for (const table of l3Parsed) {
        for (const col of table.columns) {
          if (col.fk) {
            const m = col.fk.match(/^(L[123])\.(\w+)\.(\w+)/);
            if (m) {
              if (!ddLookup.fieldExists(m[1], m[2], m[3])) {
                issues.push(`L3.${table.name}.${col.name} FK -> ${col.fk} (target not found)`);
              }
            }
          }
        }
      }
    }
    results.push(check('1.5', 1, 'FK integrity', issues));
  }

  // 1.6 Sample data alignment
  {
    const issues: string[] = [];
    const L1_SAMPLE = path.resolve(__dirname, 'l1/output/sample-data.json');
    const L2_SAMPLE = path.resolve(__dirname, 'l2/output/sample-data.json');

    if (fs.existsSync(L1_SAMPLE)) {
      try {
        const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = JSON.parse(fs.readFileSync(L1_SAMPLE, 'utf-8'));
        // Sample data keys may be prefixed with "L1." (e.g., "L1.currency_dim")
        const defNames = new Set(L1_TABLES.map(t => t.tableName));
        for (const rawKey of Object.keys(sampleData)) {
          const key = rawKey.replace(/^L1\./, '');
          if (!defNames.has(key)) {
            issues.push(`L1 sample data has table "${key}" not in L1 definitions`);
          }
        }
        for (const table of L1_TABLES) {
          const sample = sampleData[table.tableName] ?? sampleData[`L1.${table.tableName}`];
          if (sample && sample.columns.length !== table.columns.length) {
            issues.push(`L1.${table.tableName}: sample has ${sample.columns.length} cols, definition has ${table.columns.length}`);
          }
        }
      } catch { issues.push('Failed to parse L1 sample data JSON'); }
    }

    if (fs.existsSync(L2_SAMPLE)) {
      try {
        const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = JSON.parse(fs.readFileSync(L2_SAMPLE, 'utf-8'));
        const defNames = new Set(L2_TABLES.map(t => t.tableName));
        for (const rawKey of Object.keys(sampleData)) {
          const key = rawKey.replace(/^L2\./, '');
          if (!defNames.has(key)) {
            issues.push(`L2 sample data has table "${key}" not in L2 definitions`);
          }
        }
        for (const table of L2_TABLES) {
          const sample = sampleData[table.tableName] ?? sampleData[`L2.${table.tableName}`];
          if (sample && sample.columns.length !== table.columns.length) {
            issues.push(`L2.${table.tableName}: sample has ${sample.columns.length} cols, definition has ${table.columns.length}`);
          }
        }
      } catch { issues.push('Failed to parse L2 sample data JSON'); }
    }

    results.push(check('1.6', 1, 'Sample data alignment', issues, issues.length > 0 ? 'WARN' : 'PASS'));
  }

  // 1.7 DD relationships completeness — every FK in L1/L2 definitions should have a DD relationship
  {
    const issues: string[] = [];
    const relKeys = new Set(
      dd.relationships.map(r => `${r.from_layer}.${r.from_table}.${r.from_field}->${r.to_layer}.${r.to_table}.${r.to_field}`)
    );

    for (const table of L1_TABLES) {
      for (const col of table.columns) {
        if (col.fk) {
          const target = parseFkString(col.fk);
          if (target) {
            const key = `L1.${table.tableName}.${col.name}->${target.layer}.${target.table}.${target.field}`;
            if (!relKeys.has(key)) {
              issues.push(`Missing DD relationship: L1.${table.tableName}.${col.name} -> ${col.fk}`);
            }
          }
        }
      }
    }

    for (const table of L2_TABLES) {
      for (const col of table.columns) {
        if (col.fk) {
          const target = parseFkString(col.fk);
          if (target) {
            const key = `L2.${table.tableName}.${col.name}->${target.layer}.${target.table}.${target.field}`;
            if (!relKeys.has(key)) {
              issues.push(`Missing DD relationship: L2.${table.tableName}.${col.name} -> ${col.fk}`);
            }
          }
        }
      }
    }

    results.push(check('1.7', 1, 'DD relationships completeness', issues));
  }

  // 1.8 Sample data column name coverage — definition columns should exist in sample data
  {
    const issues: string[] = [];
    const L1_SAMPLE = path.resolve(__dirname, 'l1/output/sample-data.json');
    const L2_SAMPLE = path.resolve(__dirname, 'l2/output/sample-data.json');

    if (fs.existsSync(L1_SAMPLE)) {
      try {
        const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = JSON.parse(fs.readFileSync(L1_SAMPLE, 'utf-8'));
        for (const table of L1_TABLES) {
          const sample = sampleData[table.tableName] ?? sampleData[`L1.${table.tableName}`];
          if (!sample) continue;
          const sampleCols = new Set(sample.columns);
          for (const col of table.columns) {
            if (!sampleCols.has(col.name)) {
              issues.push(`L1.${table.tableName}.${col.name}: in definition but missing from sample data columns`);
            }
          }
        }
      } catch { /* parse error already reported in 1.6 */ }
    }

    if (fs.existsSync(L2_SAMPLE)) {
      try {
        const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = JSON.parse(fs.readFileSync(L2_SAMPLE, 'utf-8'));
        for (const table of L2_TABLES) {
          const sample = sampleData[table.tableName] ?? sampleData[`L2.${table.tableName}`];
          if (!sample) continue;
          const sampleCols = new Set(sample.columns);
          for (const col of table.columns) {
            if (!sampleCols.has(col.name)) {
              issues.push(`L2.${table.tableName}.${col.name}: in definition but missing from sample data columns`);
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
    const DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');

    if (!fs.existsSync(L3_FIELDS_PATH)) {
      issues.push('l3-table-fields.json not found (run L3 generation to populate visualizer)');
    } else if (fs.existsSync(DDL_PATH)) {
      try {
        const l3Fields: Record<string, { category: string; fields: { name: string }[] }> =
          JSON.parse(fs.readFileSync(L3_FIELDS_PATH, 'utf-8'));
        const ddlSql = fs.readFileSync(DDL_PATH, 'utf-8');
        const l3Parsed = parseL3DDL(ddlSql);
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
      // Only test finalized seed metrics (C100-C113) to keep dry-run fast and focused
      const FINALIZED_IDS = new Set(mergedMetrics
        .filter(m => m.id.match(/^C1[0-1]\d$/) && m.allowedDimensions && m.allowedDimensions.length > 0)
        .map(m => m.id));
      const testableMetrics = mergedMetrics.filter(m => FINALIZED_IDS.has(m.id));

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
        issues.push('No finalized metrics (C100-C113) with allowedDimensions found for dry-run');
      }
    }

    results.push(check('6.3', 6, 'SQL dry-run', issues,
      (!hasSampleData || !hasWasm) ? 'WARN' : issues.length > 0 ? 'FAIL' : 'PASS'));
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

  // 7.2 Export field coverage (DD covers all definition fields)
  {
    const issues: string[] = [];

    // L1
    for (const table of L1_TABLES) {
      for (const col of table.columns) {
        if (!ddLookup.fieldExists('L1', table.tableName, col.name)) {
          issues.push(`Export gap: L1.${table.tableName}.${col.name} not in DD`);
        }
      }
    }

    // L2
    for (const table of L2_TABLES) {
      for (const col of table.columns) {
        if (!ddLookup.fieldExists('L2', table.tableName, col.name)) {
          issues.push(`Export gap: L2.${table.tableName}.${col.name} not in DD`);
        }
      }
    }

    results.push(check('7.2', 7, 'Export field coverage', issues, issues.length > 0 ? 'WARN' : 'PASS'));
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
