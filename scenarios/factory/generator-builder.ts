/**
 * Generator Builder — dynamically scaffolds TypeScript generators for tables
 * that don't have one yet.
 *
 * Given a table's SchemaContract (from SchemaAnalyzer), produces:
 *   1. A TypeScript generator function following the V2 pattern
 *   2. Registry update code for generators/index.ts
 *   3. Column-level generation strategies
 *
 * The builder does NOT auto-write files. It produces source code strings
 * that the agent (Claude) reviews and writes.
 */

import { SchemaAnalyzer } from './schema-analyzer';
import type { SchemaContract, ColumnContract, TableClassification } from './schema-contracts';
import type { GeneratorScaffold, ColumnGenerationStrategy } from './strategy-types';

/* ────────────────── Generator Builder ────────────────── */

export class GeneratorBuilder {
  private analyzer: SchemaAnalyzer;

  constructor(analyzer?: SchemaAnalyzer) {
    this.analyzer = analyzer ?? SchemaAnalyzer.create();
  }

  /**
   * Scaffold a complete generator for a table.
   * Returns the TypeScript source code, registry update, and column strategies.
   */
  scaffoldGenerator(qualifiedName: string): GeneratorScaffold | null {
    const contract = this.analyzer.getContract(qualifiedName);
    if (!contract) return null;

    const columns = this.buildColumnStrategies(contract);
    const functionName = this.toFunctionName(contract.tableName);
    const fileName = this.toFileName(contract.tableName);

    const sourceCode = this.generateSourceCode(contract, columns, functionName);
    const registryUpdateCode = this.generateRegistryUpdate(contract, functionName, fileName);

    return {
      qualifiedName,
      functionName,
      fileName,
      columns,
      sourceCode,
      registryUpdateCode,
      dependsOn: contract.dependsOn,
    };
  }

  /**
   * Scaffold generators for all uncovered tables.
   */
  scaffoldAll(targetTables?: string[]): GeneratorScaffold[] {
    const plan = this.analyzer.getGenerationPlan(targetTables);
    const scaffolds: GeneratorScaffold[] = [];

    for (const step of plan.steps) {
      if (step.action === 'CREATE_GENERATOR') {
        const scaffold = this.scaffoldGenerator(step.qualifiedName);
        if (scaffold) scaffolds.push(scaffold);
      }
    }

    return scaffolds;
  }

  /**
   * Validate a scaffold against its contract.
   * Checks: all DD columns covered, FK columns use valid patterns, no forbidden patterns.
   */
  validateScaffold(scaffold: GeneratorScaffold): { valid: boolean; issues: string[] } {
    const contract = this.analyzer.getContract(scaffold.qualifiedName);
    if (!contract) return { valid: false, issues: ['Table not found in DD'] };

    const issues: string[] = [];

    // Check all DD columns are represented
    const scaffoldCols = new Set(scaffold.columns.map(c => c.columnName));
    for (const col of contract.columns) {
      if (!scaffoldCols.has(col.name)) {
        issues.push(`Missing column: ${col.name}`);
      }
    }

    // Check FK columns have FK_LOOKUP or FROM_STATE strategy
    for (const col of scaffold.columns) {
      const contractCol = contract.columns.find(c => c.name === col.columnName);
      if (contractCol?.fkTarget && col.strategy !== 'FK_LOOKUP' && col.strategy !== 'FROM_STATE') {
        issues.push(`FK column ${col.columnName} should use FK_LOOKUP or FROM_STATE strategy, got ${col.strategy}`);
      }
    }

    // Check no forbidden patterns (SUM of dates, etc.)
    if (scaffold.sourceCode.includes('SUM(') && scaffold.sourceCode.includes('_date')) {
      issues.push('Potential SUM of date column detected — use MIN() or MAX() instead');
    }

    return { valid: issues.length === 0, issues };
  }

  /* ────────────────── Column Strategy Builder ────────────────── */

  private buildColumnStrategies(contract: SchemaContract): ColumnGenerationStrategy[] {
    return contract.columns.map(col => this.buildColumnStrategy(col, contract));
  }

