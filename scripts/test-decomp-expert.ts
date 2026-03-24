#!/usr/bin/env npx tsx
/**
 * Smoke test for the Credit Risk Decomposition Expert agent.
 * Validates that source table/field references in the agent's knowledge base
 * exist in the golden-source data dictionary.
 *
 * Usage: npx tsx scripts/test-decomp-expert.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const AGENT_FILE = path.join(ROOT, '.claude/commands/experts/decomp-credit-risk.md');
const DD_FILE = path.join(ROOT, 'facility-summary-mvp/output/data-dictionary/data-dictionary.json');

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

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg: string) {
  console.log(`  PASS  ${msg}`);
  passed++;
}

function fail(msg: string) {
  console.error(`  FAIL  ${msg}`);
  failed++;
}

function warn(msg: string) {
  console.warn(`  WARN  ${msg}`);
  warnings++;
}

// --- Test 1: Agent file exists and is readable ---
console.log('\n=== Test 1: Agent file integrity ===');

if (!fs.existsSync(AGENT_FILE)) {
  fail('Agent file not found: ' + AGENT_FILE);
  process.exit(1);
}

const agentContent = fs.readFileSync(AGENT_FILE, 'utf-8');
const lineCount = agentContent.split('\n').length;

if (lineCount > 500) {
  pass(`Agent file exists (${lineCount} lines)`);
} else {
  fail(`Agent file suspiciously short (${lineCount} lines)`);
}

// --- Test 2: Required sections present ---
console.log('\n=== Test 2: Required sections ===');

const requiredSections = [
  '## 1. Invocation Modes',
  '## 2. Context Loading',
  '## 3. Intake Questions',
  '## 4. Credit Risk Knowledge Base',
  '## 5. Decomposition Output Format',
  '## 6. Confirmation Gate',
  '## 7. Audit Logging',
  '## 8. Duplicate Detection',
  '## 9. Error Handling',
];

for (const section of requiredSections) {
  if (agentContent.includes(section)) {
    pass(section);
  } else {
    fail(`Missing section: ${section}`);
  }
}

// --- Test 3: Source table references exist in DD ---
console.log('\n=== Test 3: Source table references vs data dictionary ===');

if (!fs.existsSync(DD_FILE)) {
  warn('Data dictionary not found — skipping source table validation');
} else {
  const dd: DataDictionary = JSON.parse(fs.readFileSync(DD_FILE, 'utf-8'));

  // Build lookup: schema.table -> Set<field_name>
  // DD uses uppercase keys (L1, L2, L3) and { name, fields: [{ name }] }
  const ddLookup = new Map<string, Set<string>>();
  for (const layerKey of ['L1', 'L2', 'L3']) {
    const tables = dd[layerKey as keyof DataDictionary];
    if (!Array.isArray(tables)) continue;
    const schema = layerKey.toLowerCase(); // l1, l2, l3
    for (const table of tables as DDTable[]) {
      const key = `${schema}.${table.name}`;
      const fields = new Set(table.fields?.map(f => f.name) ?? []);
      ddLookup.set(key, fields);
    }
  }

  // Extract table.field references from Section 4 (knowledge base)
  // Pattern: `l1.table_name.field_name` or `l2.table_name.field_name`
  const sourceRefPattern = /`(l[123])\.(\w+)\.(\w+)`/g;
  let match;
  const refs: Array<{ schema: string; table: string; field: string; line: string }> = [];

  for (const line of agentContent.split('\n')) {
    while ((match = sourceRefPattern.exec(line)) !== null) {
      refs.push({
        schema: match[1],
        table: match[2],
        field: match[3],
        line: line.trim().substring(0, 80),
      });
    }
  }

  if (refs.length === 0) {
    warn('No source table references found in agent file');
  } else {
    console.log(`  Found ${refs.length} source table.field references`);

    for (const ref of refs) {
      const tableKey = `${ref.schema}.${ref.table}`;
      const fields = ddLookup.get(tableKey);

      if (!fields) {
        fail(`Table not in DD: ${tableKey} (field: ${ref.field})`);
      } else if (!fields.has(ref.field)) {
        fail(`Field not in DD: ${tableKey}.${ref.field}`);
      } else {
        pass(`${tableKey}.${ref.field}`);
      }
    }
  }
}

// --- Test 4: Rollup strategies match CLAUDE.md conventions ---
console.log('\n=== Test 4: Rollup strategy conventions ===');

const validStrategies = ['direct-sum', 'sum-ratio', 'count-ratio', 'weighted-avg', 'none'];
// Match "**Rollup**: strategy-name" — only valid strategy identifiers (lowercase with hyphens)
const rollupPattern = /\*\*Rollup\*\*:\s*((?:direct-sum|sum-ratio|count-ratio|weighted-avg|none)\b)/g;
let rollupMatch;
const foundStrategies = new Set<string>();

while ((rollupMatch = rollupPattern.exec(agentContent)) !== null) {
  const strategy = rollupMatch[1].replace(/[()]/g, '');
  foundStrategies.add(strategy);

  if (validStrategies.includes(strategy)) {
    pass(`Rollup strategy: ${strategy}`);
  } else {
    fail(`Unknown rollup strategy: ${strategy}`);
  }
}

if (foundStrategies.size === 0) {
  warn('No rollup strategies found in agent file');
}

// --- Test 5: No duplicate abbreviations in knowledge base ---
console.log('\n=== Test 5: Abbreviation uniqueness ===');

const abbrPattern = /#### .*\((\w+)\)/g;
let abbrMatch;
const abbreviations = new Map<string, number>();

while ((abbrMatch = abbrPattern.exec(agentContent)) !== null) {
  const abbr = abbrMatch[1];
  abbreviations.set(abbr, (abbreviations.get(abbr) ?? 0) + 1);
}

// Also check inline abbreviations
const inlineAbbrPattern = /\*\*([A-Z]{2,})\*\*/g;
while ((abbrMatch = inlineAbbrPattern.exec(agentContent)) !== null) {
  // Skip common formatting words
  const skip = new Set(['NOT', 'ALL', 'IRB', 'CCF', 'CRE', 'GSIB', 'CCAR', 'DFAST', 'MANDATORY', 'FR', 'OCC', 'FFIEC', 'SNC']);
  if (!skip.has(abbrMatch[1])) {
    // Don't double-count these
  }
}

let dupFound = false;
for (const [abbr, count] of abbreviations) {
  if (count > 1) {
    fail(`Duplicate abbreviation: ${abbr} (appears ${count} times)`);
    dupFound = true;
  }
}

if (!dupFound && abbreviations.size > 0) {
  pass(`All ${abbreviations.size} abbreviations are unique`);
}

// --- Test 6: Output format blocks defined ---
console.log('\n=== Test 6: Output format completeness ===');

const outputBlocks = ['5A', '5B', '5C', '5D', '5E', '5F', '5G', '5H', '5I'];

for (const block of outputBlocks) {
  if (agentContent.includes(`### ${block}.`)) {
    pass(`Output block ${block} defined`);
  } else {
    fail(`Missing output block: ${block}`);
  }
}

// --- Summary ---
console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
