#!/usr/bin/env tsx
/**
 * GSIB Calculation Engine — CLI Entry Point
 *
 * Usage:
 *   npx tsx scripts/calc_engine/cli.ts <command> [options]
 *
 * Commands:
 *   run       Execute metric calculations
 *   validate  Run validation checks on existing results
 *   audit     Query audit trail
 *   inspect   Inspect a metric definition
 *   list      List available metrics
 *   dag       Display dependency graph
 */

import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { run } from './engine/runner';
import { loadMetricDefinitions } from './loader';
import { buildExecutionPlan, formatExecutionPlanAscii, formatExecutionPlanDot } from './engine/dag';
import { loadEngineConfig } from './config/engine-config';
import type { AggregationLevel } from './types';

yargs(hideBin(process.argv))
  // ── run ──────────────────────────────────────────────────
  .command(
    'run',
    'Execute metric calculations',
    (y) =>
      y
        .option('as-of-date', {
          alias: 'd',
          type: 'string',
          describe: 'Reporting date (YYYY-MM-DD)',
          demandOption: true,
        })
        .option('prior-date', {
          type: 'string',
          describe: 'Prior period date (default: as_of_date - 1 month)',
        })
        .option('base-currency', {
          type: 'string',
          describe: 'Base currency code',
          default: 'USD',
        })
        .option('run-version', {
          type: 'string',
          describe: 'Run version ID (default: auto-generated)',
        })
        .option('metrics', {
          alias: 'm',
          type: 'array',
          string: true,
          describe: 'Specific metric IDs to run',
        })
        .option('domain', {
          type: 'array',
          string: true,
          describe: 'Filter by domain',
        })
        .option('levels', {
          alias: 'l',
          type: 'array',
          string: true,
          describe: 'Specific levels to run',
        })
        .option('parallel', {
          alias: 'p',
          type: 'number',
          describe: 'Max parallel metrics per batch',
          default: 5,
        })
        .option('timeout', {
          type: 'number',
          describe: 'Per-metric SQL timeout in ms',
          default: 30000,
        })
        .option('dry-run', {
          type: 'boolean',
          describe: 'Parse and plan only, do not execute SQL',
          default: false,
        })
        .option('include-draft', {
          type: 'boolean',
          describe: 'Include DRAFT status metrics',
          default: false,
        })
        .option('skip-validation', {
          type: 'boolean',
          describe: 'Skip post-calculation validation checks',
          default: false,
        })
        .option('skip-reconciliation', {
          type: 'boolean',
          describe: 'Skip cross-metric reconciliation',
          default: false,
        })
        .option('verbose', {
          alias: 'v',
          type: 'boolean',
          describe: 'Detailed logging',
          default: false,
        }),
    async (argv) => {
      const config = loadEngineConfig({
        poolSize: argv.parallel,
        statementTimeoutMs: argv.timeout,
        dryRun: argv.dryRun,
        verbose: argv.verbose,
      });

      console.log(`\n  GSIB Calculation Engine`);
      console.log(`  ═══════════════════════════════════════════`);

      const summary = await run({
        asOfDate: argv.asOfDate,
        priorAsOfDate: argv.priorDate,
        baseCurrency: argv.baseCurrency,
        runVersionId: argv.runVersion,
        metricIds: argv.metrics,
        domains: argv.domain,
        levels: argv.levels as AggregationLevel[] | undefined,
        parallel: argv.parallel,
        includeDraft: argv.includeDraft,
        skipValidation: argv.skipValidation,
        skipReconciliation: argv.skipReconciliation,
        config,
        cliArgs: process.argv.slice(2).join(' '),
      });

      process.exit(
        summary.metricsFailed > 0 ? 2 : summary.validationSummary.failed > 0 ? 1 : 0
      );
    }
  )

  // ── validate ─────────────────────────────────────────────
  .command(
    'validate',
    'Validate metric formulas against PostgreSQL (or post-calc results with --run-id)',
    (y) =>
      y
        .option('run-id', {
          type: 'string',
          describe: 'Run ID to validate post-calc results (omit for formula validation)',
        })
        .option('metrics', {
          alias: 'm',
          type: 'array',
          string: true,
          describe: 'Specific metric IDs to validate',
        })
        .option('domain', {
          type: 'array',
          string: true,
          describe: 'Filter by domain',
        })
        .option('levels', {
          alias: 'l',
          type: 'array',
          string: true,
          describe: 'Specific levels to validate',
        })
        .option('as-of-date', {
          alias: 'd',
          type: 'string',
          describe: 'Reporting date (YYYY-MM-DD)',
          default: '2025-01-31',
        })
        .option('include-draft', {
          type: 'boolean',
          describe: 'Include DRAFT status metrics',
          default: false,
        })
        .option('severity', {
          type: 'string',
          describe: 'Minimum severity to report (for --run-id mode)',
          choices: ['ERROR', 'WARNING', 'INFO'],
          default: 'WARNING',
        })
        .option('verbose', {
          alias: 'v',
          type: 'boolean',
          describe: 'Detailed logging',
          default: false,
        }),
    async (argv) => {
      if (argv.runId) {
        // Post-calc validation mode (existing run)
        console.log(`\n  Validate command — run-id: ${argv.runId}`);
        console.log(`  (Post-calc validation requires a completed run — use 'run' command first)`);
        return;
      }

      // Formula validation mode
      console.log(`\n  GSIB Formula Validator`);
      console.log(`  ═══════════════════════════════════════════`);
      console.log(`  as_of_date: ${argv.asOfDate}`);

      const { validateFormulas, printValidationSummary } = await import(
        './engine/formula-validator'
      );

      const summary = await validateFormulas({
        metricIds: argv.metrics,
        domains: argv.domain,
        levels: argv.levels as AggregationLevel[] | undefined,
        asOfDate: argv.asOfDate,
        includeDraft: argv.includeDraft,
        verbose: argv.verbose,
      });

      printValidationSummary(summary);

      // Exit code: 2 if FAIL, 1 if WARN, 0 if PASS
      process.exit(summary.failed > 0 ? 2 : summary.warned > 0 ? 1 : 0);
    }
  )

  // ── promote ─────────────────────────────────────────────
  .command(
    'promote',
    'Promote a metric from DRAFT to ACTIVE (or demote with --demote)',
    (y) =>
      y
        .option('metric-id', {
          alias: 'm',
          type: 'string',
          describe: 'Metric ID to promote',
          demandOption: true,
        })
        .option('as-of-date', {
          alias: 'd',
          type: 'string',
          describe: 'Reporting date for validation (YYYY-MM-DD)',
          default: '2025-01-31',
        })
        .option('dry-run', {
          type: 'boolean',
          describe: 'Check eligibility without applying changes',
          default: false,
        })
        .option('demote', {
          type: 'boolean',
          describe: 'Demote from ACTIVE to DRAFT',
          default: false,
        })
        .option('verbose', {
          alias: 'v',
          type: 'boolean',
          describe: 'Detailed logging',
          default: false,
        }),
    async (argv) => {
      console.log(`\n  GSIB Metric Promoter`);
      console.log(`  ═══════════════════════════════════════════`);

      const { promoteMetric, printPromotionResult } = await import(
        './engine/promoter'
      );

      const result = await promoteMetric({
        metricId: argv.metricId,
        asOfDate: argv.asOfDate,
        dryRun: argv.dryRun,
        demote: argv.demote,
        verbose: argv.verbose,
      });

      printPromotionResult(result, argv.dryRun);

      process.exit(result.success ? 0 : 1);
    }
  )

  // ── audit ────────────────────────────────────────────────
  .command(
    'audit',
    'Query audit trail',
    (y) =>
      y
        .option('run-id', {
          type: 'string',
          describe: 'Filter by run ID',
        })
        .option('metric-id', {
          type: 'string',
          describe: 'Filter by metric ID',
        })
        .option('status', {
          type: 'string',
          describe: 'Filter by status',
          choices: ['SUCCEEDED', 'FAILED', 'SKIPPED', 'STARTED'],
        })
        .option('since', {
          type: 'string',
          describe: 'Show runs since date (YYYY-MM-DD)',
        })
        .option('limit', {
          alias: 'n',
          type: 'number',
          describe: 'Max rows to display',
          default: 50,
        })
        .option('format', {
          type: 'string',
          describe: 'Output format',
          choices: ['table', 'json', 'csv'],
          default: 'table',
        }),
    async (argv) => {
      console.log(`\n  Audit command`);
      console.log(`  (Requires DATABASE_URL — queries l3.calc_audit_log and l3.calc_run)`);

      if (!process.env.DATABASE_URL) {
        console.log(`  Set DATABASE_URL to query audit trail.`);
        return;
      }

      const { SqlExecutor } = await import('./engine/executor');
      const config = loadEngineConfig();
      const executor = new SqlExecutor(config);

      try {
        if (argv.runId) {
          // Show specific run details
          const runResult = await executor.query(
            `SELECT * FROM l3.calc_run WHERE run_id = :run_id`,
            { run_id: argv.runId }
          );
          if (runResult.rowCount === 0) {
            console.log(`  No run found with ID: ${argv.runId}`);
            return;
          }
          console.log(`\n  Run Details:`);
          console.log(JSON.stringify(runResult.rows[0], null, 2));

          // Show audit entries
          const auditResult = await executor.query(
            `SELECT metric_id, aggregation_level, status, duration_ms, rows_written, error_message
             FROM l3.calc_audit_log WHERE run_id = :run_id
             ORDER BY started_at LIMIT :limit`,
            { run_id: argv.runId, limit: argv.limit }
          );
          console.log(`\n  Audit Entries (${auditResult.rowCount}):`);
          if (argv.format === 'json') {
            console.log(JSON.stringify(auditResult.rows, null, 2));
          } else {
            console.table(auditResult.rows);
          }
        } else {
          // Show recent runs
          const params: Record<string, unknown> = { limit: argv.limit };
          let whereClause = '1=1';
          if (argv.since) {
            whereClause += ` AND started_at >= :since`;
            params.since = argv.since;
          }

          const result = await executor.query(
            `SELECT run_id, run_version_id, as_of_date, status,
                    metrics_succeeded, metrics_failed, total_rows_written,
                    duration_ms, started_at
             FROM l3.calc_run WHERE ${whereClause}
             ORDER BY started_at DESC LIMIT :limit`,
            params
          );
          console.log(`\n  Recent Runs (${result.rowCount}):`);
          if (argv.format === 'json') {
            console.log(JSON.stringify(result.rows, null, 2));
          } else {
            console.table(result.rows);
          }
        }
      } finally {
        await executor.close();
      }
    }
  )

  // ── inspect ──────────────────────────────────────────────
  .command(
    'inspect',
    'Inspect a metric definition',
    (y) =>
      y
        .option('metric-id', {
          alias: 'm',
          type: 'string',
          describe: 'Metric ID to inspect',
          demandOption: true,
        })
        .option('show-sql', {
          type: 'boolean',
          describe: 'Display formula_sql for all levels',
          default: false,
        })
        .option('show-deps', {
          type: 'boolean',
          describe: 'Display dependency tree',
          default: false,
        })
        .option('show-validations', {
          type: 'boolean',
          describe: 'Display validation rules',
          default: false,
        })
        .option('show-lineage', {
          type: 'boolean',
          describe: 'Display source table lineage',
          default: false,
        })
        .option('format', {
          type: 'string',
          describe: 'Output format',
          choices: ['yaml', 'json', 'table'],
          default: 'table',
        }),
    async (argv) => {
      const { metrics, errors } = loadMetricDefinitions();
      if (errors.length > 0) {
        for (const err of errors) console.error(`  WARN: ${err}`);
      }

      const metric = metrics.find((m) => m.metric_id === argv.metricId);
      if (!metric) {
        console.error(`  Metric not found: ${argv.metricId}`);
        console.log(`  Available: ${metrics.map((m) => m.metric_id).join(', ') || '(none)'}`);
        process.exit(1);
      }

      if (argv.format === 'json') {
        console.log(JSON.stringify(metric, null, 2));
        return;
      }

      console.log(`\n  Metric: ${metric.metric_id} — ${metric.name}`);
      console.log(`  ───────────────────────────────────────────`);
      console.log(`  Status:      ${metric.status}`);
      console.log(`  Version:     ${metric.version}`);
      console.log(`  Owner:       ${metric.owner}`);
      console.log(`  Domain:      ${metric.domain} / ${metric.sub_domain}`);
      console.log(`  Class:       ${metric.metric_class}`);
      console.log(`  Direction:   ${metric.direction}`);
      console.log(`  Unit:        ${metric.unit_type}`);
      console.log(`  Format:      ${metric.display_format}`);
      console.log(`  Description: ${metric.description.slice(0, 100)}...`);

      if (metric.regulatory_references.length > 0) {
        console.log(`\n  Regulatory References:`);
        for (const ref of metric.regulatory_references) {
          console.log(`    ${ref.framework} ${ref.section ?? ref.schedule ?? ''} — ${ref.description}`);
        }
      }

      if (argv.showLineage || argv.format === 'table') {
        console.log(`\n  Source Tables:`);
        for (const t of metric.source_tables) {
          console.log(
            `    ${t.schema}.${t.table} (${t.alias}) [${t.join_type}] — ${t.fields.length} fields`
          );
        }
      }

      console.log(`\n  Levels:`);
      for (const [level, formula] of Object.entries(metric.levels)) {
        console.log(`    ${level}: ${formula.aggregation_type} — ${formula.formula_text}`);
        if (argv.showSql) {
          console.log(`      SQL:\n${formula.formula_sql.split('\n').map((l: string) => `        ${l}`).join('\n')}`);
        }
      }

      if (argv.showDeps && metric.depends_on.length > 0) {
        console.log(`\n  Dependencies: ${metric.depends_on.join(', ')}`);
      }

      if (argv.showValidations && metric.validations.length > 0) {
        console.log(`\n  Validation Rules:`);
        for (const v of metric.validations) {
          console.log(`    ${v.rule_id} [${v.severity}] ${v.type}: ${v.description}`);
        }
      }

      if (metric.tags.length > 0) {
        console.log(`\n  Tags: ${metric.tags.join(', ')}`);
      }
      if (metric.legacy_metric_ids.length > 0) {
        console.log(`  Legacy IDs: ${metric.legacy_metric_ids.join(', ')}`);
      }
    }
  )

  // ── list ─────────────────────────────────────────────────
  .command(
    'list',
    'List available metrics',
    (y) =>
      y
        .option('domain', {
          type: 'string',
          describe: 'Filter by domain',
        })
        .option('status', {
          type: 'string',
          describe: 'Filter by status',
          choices: ['ACTIVE', 'DRAFT', 'DEPRECATED', 'RETIRED'],
        })
        .option('format', {
          type: 'string',
          describe: 'Output format',
          choices: ['table', 'json', 'csv'],
          default: 'table',
        })
        .option('verbose', {
          type: 'boolean',
          describe: 'Show all fields',
          default: false,
        }),
    async (argv) => {
      const { metrics, errors } = loadMetricDefinitions();

      if (errors.length > 0) {
        console.error(`  Load warnings: ${errors.length}`);
        for (const err of errors) console.error(`    ${err}`);
      }

      let filtered = metrics;
      if (argv.domain) {
        filtered = filtered.filter((m) => m.domain === argv.domain);
      }
      if (argv.status) {
        filtered = filtered.filter((m) => m.status === argv.status);
      }

      if (filtered.length === 0) {
        console.log(`\n  No metrics found.`);
        return;
      }

      if (argv.format === 'json') {
        const summary = filtered.map((m) => ({
          metric_id: m.metric_id,
          name: m.name,
          domain: m.domain,
          status: m.status,
          version: m.version,
          depends_on: m.depends_on,
          tags: m.tags,
        }));
        console.log(JSON.stringify(summary, null, 2));
        return;
      }

      console.log(`\n  Metrics (${filtered.length}):`);
      console.log(`  ${'ID'.padEnd(12)} ${'Name'.padEnd(35)} ${'Domain'.padEnd(15)} ${'Status'.padEnd(12)} ${'Deps'.padEnd(5)}`);
      console.log(`  ${'─'.repeat(12)} ${'─'.repeat(35)} ${'─'.repeat(15)} ${'─'.repeat(12)} ${'─'.repeat(5)}`);

      for (const m of filtered) {
        console.log(
          `  ${m.metric_id.padEnd(12)} ${m.name.slice(0, 35).padEnd(35)} ${m.domain.padEnd(15)} ${m.status.padEnd(12)} ${String(m.depends_on.length).padEnd(5)}`
        );
      }
    }
  )

  // ── dag ──────────────────────────────────────────────────
  .command(
    'dag',
    'Display dependency graph',
    (y) =>
      y
        .option('metrics', {
          alias: 'm',
          type: 'array',
          string: true,
          describe: 'Highlight specific metrics',
        })
        .option('format', {
          type: 'string',
          describe: 'Output format',
          choices: ['ascii', 'dot', 'json'],
          default: 'ascii',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          describe: 'Write to file (for dot format)',
        }),
    async (argv) => {
      const { metrics, errors } = loadMetricDefinitions();

      if (errors.length > 0) {
        for (const err of errors) console.error(`  WARN: ${err}`);
      }

      const plan = buildExecutionPlan(metrics, argv.metrics);

      switch (argv.format) {
        case 'dot': {
          const dot = formatExecutionPlanDot(plan);
          if (argv.output) {
            const fs = await import('fs');
            fs.writeFileSync(argv.output, dot);
            console.log(`  DOT graph written to ${argv.output}`);
          } else {
            console.log(dot);
          }
          break;
        }
        case 'json': {
          const jsonPlan = {
            totalMetrics: plan.totalMetrics,
            totalBatches: plan.totalBatches,
            hasCycles: plan.hasCycles,
            cyclePath: plan.cyclePath,
            batches: plan.batches,
            edges: plan.edges,
          };
          console.log(JSON.stringify(jsonPlan, null, 2));
          break;
        }
        default:
          console.log(`\n  ${formatExecutionPlanAscii(plan)}`);
      }
    }
  )

  .demandCommand(1, 'You must specify a command')
  .strict()
  .help()
  .version(false)
  .wrap(100)
  .parse();
