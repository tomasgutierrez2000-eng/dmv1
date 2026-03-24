/**
 * Strategy Advisor — decides the optimal approach for data generation.
 *
 * Given a user request ("generate data for 2026-03-31") and the current DB state,
 * decides: EXTEND_TEMPORAL, FRESH_START, PATCH, or SCENARIO_APPEND.
 *
 * Queries PostgreSQL for existing data coverage (row counts, date ranges).
 * Falls back to estimation-only mode if DATABASE_URL is not available.
 */

import { loadEnv } from './load-env';
import { SchemaAnalyzer } from './schema-analyzer';
import type { CoverageReport, GenerationPlan } from './schema-contracts';
import type {
  GenerationStrategy,
  StrategyDecision,
  CurrentDBState,
  TableState,
  ExecutionPlan,
  ExecutionStep,
} from './strategy-types';

/* ────────────────── Strategy Advisor ────────────────── */

export class StrategyAdvisor {
  private analyzer: SchemaAnalyzer;

  constructor(analyzer?: SchemaAnalyzer) {
    this.analyzer = analyzer ?? SchemaAnalyzer.create();
  }

  /**
   * Assess the current state of the database.
   * Returns row counts and date ranges per table.
   */
  async assessCurrentState(tables?: string[]): Promise<CurrentDBState> {
    loadEnv();
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      return {
        connected: false,
        tables: [],
        overallMinDate: null,
        overallMaxDate: null,
        totalRows: 0,
      };
    }

