#!/usr/bin/env npx tsx
/**
 * CLI entry point for Generator Builder.
 *
 * Usage:
 *   npx tsx scenarios/factory/cli/build-generator.ts --table l2.legal_entity
 *   npx tsx scenarios/factory/cli/build-generator.ts --all              # Scaffold all uncovered
 *   npx tsx scenarios/factory/cli/build-generator.ts --validate l2.legal_entity  # Validate existing
 */

import { GeneratorBuilder } from '../generator-builder';

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? '--help';

  try {
    const builder = new GeneratorBuilder();

    if (mode === '--table') {
      const tableName = args[1];
      if (!tableName) {
        console.error('Usage: --table <qualified_table_name>');
        process.exit(1);
      }

      const scaffold = builder.scaffoldGenerator(tableName);
      if (!scaffold) {
        console.error(`Table '${tableName}' not found in data dictionary`);
        process.exit(1);
      }

      // Validate the scaffold
      const validation = builder.validateScaffold(scaffold);

      console.log(JSON.stringify({
        mode: 'scaffold',
        table: scaffold.qualifiedName,
        functionName: scaffold.functionName,
        fileName: scaffold.fileName,
        columns: scaffold.columns.length,
        columnStrategies: scaffold.columns.map(c => ({
          name: c.columnName,
          type: c.dataType,
          strategy: c.strategy,
          fkSource: c.fkSource ?? null,
          range: c.range ?? null,
          stateField: c.stateField ?? null,
        })),
        validation: {
          valid: validation.valid,
          issues: validation.issues,
        },
        dependsOn: scaffold.dependsOn,
      }, null, 2));

      // Also output the generated source code to stderr for review
      console.error('\n=== Generated Source Code ===\n');
      console.error(scaffold.sourceCode);
      console.error('\n=== Registry Update ===\n');
      console.error(scaffold.registryUpdateCode);

    } else if (mode === '--all') {
      const scaffolds = builder.scaffoldAll();
      console.log(JSON.stringify({
        mode: 'scaffold_all',
        count: scaffolds.length,
        scaffolds: scaffolds.map(s => ({
          table: s.qualifiedName,
          functionName: s.functionName,
          fileName: s.fileName,
          columns: s.columns.length,
          dependsOn: s.dependsOn,
        })),
      }, null, 2));

    } else {
      console.error('Usage:');
      console.error('  --table <name>   Scaffold generator for one table');
      console.error('  --all            Scaffold all uncovered tables');
      process.exit(1);
    }
  } catch (err) {
    console.error('Generator Builder error:', (err as Error).message);
    process.exit(1);
  }
}

main();
