#!/usr/bin/env npx tsx
/**
 * Comprehensive parameterized test suite for all 8 decomposition agents.
 * Validates structural integrity, rollup strategies, DD references, output
 * format consistency, audit API usage, and cross-agent consistency.
 *
 * Tiers covered:
 *   Tier 1: Structural Integrity (all 8 agents)
 *   Tier 3: Rollup Strategy Correctness (per agent)
 *   Tier 4: Source Field Validation (per agent)
 *   Tier 6: Cross-Agent Consistency
 *
 * Usage: npx tsx scripts/test-decomp-agents.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AGENT_REGISTRY,
  AgentSpec,
  REQUIRED_SECTION_PREFIXES,
  OUTPUT_BLOCKS,
  VALID_ROLLUP_STRATEGIES,
  CANONICAL_AUDIT_METHODS,
  DEPRECATED_AUDIT_ALIASES,
  SHARED_VOCABULARY,
  COMPLIANCE_UPSTREAM_AGENTS,
} from './decomp-agent-test-fixtures';

const ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, '.claude/commands');
const DD_FILE = path.join(ROOT, 'facility-summary-mvp/output/data-dictionary/data-dictionary.json');

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
// Data Dictionary Loader
// ============================================================================

interface DDTable {
  name: string;
  layer: string;
  fields: Array<{ name: string }>;
}

interface DataDictionary {
  L1: DDTable[];
  L2: DDTable[];
  L3: DDTable[];
  [key: string]: unknown;
}

let ddLookup: Map<string, Set<string>> | null = null;

function loadDD(): Map<string, Set<string>> | null {
  if (ddLookup !== null) return ddLookup;
  if (!fs.existsSync(DD_FILE)) return null;

  const dd: DataDictionary = JSON.parse(fs.readFileSync(DD_FILE, 'utf-8'));
  ddLookup = new Map<string, Set<string>>();

  for (const layerKey of ['L1', 'L2', 'L3']) {
    const tables = dd[layerKey as keyof DataDictionary];
    if (!Array.isArray(tables)) continue;
    const schema = layerKey.toLowerCase();
    for (const table of tables as DDTable[]) {
      const key = `${schema}.${table.name}`;
      const fields = new Set(table.fields?.map(f => f.name) ?? []);
      ddLookup.set(key, fields);
    }
  }
  return ddLookup;
}

// ============================================================================
// Agent Content Cache
// ============================================================================

const agentContentCache = new Map<string, string>();

function loadAgentContent(spec: AgentSpec): string | null {
  if (agentContentCache.has(spec.name)) return agentContentCache.get(spec.name)!;
  const filePath = path.join(COMMANDS_DIR, spec.file);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  agentContentCache.set(spec.name, content);
  return content;
}

// ============================================================================
// Tier 1: Structural Integrity
// ============================================================================

function runTier1(spec: AgentSpec): void {
  console.log(`\n--- Tier 1: Structural Integrity [${spec.name}] ---`);

  const content = loadAgentContent(spec);
  if (!content) {
    record(1, spec.name, 'Agent file exists', 'FAIL', `File not found: ${spec.file}`);
    return;
  }

  // 1a. File size sanity
  const lineCount = content.split('\n').length;
  if (lineCount > 400) {
    record(1, spec.name, 'Agent file size', 'PASS', `${lineCount} lines`);
  } else {
    record(1, spec.name, 'Agent file size', 'FAIL', `Only ${lineCount} lines (expected >400)`);
  }

  // 1b. Required sections (9 standard + 1 domain-specific knowledge base)
  for (const section of REQUIRED_SECTION_PREFIXES) {
    if (content.includes(section)) {
      record(1, spec.name, `Section: ${section}`, 'PASS');
    } else {
      record(1, spec.name, `Section: ${section}`, 'FAIL', 'Missing');
    }
  }

  // 1c. Domain-specific knowledge base header
  if (content.includes(spec.knowledgeBaseHeader)) {
    record(1, spec.name, `Knowledge base: ${spec.knowledgeBaseHeader}`, 'PASS');
  } else {
    // Try fuzzy match — some agents may use slightly different wording
    const fuzzyPattern = /## 4\.\s+\w+.*Knowledge Base/;
    if (fuzzyPattern.test(content)) {
      record(1, spec.name, `Knowledge base header`, 'WARN', `Expected "${spec.knowledgeBaseHeader}" but found a variant`);
    } else {
      record(1, spec.name, `Knowledge base: ${spec.knowledgeBaseHeader}`, 'FAIL', 'Missing');
    }
  }

  // 1d. Output format blocks (5A-5I)
  for (const block of OUTPUT_BLOCKS) {
    if (content.includes(`### ${block}.`) || content.includes(`**${block}.`) || content.includes(`${block}.`)) {
      record(1, spec.name, `Output block ${block}`, 'PASS');
    } else {
      record(1, spec.name, `Output block ${block}`, 'FAIL', 'Missing');
    }
  }

  // 1e. Invocation modes (Mode A + Mode B)
  const hasModeA = content.includes('Mode A') || content.includes('Direct');
  const hasModeB = content.includes('Mode B') || content.includes('Orchestrator');
  record(1, spec.name, 'Mode A (Direct)', hasModeA ? 'PASS' : 'FAIL');
  record(1, spec.name, 'Mode B (Orchestrator)', hasModeB ? 'PASS' : 'FAIL');

  // 1f. Confirmation gate
  const hasConfirmation = content.includes('Confirmation Gate') || content.includes('confirmation');
  record(1, spec.name, 'Confirmation gate', hasConfirmation ? 'PASS' : 'FAIL');

  // 1g. Audit logging hooks — agents reference AuditLogger or audit logging section
  const hasAuditLogging =
    CANONICAL_AUDIT_METHODS.some(m => content.includes(m)) ||
    content.includes('AuditLogger') ||
    content.includes('Audit Logging') ||
    content.includes('audit logger') ||
    content.includes('log to audit');
  record(1, spec.name, 'Audit logging hooks', hasAuditLogging ? 'PASS' : 'FAIL');

  // 1h. Duplicate detection algorithm
  const hasDuplicateDetection = content.includes('Duplicate Detection') || content.includes('duplicate');
  record(1, spec.name, 'Duplicate detection', hasDuplicateDetection ? 'PASS' : 'FAIL');
}

// ============================================================================
// Tier 2 (partial): Rollup Strategy Extraction & Validation
// ============================================================================

function runTier2Rollup(spec: AgentSpec): void {
  console.log(`\n--- Tier 2: Rollup Strategy [${spec.name}] ---`);

  const content = loadAgentContent(spec);
  if (!content) {
    record(2, spec.name, 'Rollup extraction', 'SKIP', 'No agent file');
    return;
  }

  // Extract rollup strategy declarations
  // The pattern in agent files is: **Rollup**: strategy-name (possibly with extra text)
  // We look for known strategy names after "Rollup" markers
  const rollupLinePattern = /\*\*Rollup\*\*:\s*(.+)/g;
  let match;
  const foundStrategies = new Set<string>();
  let strategyCount = 0;

  while ((match = rollupLinePattern.exec(content)) !== null) {
    const lineText = match[1];
    // Extract known strategies from the line
    const strategyMatches = lineText.match(/\b(direct-sum|sum-ratio|count-ratio|weighted-avg|none)\b/gi);
    if (strategyMatches) {
      for (const s of strategyMatches) {
        const strategy = s.toLowerCase();
        foundStrategies.add(strategy);
        strategyCount++;
        if (VALID_ROLLUP_STRATEGIES.includes(strategy)) {
          record(2, spec.name, `Rollup strategy: ${strategy}`, 'PASS');
        } else {
          record(2, spec.name, `Rollup strategy: ${strategy}`, 'FAIL', 'Unknown strategy');
        }
      }
    } else {
      // Line has a rollup declaration but uses prose (e.g., "Not standard sum", "Recomputed")
      // This is fine — the agent is describing a non-additive metric
      if (lineText.match(/\b(not|recomputed|requires|must|non-additive|inherently)\b/i)) {
        foundStrategies.add('none');
        strategyCount++;
        record(2, spec.name, `Rollup strategy: none (implied)`, 'PASS', `Prose: "${lineText.substring(0, 60)}"`);
      }
    }
  }

  if (strategyCount === 0) {
    // Also try alternate patterns
    const altPattern = /rollup.*?:\s*(direct-sum|sum-ratio|count-ratio|weighted-avg|none)/gi;
    while ((match = altPattern.exec(content)) !== null) {
      const strategy = match[1].toLowerCase();
      foundStrategies.add(strategy);
      strategyCount++;
    }
  }

  if (strategyCount > 0) {
    record(2, spec.name, 'Rollup strategies found', 'PASS', `${strategyCount} declarations, ${foundStrategies.size} unique`);
  } else {
    record(2, spec.name, 'Rollup strategies found', 'WARN', 'No rollup strategies detected');
  }

  // Check for anti-patterns: AVG of ratios
  if (content.match(/AVG\s*\(\s*(?:ratio|rate|pct|percentage)/i)) {
    record(2, spec.name, 'AVG of ratios anti-pattern', 'FAIL', 'Found AVG() applied to a ratio — should use sum-ratio');
  }
}

// ============================================================================
// Tier 2 (partial): Rollup Hierarchy Validation
// ============================================================================

function runTier2Hierarchy(spec: AgentSpec): void {
  if (spec.rollupHierarchy.length === 0) {
    record(2, spec.name, 'Rollup hierarchy', 'SKIP', 'No expected hierarchy (varies by sub-domain)');
    return;
  }

  const content = loadAgentContent(spec);
  if (!content) return;

  // Check that each hierarchy level is mentioned in the agent
  let levelsFound = 0;
  for (const level of spec.rollupHierarchy) {
    if (content.toLowerCase().includes(level.toLowerCase())) {
      levelsFound++;
    }
  }

  const coverage = levelsFound / spec.rollupHierarchy.length;
  if (coverage >= 0.8) {
    record(2, spec.name, 'Rollup hierarchy coverage', 'PASS', `${levelsFound}/${spec.rollupHierarchy.length} levels mentioned`);
  } else if (coverage >= 0.5) {
    record(2, spec.name, 'Rollup hierarchy coverage', 'WARN', `Only ${levelsFound}/${spec.rollupHierarchy.length} levels`);
  } else {
    record(2, spec.name, 'Rollup hierarchy coverage', 'FAIL', `Only ${levelsFound}/${spec.rollupHierarchy.length} levels`);
  }
}

// ============================================================================
// Tier 4: Source Field DD Validation
// ============================================================================

function runTier4(spec: AgentSpec): void {
  console.log(`\n--- Tier 4: Source Field Validation [${spec.name}] ---`);

  const content = loadAgentContent(spec);
  if (!content) {
    record(4, spec.name, 'Source field validation', 'SKIP', 'No agent file');
    return;
  }

  const dd = loadDD();
  if (!dd) {
    record(4, spec.name, 'Source field validation', 'SKIP', 'Data dictionary not found');
    return;
  }

  // Extract l[123].table.field references
  const sourceRefPattern = /`(l[123])\.(\w+)\.(\w+)`/g;
  let match;
  const refs: Array<{ schema: string; table: string; field: string }> = [];

  while ((match = sourceRefPattern.exec(content)) !== null) {
    refs.push({ schema: match[1], table: match[2], field: match[3] });
  }

  if (refs.length === 0) {
    record(4, spec.name, 'Source references', 'WARN', 'No `l[123].table.field` references found');
    return;
  }

  record(4, spec.name, 'Source references count', 'PASS', `${refs.length} references found`);

  let validCount = 0;
  let tableNotFound = 0;
  let fieldNotFound = 0;

  for (const ref of refs) {
    const tableKey = `${ref.schema}.${ref.table}`;
    const fields = dd.get(tableKey);

    if (!fields) {
      tableNotFound++;
      if (tableNotFound <= 5) { // limit noise
        record(4, spec.name, `Table: ${tableKey}`, 'FAIL', `Not in DD (field: ${ref.field})`);
      }
    } else if (!fields.has(ref.field)) {
      fieldNotFound++;
      if (fieldNotFound <= 5) {
        record(4, spec.name, `Field: ${tableKey}.${ref.field}`, 'FAIL', 'Not in DD');
      }
    } else {
      validCount++;
    }
  }

  if (tableNotFound > 5) {
    record(4, spec.name, 'Tables not in DD', 'FAIL', `${tableNotFound} total (showing first 5)`);
  }
  if (fieldNotFound > 5) {
    record(4, spec.name, 'Fields not in DD', 'FAIL', `${fieldNotFound} total (showing first 5)`);
  }

  const validPct = refs.length > 0 ? Math.round((validCount / refs.length) * 100) : 0;
  if (validPct >= 90) {
    record(4, spec.name, 'DD coverage', 'PASS', `${validCount}/${refs.length} (${validPct}%) references valid`);
  } else if (validPct >= 70) {
    record(4, spec.name, 'DD coverage', 'WARN', `${validCount}/${refs.length} (${validPct}%) — some gaps`);
  } else {
    record(4, spec.name, 'DD coverage', 'FAIL', `${validCount}/${refs.length} (${validPct}%) — significant gaps`);
  }

  // Layer assignment validation — flag L3 sourcing
  const l3Sources = refs.filter(r => r.schema === 'l3');
  if (l3Sources.length > 0 && spec.schemaMaturity === 'mature') {
    record(4, spec.name, 'L3 sourcing check', 'WARN', `${l3Sources.length} references to L3 tables — ingredients should come from L1/L2`);
  }
}

// ============================================================================
// Tier 1 (supplemental): Audit API Consistency
// ============================================================================

function runAuditConsistency(spec: AgentSpec): void {
  const content = loadAgentContent(spec);
  if (!content) return;

  // Check canonical methods — agents may reference AuditLogger class rather than individual methods
  const usesCanonical = CANONICAL_AUDIT_METHODS.filter(m => content.includes(m));
  const hasAuditLoggerRef = content.includes('AuditLogger') || content.includes('Audit Logging');
  record(1, spec.name, 'Canonical audit methods',
    usesCanonical.length >= 3 || hasAuditLoggerRef ? 'PASS' : 'WARN',
    hasAuditLoggerRef
      ? `References AuditLogger (${usesCanonical.length} method names)`
      : `Uses ${usesCanonical.length}/${CANONICAL_AUDIT_METHODS.length}: ${usesCanonical.join(', ')}`);

  // Flag deprecated aliases
  const usesDeprecated = DEPRECATED_AUDIT_ALIASES.filter(a => content.includes(a));
  if (usesDeprecated.length > 0) {
    record(1, spec.name, 'Deprecated audit aliases', 'WARN', `Uses deprecated: ${usesDeprecated.join(', ')}`);
  }
}

// ============================================================================
// Tier 6: Cross-Agent Consistency
// ============================================================================

function runTier6CrossAgent(): void {
  console.log('\n=== Tier 6: Cross-Agent Consistency ===');

  // 6A. Output schema format identical across all 8
  console.log('\n--- 6A: Output Format Consistency ---');
  const blockPresence: Record<string, string[]> = {};

  for (const block of OUTPUT_BLOCKS) {
    blockPresence[block] = [];
    for (const spec of AGENT_REGISTRY) {
      const content = loadAgentContent(spec);
      if (content && (content.includes(`### ${block}.`) || content.includes(`**${block}.`) || content.includes(`${block}.`))) {
        blockPresence[block].push(spec.name);
      }
    }
  }

  for (const block of OUTPUT_BLOCKS) {
    const agents = blockPresence[block];
    if (agents.length === AGENT_REGISTRY.length) {
      record(6, 'cross-agent', `Block ${block} present in all agents`, 'PASS');
    } else {
      const missing = AGENT_REGISTRY.filter(s => !agents.includes(s.name)).map(s => s.name);
      record(6, 'cross-agent', `Block ${block}`, 'FAIL', `Missing in: ${missing.join(', ')}`);
    }
  }

  // 6B. Shared vocabulary consistency
  console.log('\n--- 6B: Shared Vocabulary ---');
  for (const [vocabName, validValues] of Object.entries(SHARED_VOCABULARY)) {
    let agentsWithVocab = 0;
    for (const spec of AGENT_REGISTRY) {
      const content = loadAgentContent(spec);
      if (!content) continue;
      const hasAny = validValues.some(v => content.includes(v));
      if (hasAny) agentsWithVocab++;
    }

    if (agentsWithVocab >= 6) {
      record(6, 'cross-agent', `Vocabulary "${vocabName}"`, 'PASS', `Referenced by ${agentsWithVocab}/8 agents`);
    } else {
      record(6, 'cross-agent', `Vocabulary "${vocabName}"`, 'WARN', `Only ${agentsWithVocab}/8 agents reference it`);
    }
  }

  // 6C. Compliance agent upstream references
  console.log('\n--- 6C: Compliance Upstream References ---');
  const complianceSpec = AGENT_REGISTRY.find(s => s.name === 'decomp-compliance');
  if (complianceSpec) {
    const compContent = loadAgentContent(complianceSpec);
    if (compContent) {
      for (const upstream of COMPLIANCE_UPSTREAM_AGENTS) {
        const patterns = upstream.reference.split('|');
        const found = patterns.some(p => compContent.toLowerCase().includes(p.toLowerCase()));
        if (found) {
          record(6, 'decomp-compliance', `Upstream: ${upstream.agent}`, 'PASS');
        } else {
          // Also check if the agent name itself is referenced
          if (compContent.includes(upstream.agent) || compContent.includes(upstream.agent.replace('decomp-', ''))) {
            record(6, 'decomp-compliance', `Upstream: ${upstream.agent}`, 'PASS', 'Agent name referenced');
          } else {
            record(6, 'decomp-compliance', `Upstream: ${upstream.agent}`, 'WARN', `Expected reference to "${upstream.reference}"`);
          }
        }
      }
    }
  }

  // 6D. Integration point cross-references
  console.log('\n--- 6D: Integration Point Cross-References ---');
  const allAgentNames = [
    ...AGENT_REGISTRY.map(s => s.name),
    'data-model-expert', 'reg-mapping-expert',
    'db-schema-builder', 'migration-manager', 'data-factory-builder', 'metric-config-writer',
    'risk-expert-reviewer', 'sr-11-7-checker', 'drift-monitor', 'audit-reporter',
    'orchestrate',
  ];

  for (const spec of AGENT_REGISTRY) {
    const content = loadAgentContent(spec);
    if (!content) continue;

    // Count how many other agents this agent references
    const referencedAgents = allAgentNames.filter(name =>
      name !== spec.name && (content.includes(name) || content.includes(name.replace('decomp-', '')))
    );

    if (referencedAgents.length >= 2) {
      record(6, spec.name, 'Cross-agent references', 'PASS', `References ${referencedAgents.length} other agents`);
    } else if (referencedAgents.length >= 1) {
      record(6, spec.name, 'Cross-agent references', 'WARN', `Only references ${referencedAgents.length} other agent(s)`);
    } else {
      record(6, spec.name, 'Cross-agent references', 'WARN', 'No cross-agent references found');
    }
  }
}

// ============================================================================
// Sub-Domain Coverage (Tier 2)
// ============================================================================

function runSubDomainCoverage(spec: AgentSpec): void {
  const content = loadAgentContent(spec);
  if (!content) return;

  let covered = 0;
  const missing: string[] = [];

  for (const subDomain of spec.expectedSubDomains) {
    if (content.toLowerCase().includes(subDomain.toLowerCase())) {
      covered++;
    } else {
      missing.push(subDomain);
    }
  }

  const coverage = covered / spec.expectedSubDomains.length;
  if (coverage >= 0.8) {
    record(2, spec.name, 'Sub-domain coverage', 'PASS', `${covered}/${spec.expectedSubDomains.length}`);
  } else if (coverage >= 0.6) {
    record(2, spec.name, 'Sub-domain coverage', 'WARN', `${covered}/${spec.expectedSubDomains.length} — missing: ${missing.join(', ')}`);
  } else {
    record(2, spec.name, 'Sub-domain coverage', 'FAIL', `${covered}/${spec.expectedSubDomains.length} — missing: ${missing.join(', ')}`);
  }
}

// ============================================================================
// Regulatory Framework Presence (Tier 2)
// ============================================================================

function runRegulatoryFrameworks(spec: AgentSpec): void {
  const content = loadAgentContent(spec);
  if (!content) return;

  let found = 0;
  const missing: string[] = [];

  for (const framework of spec.expectedRegulatoryFrameworks) {
    if (content.includes(framework)) {
      found++;
    } else {
      missing.push(framework);
    }
  }

  if (found === spec.expectedRegulatoryFrameworks.length) {
    record(2, spec.name, 'Regulatory frameworks', 'PASS', `All ${found} expected frameworks present`);
  } else {
    record(2, spec.name, 'Regulatory frameworks', 'WARN', `${found}/${spec.expectedRegulatoryFrameworks.length} — missing: ${missing.join(', ')}`);
  }
}

// ============================================================================
// Scorecard Generator
// ============================================================================

function printScorecard(): void {
  console.log('\n' + '='.repeat(72));
  console.log('DECOMPOSITION AGENT TEST SCORECARD');
  console.log('='.repeat(72));

  // Per-agent summary
  const agents = [...new Set(results.map(r => r.agent))];
  const tiers = [...new Set(results.map(r => r.tier))].sort();

  // Header
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
    1: 'Structural Integrity',
    2: 'Domain Knowledge',
    4: 'Source Field Validation',
    6: 'Cross-Agent Consistency',
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
  console.log('Decomposition Agent Test Suite');
  console.log('==============================');
  console.log(`Testing ${AGENT_REGISTRY.length} agents across 4 tiers\n`);

  // Phase 2: Per-agent structural + rollup + DD tests
  for (const spec of AGENT_REGISTRY) {
    runTier1(spec);
    runTier2Rollup(spec);
    runTier2Hierarchy(spec);
    runSubDomainCoverage(spec);
    runRegulatoryFrameworks(spec);
    runAuditConsistency(spec);
    runTier4(spec);
  }

  // Phase 4: Cross-agent consistency
  runTier6CrossAgent();

  // Scorecard
  printScorecard();

  // Exit code
  const totalFail = results.filter(r => r.status === 'FAIL').length;
  if (totalFail > 0) {
    process.exit(1);
  }
}

main();