    let client: any = null;
    try {
      // Dynamic import pg to avoid hard dependency
      const pg = await import('pg');
      const Client = (pg as any).default?.Client ?? (pg as any).Client;
      client = new Client({ connectionString: dbUrl });
      await client.connect();

      const targetTables = tables ?? this.analyzer.getTablesByLayer('L2');
      const tableStates: TableState[] = [];
      let totalRows = 0;
      let overallMin: string | null = null;
      let overallMax: string | null = null;

      for (const qualifiedName of targetTables) {
        const [schema, tableName] = qualifiedName.split('.');
        // Sanitize identifiers — PG doesn't support parameterized table names
        if (!/^[a-z][a-z0-9_]*$/.test(schema) || !/^[a-z][a-z0-9_]*$/.test(tableName)) continue;
        try {
          // Check if table has as_of_date column
          const hasDateCol = await client.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = $1 AND table_name = $2 AND column_name = 'as_of_date'`,
            [schema, tableName],
          );

          let rowCount = 0;
          let minDate: string | null = null;
          let maxDate: string | null = null;
          let distinctDates = 0;

          // Get row count
          const countResult = await client.query(
            `SELECT COUNT(*) as n FROM ${schema}.${tableName}`,
          );
          rowCount = parseInt(countResult.rows[0]?.n ?? '0', 10);
          totalRows += rowCount;

          // Get date range if temporal
          if (hasDateCol.rows.length > 0 && rowCount > 0) {
            const dateResult = await client.query(
              `SELECT MIN(as_of_date)::text as min_d, MAX(as_of_date)::text as max_d,
                      COUNT(DISTINCT as_of_date) as n_dates
               FROM ${schema}.${tableName}`,
            );
            minDate = dateResult.rows[0]?.min_d ?? null;
            maxDate = dateResult.rows[0]?.max_d ?? null;
            distinctDates = parseInt(dateResult.rows[0]?.n_dates ?? '0', 10);

            if (minDate && (!overallMin || minDate < overallMin)) overallMin = minDate;
            if (maxDate && (!overallMax || maxDate > overallMax)) overallMax = maxDate;
          }

          tableStates.push({ qualifiedName, rowCount, minDate, maxDate, distinctDates });
        } catch {
          // Table might not exist in PG — skip
          tableStates.push({ qualifiedName, rowCount: 0, minDate: null, maxDate: null, distinctDates: 0 });
        }
      }

      await client.end();

      return {
        connected: true,
        tables: tableStates,
        overallMinDate: overallMin,
        overallMaxDate: overallMax,
        totalRows,
      };
    } catch {
      return {
        connected: false,
        tables: [],
        overallMinDate: null,
        overallMaxDate: null,
        totalRows: 0,
      };
    } finally {
      if (client) {
        try { await client.end(); } catch { /* already closed */ }
      }
    }
  }

  /**
   * Decide the generation strategy based on the user request and current state.
   */
  decideStrategy(
    request: StrategyRequest,
    currentState: CurrentDBState,
    coverageReport: CoverageReport,
  ): StrategyDecision {
    // If user explicitly requests a strategy, honor it
    if (request.forceStrategy) {
      return this.buildDecision(request.forceStrategy, request, currentState, coverageReport);
    }

    // Decision logic
    if (request.scenarioId) {
      // Explicit scenario request → SCENARIO_APPEND
      return this.buildDecision('SCENARIO_APPEND', request, currentState, coverageReport);
    }

    if (!currentState.connected) {
      // No DB connection → FRESH_START (generate SQL file)
      return this.buildDecision('FRESH_START', request, currentState, coverageReport);
    }

    if (currentState.totalRows === 0) {
      // Empty database → FRESH_START
      return this.buildDecision('FRESH_START', request, currentState, coverageReport);
    }

    if (request.targetDates && request.targetDates.length > 0) {
      // Check if all target dates already exist
      const existingMaxDate = currentState.overallMaxDate;
      const allDatesExist = existingMaxDate && request.targetDates.every(d => d <= existingMaxDate);

      if (allDatesExist) {
        // Dates already covered — PATCH (fill gaps in specific tables)
        return this.buildDecision('PATCH', request, currentState, coverageReport);
      }

      // New dates requested → EXTEND_TEMPORAL
      return this.buildDecision('EXTEND_TEMPORAL', request, currentState, coverageReport);
    }

    // Default: EXTEND_TEMPORAL with next month
    return this.buildDecision('EXTEND_TEMPORAL', request, currentState, coverageReport);
  }

  /**
   * Build the full execution plan from a strategy decision.
   */
  buildExecutionPlan(decision: StrategyDecision, generationPlan: GenerationPlan): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    let stepNum = 1;

    // Step 1: Cleanup (if FRESH_START)
    if (decision.cleanupSQL) {
      steps.push({
        step: stepNum++,
        action: 'CLEANUP',
        tables: [],
        estimatedRows: 0,
        description: 'Run cleanup SQL to prepare for fresh generation',
      });
    }

    // Step 2: Create missing generators
    const needGenerators = generationPlan.steps.filter(s => s.action === 'CREATE_GENERATOR');
    if (needGenerators.length > 0) {
      steps.push({
        step: stepNum++,
        action: 'CREATE_GENERATOR',
        tables: needGenerators.map(s => s.qualifiedName),
        estimatedRows: 0,
        description: `Create ${needGenerators.length} new generators for uncovered tables`,
      });
    }

    // Step 3: Generate L1 data (if needed)
    const l1Steps = generationPlan.steps.filter(
      s => s.contract.layer === 'L1' && s.action !== 'SKIP_L3',
    );
    if (l1Steps.length > 0) {
      steps.push({
        step: stepNum++,
        action: 'GENERATE_L1',
        tables: l1Steps.map(s => s.qualifiedName),
        estimatedRows: l1Steps.reduce((sum, s) => sum + s.estimatedRowsPerDate, 0),
        description: `Generate L1 reference data for ${l1Steps.length} tables`,
      });
    }

    // Step 4: Generate L2 data
    const l2Steps = generationPlan.steps.filter(
      s => s.contract.layer === 'L2' && s.action !== 'SKIP_L3',
    );
    if (l2Steps.length > 0) {
      const rowsPerDate = l2Steps.reduce((sum, s) => sum + s.estimatedRowsPerDate, 0);
      const totalRows = rowsPerDate * decision.targetDates.length;
      steps.push({
        step: stepNum++,
        action: 'GENERATE_L2',
        tables: l2Steps.map(s => s.qualifiedName),
        estimatedRows: totalRows,
        description: `Generate L2 time-series data for ${l2Steps.length} tables × ${decision.targetDates.length} dates`,
      });
    }

    // Step 5: Validate
    steps.push({
      step: stepNum++,
      action: 'VALIDATE',
      tables: [],
      estimatedRows: 0,
      description: 'Run pre-flight validation (30+ checks)',
    });

    // Step 6: Load
    steps.push({
      step: stepNum++,
      action: 'LOAD',
      tables: decision.tablesToGenerate,
      estimatedRows: decision.estimatedRows,
      description: `Load data into PostgreSQL (${decision.estimatedRows.toLocaleString()} rows)`,
    });

    return {
      strategy: decision,
      steps,
      totalEstimatedRows: decision.estimatedRows,
      totalTables: decision.tablesToGenerate.length,
    };
  }

  /* ────────────────── Private Helpers ────────────────── */

  private buildDecision(
    strategy: GenerationStrategy,
    request: StrategyRequest,
    state: CurrentDBState,
    coverage: CoverageReport,
  ): StrategyDecision {
    const targetDates = request.targetDates ?? [this.getNextMonthEnd(state.overallMaxDate)];
    const tablesToGenerate = this.getTargetTables(request, coverage);
    const estimatedRows = this.estimateRows(tablesToGenerate, targetDates.length, strategy);

    let cleanupSQL: string | null = null;
    let requiresConfirmation = false;
    let confirmationReason: string | undefined;
    let rationale: string;

    switch (strategy) {
      case 'EXTEND_TEMPORAL':
        rationale = `Existing data through ${state.overallMaxDate ?? 'unknown'}. Adding ${targetDates.length} new date(s): ${targetDates.join(', ')}`;
        break;
      case 'FRESH_START':
        rationale = state.connected
          ? 'Empty database or schema changes require full regeneration'
          : 'No database connection — generating SQL file for manual load';
        if (state.totalRows > 0) {
          requiresConfirmation = true;
          confirmationReason = `FRESH_START will regenerate all data. Current DB has ${state.totalRows.toLocaleString()} rows.`;
          cleanupSQL = [...tablesToGenerate]
            .reverse()
            .map(t => `TRUNCATE ${t} CASCADE;`)
            .join('\n');
        }
        break;
      case 'PATCH':
        rationale = `Filling gaps in existing data for dates: ${targetDates.join(', ')}`;
        break;
      case 'SCENARIO_APPEND':
        rationale = `Appending scenario ${request.scenarioId} with isolated ID ranges`;
        break;
    }

    if (estimatedRows > 50000) {
      requiresConfirmation = true;
      confirmationReason = (confirmationReason ?? '') +
        ` Estimated ${estimatedRows.toLocaleString()} rows to generate.`;
    }

    return {
      strategy,
      rationale,
      targetDates,
      tablesToGenerate,
      cleanupSQL,
      requiresConfirmation,
      confirmationReason,
      estimatedRows,
    };
  }

  private getTargetTables(request: StrategyRequest, coverage: CoverageReport): string[] {
    if (request.tables) return request.tables;

    // Default: all L1 + L2 tables that are in LOAD_ORDER or have generators
    return coverage.allTables
      .filter(t => t.layer !== 'L3' && (t.hasGenerator || t.inLoadOrder))
      .map(t => t.qualifiedName);
  }

  private estimateRows(tables: string[], dateCount: number, strategy: GenerationStrategy): number {
    const facilityCount = 410; // default
    const tablesWithTimeSeries = tables.filter(t =>
      t.includes('snapshot') || t.includes('observation') || t === 'l2.fx_rate',
    ).length;
    const eventTables = tables.filter(t =>
      t.includes('event') || t.includes('flag'),
    ).length;
    const staticTables = tables.length - tablesWithTimeSeries - eventTables;

    const timeSeriesRows = tablesWithTimeSeries * facilityCount * dateCount;
    const eventRows = eventTables * 50 * dateCount;
    const staticRows = staticTables * 100;

    return timeSeriesRows + eventRows + staticRows;
  }

  private getNextMonthEnd(currentMaxDate: string | null): string {
    if (!currentMaxDate) {
      // Default to end of current month (UTC-safe)
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth(); // 0-based
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      return lastDay.toISOString().split('T')[0];
    }

    // Parse current max and add one month (UTC-safe)
    const [y, m] = currentMaxDate.split('-').map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0));
    return lastDay.toISOString().split('T')[0];
  }
}

/* ────────────────── Request Types ────────────────── */

export interface StrategyRequest {
  /** Target dates to generate (e.g., ["2026-03-31"]) */
  targetDates?: string[];
  /** Specific tables to generate (qualified names) */
  tables?: string[];
  /** Scenario ID if adding a new scenario */
  scenarioId?: string;
  /** Force a specific strategy */
  forceStrategy?: GenerationStrategy;
  /** Whether this is a backfill request */
  backfill?: boolean;
}
