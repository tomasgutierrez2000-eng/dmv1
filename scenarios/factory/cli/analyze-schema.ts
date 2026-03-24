#!/usr/bin/env npx tsx
/**
 * CLI entry point for Schema Analyzer.
 *
 * Usage:
 *   npx tsx scenarios/factory/cli/analyze-schema.ts                    # Full analysis
 *   npx tsx scenarios/factory/cli/analyze-schema.ts --coverage         # Coverage report only
 *   npx tsx scenarios/factory/cli/analyze-schema.ts --dag              # FK dependency DAG
 *   npx tsx scenarios/factory/cli/analyze-schema.ts --contract l2.facility_risk_snapshot  # Single table contract
 *   npx tsx scenarios/factory/cli/analyze-schema.ts --plan             # Generation plan
 *   npx tsx scenarios/factory/cli/analyze-schema.ts --plan --layer L2  # L2-only generation plan
 */

import { SchemaAnalyzer } from '../schema-analyzer';

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? '--coverage';

  try {
    const analyzer = SchemaAnalyzer.create();

    if (mode === '--coverage') {
      const coverage = analyzer.analyzeCoverage();
      console.log(JSON.stringify({
        mode: 'coverage',
        summary: {
          totalTables: coverage.totalTables,
          tablesWithGenerators: coverage.tablesWithGenerators,
          tablesInLoadOrder: coverage.tablesInLoadOrder,
          l3Tables: coverage.l3Tables,
          uncoveredL1Count: coverage.uncoveredL1.length,
          uncoveredL2Count: coverage.uncoveredL2.length,
        },
        uncoveredL2: coverage.uncoveredL2.map(t => ({
          name: t.qualifiedName,
          classification: t.classification,
          columns: t.columnCount,
        })),
        uncoveredL1: coverage.uncoveredL1.map(t => ({
          name: t.qualifiedName,
          classification: t.classification,
          columns: t.columnCount,
        })),
      }, null, 2));

    } else if (mode === '--dag') {
      const dag = analyzer.buildFKDependencyDAG();
      console.log(JSON.stringify({
        mode: 'fk_dependency_dag',
        totalNodes: dag.nodes.size,
        roots: dag.roots.length,
        leaves: dag.leaves.length,
        sortedOrder: dag.sortedOrder,
        // Show first 20 nodes with their parents
        sample: dag.sortedOrder.slice(0, 20).map(name => {
          const node = dag.nodes.get(name)!;
          return {
            table: name,
            parents: node.parents,
            children: node.children.slice(0, 5),
            topoOrder: node.topoOrder,
          };
        }),
      }, null, 2));

    } else if (mode === '--contract') {
      const tableName = args[1];
      if (!tableName) {
        console.error('Usage: --contract <qualified_table_name>');
        process.exit(1);
      }
      const contract = analyzer.getContract(tableName);
      if (!contract) {
        console.error(`Table '${tableName}' not found in data dictionary`);
        process.exit(1);
      }
      console.log(JSON.stringify({
        mode: 'contract',
        contract: {
          ...contract,
          columns: contract.columns.map(c => ({
            name: c.name,
            dataType: c.dataType,
            isPK: c.isPK,
            nullable: c.nullable,
            fkTarget: c.fkTarget ?? null,
            gsibRange: c.gsibRange ?? null,
            correlationGroup: c.correlationGroup ?? null,
            generationHint: c.generationHint,
          })),
        },
      }, null, 2));

    } else if (mode === '--plan') {
      const layerFilter = args.includes('--layer')
        ? args[args.indexOf('--layer') + 1]
        : undefined;

      let targetTables: string[] | undefined;
      if (layerFilter) {
        targetTables = analyzer.getTablesByLayer(layerFilter as 'L1' | 'L2' | 'L3');
      }

      const plan = analyzer.getGenerationPlan(targetTables);
      console.log(JSON.stringify({
        mode: 'generation_plan',
        summary: plan.summary,
        steps: plan.steps.map(s => ({
          table: s.qualifiedName,
          action: s.action,
          classification: s.classification,
          estimatedRows: s.estimatedRowsPerDate,
          mustGenerateAfter: s.mustGenerateAfter,
          reason: s.reason,
        })),
      }, null, 2));

    } else {
      console.error(`Unknown mode: ${mode}`);
      console.error('Valid modes: --coverage, --dag, --contract <table>, --plan [--layer L1|L2|L3]');
      process.exit(1);
    }
  } catch (err) {
    console.error('Schema Analyzer error:', (err as Error).message);
    process.exit(1);
  }
}

main();