  private buildColumnStrategy(col: ColumnContract, contract: SchemaContract): ColumnGenerationStrategy {
    const base: ColumnGenerationStrategy = {
      columnName: col.name,
      dataType: col.dataType,
      strategy: 'FROM_STATE', // default
    };

    // PK columns that need ID allocation
    if (col.isPK && col.dataType === 'BIGINT' && !col.fkTarget && col.name !== 'as_of_date') {
      return { ...base, strategy: 'ID_REGISTRY' };
    }

    // FK columns → look up from parent table
    if (col.fkTarget) {
      return {
        ...base,
        strategy: 'FK_LOOKUP',
        fkSource: { table: col.fkTarget.parentTable, column: col.fkTarget.parentColumn },
      };
    }

    // Date columns in temporal tables
    if (col.name === 'as_of_date') {
      return { ...base, strategy: 'DATE_GRID' };
    }

    // Boolean flags
    if (col.name.endsWith('_flag')) {
      return { ...base, strategy: 'BOOLEAN_FLAG' };
    }

    // Code columns → enum from dim table
    if (col.name.endsWith('_code') && !col.isPK) {
      return { ...base, strategy: 'DIM_ENUM' };
    }

    // Timestamp columns → constant
    if (col.name.endsWith('_ts')) {
      return { ...base, strategy: 'CONSTANT', constantValue: 'CURRENT_TIMESTAMP' };
    }

    // Numeric with GSIB range
    if (col.gsibRange) {
      return { ...base, strategy: 'GSIB_RANGE', range: col.gsibRange };
    }

    // Map common field names to FacilityState fields
    const stateMapping = this.mapToStateField(col.name);
    if (stateMapping) {
      return { ...base, strategy: 'FROM_STATE', stateField: stateMapping };
    }

    return base;
  }

  /**
   * Map a column name to a FacilityState field.
   */
  private mapToStateField(columnName: string): string | null {
    const mappings: Record<string, string> = {
      'facility_id': 'facility_id',
      'counterparty_id': 'counterparty_id',
      'currency_code': 'currency_code',
      'drawn_amount': 'drawn_amount',
      'committed_amount': 'committed_amount',
      'undrawn_amount': 'undrawn_amount',
      'pd_pct': 'pd_annual',
      'lgd_pct': 'lgd_current',
      'internal_risk_rating': 'internal_rating',
      'credit_status': 'credit_status',
      'days_past_due': 'days_past_due',
      'dpd_bucket_code': 'dpd_bucket',
      'spread_bps': 'spread_bps',
      'interest_rate_spread_bps': 'spread_bps',
      'collateral_value': 'collateral_value',
      'utilization_pct': 'utilization',
    };

    return mappings[columnName] ?? null;
  }

  /* ────────────────── Source Code Generation ────────────────── */

