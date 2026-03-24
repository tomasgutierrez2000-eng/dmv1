#!/usr/bin/env npx tsx
/**
 * CLI entry point for Strategy Advisor.
 *
 * Usage:
 *   npx tsx scenarios/factory/cli/advise-strategy.ts --request "generate 2026-03-31"
 *   npx tsx scenarios/factory/cli/advise-strategy.ts --dates 2026-03-31,2026-04-30
 *   npx tsx scenarios/factory/cli/advise-strategy.ts --scenario S57
 *   npx tsx scenarios/factory/cli/advise-strategy.ts --strategy FRESH_START
 */

import { StrategyAdvisor, type StrategyRequest } from '../strategy-advisor';
import { SchemaAnalyzer } from '../schema-analyzer';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const request: StrategyRequest = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dates':
        request.targetDates = args[++i]?.split(',').map(d => d.trim());
        break;
      case '--request': {
        // Parse natural language: "generate 2026-03-31" → targetDates
        const text = args[++i] ?? '';
        const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/g);
        if (dateMatch) request.targetDates = dateMatch;
        break;
      }
      case '--scenario':
        request.scenarioId = args[++i];
        break;
      case '--strategy':
        request.forceStrategy = args[++i] as any;
        break;
      case '--tables':
        request.tables = args[++i]?.split(',').map(t => t.trim());
        break;
    }
  }

  try {
    const analyzer = SchemaAnalyzer.create();
    const advisor = new StrategyAdvisor(analyzer);

    // Assess current state
    console.error('Assessing database state...');
    const currentState = await advisor.assessCurrentState();

    // Get coverage report
    const coverage = analyzer.analyzeCoverage();

    // Decide strategy
    const decision = advisor.decideStrategy(request, currentState, coverage);

    // Build execution plan
    const generationPlan = analyzer.getGenerationPlan(decision.tablesToGenerate);
    const executionPlan = advisor.buildExecutionPlan(decision, generationPlan);

    console.log(JSON.stringify({
      dbState: {
        connected: currentState.connected,
        totalRows: currentState.totalRows,
        dateRange: currentState.connected
          ? `${currentState.overallMinDate} → ${currentState.overallMaxDate}`
          : 'N/A (not connected)',
        tablesWithData: currentState.tables.filter(t => t.rowCount > 0).length,
      },
      decision: {
        strategy: decision.strategy,
        rationale: decision.rationale,
        targetDates: decision.targetDates,
        tablesToGenerate: decision.tablesToGenerate.length,
        estimatedRows: decision.estimatedRows,
        requiresConfirmation: decision.requiresConfirmation,
        confirmationReason: decision.confirmationReason ?? null,
      },
      executionPlan: {
        totalSteps: executionPlan.steps.length,
        steps: executionPlan.steps.map(s => ({
          step: s.step,
          action: s.action,
          tables: s.tables.length,
          estimatedRows: s.estimatedRows,
          description: s.description,
        })),
      },
    }, null, 2));
  } catch (err) {
    console.error('Strategy Advisor error:', (err as Error).message);
    process.exit(1);
  }
}

main();
