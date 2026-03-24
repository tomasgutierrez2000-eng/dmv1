/**
 * Schema Analyzer — reads the data dictionary, computes coverage gaps,
 * builds FK dependency DAGs, and produces schema contracts.
 *
 * This is the foundation of the Data Factory Agent Suite. It answers:
 *   - What tables exist in the data model?
 *   - Which tables have generators and which don't?
 *   - What does valid data look like for each table/column?
 *   - In what order must tables be populated (FK dependencies)?
 *
 * Extends SchemaRegistry from schema-validator.ts — reuses DD reader
 * and Levenshtein suggestions, adds analytical layer on top.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { SchemaRegistry } from './schema-validator';
import { LOAD_ORDER } from './sql-emitter';
import { GENERATOR_REGISTRY } from './v2/generators';
import { inferGSIBRange, inferCorrelationGroup } from './gsib-calibration';

import type {
  TableClassification,
  ColumnContract,
  SchemaContract,
  CoverageReport,
  TableCoverageInfo,
  GenerationPlan,
  TableGenerationStep,
  FKDAGNode,
  FKDependencyDAG,
  FKTarget,
} from './schema-contracts';

/* ────────────────── DD Types (matches schema-validator.ts) ────────────────── */

interface DDField {
  name: string;
  description?: string;
  data_type?: string;
  pk_fk?: {
    is_pk?: boolean;
    is_composite?: boolean;
    fk_table?: string;
    fk_column?: string;
    references?: string;
  };
  [key: string]: unknown;
}

interface DDTable {
  name: string;
  layer: string;
  fields: DDField[];
  category?: string;
  [key: string]: unknown;
}

interface DataDictionary {
  L1?: DDTable[];
  L2?: DDTable[];
  L3?: DDTable[];
  [key: string]: unknown;
}

/* ────────────────── Schema Analyzer ────────────────── */

export class SchemaAnalyzer {
  private dd: DataDictionary;
  private ddPath: string;
  private registry: SchemaRegistry;

  /** Map of "l1.table_name" → DDTable for quick lookup */
  private tableMap = new Map<string, DDTable>();

  /** Known tables that V2 generators produce (from GENERATOR_REGISTRY mapping) */
  private static GENERATOR_TABLE_MAP: Record<string, string[]> = {
    'fx-rate':        ['l2.fx_rate'],
    'exposure':       ['l2.facility_exposure_snapshot'],
    'pricing':        ['l2.facility_pricing_snapshot'],
    'risk':           ['l2.facility_risk_snapshot'],
    'financial':      ['l2.facility_financial_snapshot'],
    'position':       ['l2.position', 'l2.position_detail'],
    'product-tables': [
      // 10 products × 4 categories = 40 tables
      'l2.loans_indicative_snapshot', 'l2.loans_accounting_snapshot', 'l2.loans_classification_snapshot', 'l2.loans_risk_snapshot',
      'l2.derivatives_indicative_snapshot', 'l2.derivatives_accounting_snapshot', 'l2.derivatives_classification_snapshot', 'l2.derivatives_risk_snapshot',
      'l2.offbs_commitments_indicative_snapshot', 'l2.offbs_commitments_accounting_snapshot', 'l2.offbs_commitments_classification_snapshot', 'l2.offbs_commitments_risk_snapshot',
      'l2.sft_indicative_snapshot', 'l2.sft_accounting_snapshot', 'l2.sft_classification_snapshot', 'l2.sft_risk_snapshot',
      'l2.securities_indicative_snapshot', 'l2.securities_accounting_snapshot', 'l2.securities_classification_snapshot', 'l2.securities_risk_snapshot',
      'l2.deposits_indicative_snapshot', 'l2.deposits_accounting_snapshot', 'l2.deposits_classification_snapshot', 'l2.deposits_risk_snapshot',
      'l2.borrowings_indicative_snapshot', 'l2.borrowings_accounting_snapshot', 'l2.borrowings_classification_snapshot', 'l2.borrowings_risk_snapshot',
      'l2.debt_indicative_snapshot', 'l2.debt_accounting_snapshot', 'l2.debt_classification_snapshot', 'l2.debt_risk_snapshot',
      'l2.equities_indicative_snapshot', 'l2.equities_accounting_snapshot', 'l2.equities_classification_snapshot', 'l2.equities_risk_snapshot',
      'l2.stock_indicative_snapshot', 'l2.stock_accounting_snapshot', 'l2.stock_classification_snapshot', 'l2.stock_risk_snapshot',
    ],
    'delinquency':    ['l2.facility_delinquency_snapshot'],
    'rating':         ['l2.counterparty_rating_observation'],
    'collateral':     ['l2.collateral_snapshot'],
    'profitability':  ['l2.facility_profitability_snapshot'],
    'events':         ['l2.credit_event', 'l2.credit_event_facility_link', 'l2.risk_flag', 'l2.amendment_event', 'l2.amendment_change_detail', 'l2.exception_event'],
    'limits':         ['l2.limit_contribution_snapshot', 'l2.limit_utilization_event'],
    'pipeline':       ['l2.deal_pipeline_fact'],
    'cp-financial':   ['l2.counterparty_financial_snapshot'],
    'provision':      ['l2.ecl_provision_snapshot'],
    'stress-test':    ['l2.stress_test_result', 'l2.stress_test_breach'],
  };