  private generateSourceCode(
    contract: SchemaContract,
    columns: ColumnGenerationStrategy[],
    functionName: string,
  ): string {
    const tableName = contract.tableName;
    const isSnapshot = contract.classification === 'L2_SNAPSHOT';
    const isEvent = contract.classification === 'L2_EVENT';

    const lines: string[] = [
      `/**`,
      ` * Generator: ${contract.qualifiedName}`,
      ` * Classification: ${contract.classification}`,
      ` * Columns: ${columns.length}`,
      ` * Auto-scaffolded by GeneratorBuilder — review before use.`,
      ` */`,
      `import type { FacilityStateMap, SqlRow } from '../types';`,
      `import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';`,
      `import type { IDRegistry } from '../../id-registry';`,
      `import { round } from '../prng';`,
      ``,
    ];

    // Function signature
    lines.push(`export function ${functionName}(`);
    lines.push(`  stateMap: FacilityStateMap,`);
    lines.push(`  facilityIds: number[],`);
    lines.push(`  dates: string[],`);
    lines.push(`  registry: IDRegistry,`);
    lines.push(`): SqlRow[] {`);
    lines.push(`  const rows: SqlRow[] = [];`);
    lines.push(``);

    if (isSnapshot) {
      lines.push(`  for (const date of dates) {`);
      lines.push(`    for (const facId of facilityIds) {`);
      lines.push(`      const state = stateMap.get(stateKey(facId, date));`);
      lines.push(`      if (!state) continue;`);
      lines.push(``);

      // Build row object
      lines.push(`      rows.push({`);
      for (const col of columns) {
        const value = this.columnValueExpression(col, contract);
        lines.push(`        ${col.columnName}: ${value},`);
      }
      lines.push(`      });`);
      lines.push(`    }`);
      lines.push(`  }`);
    } else if (isEvent) {
      lines.push(`  // Event tables: generate events based on state transitions`);
      lines.push(`  for (const date of dates) {`);
      lines.push(`    for (const facId of facilityIds) {`);
      lines.push(`      const state = stateMap.get(stateKey(facId, date));`);
      lines.push(`      if (!state) continue;`);
      lines.push(``);
      lines.push(`      // TODO: Add event trigger logic based on state changes`);
      lines.push(`      // Example: if (state._events?.length) { ... }`);
      lines.push(`    }`);
      lines.push(`  }`);
    } else {
      lines.push(`  // Static or junction table — generate once`);
      lines.push(`  // TODO: Implement generation logic`);
    }

    lines.push(``);
    lines.push(`  return rows;`);
    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate the value expression for a column in the row object literal.
   */
  private columnValueExpression(col: ColumnGenerationStrategy, contract: SchemaContract): string {
    switch (col.strategy) {
      case 'ID_REGISTRY':
        return `registry.allocate('${contract.tableName}', 1)[0]`;
      case 'DATE_GRID':
        return 'date';
      case 'FK_LOOKUP':
        if (col.columnName === 'facility_id') return 'state.facility_id';
        if (col.columnName === 'counterparty_id') return 'state.counterparty_id';
        return `state.${col.columnName} /* FK: ${col.fkSource?.table}.${col.fkSource?.column} */`;
      case 'FROM_STATE':
        if (col.stateField) return `state.${col.stateField}`;
        return `state.${col.columnName} ?? null /* TODO: map to state field */`;
      case 'GSIB_RANGE':
        if (col.range) {
          return `round(${col.range.min} + Math.random() * ${col.range.max - col.range.min}, 4)`;
        }
        return 'null';
      case 'BOOLEAN_FLAG':
        return `'N' /* TODO: derive from state */`;
      case 'DIM_ENUM':
        return `null /* TODO: look up valid codes from dim table */`;
      case 'CONSTANT':
        if (col.constantValue === 'CURRENT_TIMESTAMP') return `new Date().toISOString()`;
        return `${JSON.stringify(col.constantValue)}`;
      case 'DERIVED':
        return `null /* TODO: derive from other columns */`;
      default:
        return 'null';
    }
  }

  /* ────────────────── Registry Update ────────────────── */

  private generateRegistryUpdate(
    contract: SchemaContract,
    functionName: string,
    fileName: string,
  ): string {
    const genName = fileName.replace('.ts', '');
    const deps = contract.dependsOn
      .map(d => `'${d}'`)
      .join(', ');

    return [
      `// Add to generators/index.ts:`,
      `import { ${functionName} } from './${genName}';`,
      ``,
      `// Add to GENERATOR_REGISTRY:`,
      `{ name: '${genName}', dependsOn: [${deps}] },`,
      ``,
      `// Add to generateV2Data() Step N:`,
      `const ${genName.replace(/-/g, '_')}Rows = ${functionName}(stateMap, facilityIds, dates, registry);`,
      `tables.push({ schema: '${contract.schema}', table: '${contract.tableName}', rows: ${genName.replace(/-/g, '_')}Rows });`,
    ].join('\n');
  }

  /* ────────────────── Naming Helpers ────────────────── */

  private toFunctionName(tableName: string): string {
    // facility_risk_snapshot → generateFacilityRiskSnapshotRows
    const camel = tableName
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
    return `generate${camel}Rows`;
  }

  private toFileName(tableName: string): string {
    // facility_risk_snapshot → facility-risk-snapshot.ts
    return tableName.replace(/_/g, '-') + '.ts';
  }
}
