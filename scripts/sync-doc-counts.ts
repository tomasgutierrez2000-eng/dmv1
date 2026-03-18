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
 *   docs/playbook/README.md
 *   docs/playbook/01-data-model-overview.md
 *   docs/playbook/02-platform-capabilities.md
 *   docs/playbook/06-build-on-the-model.md  (AUTO blocks)
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

// ── AUTO block updater ────────────────────────────────────────────────

interface AutoBlock {
  name: string;
  content: string;
}

function buildAutoBlocks(): AutoBlock[] {
  const blocks: AutoBlock[] = [];

  // AUTO:TABLE_COUNTS — current L1/L2/L3 counts
  blocks.push({
    name: 'TABLE_COUNTS',
    content: [
      `The current data model contains:`,
      `- **L1 — Reference Data (${l1Count} tables):** Dimensions, masters, lookups, hierarchies`,
      `- **L2 — Atomic Data (${l2Count} tables):** Raw snapshots and events`,
      `- **L3 — Derived Data (${l3Count} tables):** Calculated and aggregated data`,
      `- **Total: all ${totalCount}+ tables** across the three layers`,
    ].join('\n'),
  });

  // AUTO:DOMAIN_LIST — current metric domains table
  const domainsPath = path.join(ROOT, 'data/metric-library/domains.json');
  if (fs.existsSync(domainsPath)) {
    const domains: Array<{ domain_id: string; domain_name: string; description: string }> =
      JSON.parse(fs.readFileSync(domainsPath, 'utf-8'));
    const rows = domains.map(
      d => `| ${d.domain_id} | ${d.domain_name} | ${d.description} |`
    );
    blocks.push({
      name: 'DOMAIN_LIST',
      content: [
        '| Domain | Name | Description |',
        '|--------|------|-------------|',
        ...rows,
      ].join('\n'),
    });
  }

  // AUTO:NAMING_CONVENTION — suffix → type mapping
  blocks.push({
    name: 'NAMING_CONVENTION',
    content: [
      '| Suffix | SQL Type | Example |',
      '|--------|----------|---------|',
      '| `_id` | BIGINT | `counterparty_id`, `facility_id` |',
      '| `_code` | VARCHAR(30) | `currency_code`, `fr2590_category_code` |',
      '| `_name`, `_desc`, `_text` | VARCHAR(500) | `facility_name` |',
      '| `_amt` | NUMERIC(20,4) | `committed_facility_amt` |',
      '| `_pct` | NUMERIC(10,6) | `coverage_ratio_pct` |',
      '| `_value` | NUMERIC(12,6) | metric output values |',
      '| `_date` | DATE | `maturity_date` |',
      '| `_ts` | TIMESTAMP | `created_ts` |',
      '| `_flag` | BOOLEAN | `is_active_flag` |',
      '| `_count` | INTEGER | `number_of_loans` |',
      '| `_bps` | NUMERIC(10,4) | `interest_rate_spread_bps` |',
    ].join('\n'),
  });

  // AUTO:STRIPE_CLI — stripe command reference
  blocks.push({
    name: 'STRIPE_CLI',
    content: [
      '| Command | Description |',
      '|---------|-------------|',
      '| `npm run stripe:create -- --name X` | Create isolated stripe database (full clone) |',
      '| `npm run stripe:create -- --name X --schema-only` | Clone schema without data |',
      '| `npm run stripe:create -- --name X --force` | Drop and recreate |',
      '| `npm run stripe:sync -- --name X` | Dry-run: show pending changes from main |',
      '| `npm run stripe:sync -- --name X --yes` | Apply pending changes from main |',
      '| `npm run stripe:diff -- --name X` | Generate migration SQL (stripe → main) |',
      '| `npm run stripe:diff -- --name X --stdout` | Print migration to terminal |',
      '| `npm run stripe:diff -- --name X --include-data` | Include L1 seed INSERT statements |',
      '| `npm run test:stripe` | Run stripe tooling integration tests |',
    ].join('\n'),
  });

  return blocks;
}

function updateAutoBlocks(relPath: string, blocks: AutoBlock[]): number {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return 0;

  let content = fs.readFileSync(absPath, 'utf-8');
  const original = content;
  let changes = 0;

  for (const block of blocks) {
    const regex = new RegExp(
      `(<!-- AUTO:${block.name} -->)\\n[\\s\\S]*?\\n(<!-- /AUTO:${block.name} -->)`,
      'g'
    );
    const before = content;
    content = content.replace(regex, `$1\n${block.content}\n$2`);
    if (content !== before) changes++;
  }

  if (content !== original) {
    fs.writeFileSync(absPath, content, 'utf-8');
    console.log(`  UPDATED ${relPath} (${changes} auto-blocks)`);
  }

  return changes;
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
  'docs/playbook/06-build-on-the-model.md',
];

console.log(`  Updating documentation files...`);
let totalChanges = 0;
for (const f of files) {
  totalChanges += updateFile(f, replacements);
}

// Update AUTO blocks in chapter 06
const autoBlocks = buildAutoBlocks();
const autoFiles = [
  'docs/playbook/06-build-on-the-model.md',
];
for (const f of autoFiles) {
  totalChanges += updateAutoBlocks(f, autoBlocks);
}

console.log();
if (totalChanges > 0) {
  console.log(`  Done — ${totalChanges} total replacements across ${files.length + autoFiles.length} files.`);
} else {
  console.log(`  Done — all files already up to date.`);
}
