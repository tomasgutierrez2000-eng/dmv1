#!/usr/bin/env npx tsx
/**
 * Standalone Data Factory Pipeline CLI — runs the full pipeline without the agent layer.
 *
 * Usage:
 *   npx tsx scenarios/factory/cli/run-factory-pipeline.ts --dates 2026-03-31
 *   npx tsx scenarios/factory/cli/run-factory-pipeline.ts --dates 2026-03-31 --dry-run
 *   npx tsx scenarios/factory/cli/run-factory-pipeline.ts --scenario S57
 *   npx tsx scenarios/factory/cli/run-factory-pipeline.ts --dates 2026-03-31,2026-04-30 --layer L2
 *
 * Pipeline phases:
 *   1. SCHEMA_ANALYZE  — coverage gap + FK DAG + contracts
 *   2. STRATEGY        — decide approach (extend/fresh/patch/scenario)
 *   3. GENERATOR_CHECK — identify uncovered tables needing generators
 *   4. STORY_WEAVE     — evolve facility stories + derive table rows
 *   5. PRE_FLIGHT      — 30+ validation checks
 *   6. OBSERVE         — coherence matrix + GSIB distribution
 *   7. REPORT          — final summary
 */

import { SchemaAnalyzer } from '../schema-analyzer';
import { StrategyAdvisor, type StrategyRequest } from '../strategy-advisor';
import { GeneratorBuilder } from '../generator-builder';
import { StoryWeaver } from '../story-weaver';
import { EnhancedValidator } from '../enhanced-validator';
import { ScenarioObserver } from '../scenario-observer';
import type { FacilityState, CreditStatus } from '../v2/types';

/* ────────────────── Arg Parsing ────────────────── */

function parseArgs(): {
  dates?: string[];
  scenario?: string;
  layer?: string;
  dryRun: boolean;
  verbose: boolean;
} {
  const args = process.argv.slice(2);
  const result = { dryRun: false, verbose: false } as ReturnType<typeof parseArgs>;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dates': result.dates = args[++i]?.split(',').map(d => d.trim()); break;
      case '--scenario': result.scenario = args[++i]; break;
      case '--layer': result.layer = args[++i]; break;
      case '--dry-run': result.dryRun = true; break;
      case '--verbose': result.verbose = true; break;
      case '--help':
        console.log(`
Data Factory Pipeline CLI

Usage:
  npx tsx scenarios/factory/cli/run-factory-pipeline.ts [options]

Options:
  --dates <date1,date2>  Target dates (YYYY-MM-DD, comma-separated)
  --scenario <id>        Scenario ID (e.g., S57)
  --layer <L1|L2>        Limit to specific layer
  --dry-run              Run analysis only, don't generate data
  --verbose              Show detailed output
  --help                 Show this help
`);
        process.exit(0);
    }
  }

  return result;
}

/* ────────────────── Pipeline ────────────────── */

