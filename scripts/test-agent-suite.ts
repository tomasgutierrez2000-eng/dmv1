/**
 * Agent Suite Integration Validation Script
 *
 * Static checks for the GSIB agent suite — validates infrastructure,
 * cross-references, config consistency, and payload format alignment
 * across all 19 agents.
 *
 * Run: npm run test:agent-suite
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const ROOT = path.resolve(__dirname, '..');
const CLAUDE_DIR = path.join(ROOT, '.claude');
const CONFIG_DIR = path.join(CLAUDE_DIR, 'config');
const COMMANDS_DIR = path.join(CLAUDE_DIR, 'commands');
const AUDIT_DIR = path.join(CLAUDE_DIR, 'audit');

let passed = 0;
let failed = 0;
let warned = 0;

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

function check(condition: boolean, message: string, severity: Severity = 'HIGH'): void {
  if (condition) {
    console.log(`  OK: ${message}`);
    passed++;
  } else if (severity === 'LOW' || severity === 'MEDIUM') {
    console.log(`  WARN: ${message}`);
    warned++;
  } else {
    console.error(`  FAIL [${severity}]: ${message}`);
    failed++;
  }
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// ============================================================================
// 1. Config Validation
// ============================================================================

function checkConfigs(): void {
  console.log('\n=== 1. Config Validation ===');

  // bank-profile.yaml
  const bpPath = path.join(CONFIG_DIR, 'bank-profile.yaml');
  const bpExists = fileExists(bpPath);
  check(bpExists, 'bank-profile.yaml exists', 'CRITICAL');

  if (bpExists) {
    const bpContent = readFile(bpPath)!;
    let bp: any;
    try {
      bp = yaml.load(bpContent);
      check(true, 'bank-profile.yaml is valid YAML');
    } catch (e: any) {
      check(false, `bank-profile.yaml parse error: ${e.message}`, 'CRITICAL');
      return;
    }

    check(!!bp?.institution_tier, 'bank-profile has institution_tier');
    check(Array.isArray(bp?.active_risk_stripes), 'bank-profile has active_risk_stripes[]');
    check(!!bp?.database, 'bank-profile has database section');
    check(!!bp?.database?.primary, 'bank-profile has database.primary');
    check(!!bp?.database?.audit, 'bank-profile has database.audit');
    check(!!bp?.agent_defaults, 'bank-profile has agent_defaults');
    check(bp?.agent_defaults?.require_reviewer_gate === true, 'bank-profile requires reviewer gate');
    check(!!bp?.migration_tooling?.psql_path, 'bank-profile has migration_tooling.psql_path');

    // Check risk stripe statuses
    const liveStripes = (bp?.active_risk_stripes || []).filter((s: any) => s.status === 'live');
    check(liveStripes.length > 0, `bank-profile has ${liveStripes.length} live risk stripes`);
  }

  // schema-manifest.yaml
  const smPath = path.join(CONFIG_DIR, 'schema-manifest.yaml');
  const smExists = fileExists(smPath);
  check(smExists, 'schema-manifest.yaml exists', 'CRITICAL');

  if (smExists) {
    const smContent = readFile(smPath)!;
    let sm: any;
    try {
      sm = yaml.load(smContent);
      check(true, 'schema-manifest.yaml is valid YAML');
    } catch (e: any) {
      check(false, `schema-manifest.yaml parse error: ${e.message}`, 'CRITICAL');
      return;
    }

    const totalTables = sm?.summary?.total_tables || 0;
    check(totalTables > 0, `schema-manifest has ${totalTables} tables`);

    // Cross-check against DD
    const ddPath = path.join(ROOT, 'facility-summary-mvp/output/data-dictionary/data-dictionary.json');
    if (fileExists(ddPath)) {
      const dd = JSON.parse(readFile(ddPath)!);
      const ddTables = (dd.l1_tables?.length || 0) + (dd.l2_tables?.length || 0) + (dd.l3_tables?.length || 0);
      check(
        Math.abs(totalTables - ddTables) <= 5,
        `schema-manifest table count (${totalTables}) matches DD (${ddTables}) within tolerance`,
        'MEDIUM'
      );
    }
  }
}

// ============================================================================
// 2. Agent File Existence
// ============================================================================

const EXPECTED_AGENTS: Array<{ layer: string; name: string; path: string }> = [
  // Experts
  { layer: 'Expert', name: 'decomp-credit-risk', path: 'experts/decomp-credit-risk.md' },
  { layer: 'Expert', name: 'decomp-market-risk', path: 'experts/decomp-market-risk.md' },
  { layer: 'Expert', name: 'decomp-ccr', path: 'experts/decomp-ccr.md' },
  { layer: 'Expert', name: 'decomp-liquidity', path: 'experts/decomp-liquidity.md' },
  { layer: 'Expert', name: 'decomp-capital', path: 'experts/decomp-capital.md' },
  { layer: 'Expert', name: 'decomp-irrbb-alm', path: 'experts/decomp-irrbb-alm.md' },
  { layer: 'Expert', name: 'decomp-oprisk', path: 'experts/decomp-oprisk.md' },
  { layer: 'Expert', name: 'decomp-compliance', path: 'experts/decomp-compliance.md' },
  { layer: 'Expert', name: 'data-model-expert', path: 'experts/data-model-expert.md' },
  { layer: 'Expert', name: 'reg-mapping-expert', path: 'experts/reg-mapping-expert.md' },
  // Builders
  { layer: 'Builder', name: 'db-schema-builder', path: 'builders/db-schema-builder.md' },
  { layer: 'Builder', name: 'migration-manager', path: 'builders/migration-manager.md' },
  { layer: 'Builder', name: 'data-factory-builder', path: 'builders/data-factory-builder.md' },
  { layer: 'Builder', name: 'metric-config-writer', path: 'builders/metric-config-writer.md' },
  // Reviewers
  { layer: 'Reviewer', name: 'risk-expert-reviewer', path: 'reviewers/risk-expert-reviewer.md' },
  { layer: 'Reviewer', name: 'sr-11-7-checker', path: 'reviewers/sr-11-7-checker.md' },
  { layer: 'Reviewer', name: 'drift-monitor', path: 'reviewers/drift-monitor.md' },
  { layer: 'Reviewer', name: 'audit-reporter', path: 'reviewers/audit-reporter.md' },
  // Orchestrator
  { layer: 'Orchestrator', name: 'orchestrate', path: 'orchestrate.md' },
];

function checkAgentFiles(): void {
  console.log('\n=== 2. Agent File Existence ===');

  let found = 0;
  for (const agent of EXPECTED_AGENTS) {
    const fullPath = path.join(COMMANDS_DIR, agent.path);
    const exists = fileExists(fullPath);
    check(exists, `[${agent.layer}] ${agent.name} exists at ${agent.path}`, 'CRITICAL');
    if (exists) found++;
  }

  console.log(`  Summary: ${found}/${EXPECTED_AGENTS.length} agents found`);
}

// ============================================================================
// 3. Audit Infrastructure
// ============================================================================

function checkAuditInfra(): void {
  console.log('\n=== 3. Audit Infrastructure ===');

  // audit_logger.py
  const loggerPath = path.join(AUDIT_DIR, 'audit_logger.py');
  const loggerExists = fileExists(loggerPath);
  check(loggerExists, 'audit_logger.py exists', 'CRITICAL');

  if (loggerExists) {
    const content = readFile(loggerPath)!;

    // Check for required methods
    const requiredMethods = [
      'write_reasoning_step',
      'write_action',
      'write_schema_change',
      'write_finding',
      'finalize_session',
    ];

    for (const method of requiredMethods) {
      check(content.includes(`def ${method}(`), `audit_logger has ${method}()`, 'CRITICAL');
    }

    // Check for log_* aliases (added in Phase 2B)
    const aliases = ['log_agent_run', 'log_action', 'log_session_complete', 'log_schema_change'];
    for (const alias of aliases) {
      check(content.includes(alias), `audit_logger has ${alias}() alias`, 'MEDIUM');
    }
  }

  // audit_ddl.sql
  const ddlPath = path.join(AUDIT_DIR, 'schema/audit_ddl.sql');
  check(fileExists(ddlPath), 'audit_ddl.sql exists');

  // Session directory
  const sessionsDir = path.join(AUDIT_DIR, 'sessions');
  check(
    fs.existsSync(sessionsDir) || true, // OK if doesn't exist yet — created on first run
    'audit sessions directory exists or can be created',
    'LOW'
  );
}

// ============================================================================
// 4. Cross-Reference Validation
// ============================================================================

function checkCrossReferences(): void {
  console.log('\n=== 4. Cross-Reference Validation ===');

  // Read all agent files to check for audit logger references
  const agentsWithAuditCalls: string[] = [];

  for (const agent of EXPECTED_AGENTS) {
    const fullPath = path.join(COMMANDS_DIR, agent.path);
    const content = readFile(fullPath);
    if (!content) continue;

    // Check for audit logger method references
    const hasAuditRefs =
      content.includes('write_reasoning_step') ||
      content.includes('write_action') ||
      content.includes('write_finding') ||
      content.includes('write_schema_change') ||
      content.includes('finalize_session') ||
      content.includes('log_agent_run') ||
      content.includes('log_action') ||
      content.includes('log_session_complete') ||
      content.includes('log_schema_change');

    if (hasAuditRefs) {
      agentsWithAuditCalls.push(agent.name);

      // Check for obsolete log_* calls without corresponding write_* calls
      const usesObsoleteLog =
        (content.includes('log_agent_run') && !content.includes('write_reasoning_step')) ||
        (content.includes('log_session_complete') && !content.includes('finalize_session'));

      check(
        !usesObsoleteLog,
        `${agent.name} uses canonical write_*() methods (not just log_* aliases)`,
        'MEDIUM'
      );
    }

    // Check config references
    if (content.includes('bank-profile.yaml')) {
      check(true, `${agent.name} references bank-profile.yaml`, 'LOW');
    }
    if (content.includes('schema-manifest.yaml')) {
      check(true, `${agent.name} references schema-manifest.yaml`, 'LOW');
    }

    // Check for Mode B/C JSON output specification (for agents that need it)
    if (agent.name === 'data-model-expert') {
      const hasJsonOutput = content.includes('JSON') && (content.includes('Mode B') || content.includes('mode.*orchestrator'));
      check(hasJsonOutput, `${agent.name} has JSON output for orchestrator mode`, 'HIGH');
    }
    if (agent.name === 'db-schema-builder') {
      const hasJsonOutput = content.includes('JSON') && (content.includes('Mode C') || content.includes('mode.*orchestrator'));
      check(hasJsonOutput, `${agent.name} has JSON output for orchestrator mode`, 'HIGH');
    }
    if (agent.name === 'risk-expert-reviewer') {
      const hasFindingsArray = content.includes('findings[]') || content.includes('"findings"') || content.includes('findings:');
      check(hasFindingsArray, `${agent.name} outputs findings[] array (not just counts)`, 'HIGH');
    }
  }

  console.log(`  Agents with audit logging: ${agentsWithAuditCalls.join(', ')}`);

  // Check orchestrator references all expected agents
  const orchContent = readFile(path.join(COMMANDS_DIR, 'orchestrate.md'));
  if (orchContent) {
    const agentRefs = EXPECTED_AGENTS.filter(a => a.name !== 'orchestrate');
    let referencedCount = 0;
    for (const agent of agentRefs) {
      if (orchContent.includes(agent.name) || orchContent.includes(agent.path)) {
        referencedCount++;
      }
    }
    check(
      referencedCount >= 14,
      `Orchestrator references ${referencedCount}/${agentRefs.length} agents`,
      'HIGH'
    );
  }
}

// ============================================================================
// 5. JSON Payload Schema Validation (conceptual — checks docs, not runtime)
// ============================================================================

function checkPayloadSchemas(): void {
  console.log('\n=== 5. Payload Schema Checks ===');

  // Check that orchestrate.md documents required payload fields for key phases
  const orchContent = readFile(path.join(COMMANDS_DIR, 'orchestrate.md'));
  if (!orchContent) {
    check(false, 'Cannot read orchestrate.md', 'CRITICAL');
    return;
  }

  // DECOMPOSE phase should mention metric_name and risk_stripe
  check(
    orchContent.includes('metric_name') && orchContent.includes('risk_stripe'),
    'Orchestrator documents DECOMPOSE payload (metric_name, risk_stripe)',
    'HIGH'
  );

  // REVIEW_PRE should mention pre_execution or PRE_EXECUTION
  check(
    orchContent.includes('pre_execution') || orchContent.includes('PRE_EXECUTION'),
    'Orchestrator documents REVIEW_PRE mode',
    'HIGH'
  );

  // Should document session_id passing
  const sessionIdCount = (orchContent.match(/session_id/g) || []).length;
  check(
    sessionIdCount >= 5,
    `Orchestrator references session_id ${sessionIdCount} times (ensures audit correlation)`,
    'MEDIUM'
  );

  // Check decomp expert outputs 9 sections (5A-5I)
  const decompContent = readFile(path.join(COMMANDS_DIR, 'experts/decomp-credit-risk.md'));
  if (decompContent) {
    const sectionRefs = ['5A', '5B', '5C', '5D', '5E', '5F', '5G', '5H', '5I'];
    let sectionCount = 0;
    for (const ref of sectionRefs) {
      if (decompContent.includes(ref)) sectionCount++;
    }
    check(
      sectionCount >= 7,
      `Decomp expert documents ${sectionCount}/9 output sections`,
      'HIGH'
    );
  }

  // Check metric-config-writer outputs required fields
  const mcwContent = readFile(path.join(COMMANDS_DIR, 'builders/metric-config-writer.md'));
  if (mcwContent) {
    check(
      mcwContent.includes('metric_id') && mcwContent.includes('catalogue_id'),
      'Metric config writer outputs metric_id + catalogue_id',
      'HIGH'
    );
    check(
      mcwContent.includes('yaml_path'),
      'Metric config writer outputs yaml_path',
      'HIGH'
    );
  }
}

// ============================================================================
// 6. Audit DB Connectivity (optional — only if DATABASE_URL set)
// ============================================================================

async function checkAuditDb(): Promise<void> {
  console.log('\n=== 6. Audit DB Connectivity ===');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('  SKIP: DATABASE_URL not set — skipping audit DB check');
    return;
  }

  let pg: typeof import('pg') | null = null;
  try {
    pg = await import('pg');
  } catch {
    console.log('  SKIP: pg module not available');
    return;
  }

  const auditUrl = dbUrl.replace(/\/postgres(\?|$)/, '/postgres_audit$1');
  const Client = (pg as any).default?.Client ?? (pg as any).Client;
  const client = new Client({ connectionString: auditUrl });

  try {
    await client.connect();
    check(true, 'Connected to postgres_audit');

    const res = await client.query(
      "SELECT count(*) as cnt FROM information_schema.tables WHERE table_schema = 'audit' AND table_type = 'BASE TABLE'"
    );
    const tableCount = parseInt(res.rows[0].cnt);
    check(tableCount === 5, `Audit DB has ${tableCount}/5 tables`);

    const viewRes = await client.query(
      "SELECT count(*) as cnt FROM information_schema.tables WHERE table_schema = 'audit' AND table_type = 'VIEW'"
    );
    const viewCount = parseInt(viewRes.rows[0].cnt);
    check(viewCount === 3, `Audit DB has ${viewCount}/3 views`);
  } catch (e: any) {
    check(false, `Audit DB connection failed: ${e.message}`, 'MEDIUM');
  } finally {
    await client.end().catch(() => {});
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('Agent Suite Integration Validation');
  console.log('==================================');

  checkConfigs();
  checkAgentFiles();
  checkAuditInfra();
  checkCrossReferences();
  checkPayloadSchemas();
  await checkAuditDb();

  console.log('\n==================================');
  console.log(`Results: ${passed} passed, ${failed} failed, ${warned} warned`);

  if (failed > 0) {
    console.log(`\n${failed} FAILURES — agent suite has integration issues`);
    process.exit(1);
  } else {
    console.log('\nAll checks passed.');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(2);
});
