#!/usr/bin/env npx tsx
/**
 * Live Execution Test Harness for Decomposition Agents
 *
 * Invokes each decomposition agent via Claude Code subprocess with golden
 * metrics, captures the 9-section JSON output, and validates it against
 * the decomposition output schema.
 *
 * Runs 2 agents in parallel for ~2x speedup over sequential.
 *
 * Usage:
 *   npx tsx scripts/test-decomp-live.ts                  # all agents
 *   npx tsx scripts/test-decomp-live.ts --agent credit   # single agent
 *   npx tsx scripts/test-decomp-live.ts --dry-run        # show plan only
 *
 * Results persisted to: .claude/audit/decomp-test-results/
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { AGENT_REGISTRY, AgentSpec } from './decomp-agent-test-fixtures';
import { validateDecompositionOutput, extractJsonFromOutput, ValidationResult } from './decomp-output-schema';

const ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.join(ROOT, '.claude/audit/decomp-test-results');
const CONCURRENCY = 2;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per agent invocation

// ============================================================================
// Golden Metric Invocations
// ============================================================================

interface LiveTestCase {
  agent: string;
  metricPrompt: string;
  expectedAssertions: string[]; // human-readable assertions to check
}

const LIVE_TEST_CASES: LiveTestCase[] = [
  // Credit Risk
  {
    agent: 'decomp-credit-risk',
    metricPrompt: 'Expected Loss Rate for the wholesale credit portfolio',
    expectedAssertions: ['sum-ratio rollup', 'PD×LGD formula', 'ingredients from l2'],
  },
  {
    agent: 'decomp-credit-risk',
    metricPrompt: 'Committed Exposure Amount by counterparty',
    expectedAssertions: ['direct-sum rollup', 'CURRENCY unit', 'FX at aggregate'],
  },
  // Market Risk
  {
    agent: 'decomp-market-risk',
    metricPrompt: 'FRTB Standardized Approach Capital Charge',
    expectedAssertions: ['none rollup (correlation)', 'SBM+DRC+RRAO formula'],
  },
  {
    agent: 'decomp-market-risk',
    metricPrompt: 'Value at Risk (99%, 10-day holding period)',
    expectedAssertions: ['none rollup', 'LOWER_BETTER direction'],
  },
  // CCR
  {
    agent: 'decomp-ccr',
    metricPrompt: 'SA-CCR Exposure at Default',
    expectedAssertions: ['1.4×(RC+PFE) formula', 'netting set hierarchy'],
  },
  {
    agent: 'decomp-ccr',
    metricPrompt: 'BA-CVA Capital Charge',
    expectedAssertions: ['beta formula', 'MEDIUM+ confidence'],
  },
  // Liquidity
  {
    agent: 'decomp-liquidity',
    metricPrompt: 'Liquidity Coverage Ratio',
    expectedAssertions: ['sum-ratio per entity', 'HQLA/outflows formula'],
  },
  {
    agent: 'decomp-liquidity',
    metricPrompt: 'Net Stable Funding Ratio',
    expectedAssertions: ['sum-ratio per entity', 'ASF/RSF formula'],
  },
  // Capital
  {
    agent: 'decomp-capital',
    metricPrompt: 'CET1 Capital Ratio',
    expectedAssertions: ['sum-ratio per entity', 'capital/RWA formula'],
  },
  {
    agent: 'decomp-capital',
    metricPrompt: 'Supplementary Leverage Ratio',
    expectedAssertions: ['sum-ratio', 'T1/TLE formula'],
  },
  // IRRBB
  {
    agent: 'decomp-irrbb-alm',
    metricPrompt: 'NII Sensitivity to +200bp parallel shock',
    expectedAssertions: ['direct-sum per entity/currency', 'gap×rate formula'],
  },
  {
    agent: 'decomp-irrbb-alm',
    metricPrompt: 'EVE Sensitivity under prescribed shock scenarios',
    expectedAssertions: ['direct-sum per entity', '6 scenarios'],
  },
  // Op Risk
  {
    agent: 'decomp-oprisk',
    metricPrompt: 'SMA Operational Risk Capital',
    expectedAssertions: ['none rollup (entity-level)', 'BIC×ILM formula'],
  },
  {
    agent: 'decomp-oprisk',
    metricPrompt: 'Key Risk Indicators composite score',
    expectedAssertions: ['none rollup', 'NEUTRAL direction'],
  },
  // Compliance
  {
    agent: 'decomp-compliance',
    metricPrompt: 'DFAST CET1 Capital Ratio Trough',
    expectedAssertions: ['none rollup', '9-quarter projection'],
  },
  {
    agent: 'decomp-compliance',
    metricPrompt: 'Stress Capital Buffer',
    expectedAssertions: ['none rollup', 'max(2.5%, delta+divs) formula'],
  },
];

// ============================================================================
// Claude Code Subprocess Invocation
// ============================================================================

async function invokeDecompAgent(agentName: string, metricPrompt: string): Promise<{ output: string; durationMs: number }> {
  const agentSpec = AGENT_REGISTRY.find(s => s.name === agentName);
  if (!agentSpec) throw new Error(`Unknown agent: ${agentName}`);

  const modeB_payload = JSON.stringify({
    mode: 'B',
    metric_name: metricPrompt,
    risk_stripe: agentSpec.domain,
    session_id: `test-${Date.now()}`,
    output_format: 'json',
  });

  const prompt = `You are the ${agentName} decomposition expert. Use Mode B (orchestrator mode) to decompose the following metric. Return ONLY the 9-section JSON output, no preamble.

Payload: ${modeB_payload}

Metric: ${metricPrompt}

Return the complete 9-section JSON decomposition with sections: metric_definition, ingredients, schema_gaps, rollup_architecture, variants, consumers, regulatory_mapping, gsib_considerations, confidence_assessment.`;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn('claude', ['--print', prompt], {
      cwd: ROOT,
      timeout: TIMEOUT_MS,
      env: { ...process.env },
    });

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      if (code === 0) {
        resolve({ output: stdout, durationMs });
      } else {
        reject(new Error(`Claude subprocess exited with code ${code}: ${stderr.substring(0, 500)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });

    // Hard timeout
    setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Timeout after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS + 5000);
  });
}

// ============================================================================
// Concurrency Limiter
// ============================================================================

async function pLimit<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task().then(result => {
      results.push(result);
      executing.delete(p);
    });
    executing.add(p);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// ============================================================================
// Result Persistence
// ============================================================================

interface LiveTestResult {
  agent: string;
  metric: string;
  timestamp: string;
  durationMs: number;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'TIMEOUT';
  validation: ValidationResult | null;
  rawOutputLength: number;
  expectedAssertions: string[];
  error?: string;
}

function persistResult(result: LiveTestResult): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const safeName = `${result.agent}-${result.metric.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}`;
  const filename = `${safeName}-${result.timestamp.replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(RESULTS_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
}

function loadPreviousResults(agent: string, metric: string): LiveTestResult | null {
  if (!fs.existsSync(RESULTS_DIR)) return null;

  const safeName = `${agent}-${metric.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}`;
  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.startsWith(safeName) && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  try {
    return JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, files[0]), 'utf-8'));
  } catch {
    return null;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runLiveTests(options: { agentFilter?: string; dryRun?: boolean }): Promise<void> {
  console.log('Decomposition Agent Live Execution Tests');
  console.log('========================================\n');

  // Filter test cases
  let testCases = LIVE_TEST_CASES;
  if (options.agentFilter) {
    testCases = testCases.filter(tc =>
      tc.agent.toLowerCase().includes(options.agentFilter!.toLowerCase())
    );
    console.log(`Filtered to ${testCases.length} test cases matching "${options.agentFilter}"\n`);
  }

  if (options.dryRun) {
    console.log('DRY RUN — showing test plan only:\n');
    for (const tc of testCases) {
      console.log(`  ${tc.agent}: "${tc.metricPrompt}"`);
      console.log(`    Assertions: ${tc.expectedAssertions.join(', ')}`);
    }
    console.log(`\nTotal: ${testCases.length} test cases, ${CONCURRENCY} concurrent`);
    console.log(`Estimated time: ${Math.ceil(testCases.length / CONCURRENCY) * 3}-${Math.ceil(testCases.length / CONCURRENCY) * 5} minutes`);
    return;
  }

  // Check claude CLI is available
  try {
    execSync('which claude', { stdio: 'pipe' });
  } catch {
    console.error('ERROR: `claude` CLI not found in PATH. Cannot run live tests.');
    console.error('Install: https://docs.anthropic.com/en/docs/claude-code');
    process.exit(1);
  }

  const allResults: LiveTestResult[] = [];
  const timestamp = new Date().toISOString();

  // Build task functions
  const tasks = testCases.map(tc => async (): Promise<LiveTestResult> => {
    console.log(`\n[START] ${tc.agent}: "${tc.metricPrompt}"`);

    try {
      const { output, durationMs } = await invokeDecompAgent(tc.agent, tc.metricPrompt);
      console.log(`  Completed in ${(durationMs / 1000).toFixed(1)}s (${output.length} chars)`);

      // Extract JSON from output
      const parsed = extractJsonFromOutput(output);
      if (!parsed) {
        console.error(`  FAIL: No JSON block found in output`);
        return {
          agent: tc.agent,
          metric: tc.metricPrompt,
          timestamp,
          durationMs,
          status: 'FAIL',
          validation: null,
          rawOutputLength: output.length,
          expectedAssertions: tc.expectedAssertions,
          error: 'No JSON block found in agent output',
        };
      }

      // Validate against schema
      const validation = validateDecompositionOutput(parsed);
      const status = validation.valid ? 'PASS' : 'FAIL';

      if (validation.errors.length > 0) {
        console.error(`  Schema errors: ${validation.errors.join('; ')}`);
      }
      if (validation.warnings.length > 0) {
        console.warn(`  Schema warnings: ${validation.warnings.join('; ')}`);
      }

      const sectionsPresent = Object.values(validation.sectionPresence).filter(Boolean).length;
      console.log(`  Sections: ${sectionsPresent}/9 present, status: ${status}`);

      // Check for regressions against previous run
      const prev = loadPreviousResults(tc.agent, tc.metricPrompt);
      if (prev && prev.validation) {
        const prevSections = Object.values(prev.validation.sectionPresence).filter(Boolean).length;
        if (sectionsPresent < prevSections) {
          console.warn(`  REGRESSION: ${prevSections} sections → ${sectionsPresent} sections`);
        }
      }

      const result: LiveTestResult = {
        agent: tc.agent,
        metric: tc.metricPrompt,
        timestamp,
        durationMs,
        status,
        validation,
        rawOutputLength: output.length,
        expectedAssertions: tc.expectedAssertions,
      };

      persistResult(result);
      return result;
    } catch (err: any) {
      const isTimeout = err.message?.includes('Timeout');
      console.error(`  ${isTimeout ? 'TIMEOUT' : 'ERROR'}: ${err.message}`);

      const result: LiveTestResult = {
        agent: tc.agent,
        metric: tc.metricPrompt,
        timestamp,
        durationMs: 0,
        status: isTimeout ? 'TIMEOUT' : 'FAIL',
        validation: null,
        rawOutputLength: 0,
        expectedAssertions: tc.expectedAssertions,
        error: err.message,
      };

      persistResult(result);
      return result;
    }
  });

  // Run with concurrency limit
  const taskResults = await pLimit(tasks, CONCURRENCY);
  allResults.push(...taskResults);

  // Print summary
  console.log('\n' + '='.repeat(72));
  console.log('LIVE EXECUTION TEST RESULTS');
  console.log('='.repeat(72));
  console.log(
    'Agent'.padEnd(25) +
    'Metric'.padEnd(30) +
    'Status'.padStart(8) +
    'Time'.padStart(8) +
    'Sections'.padStart(10)
  );
  console.log('-'.repeat(81));

  for (const r of allResults) {
    const sections = r.validation
      ? `${Object.values(r.validation.sectionPresence).filter(Boolean).length}/9`
      : 'N/A';
    const time = r.durationMs > 0 ? `${(r.durationMs / 1000).toFixed(1)}s` : 'N/A';

    console.log(
      r.agent.padEnd(25) +
      r.metric.substring(0, 28).padEnd(30) +
      r.status.padStart(8) +
      time.padStart(8) +
      sections.padStart(10)
    );
  }

  const passed = allResults.filter(r => r.status === 'PASS').length;
  const failed = allResults.filter(r => r.status === 'FAIL').length;
  const timeouts = allResults.filter(r => r.status === 'TIMEOUT').length;

  console.log('\n' + '='.repeat(72));
  console.log(`TOTAL: ${passed} passed, ${failed} failed, ${timeouts} timeouts out of ${allResults.length} tests`);
  console.log(`Results saved to: ${RESULTS_DIR}`);
  console.log('='.repeat(72) + '\n');

  if (failed > 0 || timeouts > 0) {
    process.exit(1);
  }
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);
const agentFilter = args.find(a => a.startsWith('--agent'))?.split('=')[1]
  || (args.indexOf('--agent') !== -1 ? args[args.indexOf('--agent') + 1] : undefined);
const dryRun = args.includes('--dry-run');

runLiveTests({ agentFilter, dryRun }).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
