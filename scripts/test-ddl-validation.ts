#!/usr/bin/env npx tsx
/**
 * DDL Validation Test Suite — tests the 6-rule validation battery
 * defined in .claude/commands/builders/db-schema-builder.md
 *
 * Run: npx tsx scripts/test-ddl-validation.ts
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ============================================================
// Naming Convention Contract (Test 4 in DDL battery)
// ============================================================

const SUFFIX_TYPE_MAP: Record<string, string[]> = {
  '_id':    ['BIGINT', 'BIGSERIAL'],
  '_code':  ['VARCHAR'],
  '_name':  ['VARCHAR'],
  '_desc':  ['VARCHAR'],
  '_text':  ['VARCHAR'],
  '_amt':   ['NUMERIC'],
  '_pct':   ['NUMERIC'],
  '_value': ['NUMERIC'],
  '_date':  ['DATE'],
  '_ts':    ['TIMESTAMP', 'TIMESTAMPTZ'],
  '_flag':  ['BOOLEAN'],
  '_count': ['INTEGER'],
  '_bps':   ['NUMERIC'],
};

const EXCEPTION_IDS = new Set([
  'metric_id', 'variant_id', 'source_metric_id',
  'mdrm_id', 'mapped_line_id', 'mapped_column_id',
]);

function inferTypeFromSuffix(columnName: string): string[] | null {
  if (EXCEPTION_IDS.has(columnName)) return ['VARCHAR'];
  for (const [suffix, types] of Object.entries(SUFFIX_TYPE_MAP)) {
    if (columnName.endsWith(suffix)) return types;
  }
  return null; // fallback — no enforcement
}

function validateColumnType(columnName: string, declaredType: string): { valid: boolean; reason?: string } {
  const expectedTypes = inferTypeFromSuffix(columnName);
  if (!expectedTypes) return { valid: true }; // no rule for this suffix

  const upperType = declaredType.toUpperCase();
  const matches = expectedTypes.some(t => upperType.startsWith(t));
  if (!matches) {
    return { valid: false, reason: `${columnName} should be ${expectedTypes.join('|')}, got ${declaredType}` };
  }
  return { valid: true };
}

// ============================================================
// Boolean naming (is_*_flag pattern)
// ============================================================

function validateBooleanNaming(columnName: string, declaredType: string): { valid: boolean; reason?: string } {
  const upperType = declaredType.toUpperCase();
  if (upperType === 'BOOLEAN') {
    if (!columnName.startsWith('is_') || !columnName.endsWith('_flag')) {
      return { valid: false, reason: `Boolean column ${columnName} must use is_*_flag pattern` };
    }
  }
  if (columnName.endsWith('_flag') && upperType !== 'BOOLEAN') {
    return { valid: false, reason: `${columnName} ends with _flag but type is ${declaredType}, not BOOLEAN` };
  }
  return { valid: true };
}

// ============================================================
// Constraint name length (Test 6)
// ============================================================

const ABBREVIATIONS: Record<string, string> = {
  counterparty: 'cp',
  facility: 'fac',
  credit_agreement: 'ca',
  enterprise_business_taxonomy: 'ebt',
  participation: 'part',
  snapshot: 'snap',
  consumption: 'cons',
};

function truncateConstraintName(name: string): string {
  if (name.length <= 63) return name;
  let result = name;
  for (const [full, abbrev] of Object.entries(ABBREVIATIONS)) {
    result = result.replace(new RegExp(full, 'g'), abbrev);
    if (result.length <= 63) return result;
  }
  return result.slice(0, 63);
}

// ============================================================
// Double comma detection (Test 1)
// ============================================================

function hasDoubleComma(ddl: string): boolean {
  // Detect ,, or , followed by whitespace then ,
  return /,\s*,/.test(ddl);
}

// ============================================================
// Search path validation (Test 1)
// ============================================================

function validateSearchPath(ddl: string, targetSchema: string): { valid: boolean; reason?: string } {
  const needsSearchPath = /REFERENCES\s+l[123]\./i.test(ddl);
  if (!needsSearchPath) return { valid: true };

  const hasSearchPath = /SET\s+search_path\s+TO/i.test(ddl);
  if (!hasSearchPath) {
    return { valid: false, reason: `Cross-schema REFERENCES found but no SET search_path` };
  }

  if (targetSchema === 'l3') {
    if (!/search_path\s+TO\s+.*l3/i.test(ddl)) {
      return { valid: false, reason: `L3 DDL must include l3 in search_path` };
    }
  }
  return { valid: true };
}

// ============================================================
// DML rejection (Gate 0)
// ============================================================

function containsDML(ddl: string): boolean {
  return /\b(INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE)\b/i.test(ddl);
}

// ============================================================
// Migration sequence number parsing
// ============================================================

function parseSequenceNumber(filename: string): number | null {
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ============================================================
// Tests
// ============================================================

console.log('\n=== Test 4: Naming Convention Contract ===');

// Standard suffix rules
assert(validateColumnType('facility_id', 'BIGINT').valid, '_id → BIGINT');
assert(validateColumnType('facility_id', 'BIGSERIAL').valid, '_id → BIGSERIAL');
assert(!validateColumnType('facility_id', 'VARCHAR(50)').valid, '_id rejects VARCHAR');
assert(validateColumnType('currency_code', 'VARCHAR(30)').valid, '_code → VARCHAR');
assert(!validateColumnType('currency_code', 'BIGINT').valid, '_code rejects BIGINT');
assert(validateColumnType('facility_name', 'VARCHAR(500)').valid, '_name → VARCHAR');
assert(validateColumnType('committed_facility_amt', 'NUMERIC(20,4)').valid, '_amt → NUMERIC');
assert(!validateColumnType('committed_facility_amt', 'VARCHAR(50)').valid, '_amt rejects VARCHAR');
assert(validateColumnType('pd_pct', 'NUMERIC(10,6)').valid, '_pct → NUMERIC');
assert(validateColumnType('maturity_date', 'DATE').valid, '_date → DATE');
assert(!validateColumnType('maturity_date', 'VARCHAR(20)').valid, '_date rejects VARCHAR');
assert(validateColumnType('created_ts', 'TIMESTAMP').valid, '_ts → TIMESTAMP');
assert(validateColumnType('created_ts', 'TIMESTAMPTZ').valid, '_ts → TIMESTAMPTZ');
assert(validateColumnType('is_active_flag', 'BOOLEAN').valid, '_flag → BOOLEAN');
assert(!validateColumnType('is_active_flag', 'VARCHAR(1)').valid, '_flag rejects VARCHAR');
assert(validateColumnType('loan_count', 'INTEGER').valid, '_count → INTEGER');
assert(validateColumnType('spread_bps', 'NUMERIC(10,4)').valid, '_bps → NUMERIC');

// Exception IDs (VARCHAR despite _id suffix)
assert(validateColumnType('metric_id', 'VARCHAR(50)').valid, 'metric_id is exception → VARCHAR');
assert(validateColumnType('variant_id', 'VARCHAR(50)').valid, 'variant_id is exception → VARCHAR');
assert(validateColumnType('mdrm_id', 'VARCHAR(20)').valid, 'mdrm_id is exception → VARCHAR');

// Fallback (no matching suffix)
assert(validateColumnType('description', 'TEXT').valid, 'no matching suffix → no enforcement');
assert(validateColumnType('status', 'VARCHAR(20)').valid, 'no matching suffix → no enforcement');

console.log('\n=== Boolean Naming (is_*_flag pattern) ===');

assert(validateBooleanNaming('is_active_flag', 'BOOLEAN').valid, 'is_active_flag BOOLEAN → valid');
assert(!validateBooleanNaming('active', 'BOOLEAN').valid, 'active BOOLEAN → missing is_*_flag');
assert(!validateBooleanNaming('is_active', 'BOOLEAN').valid, 'is_active BOOLEAN → missing _flag');
assert(!validateBooleanNaming('active_flag', 'BOOLEAN').valid, 'active_flag BOOLEAN → missing is_ prefix');
assert(!validateBooleanNaming('is_active_flag', 'VARCHAR(1)').valid, '_flag with VARCHAR → rejected');
assert(validateBooleanNaming('facility_name', 'VARCHAR(200)').valid, 'non-boolean non-flag → valid');

console.log('\n=== Test 6: Constraint Name Length ===');

assert(truncateConstraintName('fk_short').length <= 63, 'Short name unchanged');
assert(
  truncateConstraintName('fk_credit_agreement_counterparty_participation_borrower_counterparty_id').length <= 63,
  'Long name truncated to ≤63 chars'
);
const truncated = truncateConstraintName('fk_credit_agreement_counterparty_participation_facility_snapshot');
assert(truncated.includes('ca') || truncated.includes('cp'), 'Abbreviations applied');

console.log('\n=== Test 1: Double Comma Detection ===');

assert(hasDoubleComma('col1 BIGINT,,col2 VARCHAR'), 'Detects adjacent double comma');
assert(hasDoubleComma('col1 BIGINT,\n  ,\n  col2 VARCHAR'), 'Detects comma-whitespace-comma');
assert(!hasDoubleComma('col1 BIGINT,\n  col2 VARCHAR'), 'No false positive on normal DDL');

console.log('\n=== Test 1: Search Path Validation ===');

assert(
  validateSearchPath('CREATE TABLE l3.foo (id BIGINT REFERENCES l2.bar(id))', 'l3').valid === false,
  'L3 DDL with cross-schema ref but no search_path → rejected'
);
assert(
  validateSearchPath('SET search_path TO l1, l2, l3, public;\nCREATE TABLE l3.foo (id BIGINT REFERENCES l2.bar(id))', 'l3').valid,
  'L3 DDL with correct search_path → accepted'
);
assert(
  validateSearchPath('CREATE TABLE l1.foo (id BIGSERIAL PRIMARY KEY)', 'l1').valid,
  'L1 DDL with no cross-schema refs → no search_path needed'
);

console.log('\n=== Gate 0: DML Rejection ===');

assert(containsDML('INSERT INTO l1.foo VALUES (1)'), 'Detects INSERT');
assert(containsDML('UPDATE l1.foo SET x = 1'), 'Detects UPDATE');
assert(containsDML('DELETE FROM l1.foo'), 'Detects DELETE');
assert(containsDML('TRUNCATE l1.foo'), 'Detects TRUNCATE');
assert(!containsDML('CREATE TABLE l1.foo (id BIGINT)'), 'No false positive on DDL');
assert(!containsDML('ALTER TABLE l1.foo ADD COLUMN bar VARCHAR(20)'), 'No false positive on ALTER');

console.log('\n=== Migration Sequence Number Parsing ===');

assert(parseSequenceNumber('036-facility-type-dim-fixes.sql') === 36, 'Parses 036');
assert(parseSequenceNumber('001-audit-fixes.sql') === 1, 'Parses 001');
assert(parseSequenceNumber('002a-capital-metrics-seed.sql') === 2, 'Parses 002a');
assert(parseSequenceNumber('add-4-loading-stage-tables.sql') === null, 'Non-numeric prefix → null');
assert(parseSequenceNumber('fix-7-to-14-l1-data-quality.sql') === null, 'Non-numeric prefix → null');

// ============================================================
// Summary
// ============================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}
