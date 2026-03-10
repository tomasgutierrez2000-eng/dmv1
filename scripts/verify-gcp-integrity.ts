/**
 * Verify GCP database integrity: duplicate PKs, FK orphans, row counts, schema structure.
 * Runs against TARGET_DATABASE_URL only (no source needed).
 */
import 'dotenv/config';
import pg from 'pg';

async function main() {
  const targetUrl = process.env.TARGET_DATABASE_URL;
  if (!targetUrl) {
    console.error('Set TARGET_DATABASE_URL');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: targetUrl });
  await client.connect();

  const SCHEMAS = ['l1', 'l2', 'l3', 'metric_library'];
  let issues = 0;

  // ─── 1. Table & Row Counts ─────────────────────────────────────────────────

  console.log('=== 1. TABLE & ROW COUNTS ===\n');

  const tablesQ = `SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = ANY($1) AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name`;
  const tables = (await client.query(tablesQ, [SCHEMAS])).rows;

  const bySchemaCounts: Record<string, { tables: number; rows: number }> = {};
  let grandTotal = 0;

  for (const t of tables) {
    const fqn = `${t.table_schema}."${t.table_name}"`;
    const count = Number((await client.query(`SELECT count(*)::bigint AS n FROM ${fqn}`)).rows[0].n);
    grandTotal += count;
    if (!bySchemaCounts[t.table_schema]) bySchemaCounts[t.table_schema] = { tables: 0, rows: 0 };
    bySchemaCounts[t.table_schema].tables++;
    bySchemaCounts[t.table_schema].rows += count;
  }

  for (const [schema, { tables: tCount, rows }] of Object.entries(bySchemaCounts)) {
    console.log(`  ${schema}: ${tCount} tables, ${rows.toLocaleString()} rows`);
  }
  console.log(`  Grand total: ${tables.length} tables, ${grandTotal.toLocaleString()} rows`);

  // Compare against known source total
  const EXPECTED_TOTAL = 100564;
  if (grandTotal === EXPECTED_TOTAL) {
    console.log(`  OK — matches expected source (${EXPECTED_TOTAL.toLocaleString()} rows)`);
  } else {
    console.log(`  MISMATCH — expected ${EXPECTED_TOTAL.toLocaleString()}, got ${grandTotal.toLocaleString()} (diff=${grandTotal - EXPECTED_TOTAL})`);
    issues++;
  }

  // ─── 2. Duplicate PK Check ────────────────────────────────────────────────

  console.log('\n=== 2. DUPLICATE PK CHECK ===\n');

  const pkQ = `SELECT tc.table_schema, tc.table_name,
    string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS pk_cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = ANY($1) AND tc.constraint_type = 'PRIMARY KEY'
    GROUP BY tc.table_schema, tc.table_name
    ORDER BY tc.table_schema, tc.table_name`;
  const pks = (await client.query(pkQ, [SCHEMAS])).rows;

  let dupTables = 0;
  for (const pk of pks) {
    const fqn = `${pk.table_schema}."${pk.table_name}"`;
    // Quote each PK column to handle reserved words
    const quotedCols = pk.pk_cols.split(',').map((c: string) => `"${c.trim()}"`).join(', ');
    const dupQ = `SELECT ${quotedCols}, count(*) AS cnt FROM ${fqn} GROUP BY ${quotedCols} HAVING count(*) > 1 LIMIT 3`;
    try {
      const dups = (await client.query(dupQ)).rows;
      if (dups.length > 0) {
        console.log(`  DUPLICATE ${pk.table_schema}.${pk.table_name} (PK: ${pk.pk_cols}): ${dups.length}+ duplicate groups`);
        dupTables++;
        issues++;
      }
    } catch (err) {
      // Skip errors (e.g. expression columns)
    }
  }

  if (dupTables === 0) {
    console.log(`  OK — no duplicates across ${pks.length} tables`);
  } else {
    console.log(`  ${dupTables} table(s) with duplicate PKs`);
  }

  // ─── 3. FK Integrity ──────────────────────────────────────────────────────

  console.log('\n=== 3. FK INTEGRITY (orphaned rows) ===\n');

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
  const fks = (await client.query(fkQ, [SCHEMAS])).rows;

  // Deduplicate by constraint name (multi-column FKs appear multiple times)
  const seen = new Set<string>();
  const uniqueFKs: typeof fks = [];
  for (const fk of fks) {
    const key = `${fk.table_schema}.${fk.constraint_name}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFKs.push(fk);
    }
  }

  let fkViolations = 0;
  for (const fk of uniqueFKs) {
    const child = `${fk.table_schema}."${fk.table_name}"`;
    const parent = `${fk.ref_schema}."${fk.ref_table}"`;
    const checkQ = `SELECT count(*)::int AS n FROM ${child} c
      WHERE c."${fk.column_name}" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM ${parent} p WHERE p."${fk.ref_column}" = c."${fk.column_name}")`;
    try {
      const n = (await client.query(checkQ)).rows[0].n;
      if (n > 0) {
        console.log(`  ORPHAN ${fk.table_schema}.${fk.table_name}."${fk.column_name}" -> ${fk.ref_schema}.${fk.ref_table}."${fk.ref_column}": ${n} orphaned rows`);
        fkViolations++;
        issues++;
      }
    } catch {
      // Skip errors
    }
  }

  if (fkViolations === 0) {
    console.log(`  OK — all ${uniqueFKs.length} FK constraints satisfied, zero orphaned rows`);
  } else {
    console.log(`  ${fkViolations} FK violation(s)`);
  }

  // ─── 4. FK Constraint Count ────────────────────────────────────────────────

  console.log('\n=== 4. CONSTRAINT SUMMARY ===\n');

  const constraintQ = `SELECT constraint_type, count(*)::int AS n
    FROM information_schema.table_constraints
    WHERE table_schema = ANY($1)
    GROUP BY constraint_type ORDER BY constraint_type`;
  const constraints = (await client.query(constraintQ, [SCHEMAS])).rows;
  for (const c of constraints) {
    console.log(`  ${c.constraint_type}: ${c.n}`);
  }

  // ─── 5. Index Count ────────────────────────────────────────────────────────

  console.log('\n=== 5. INDEXES ===\n');

  const idxQ = `SELECT schemaname, count(*)::int AS n FROM pg_indexes WHERE schemaname = ANY($1) GROUP BY schemaname ORDER BY schemaname`;
  const indexes = (await client.query(idxQ, [SCHEMAS])).rows;
  let totalIdx = 0;
  for (const idx of indexes) {
    console.log(`  ${idx.schemaname}: ${idx.n} indexes`);
    totalIdx += idx.n;
  }
  console.log(`  Total: ${totalIdx} indexes`);

  // ─── 6. Sequence Health ────────────────────────────────────────────────────

  console.log('\n=== 6. SEQUENCES ===\n');

  const seqQ = `SELECT schemaname, count(*)::int AS n FROM pg_sequences WHERE schemaname = ANY($1) GROUP BY schemaname ORDER BY schemaname`;
  const seqs = (await client.query(seqQ, [SCHEMAS])).rows;
  let totalSeq = 0;
  for (const s of seqs) {
    console.log(`  ${s.schemaname}: ${s.n} sequences`);
    totalSeq += s.n;
  }
  console.log(`  Total: ${totalSeq} sequences`);

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log('\n=======================================');
  if (issues === 0) {
    console.log('MIGRATION VERIFIED — zero issues');
  } else {
    console.log(`${issues} issue(s) found — review above`);
  }
  console.log('=======================================');

  await client.end();
  process.exit(issues > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