  private constructor(dd: DataDictionary, ddPath: string, registry: SchemaRegistry) {
    this.dd = dd;
    this.ddPath = ddPath;
    this.registry = registry;
    this.indexTables();
  }

  /**
   * Create a SchemaAnalyzer from the data dictionary.
   */
  static create(ddPath?: string): SchemaAnalyzer {
    const resolvedPath = ddPath ?? path.join(
      __dirname, '..', '..', 'facility-summary-mvp', 'output',
      'data-dictionary', 'data-dictionary.json',
    );

    if (!existsSync(resolvedPath)) {
      throw new Error(
        `Data dictionary not found at ${resolvedPath}. ` +
        `Run 'npm run db:introspect' to generate it.`,
      );
    }

    const raw = readFileSync(resolvedPath, 'utf-8');
    const dd: DataDictionary = JSON.parse(raw);
    const registry = SchemaRegistry.fromDataDictionary(resolvedPath);

    return new SchemaAnalyzer(dd, resolvedPath, registry);
  }

  /** Build internal table index. */
  private indexTables(): void {
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      const tables = this.dd[layer];
      if (!Array.isArray(tables)) continue;
      const schema = layer.toLowerCase();
      for (const table of tables) {
        this.tableMap.set(`${schema}.${table.name}`, table);
      }
    }
  }

  /** Get the SchemaRegistry for external use. */
  getRegistry(): SchemaRegistry {
    return this.registry;
  }

  /* ────────────────── Coverage Analysis ────────────────── */

  /**
   * Compute the coverage gap: which tables have generators and which don't.
   */
  analyzeCoverage(): CoverageReport {
    // Build the set of tables covered by V2 generators
    const coveredByGenerator = new Set<string>();
    for (const gen of GENERATOR_REGISTRY) {
      const tables = SchemaAnalyzer.GENERATOR_TABLE_MAP[gen.name];
      if (tables) {
        for (const t of tables) coveredByGenerator.add(t);
      }
    }

    // Build the set of tables in LOAD_ORDER
    const inLoadOrder = new Set(LOAD_ORDER);

    const allTables: TableCoverageInfo[] = [];
    const uncoveredL1: TableCoverageInfo[] = [];
    const uncoveredL2: TableCoverageInfo[] = [];
    let l3Count = 0;

    for (const [qualifiedName, ddTable] of this.tableMap) {
      const layer = qualifiedName.startsWith('l1.') ? 'L1'
        : qualifiedName.startsWith('l2.') ? 'L2'
        : 'L3';

      const classification = this.classifyTable(qualifiedName);
      const hasGenerator = coveredByGenerator.has(qualifiedName);
      const isInLoadOrder = inLoadOrder.has(qualifiedName);

      const info: TableCoverageInfo = {
        qualifiedName,
        layer: layer as 'L1' | 'L2' | 'L3',
        classification,
        hasGenerator,
        inLoadOrder: isInLoadOrder,
        columnCount: ddTable.fields?.length ?? 0,
      };

      allTables.push(info);

      if (layer === 'L3') {
        l3Count++;
      } else if (!hasGenerator && !isInLoadOrder) {
        if (layer === 'L1') uncoveredL1.push(info);
        else if (layer === 'L2') uncoveredL2.push(info);
      }
    }

    return {
      totalTables: this.tableMap.size,
      tablesWithGenerators: coveredByGenerator.size,
      tablesInLoadOrder: inLoadOrder.size,
      uncoveredL2,
      uncoveredL1,
      l3Tables: l3Count,
      allTables,
    };
  }

  /* ────────────────── Table Classification ────────────────── */

  /**
   * Classify a table by its role in the data model.
   */
  classifyTable(qualifiedName: string): TableClassification {
    const ddTable = this.tableMap.get(qualifiedName);
    if (!ddTable) return 'L2_SNAPSHOT'; // fallback

    const layer = qualifiedName.split('.')[0];
    const name = ddTable.name;

    // L3 = always derived
    if (layer === 'l3') return 'L3_DERIVED';

    // L1 classification
    if (layer === 'l1') {
      // Dim tables: name ends with _dim
      if (name.endsWith('_dim')) return 'L1_DIM';

      // Junction/bridge tables: name contains _link, _participation, _member, _mapping
      if (name.includes('_link') || name.includes('_participation') ||
          name.includes('_member') || name.includes('_mapping'))
        return 'JUNCTION';

      // Master tables: everything else in L1
      return 'L1_MASTER';
    }

    // L2 classification
    if (layer === 'l2') {
      // Event tables: name contains _event, _flag
      if (name.includes('_event') || name === 'risk_flag')
        return 'L2_EVENT';

      // Junction/bridge tables
      if (name.includes('_link') || name.includes('_participation') ||
          name.includes('_attribution'))
        return 'JUNCTION';

      // Default: snapshot (time-series)
      return 'L2_SNAPSHOT';
    }

    return 'L2_SNAPSHOT';
  }

  /* ────────────────── FK Dependency DAG ────────────────── */

  /**
   * Build the FK dependency graph from DD FK references.
   * Returns a DAG with topological ordering.
   */
  buildFKDependencyDAG(): FKDependencyDAG {
    const nodes = new Map<string, FKDAGNode>();

    // Initialize all nodes
    for (const qualifiedName of this.tableMap.keys()) {
      nodes.set(qualifiedName, {
        qualifiedName,
        parents: [],
        children: [],
        topoOrder: -1,
      });
    }

    // Build edges from FK references
    for (const [qualifiedName, ddTable] of this.tableMap) {
      if (!ddTable.fields) continue;
      const node = nodes.get(qualifiedName)!;

      for (const field of ddTable.fields) {
        const fk = this.extractFKTarget(field, qualifiedName);
        if (fk) {
          const parentQualified = fk.parentTable;
          // Only add edge if parent exists in our table set
          if (nodes.has(parentQualified) && parentQualified !== qualifiedName) {
            if (!node.parents.includes(parentQualified)) {
              node.parents.push(parentQualified);
            }
            const parentNode = nodes.get(parentQualified)!;
            if (!parentNode.children.includes(qualifiedName)) {
              parentNode.children.push(qualifiedName);
            }
          }
        }
      }
    }

    // Topological sort (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    for (const [name, node] of nodes) {
      inDegree.set(name, node.parents.length);
    }

    const queue: string[] = [];
    const roots: string[] = [];
    for (const [name, deg] of inDegree) {
      if (deg === 0) {
        queue.push(name);
        roots.push(name);
      }
    }

    const sortedOrder: string[] = [];
    let order = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      sortedOrder.push(current);
      const node = nodes.get(current)!;
      node.topoOrder = order++;

      for (const child of node.children) {
        const childDeg = inDegree.get(child)!;
        inDegree.set(child, childDeg - 1);
        if (childDeg - 1 === 0) {
          queue.push(child);
        }
      }
    }

    // Find leaves (nodes with no children)
    const leaves: string[] = [];
    for (const [name, node] of nodes) {
      if (node.children.length === 0) leaves.push(name);
    }

    // If there are cycles (sortedOrder.length < nodes.size), handle gracefully
    // by adding remaining nodes at the end
    if (sortedOrder.length < nodes.size) {
      for (const name of nodes.keys()) {
        if (!sortedOrder.includes(name)) {
          sortedOrder.push(name);
          const node = nodes.get(name)!;
          node.topoOrder = order++;
        }
      }
    }

    return { nodes, sortedOrder, roots, leaves };
  }

  /**
   * Extract FK target from a DD field definition.
   */
  private extractFKTarget(field: DDField, sourceTable: string): FKTarget | null {
    if (!field.pk_fk) return null;

    const pkfk = field.pk_fk;

    // Explicit FK reference in DD
    if (pkfk.fk_table && pkfk.fk_column) {
      return {
        parentTable: pkfk.fk_table,
        parentColumn: pkfk.fk_column,
      };
    }

    // Parse "references" string (e.g., "l1.counterparty.counterparty_id")
    if (pkfk.references && typeof pkfk.references === 'string') {
      const parts = pkfk.references.split('.');
      if (parts.length >= 3) {
        return {
          parentTable: `${parts[0]}.${parts[1]}`,
          parentColumn: parts[2],
        };
      } else if (parts.length === 2) {
        // Assume same schema as source
        const schema = sourceTable.split('.')[0];
        return {
          parentTable: `${schema}.${parts[0]}`,
          parentColumn: parts[1],
        };
      }
    }

    return null;
  }

  /* ────────────────── Schema Contracts ────────────────── */

  /**
   * Generate schema contracts for all tables (or a subset).
   */
  generateSchemaContracts(tableFilter?: string[]): Map<string, SchemaContract> {
    const contracts = new Map<string, SchemaContract>();
    const dag = this.buildFKDependencyDAG();

    const tablesToProcess = tableFilter
      ? [...this.tableMap.entries()].filter(([name]) => tableFilter.includes(name))
      : [...this.tableMap.entries()];

    for (const [qualifiedName, ddTable] of tablesToProcess) {
      const [schema, tableName] = qualifiedName.split('.');
      const layer = schema === 'l1' ? 'L1' : schema === 'l2' ? 'L2' : 'L3';
      const classification = this.classifyTable(qualifiedName);

      // Build column contracts
      const columns: ColumnContract[] = [];
      const primaryKey: string[] = [];
      let isTemporal = false;

      for (const field of ddTable.fields ?? []) {
        const dataType = field.data_type ?? 'VARCHAR(64)';
        const isPK = !!field.pk_fk?.is_pk;
        if (isPK) primaryKey.push(field.name);
        if (field.name === 'as_of_date') isTemporal = true;

        const fkTarget = this.extractFKTarget(field, qualifiedName) ?? undefined;
        const gsibRange = inferGSIBRange(field.name, dataType) ?? undefined;
        const correlationGroup = inferCorrelationGroup(field.name) ?? undefined;

        // Determine generation hint
        let generationHint: ColumnContract['generationHint'];
        if (fkTarget) generationHint = 'FK_LOOKUP';
        else if (field.name === 'as_of_date') generationHint = 'DATE_GRID';
        else if (field.name.endsWith('_flag')) generationHint = 'BOOLEAN_FLAG';
        else if (field.name.endsWith('_code') && !isPK) generationHint = 'DIM_ENUM';
        else if (gsibRange) generationHint = 'GSIB_RANGE';
        else if (field.name.endsWith('_ts')) generationHint = 'CONSTANT';
        else generationHint = 'FROM_STATE';

        columns.push({
          name: field.name,
          dataType,
          nullable: !isPK, // PK columns are NOT NULL, others assumed nullable unless DD says otherwise
          isPK,
          fkTarget,
          gsibRange,
          correlationGroup,
          generationHint,
        });
      }

      // Determine dependencies from DAG
      const dagNode = dag.nodes.get(qualifiedName);
      const dependsOn = dagNode?.parents ?? [];
      const referencedBy = dagNode?.children ?? [];

      contracts.set(qualifiedName, {
        qualifiedName,
        schema,
        tableName,
        classification,
        layer: layer as 'L1' | 'L2' | 'L3',
        isTemporal,
        primaryKey,
        columns,
        dependsOn,
        referencedBy,
      });
    }

    return contracts;
  }

  /**
   * Get a single table's contract.
   */
  getContract(qualifiedName: string): SchemaContract | undefined {
    const contracts = this.generateSchemaContracts([qualifiedName]);
    return contracts.get(qualifiedName);
  }

  /* ────────────────── Generation Plan ────────────────── */

  /**
   * Build a generation plan: ordered list of tables to generate,
   * respecting FK ordering and identifying what action each needs.
   */
  getGenerationPlan(targetTables?: string[]): GenerationPlan {
    const coverage = this.analyzeCoverage();
    const dag = this.buildFKDependencyDAG();
    const contracts = this.generateSchemaContracts();

    // Determine which tables to include
    let tablesToGenerate: Set<string>;
    if (targetTables) {
      tablesToGenerate = new Set(targetTables);
    } else {
      // Default: all L1 and L2 tables
      tablesToGenerate = new Set(
        coverage.allTables
          .filter(t => t.layer !== 'L3')
          .map(t => t.qualifiedName)
      );
    }

    // Build steps in topological order
    const steps: TableGenerationStep[] = [];
    const coverageMap = new Map(coverage.allTables.map(t => [t.qualifiedName, t]));

    for (const qualifiedName of dag.sortedOrder) {
      if (!tablesToGenerate.has(qualifiedName)) continue;

      const info = coverageMap.get(qualifiedName);
      const contract = contracts.get(qualifiedName);
      if (!info || !contract) continue;

      let action: TableGenerationStep['action'];
      let reason: string;

      if (contract.classification === 'L3_DERIVED') {
        action = 'SKIP_L3';
        reason = 'L3 derived table — calc engine handles generation';
      } else if (info.hasGenerator) {
        action = 'USE_EXISTING';
        reason = `Covered by V2 generator`;
      } else if (contract.classification === 'L1_DIM') {
        action = 'SEED_STATIC';
        reason = 'L1 dim table — generate static reference data once';
      } else {
        action = 'CREATE_GENERATOR';
        reason = `No generator exists — needs new V2 generator`;
      }

      // Estimate rows: snapshots = facilityCount × dateCount, events = ~10% of snapshots
      let estimatedRowsPerDate = 0;
      if (contract.isTemporal && contract.classification === 'L2_SNAPSHOT') {
        estimatedRowsPerDate = 410; // default facility count
      } else if (contract.classification === 'L2_EVENT') {
        estimatedRowsPerDate = 50; // events are sparse
      } else if (contract.classification === 'L1_DIM') {
        estimatedRowsPerDate = 20; // static
      } else if (contract.classification === 'L1_MASTER') {
        estimatedRowsPerDate = 100;
      } else if (contract.classification === 'JUNCTION') {
        estimatedRowsPerDate = 200;
      }

      const dagNode = dag.nodes.get(qualifiedName);
      const mustGenerateAfter = (dagNode?.parents ?? []).filter(p => tablesToGenerate.has(p));

      steps.push({
        qualifiedName,
        action,
        classification: contract.classification,
        contract,
        estimatedRowsPerDate,
        mustGenerateAfter,
        reason,
      });
    }

    // Summary
    const newGeneratorsNeeded = steps.filter(s => s.action === 'CREATE_GENERATOR').length;
    const existingGeneratorsUsed = steps.filter(s => s.action === 'USE_EXISTING').length;
    const l3Skipped = steps.filter(s => s.action === 'SKIP_L3').length;
    const staticSeeded = steps.filter(s => s.action === 'SEED_STATIC').length;
    const estimatedTotalRows = steps.reduce((sum, s) => sum + s.estimatedRowsPerDate, 0);

    return {
      steps,
      summary: {
        totalSteps: steps.length,
        newGeneratorsNeeded,
        existingGeneratorsUsed,
        l3Skipped,
        staticSeeded,
        estimatedTotalRows,
      },
    };
  }

  /* ────────────────── Utility ────────────────── */

  /** Get all table names in the DD. */
  getAllTableNames(): string[] {
    return [...this.tableMap.keys()];
  }

  /** Get DD table definition. */
  getDDTable(qualifiedName: string): DDTable | undefined {
    return this.tableMap.get(qualifiedName);
  }

  /** Get tables by layer. */
  getTablesByLayer(layer: 'L1' | 'L2' | 'L3'): string[] {
    const prefix = layer.toLowerCase() + '.';
    return [...this.tableMap.keys()].filter(n => n.startsWith(prefix));
  }

  /** Get the data dictionary path. */
  getDDPath(): string {
    return this.ddPath;
  }
}
