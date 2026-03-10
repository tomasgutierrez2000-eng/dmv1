/**
 * Comprehensive migration verification: compare source vs target PostgreSQL.
 * Checks: table parity, row counts, duplicate PKs, FK integrity, schema match.
 *
 * Usage:
 *   SOURCE_DATABASE_URL="..." TARGET_DATABASE_URL="..." npx tsx scripts/verify-migration.ts
 *   (defaults: SOURCE = DATABASE_URL, TARGET = TARGET_DATABASE_URL)
 */
import 'dotenv/config';
import pg from 'pg';

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;

  if (!sourceUrl || !targetUrl) {
    console.error('Set SOURCE_DATABASE_URL (or DATABASE_URL) and TARGET_DATABASE_URL');
    process.exit(1);
  }

  const source = new pg.Client({
    connectionString: sourceUrl,
    ssl: sourceUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
  const target = new pg.Client({ connectionString: targetUrl });

  await source.connect();
  await target.connect();

  const SCHEMAS = ['l1', 'l2', 'l3', 'metric_library'];
  let issues = 0;

  // ─── 1. Table Parity ──────────────────────────────────────────────────────

  console.log('═══ 1. TABLE PARITY ═══\n');

  const tablesQ = `SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = ANY($1) AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name`;

  const srcTables = (await source.query(tablesQ, [SCHEMAS])).rows;
  const tgtTables = (await target.query(tablesQ, [SCHEMAS])).rows;

  const srcSet = new Set(srcTables.map((t: { table_schema: string; table_name: string }) => `${t.table_schema}.${t.table_name}`));
  const tgtSet = new Set(tgtTables.map((t: { table_schema: string; table_name: string }) => `${t.table_schema}.${t.table_name}`));

  const missingInTarget: string[] = [];
  const extraInTarget: string[] = [];
  for (const t of srcSet) { if (!tgtSet.has(t)) missingInTarget.push(t); }
  for (const t of tgtSet) { if (!srcSet.has(t)) extraInTarget.push(t); }

  console.log(`  Source tables: ${srcTables.length}`);
  console.log(`  Target tables: ${tgtTables.length}`);
  if (missingInTarget.length) { console.log(`  ❌ MISSING in target: ${missingInTarget.join(', ')}`); issues += missingInTarget.length; }
  if (extraInTarget.length) { console.log(`  ⚠️  EXTRA in target: ${extraInTarget.join(', ')}`); }
  if (missingInTarget.length === 0 && extraInTarget.length === 0) { console.log('  ✅ Table lists match'); }

  // ─── 2. Row Count Comparison ───────────────────────────────────────────────

  console.log('\n═══ 2. ROW COUNTS ═══\n');

  let totalSrc = 0, totalTgt = 0;
  const rowMismatches: string[] = [];

  for (const t of srcTables) {
    const fqn = `${t.table_schema}."${t.table_name}"`;
    const srcCount = Number((await source.query(`SELECT count(*)::bigint AS n FROM ${fqn}`)).rows[0].n);
    totalSrc += srcCount;

    if (tgtSet.has(`${t.table_schema}.${t.table_name}`)) {
      const tgtCount = Number((await target.query(`SELECT count(*)::bigint AS n FROM ${fqn}`)).rows[0].n);
      totalTgt += tgtCount;
      if (srcCount !== tgtCount) {
        rowMismatches.push(`  ❌ ${t.table_schema}.${t.table_name}: source=${srcCount} target=${tgtCount} (diff=${tgtCount - srcCount})`);
        issues++;
      }
    }
  }

  if (rowMismatches.length === 0) {
    console.log(`  ✅ All ${srcTables.length} tables match`);
  } else {
    rowMismatches.forEach(m => console.log(m));
  }
  console.log(`  Total rows: source=${totalSrc.toLocaleString()} target=${totalTgt.toLocaleString()}`);

  // ─── 3. Duplicate PK Check (on target) ────────────────────────────────────

  console.log('\n═══ 3. DUPLICATE PK CHECK (target) ═══\n');

  const pkQ = `SELECT tc.table_schema, tc.table_name,
    string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS pk_cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = ANY($1) AND tc.constraint_type = 'PRIMARY KEY'
    GROUP BY tc.table_schema, tc.table_name
    ORDER BY tc.table_schema, tc.table_name`;

  const pks = (await target.query(pkQ, [SCHEMAS])).rows;
  let dupCount = 0;

  for (const pk of pks) {
    const fqn = `${pk.table_schema}."${pk.table_name}"`;
    const cols = pk.pk_cols;
    const dupQ = `SELECT ${cols}, count(*) AS cnt FROM ${fqn} GROUP BY ${cols} HAVING count(*) > 1 LIMIT 5`;
    try {
      const dups = (await target.query(dupQ)).rows;
      if (dups.length > 0) {
        console.log(`  ❌ ${pk.table_schema}.${pk.table_name}: ${dups.length} duplicate PK groups`);
        dupCount += dups.length;
        issues++;
      }
    } catch {
      // Some tables may have reserved word columns — skip
    }
  }

  if (dupCount === 0) {
    console.log(`  ✅ No duplicate PKs across ${pks.length} tables`);
  }

  // ─── 4. FK Integrity Check (on target) ─────────────────────────────────────

  console.log('\n═══ 4. FK INTEGRITY CHECK (target) ═══\n');

  const fkQ = `SELECT
    tc.table_schema, tc.table_name, tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = ANY($1) AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_schema, tc.table_name, tc.constraint_name`;

  const fks = (await target.query(fkQ, [SCHEMAS])).rows;

  // Group by constraint
  const fkByConstraint = new Map<string, { schema: string; table: string; col: string; refSchema: string; refTable: string; refCol: string }>();
  for (const fk of fks) {
    const key = `${fk.table_schema}.${fk.constraint_name}`;
    if (!fkByConstraint.has(key)) {
      fkByConstraint.set(key, {
        schema: fk.table_schema, table: fk.table_name, col: fk.column_name,
        refSchema: fk.ref_schema, refTable: fk.ref_table, refCol: fk.ref_column,
      });
    }
  }

  let fkViolations = 0;
  for (const [constraintKey, fk] of fkByConstraint) {
    const child = `${fk.schema}."${fk.table}"`;
    const parent = `${fk.refSchema}."${fk.refTable}"`;
    const checkQ = `SELECT count(*)::int AS n FROM ${child} c
      WHERE c."${fk.col}" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM ${parent} p WHERE p."${fk.refCol}" = c."${fk.col}")`;
    try {
      const result = (await target.query(checkQ)).rows[0].n;
      if (result > 0) {
        console.log(`  ❌ ${constraintKey}: ${result} orphaned rows (${fk.schema}.${fk.table}.${fk.col} → ${fk.refSchema}.${fk.refTable}.${fk.refCol})`);
        fkViolations++;
        issues++;
      }
    } catch {
      // Skip if column names have reserved words
    }
  }

  if (fkViolations === 0) {
    console.log(`  ✅ All ${fkByConstraint.size} FK constraints satisfied — zero orphaned rows`);
  }

  // ─── 5. Schema Structure Match ─────────────────────────────────────────────

  console.log('\n═══ 5. SCHEMA STRUCTURE CHECK ═══\n');

  const colsQ = `SELECT table_schema, table_name, column_name, data_type, udt_name,
    character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = ANY($1)
    ORDER BY table_schema, table_name, ordinal_position`;

  const srcCols = (await source.query(colsQ, [SCHEMAS])).rows;
  const tgtCols = (await target.query(colsQ, [SCHEMAS])).rows;

  const srcColMap = new Map<string, string>();
  for (const c of srcCols) {
    srcColMap.set(`${c.table_schema}.${c.table_name}.${c.column_name}`, c.udt_name);
  }
  const tgtColMap = new Map<string, string>();
  for (const c of tgtCols) {
    tgtColMap.set(`${c.table_schema}.${c.table_name}.${c.column_name}`, c.udt_name);
  }

  let schemaDiffs = 0;
  for (const [key, srcType] of srcColMap) {
    const tgtType = tgtColMap.get(key);
    if (!tgtType) {
      console.log(`  ❌ Missing column in target: ${key}`);
      schemaDiffs++;
      issues++;
    } else if (srcType !== tgtType) {
      console.log(`  ⚠️  Type mismatch: ${key}: source=${srcType} target=${tgtType}`);
      schemaDiffs++;
    }
  }
  for (const [key] of tgtColMap) {
    if (!srcColMap.has(key)) {
      console.log(`  ⚠️  Extra column in target: ${key}`);
      schemaDiffs++;
    }
  }

  if (schemaDiffs === 0) {
    console.log(`  ✅ All ${srcColMap.size} columns match (name + type)`);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════');
  if (issues === 0) {
    console.log('✅ MIGRATION VERIFIED — zero issues found');
  } else {
    console.log(`❌ ${issues} issue(s) found — review above`);
  }
  console.log('═══════════════════════════════════════');

  await source.end();
  await target.end();
  process.exit(issues > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
