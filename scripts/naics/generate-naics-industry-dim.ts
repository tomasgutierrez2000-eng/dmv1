/**
 * Generate SQL seed data for l1.industry_dim from Census Bureau NAICS 2022 Structure XLSX.
 *
 * Usage: npx tsx scripts/naics/generate-naics-industry-dim.ts
 *
 * Reads:  data/2022_NAICS_Structure.xlsx
 * Writes: sql/naics-industry-dim-seed.sql  (INSERT statements for 03-l1-seed.sql)
 *         sql/migrations/003-naics-industry-dim.sql (live DB migration)
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

interface NaicsEntry {
  industry_id: number;
  industry_code: string;
  industry_name: string;
  industry_level: string;
  industry_standard: string;
  parent_industry_id: number;
}

const LEVEL_MAP: Record<number, string> = {
  2: 'SECTOR',
  3: 'SUBSECTOR',
  4: 'INDUSTRY_GROUP',
  5: 'NAICS_INDUSTRY',
  6: 'NATIONAL_INDUSTRY',
};

// Range sectors: NAICS uses "31-33", "44-45", "48-49" for Manufacturing, Retail, Transportation
const RANGE_SECTORS: Record<string, { codes: number[]; name: string }> = {
  '31-33': { codes: [31, 32, 33], name: 'Manufacturing' },
  '44-45': { codes: [44, 45], name: 'Retail Trade' },
  '48-49': { codes: [48, 49], name: 'Transportation and Warehousing' },
};

function cleanTitle(raw: string): string {
  return raw
    .replace(/T\s*$/, '')   // Remove trailing T (trilateral marker) + whitespace
    .replace(/\s+$/, '')    // Remove any remaining trailing whitespace
    .replace(/'/g, "''");   // Escape single quotes for SQL
}

function parseNaicsXlsx(): NaicsEntry[] {
  const xlsxPath = path.join(ROOT, 'data', '2022_NAICS_Structure.xlsx');
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as (string | null)[][];

  const entries: NaicsEntry[] = [];
  const codeSet = new Set<string>();

  for (let i = 3; i < rows.length; i++) {
    const rawCode = rows[i]?.[1];
    const rawTitle = rows[i]?.[2];
    if (!rawCode || !rawTitle) continue;

    const codeStr = String(rawCode).trim();
    const title = cleanTitle(String(rawTitle));

    // Handle range sectors
    if (RANGE_SECTORS[codeStr]) {
      const { codes, name } = RANGE_SECTORS[codeStr];
      for (const code of codes) {
        const cs = String(code);
        if (!codeSet.has(cs)) {
          codeSet.add(cs);
          entries.push({
            industry_id: code,
            industry_code: cs,
            industry_name: name,
            industry_level: 'SECTOR',
            industry_standard: 'NAICS',
            parent_industry_id: code, // Self-reference for sectors
          });
        }
      }
      continue;
    }

    // Regular code
    const codeLen = codeStr.length;
    if (codeLen < 2 || codeLen > 6) continue;

    const codeNum = parseInt(codeStr, 10);
    if (isNaN(codeNum)) continue;

    const level = LEVEL_MAP[codeLen];
    if (!level) continue;

    // Derive parent: truncate to one fewer digit; sectors self-reference (NOT NULL constraint)
    let parentId: number;
    if (codeLen > 2) {
      const parentCode = codeStr.slice(0, codeLen - 1);
      parentId = parseInt(parentCode, 10);
    } else {
      parentId = codeNum; // Self-reference for sectors (parent_industry_id is NOT NULL)
    }

    if (!codeSet.has(codeStr)) {
      codeSet.add(codeStr);
      entries.push({
        industry_id: codeNum,
        industry_code: codeStr,
        industry_name: title,
        industry_level: level,
        industry_standard: 'NAICS',
        parent_industry_id: parentId,
      });
    }
  }

  return entries;
}

function validateHierarchy(entries: NaicsEntry[]): void {
  const idSet = new Set(entries.map(e => e.industry_id));
  const issues: string[] = [];

  for (const e of entries) {
    if (e.parent_industry_id !== e.industry_id && !idSet.has(e.parent_industry_id)) {
      issues.push(`Code ${e.industry_code} (${e.industry_name}) references parent ${e.parent_industry_id} which does not exist`);
    }
  }

  if (issues.length > 0) {
    console.error(`\n⚠️  ${issues.length} hierarchy issues found:`);
    issues.forEach(i => console.error(`  - ${i}`));
    console.error('');
  } else {
    console.log('✅ Hierarchy validation passed — all parent references exist');
  }
}

function generateSeedSQL(entries: NaicsEntry[]): string {
  const lines: string[] = [];
  lines.push(`-- NAICS 2022 Industry Dimension (${entries.length} rows)`);
  lines.push('-- Generated from Census Bureau 2022_NAICS_Structure.xlsx');
  lines.push(`-- Generated on ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  // Sort: sectors first (for self-ref FK), then by code
  const sorted = [...entries].sort((a, b) => {
    const lenDiff = a.industry_code.length - b.industry_code.length;
    if (lenDiff !== 0) return lenDiff;
    return a.industry_id - b.industry_id;
  });

  for (const e of sorted) {
    const parentVal = String(e.parent_industry_id);
    lines.push(
      `INSERT INTO l1.industry_dim (industry_id, industry_code, industry_name, industry_level, industry_standard, parent_industry_id, is_active_flag, created_ts, updated_ts) VALUES (${e.industry_id}, '${e.industry_code}', '${e.industry_name}', '${e.industry_level}', '${e.industry_standard}', ${parentVal}, TRUE, '2024-06-15 12:00:00', '2024-06-15 12:00:00');`
    );
  }

  return lines.join('\n');
}

function generateMigrationSQL(entries: NaicsEntry[]): string {
  const lines: string[] = [];
  lines.push('-- Migration: Replace GICS industry_dim with NAICS 2022 hierarchy');
  lines.push(`-- ${entries.length} NAICS codes (2-through-6 digit)`);
  lines.push(`-- Generated on ${new Date().toISOString().split('T')[0]}`);
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // Step 1: Insert NAICS records FIRST (IDs 11+ don't conflict with old 1-10)
  lines.push(`-- Step 1: Insert ${entries.length} NAICS 2022 records (new IDs don't conflict with old 1-10)`);
  const sorted = [...entries].sort((a, b) => {
    const lenDiff = a.industry_code.length - b.industry_code.length;
    if (lenDiff !== 0) return lenDiff;
    return a.industry_id - b.industry_id;
  });

  for (const e of sorted) {
    const parentVal = String(e.parent_industry_id);
    lines.push(
      `INSERT INTO l1.industry_dim (industry_id, industry_code, industry_name, industry_level, industry_standard, parent_industry_id, is_active_flag, created_ts, updated_ts) VALUES (${e.industry_id}, '${e.industry_code}', '${e.industry_name}', '${e.industry_level}', '${e.industry_standard}', ${parentVal}, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`
    );
  }
  lines.push('');

  // Step 2: Update FK references in child tables (now safe — new IDs exist)
  lines.push('-- Step 2: Update l2.counterparty industry_id (GICS ID → NAICS sector code)');
  const idMap: [number, number, string][] = [
    [1, 51, 'TMT → Information'],
    [2, 62, 'HC → Health Care and Social Assistance'],
    [3, 52, 'FIN → Finance and Insurance'],
    [4, 21, 'ENE → Mining, Quarrying, and Oil and Gas Extraction'],
    [5, 31, 'IND → Manufacturing'],
    [6, 44, 'CON → Retail Trade'],
    [7, 45, 'RET → Retail Trade'],
    [8, 22, 'UTL → Utilities'],
    [9, 32, 'MAT → Manufacturing (non-metallic)'],
    [10, 71, 'CD → Arts, Entertainment, and Recreation'],
  ];
  for (const [oldId, newId, comment] of idMap) {
    lines.push(`UPDATE l2.counterparty SET industry_id = ${newId} WHERE industry_id = ${oldId};  -- ${comment}`);
  }
  lines.push('');

  lines.push('-- Step 3: Update l2.facility_master industry_code (GICS code → NAICS code)');
  const codeMap: [string, string, string][] = [
    ['TMT', '51', 'Technology Media Telecom → Information'],
    ['HC', '62', 'Healthcare → Health Care'],
    ['FIN', '52', 'Financials → Finance and Insurance'],
    ['ENE', '21', 'Energy → Mining/Oil/Gas'],
    ['IND', '31', 'Industrials → Manufacturing'],
    ['CON', '44', 'Consumer Staples → Retail Trade'],
    ['RET', '45', 'Retail → Retail Trade'],
    ['UTL', '22', 'Utilities → Utilities'],
    ['MAT', '32', 'Materials → Manufacturing (non-metallic)'],
    ['CD', '71', 'Consumer Discretionary → Arts/Entertainment'],
    ['RE', '53', 'Real Estate → Real Estate (orphan fix)'],
    ['ENR', '21', 'Energy/NatRes → Mining (orphan fix)'],
    ['CS', '44', 'Consumer Staples → Retail Trade (orphan fix)'],
  ];
  for (const [oldCode, newCode, comment] of codeMap) {
    lines.push(`UPDATE l2.facility_master SET industry_code = '${newCode}' WHERE industry_code = '${oldCode}';  -- ${comment}`);
  }
  lines.push('');

  lines.push('-- Step 4: Update L3 tables that carry industry_code');
  for (const [oldCode, newCode] of codeMap) {
    lines.push(`UPDATE l3.counterparty_exposure_summary SET industry_code = '${newCode}' WHERE industry_code = '${oldCode}';`);
  }
  lines.push('');
  for (const [oldCode, newCode] of codeMap) {
    lines.push(`UPDATE l3.counterparty_detail_snapshot SET industry_code = '${newCode}' WHERE industry_code = '${oldCode}';`);
  }
  lines.push('');

  // Step 5: Delete old GICS records (no longer referenced by any child)
  lines.push('-- Step 5: Delete old GICS industry_dim records (IDs 1-10)');
  lines.push('DELETE FROM l1.industry_dim WHERE industry_id BETWEEN 1 AND 10;');
  lines.push('');

  lines.push('COMMIT;');

  return lines.join('\n');
}

// ── Main ──
const entries = parseNaicsXlsx();

// Stats
const stats: Record<string, number> = {};
for (const e of entries) {
  stats[e.industry_level] = (stats[e.industry_level] || 0) + 1;
}
console.log(`Parsed ${entries.length} NAICS 2022 codes:`);
Object.entries(stats).sort().forEach(([level, count]) => {
  console.log(`  ${level}: ${count}`);
});

// Validate
validateHierarchy(entries);

// Generate seed SQL
const seedSQL = generateSeedSQL(entries);
const seedPath = path.join(ROOT, 'sql', 'naics-industry-dim-seed.sql');
fs.writeFileSync(seedPath, seedSQL, 'utf-8');
console.log(`\nWrote seed SQL to: ${seedPath}`);

// Generate migration SQL
const migrationSQL = generateMigrationSQL(entries);
const migrationPath = path.join(ROOT, 'sql', 'migrations', '003-naics-industry-dim.sql');
fs.writeFileSync(migrationPath, migrationSQL, 'utf-8');
console.log(`Wrote migration SQL to: ${migrationPath}`);