async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════');
  console.log(' DATA FACTORY PIPELINE');
  console.log('═══════════════════════════════════════════════════\n');

  // ── Phase 1: Schema Analysis ──
  console.log('Phase 1: SCHEMA_ANALYZE');
  const analyzer = SchemaAnalyzer.create();
  const coverage = analyzer.analyzeCoverage();
  console.log(`  Total tables: ${coverage.totalTables}`);
  console.log(`  With generators: ${coverage.tablesWithGenerators}`);
  console.log(`  Uncovered L2: ${coverage.uncoveredL2.length}`);
  console.log(`  L3 (calc engine): ${coverage.l3Tables}`);
  console.log('  ✅ DONE\n');

  // ── Phase 2: Strategy ──
  console.log('Phase 2: STRATEGY');
  const advisor = new StrategyAdvisor(analyzer);
  const request: StrategyRequest = {
    targetDates: opts.dates,
    scenarioId: opts.scenario,
  };
  const currentState = await advisor.assessCurrentState();
  const decision = advisor.decideStrategy(request, currentState, coverage);

  console.log(`  Strategy: ${decision.strategy}`);
  console.log(`  Rationale: ${decision.rationale}`);
  console.log(`  Target dates: ${decision.targetDates.join(', ')}`);
  console.log(`  Tables: ${decision.tablesToGenerate.length}`);
  console.log(`  Estimated rows: ${decision.estimatedRows.toLocaleString()}`);
  if (decision.requiresConfirmation) {
    console.log(`  ⚠️  REQUIRES CONFIRMATION: ${decision.confirmationReason}`);
  }
  console.log('  ✅ DONE\n');

  // ── Phase 3: Generator Check ──
  console.log('Phase 3: GENERATOR_CHECK');
  const builder = new GeneratorBuilder(analyzer);
  const targetTables = opts.layer
    ? analyzer.getTablesByLayer(opts.layer as 'L1' | 'L2' | 'L3')
    : undefined;
  const plan = analyzer.getGenerationPlan(targetTables);
  const needGenerators = plan.steps.filter(s => s.action === 'CREATE_GENERATOR');

  if (needGenerators.length > 0) {
    console.log(`  ⚠️  ${needGenerators.length} tables need new generators:`);
    for (const step of needGenerators.slice(0, 10)) {
      console.log(`    - ${step.qualifiedName} (${step.classification})`);
    }
    if (needGenerators.length > 10) {
      console.log(`    ... and ${needGenerators.length - 10} more`);
    }
  } else {
    console.log('  All tables have generators');
  }
  console.log('  ✅ DONE\n');

  // ── Phase 4: Story Weave (simulation) ──
  console.log('Phase 4: STORY_WEAVE');
  const weaver = new StoryWeaver(42);

  // Create mock facilities for demonstration
  const mockCPIds = Array.from({ length: 20 }, (_, i) => i + 1);
  weaver.assignStories(mockCPIds);

  // Create mock initial states
  const mockFacilities: FacilityState[] = mockCPIds.map(cpId => ({
    facility_id: cpId * 10,
    counterparty_id: cpId,
    credit_agreement_id: cpId,
    product_type: 'REVOLVING_CREDIT' as const,
    currency_code: 'USD',
    facility_type_code: 'REVOLVING',
    story_arc: 'STABLE_IG' as any,
    rating_tier: 'IG_MID' as any,
    size_profile: 'LARGE' as any,
    industry_id: (cpId % 10) + 1,
    country_code: 'US',
    committed_amount: 50_000_000 + cpId * 5_000_000,
    drawn_amount: 15_000_000 + cpId * 2_000_000,
    undrawn_amount: 35_000_000 + cpId * 3_000_000,
    original_committed: 50_000_000 + cpId * 5_000_000,
    pd_annual: 0.10 + (cpId * 0.05),
    pd_at_origination: 0.10,
    lgd_current: 35 + (cpId % 5) * 3,
    internal_rating: cpId <= 10 ? 'A' : 'BBB',
    external_rating_sp: cpId <= 10 ? 'A' : 'BBB',
    external_rating_moodys: cpId <= 10 ? 'A2' : 'Baa2',
    credit_status: 'PERFORMING' as CreditStatus,
    days_past_due: 0,
    ifrs9_stage: 1 as const,
    spread_bps: 100 + cpId * 10,
    base_rate_pct: 5.33,
    all_in_rate_pct: 6.33 + cpId * 0.1,
    fee_rate_pct: 0.25,
    cost_of_funds_pct: 4.80,
    collateral_value: 20_000_000 + cpId * 2_000_000,
    collateral_type: 'RE',
    ltv_ratio: 75,
    covenant_package: null,
    covenants: [],
    next_test_date: null,
    lifecycle_stage: 'FUNDED' as any,
    origination_date: '2024-01-15',
    maturity_date: '2029-01-15',
    remaining_tenor_months: 36,
    amortization_schedule: null,
    next_payment_date: null,
    is_revolving: true,
    ead: 40_000_000,
    ccf: 0.75,
    rwa: 20_000_000,
    risk_weight_pct: 50,
    expected_loss: 50_000,
    ecl_12m: 30_000,
    ecl_lifetime: 120_000,
    dscr: 1.8,
    icr: 3.2,
    leverage_ratio: 2.5,
    last_draw_date: null,
    last_repay_date: null,
    last_rate_reset_date: null,
    prior_drawn_amount: 0,
    events_this_period: [],
  }));

  const firstDate = decision.targetDates[0] ?? '2026-03-31';
  // Initialize
  for (const fac of mockFacilities) {
    weaver.initializeFromState(fac, '2026-02-28');
  }
  // Evolve one month
  const facilityIds = mockFacilities.map(f => f.facility_id);
  for (const fid of facilityIds) {
    weaver.evolveOneMonth(fid, '2026-02-28', firstDate, 1);
  }
  weaver.enforceCrossCounterpartyCoherence(facilityIds, firstDate);

  const stories = weaver.getStoriesForDate(facilityIds, firstDate);
  console.log(`  Evolved ${stories.length} facilities to ${firstDate}`);

  // Story distribution
  const storyTypes = new Map<string, number>();
  for (const s of stories) {
    storyTypes.set(s.storyType, (storyTypes.get(s.storyType) ?? 0) + 1);
  }
  for (const [type, count] of storyTypes) {
    console.log(`    ${type}: ${count} facilities`);
  }
  console.log('  ✅ DONE\n');

  // ── Phase 5: Pre-Flight Validation ──
  console.log('Phase 5: PRE_FLIGHT');
  const validator = new EnhancedValidator(analyzer);
  const storyReport = validator.runStoryCoherenceChecks(stories);

  console.log(`  Total checks: ${storyReport.totalChecks}`);
  console.log(`  CRITICAL: ${storyReport.criticalFailures}`);
  console.log(`  HIGH: ${storyReport.highFailures}`);
  console.log(`  MEDIUM: ${storyReport.mediumFailures}`);
  console.log(`  LOW: ${storyReport.lowFailures}`);
  console.log(`  Verdict: ${storyReport.passed ? '✅ PASS' : '❌ BLOCKED'}`);
  if (!storyReport.passed) {
    const criticals = storyReport.checks.filter(c => !c.passed && c.severity === 'CRITICAL');
    for (const c of criticals) {
      console.log(`    ❌ ${c.name}: ${c.message}`);
    }
  }
  console.log('');

  // ── Phase 6: Observe ──
  console.log('Phase 6: OBSERVE');
  const observer = new ScenarioObserver();
  const observerReport = observer.generateReport(stories, undefined, firstDate);

  console.log(`  Facilities checked: ${observerReport.facilitiesChecked}`);
  console.log(`  Coherence pass rate: ${observerReport.coherencePassRate}%`);
  console.log(`  PD distribution:`);
  for (const [bucket, info] of Object.entries(observerReport.gsibDistribution.pdDistribution)) {
    console.log(`    ${bucket}: ${info.count} (${info.pct}%)`);
  }
  console.log(`  Health distribution:`);
  for (const [state, info] of Object.entries(observerReport.gsibDistribution.healthDistribution)) {
    if (info.count > 0) console.log(`    ${state}: ${info.count} (${info.pct}%)`);
  }
  console.log(`  Overall: ${observerReport.overallResult}`);
  console.log('');

  // ── Phase 7: Report ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('═══════════════════════════════════════════════════');
  console.log(' PIPELINE COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode: ${opts.dryRun ? 'DRY RUN' : 'FULL'}`);
  console.log(`  Strategy: ${decision.strategy}`);
  console.log(`  Target: ${decision.targetDates.join(', ')}`);
  console.log(`  Validation: ${storyReport.passed ? 'PASS' : 'BLOCKED'}`);
  console.log(`  Coherence: ${observerReport.coherencePassRate}%`);
  console.log(`  Duration: ${elapsed}s`);

  if (opts.dryRun) {
    console.log('\n  [DRY RUN] No data was loaded into PostgreSQL.');
    console.log('  Remove --dry-run to execute the full pipeline.');
  }

  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Pipeline error:', err.message);
  process.exit(1);
});
