/**
 * Sync hardcoded table/metric counts in CLAUDE.md and playbook docs
 * with the actual metadata source files.
 *
 * Reads:
 *   data/l1-table-meta.ts          → L1 table count
 *   data/l2-table-meta.ts          → L2 table count
 *   data/l3-tables.ts              → L3 table count
 *   data/metric-library/domains.json    → domain count
 *   data/metric-library/catalogue.json  → catalogue item count
 *
 * Updates:
 *   CLAUDE.md
 *   docs/playbook/01-data-model-overview.md
 *   docs/playbook/02-platform-capabilities.md
 *   docs/playbook/README.md
 *
 * Usage: npm run doc:sync
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

// ── Count extraction ────────────────────────────────────────────────────

function countPattern(filePath: string, pattern: RegExp): number {
  const content = fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function countJson(filePath: string): number {
  const content = fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
  return JSON.parse(content).length;
}

const l1Count = countPattern('data/l1-table-meta.ts', /\{ name:/g);
const l2Count = countPattern('data/l2-table-meta.ts', /\{ name:/g);
// L3 tables: count object literals (lines starting with whitespace + {)
const l3Content = fs.readFileSync(path.join(ROOT, 'data/l3-tables.ts'), 'utf-8');
const l3Count = (l3Content.match(/^\s+\{/gm) || []).length;
const totalCount = l1Count + l2Count + l3Count;
const domainCount = countJson('data/metric-library/domains.json');
const catalogueCount = countJson('data/metric-library/catalogue.json');

console.log(`  Counts from source files:`);
console.log(`    L1 tables:       ${l1Count}`);
console.log(`    L2 tables:       ${l2Count}`);
console.log(`    L3 tables:       ${l3Count}`);
console.log(`    Total tables:    ${totalCount}`);
console.log(`    Domains:         ${domainCount}`);
console.log(`    Catalogue items: ${catalogueCount}`);
console.log();

// ── Replacement rules ───────────────────────────────────────────────────

interface Replacement {
  pattern: RegExp;
  replacement: string;
  label: string;
}

function buildReplacements(): Replacement[] {
  return [
    // CLAUDE.md architecture section: "L1 — Reference Data (NN tables)"
    {
      pattern: /L1 — Reference Data \(\d+ tables\)/g,
      replacement: `L1 — Reference Data (${l1Count} tables)`,
      label: 'L1 count (em-dash)',
    },
    {
      pattern: /L2 — Atomic Data \(\d+ tables\)/g,
      replacement: `L2 — Atomic Data (${l2Count} tables)`,
      label: 'L2 count (em-dash)',
    },
    {
      pattern: /L3 — Derived Data \(\d+ tables\)/g,
      replacement: `L3 — Derived Data (${l3Count} tables)`,
      label: 'L3 count (em-dash)',
    },
    // Playbook uses double-dash: "L1 -- Reference Data (NN tables)"
    {
      pattern: /L1 -- REFERENCE DATA\s+\(\d+ tables\)/gi,
      replacement: `L1 -- REFERENCE DATA  (${l1Count} tables)`,
      label: 'L1 count (double-dash)',
    },
    {
      pattern: /L2 -- ATOMIC DATA\s+\(\d+ tables\)/gi,
      replacement: `L2 -- ATOMIC DATA  (${l2Count} tables)`,
      label: 'L2 count (double-dash)',
    },
    {
      pattern: /L3 -- DERIVED DATA\s+\(\d+ tables\)/gi,
      replacement: `L3 -- DERIVED DATA  (${l3Count} tables)`,
      label: 'L3 count (double-dash)',
    },
    // Playbook section headers: "### L1 -- Reference Data (NN tables)"
    {
      pattern: /L1 -- Reference Data \(\d+ tables\)/g,
      replacement: `L1 -- Reference Data (${l1Count} tables)`,
      label: 'L1 section header',
    },
    {
      pattern: /L2 -- Atomic Data \(\d+ tables\)/g,
      replacement: `L2 -- Atomic Data (${l2Count} tables)`,
      label: 'L2 section header',
    },
    {
      pattern: /L3 -- Derived Data \(\d+ tables\)/g,
      replacement: `L3 -- Derived Data (${l3Count} tables)`,
      label: 'L3 section header',
    },
    // Key directories: "NN+ metric definitions" and "NN L3 table definitions"
    {
      pattern: /\d+\+? metric definitions/g,
      replacement: `${catalogueCount}+ metric definitions`,
      label: 'metric definitions count',
    },
    {
      pattern: /\d+ L3 table definitions/g,
      replacement: `${l3Count} L3 table definitions`,
      label: 'L3 table definitions count',
    },
    // Playbook: "all NNN+ tables" or "renders all NNN+ tables"
    {
      pattern: /all \d+\+ tables/g,
      replacement: `all ${totalCount}+ tables`,
      label: 'total tables (all N+)',
    },
    // Playbook: "NNN+ catalogue items"
    {
      pattern: /\d+\+ catalogue items/g,
      replacement: `${catalogueCount}+ catalogue items`,
      label: 'catalogue items count',
    },
    // Playbook: "N domains"
    {
      pattern: /across \d+ domains/g,
      replacement: `across ${domainCount} domains`,
      label: 'domain count',
    },
  ];
}

// ── File updater ────────────────────────────────────────────────────────

function updateFile(relPath: string, replacements: Replacement[]): number {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    console.log(`  SKIP ${relPath} (not found)`);
    return 0;
  }

  let content = fs.readFileSync(absPath, 'utf-8');
  const original = content;
  let changes = 0;

  for (const r of replacements) {
    const before = content;
    content = content.replace(r.pattern, r.replacement);
    if (content !== before) {
      changes++;
    }
  }

  if (content !== original) {
    fs.writeFileSync(absPath, content, 'utf-8');
    console.log(`  UPDATED ${relPath} (${changes} replacements)`);
  } else {
    console.log(`  OK      ${relPath} (no changes needed)`);
  }

  return changes;
}

// ── Main ────────────────────────────────────────────────────────────────

const replacements = buildReplacements();
const files = [
  'CLAUDE.md',
  'docs/playbook/README.md',
  'docs/playbook/01-data-model-overview.md',
  'docs/playbook/02-platform-capabilities.md',
];

console.log(`  Updating documentation files...`);
let totalChanges = 0;
for (const f of files) {
  totalChanges += updateFile(f, replacements);
}

console.log();
if (totalChanges > 0) {
  console.log(`  Done — ${totalChanges} total replacements across ${files.length} files.`);
} else {
  console.log(`  Done — all files already up to date.`);
}
