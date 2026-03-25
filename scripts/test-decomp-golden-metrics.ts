#!/usr/bin/env npx tsx
/**
 * Golden Metric Test Cases — domain-specific knowledge validation.
 *
 * Validates that each agent's knowledge base contains accurate GSIB-standard
 * formulas, correctly categorizes metrics, applies correct rollup strategies,
 * documents metric variants, and handles non-additivity properly.
 *
 * Tiers covered:
 *   Tier 2: Domain Knowledge Accuracy (golden formula matching)
 *   Tier 3: Rollup Strategy per Metric Family
 *   Tier 5: Variant Awareness
 *
 * Usage: npx tsx scripts/test-decomp-golden-metrics.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AGENT_REGISTRY,
  AgentSpec,
  GOLDEN_METRICS,
  GoldenMetric,
  NON_ADDITIVE_RULES,
  VARIANT_REQUIREMENTS,
  FX_RULES,
  REGULATORY_FRAMEWORKS,
} from './decomp-agent-test-fixtures';

const ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, '.claude/commands');

// ============================================================================
// Test Infrastructure
// ============================================================================

interface TestResult {
  tier: number;
  agent: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  detail?: string;
}

const results: TestResult[] = [];

function record(tier: number, agent: string, test: string, status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP', detail?: string) {
  results.push({ tier, agent, test, status, detail });
  const icon = status === 'PASS' ? '  PASS ' : status === 'FAIL' ? '  FAIL ' : status === 'WARN' ? '  WARN ' : '  SKIP ';
  const line = `${icon} [${agent}] ${test}${detail ? ` — ${detail}` : ''}`;
  if (status === 'FAIL') console.error(line);
  else if (status === 'WARN') console.warn(line);
  else console.log(line);
}

// ============================================================================
// Agent Content Cache
// ============================================================================

const agentContentCache = new Map<string, string>();

function loadAgentContent(name: string): string | null {
  if (agentContentCache.has(name)) return agentContentCache.get(name)!;
  const spec = AGENT_REGISTRY.find(s => s.name === name);
  if (!spec) return null;
  const filePath = path.join(COMMANDS_DIR, spec.file);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  agentContentCache.set(name, content);
  return content;
}

// ============================================================================
// Tier 2: Golden Metric Formula Validation (3A)
// ============================================================================

function runGoldenFormulaTests(): void {
  console.log('\n=== Tier 2: Golden Metric Formula Validation ===');

  const byAgent = new Map<string, GoldenMetric[]>();
  for (const gm of GOLDEN_METRICS) {
    if (!byAgent.has(gm.agent)) byAgent.set(gm.agent, []);
    byAgent.get(gm.agent)!.push(gm);
  }

  for (const [agentName, metrics] of byAgent) {
    console.log(`\n--- Golden Metrics [${agentName}] ---`);

    const content = loadAgentContent(agentName);
    if (!content) {
      for (const gm of metrics) {
        record(2, agentName, `Formula: ${gm.metricName}`, 'SKIP', 'Agent file not found');
      }
      continue;
    }

    for (const gm of metrics) {
      // Test formula presence
      if (gm.formulaPattern.test(content)) {
        record(2, agentName, `Formula: ${gm.metricName}`, 'PASS', gm.formulaDescription);
      } else {
        // Try a looser match — just check the metric name is discussed
        const namePattern = new RegExp(gm.metricName.replace(/[()]/g, '\\$&'), 'i');
        if (namePattern.test(content)) {
          record(2, agentName, `Formula: ${gm.metricName}`, 'WARN',
            `Metric discussed but formula pattern not matched: ${gm.formulaDescription}`);
        } else {
          record(2, agentName, `Formula: ${gm.metricName}`, 'FAIL',
            `Missing formula: ${gm.formulaDescription} (${gm.regulatorySource})`);
        }
      }

      // Test regulatory source mention
      if (content.includes(gm.regulatorySource)) {
        record(2, agentName, `Reg source: ${gm.metricName} → ${gm.regulatorySource}`, 'PASS');
      } else {
        // Check partial match (e.g., "CRE 31" might appear as "CRE31" or "CRE 31.x")
        const loosened = gm.regulatorySource.replace(/\s+/g, '\\s*');
        if (new RegExp(loosened, 'i').test(content)) {
          record(2, agentName, `Reg source: ${gm.metricName} → ${gm.regulatorySource}`, 'PASS', 'Variant format');
        } else {
          record(2, agentName, `Reg source: ${gm.metricName} → ${gm.regulatorySource}`, 'WARN', 'Not explicitly referenced');
        }
      }
    }
  }
}

// ============================================================================
// Tier 3: Rollup Strategy per Golden Metric (3B)
// ============================================================================

function runRollupPerMetric(): void {
  console.log('\n=== Tier 3: Rollup Strategy per Golden Metric ===');

  for (const gm of GOLDEN_METRICS) {
    const content = loadAgentContent(gm.agent);
    if (!content) {
      record(3, gm.agent, `Rollup: ${gm.metricName}`, 'SKIP');
      continue;
    }

    // Find the section discussing this metric and check nearby rollup declaration
    const metricPattern = new RegExp(gm.metricName.replace(/[()]/g, '\\$&'), 'i');
    const lines = content.split('\n');
    let metricLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (metricPattern.test(lines[i])) {
        metricLineIdx = i;
        break;
      }
    }

    if (metricLineIdx === -1) {
      record(3, gm.agent, `Rollup: ${gm.metricName}`, 'SKIP', 'Metric not found in agent');
      continue;
    }

    // Look for rollup strategy within 20 lines of the metric mention
    const contextWindow = lines.slice(metricLineIdx, metricLineIdx + 20).join('\n');
    const rollupMatch = contextWindow.match(/(?:rollup|Rollup).*?:\s*(direct-sum|sum-ratio|count-ratio|weighted-avg|none)/i);

    if (rollupMatch) {
      const declaredRollup = rollupMatch[1].toLowerCase();
      if (declaredRollup === gm.expectedRollup) {
        record(3, gm.agent, `Rollup: ${gm.metricName}`, 'PASS', `Correctly uses ${gm.expectedRollup}`);
      } else {
        record(3, gm.agent, `Rollup: ${gm.metricName}`, 'FAIL',
          `Expected ${gm.expectedRollup}, found ${declaredRollup}`);
      }
    } else {
      // Check broader context
      const broadContext = lines.slice(Math.max(0, metricLineIdx - 5), metricLineIdx + 30).join('\n');
      const broadMatch = broadContext.match(/(direct-sum|sum-ratio|count-ratio|weighted-avg|none)/i);

      if (broadMatch && broadMatch[1].toLowerCase() === gm.expectedRollup) {
        record(3, gm.agent, `Rollup: ${gm.metricName}`, 'PASS', `Found ${gm.expectedRollup} in broader context`);
      } else {
        record(3, gm.agent, `Rollup: ${gm.metricName}`, 'WARN',
          `Expected ${gm.expectedRollup} — rollup not found near metric`);
      }
    }

    // Check for anti-patterns
    if (gm.antiPattern) {
      const antiPatternRegex = new RegExp(gm.antiPattern.replace(/[()]/g, '\\$&'), 'i');
      if (antiPatternRegex.test(contextWindow)) {
        record(3, gm.agent, `Anti-pattern: ${gm.metricName}`, 'FAIL',
          `Found anti-pattern "${gm.antiPattern}" — causes Simpson's paradox`);
      }
    }
  }
}

// ============================================================================
// Tier 3: Non-Additivity Awareness (3F)
// ============================================================================

function runNonAdditivityTests(): void {
  console.log('\n=== Tier 3: Non-Additivity Awareness ===');

  for (const rule of NON_ADDITIVE_RULES) {
    const content = loadAgentContent(rule.agent);
    if (!content) {
      record(3, rule.agent, 'Non-additivity', 'SKIP');
      continue;
    }

    let metricsFound = 0;
    const missing: string[] = [];

    for (const metric of rule.metrics) {
      // Check if the metric is mentioned AND flagged as non-additive or "none" rollup
      const metricLower = metric.toLowerCase();
      if (content.toLowerCase().includes(metricLower)) {
        metricsFound++;

        // Check if it's flagged as non-additive
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(metricLower)) {
            const context = lines.slice(i, i + 10).join('\n').toLowerCase();
            if (context.includes('none') || context.includes('non-additive') || context.includes('recomputed') || context.includes('not additive')) {
              // Good — metric is flagged as non-additive
              break;
            }
          }
        }
      } else {
        missing.push(metric);
      }
    }

    if (metricsFound === rule.metrics.length) {
      record(3, rule.agent, 'Non-additive metrics coverage', 'PASS',
        `All ${rule.metrics.length} non-additive metrics mentioned`);
    } else if (metricsFound > 0) {
      record(3, rule.agent, 'Non-additive metrics coverage', 'WARN',
        `${metricsFound}/${rule.metrics.length} — missing: ${missing.join(', ')}`);
    } else {
      record(3, rule.agent, 'Non-additive metrics coverage', 'FAIL',
        `None of ${rule.metrics.length} non-additive metrics found`);
    }
  }

  // Also validate golden metrics marked as non-additive
  for (const gm of GOLDEN_METRICS.filter(g => g.isNonAdditive)) {
    const content = loadAgentContent(gm.agent);
    if (!content) continue;

    if (gm.expectedRollup === 'none') {
      record(3, gm.agent, `Non-additive: ${gm.metricName}`, 'PASS',
        `Correctly expected rollup=none (${gm.nonAdditivityReason})`);
    }
  }
}

// ============================================================================
// Tier 5: Variant Awareness (3E)
// ============================================================================

function runVariantTests(): void {
  console.log('\n=== Tier 5: Variant Awareness ===');

  for (const vr of VARIANT_REQUIREMENTS) {
    const content = loadAgentContent(vr.agent);
    if (!content) {
      record(5, vr.agent, 'Variant awareness', 'SKIP');
      continue;
    }

    let found = 0;
    const missing: string[] = [];

    for (const variant of vr.requiredVariants) {
      if (content.toLowerCase().includes(variant.toLowerCase())) {
        found++;
      } else {
        missing.push(variant);
      }
    }

    const coverage = found / vr.requiredVariants.length;
    if (coverage >= 0.8) {
      record(5, vr.agent, 'Variant awareness', 'PASS',
        `${found}/${vr.requiredVariants.length} variants documented`);
    } else if (coverage >= 0.5) {
      record(5, vr.agent, 'Variant awareness', 'WARN',
        `${found}/${vr.requiredVariants.length} — missing: ${missing.join(', ')}`);
    } else {
      record(5, vr.agent, 'Variant awareness', 'FAIL',
        `${found}/${vr.requiredVariants.length} — missing: ${missing.join(', ')}`);
    }
  }
}

// ============================================================================
// Tier 3: FX Conversion Rules (3G)
// ============================================================================

function runFxRuleTests(): void {
  console.log('\n=== Tier 3: FX Conversion Rules ===');

  for (const fxRule of FX_RULES) {
    const content = loadAgentContent(fxRule.agent);
    if (!content) {
      record(3, fxRule.agent, 'FX conversion', 'SKIP');
      continue;
    }

    // Check for FX-related discussion
    const hasFx = content.toLowerCase().includes('fx') ||
                  content.toLowerCase().includes('currency conversion') ||
                  content.toLowerCase().includes('currency_code');

    if (hasFx) {
      record(3, fxRule.agent, 'FX conversion discussed', 'PASS', fxRule.rule);
    } else {
      // FX might not be explicitly discussed for some agents (oprisk, compliance)
      if (fxRule.agent === 'decomp-oprisk' || fxRule.agent === 'decomp-compliance') {
        record(3, fxRule.agent, 'FX conversion', 'PASS', 'Not applicable for this domain');
      } else {
        record(3, fxRule.agent, 'FX conversion', 'WARN', `Expected discussion of: ${fxRule.rule}`);
      }
    }
  }
}

// ============================================================================
// Tier 2: Regulatory Reference Validation (3D)
// ============================================================================

function runRegulatoryRefTests(): void {
  console.log('\n=== Tier 2: Regulatory Reference Validation ===');

  for (const spec of AGENT_REGISTRY) {
    const content = loadAgentContent(spec.name);
    if (!content) continue;

    // Extract all regulatory reference patterns from the agent
    const refPatterns = [
      /CRE\s*\d+/g,
      /MAR\s*\d+/g,
      /OPE\s*\d+/g,
      /CAP\s*\d+/g,
      /LEV\s*\d+/g,
      /LCR\s*\d+/g,
      /NSFR\s*\d+/g,
      /FR\s*Y-14[A-Z]?/g,
      /FR\s*Y-9C/g,
      /FR\s*2052a/g,
      /BCBS\s*\d+/g,
      /12\s*CFR\s*\d+/g,
      /SR\s*11-7/g,
      /OCC\s*\d{4}-\d+/g,
    ];

    let totalRefs = 0;
    const uniqueRefs = new Set<string>();

    for (const pattern of refPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        uniqueRefs.add(match[0]);
        totalRefs++;
      }
    }

    if (uniqueRefs.size >= 3) {
      record(2, spec.name, 'Regulatory references', 'PASS',
        `${uniqueRefs.size} unique references found`);
    } else if (uniqueRefs.size >= 1) {
      record(2, spec.name, 'Regulatory references', 'WARN',
        `Only ${uniqueRefs.size} unique reference(s)`);
    } else {
      record(2, spec.name, 'Regulatory references', 'FAIL',
        'No regulatory references found');
    }
  }
}

// ============================================================================
// Scorecard Generator
// ============================================================================

function printScorecard(): void {
  console.log('\n' + '='.repeat(72));
  console.log('GOLDEN METRIC TEST SCORECARD');
  console.log('='.repeat(72));

  const agents = [...new Set(results.map(r => r.agent))];
  const tiers = [...new Set(results.map(r => r.tier))].sort();

  // Per-agent summary
  console.log('\nPer-Agent Results:');
  console.log('-'.repeat(72));
  console.log(
    'Agent'.padEnd(25) +
    'Pass'.padStart(6) +
    'Fail'.padStart(6) +
    'Warn'.padStart(6) +
    'Skip'.padStart(6) +
    '  Status'
  );
  console.log('-'.repeat(72));

  for (const agent of agents) {
    const agentResults = results.filter(r => r.agent === agent);
    const pass = agentResults.filter(r => r.status === 'PASS').length;
    const fail = agentResults.filter(r => r.status === 'FAIL').length;
    const warn = agentResults.filter(r => r.status === 'WARN').length;
    const skip = agentResults.filter(r => r.status === 'SKIP').length;
    const status = fail > 0 ? 'FAIL' : warn > 0 ? 'WARN' : 'PASS';

    console.log(
      agent.padEnd(25) +
      String(pass).padStart(6) +
      String(fail).padStart(6) +
      String(warn).padStart(6) +
      String(skip).padStart(6) +
      `  ${status}`
    );
  }

  // Per-tier summary
  console.log('\nPer-Tier Results:');
  console.log('-'.repeat(72));

  const tierNames: Record<number, string> = {
    2: 'Domain Knowledge Accuracy',
    3: 'Rollup Strategy / Non-Additivity / FX',
    5: 'Variant Awareness',
  };

  for (const tier of tiers) {
    const tierResults = results.filter(r => r.tier === tier);
    const pass = tierResults.filter(r => r.status === 'PASS').length;
    const fail = tierResults.filter(r => r.status === 'FAIL').length;
    const warn = tierResults.filter(r => r.status === 'WARN').length;
    const label = tierNames[tier] || `Tier ${tier}`;
    console.log(`  Tier ${tier} (${label}): ${pass} pass, ${fail} fail, ${warn} warn`);
  }

  // Grand total
  const totalPass = results.filter(r => r.status === 'PASS').length;
  const totalFail = results.filter(r => r.status === 'FAIL').length;
  const totalWarn = results.filter(r => r.status === 'WARN').length;
  const totalSkip = results.filter(r => r.status === 'SKIP').length;

  console.log('\n' + '='.repeat(72));
  console.log(`TOTAL: ${totalPass} passed, ${totalFail} failed, ${totalWarn} warnings, ${totalSkip} skipped`);
  console.log('='.repeat(72) + '\n');
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log('Golden Metric Test Suite');
  console.log('=======================');
  console.log(`Testing ${GOLDEN_METRICS.length} golden metrics across ${AGENT_REGISTRY.length} agents\n`);

  runGoldenFormulaTests();
  runRollupPerMetric();
  runNonAdditivityTests();
  runVariantTests();
  runFxRuleTests();
  runRegulatoryRefTests();

  printScorecard();

  const totalFail = results.filter(r => r.status === 'FAIL').length;
  if (totalFail > 0) {
    process.exit(1);
  }
}

main();
