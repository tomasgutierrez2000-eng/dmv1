/**
 * Verify GSIB data load: report row counts for l1 and l2 tables.
 * Usage: npm run db:verify-gsib  (or: npx tsx scripts/verify-gsib-load.ts)
 */
import 'dotenv/config';
import pg from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL in .env');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const tables: { schema: string; table: string }[] = (
      await client.query(
        `SELECT table_schema AS schema, table_name AS table
         FROM information_schema.tables
         WHERE table_schema IN ('l1', 'l2')
           AND table_type = 'BASE TABLE'
         ORDER BY table_schema, table_name`
      )
    ).rows;

    let l1Total = 0;
    let l2Total = 0;
    const l1Counts: { table: string; count: number }[] = [];
    const l2Counts: { table: string; count: number }[] = [];

    for (const { schema, table } of tables) {
      const q = await client.query(
        `SELECT count(*)::bigint AS n FROM ${schema}.${table}`
      );
      const n = Number(q.rows[0].n);
      if (schema === 'l1') {
        l1Total += n;
        l1Counts.push({ table, count: n });
      } else {
        l2Total += n;
        l2Counts.push({ table, count: n });
      }
    }

    console.log('=== GSIB load verification ===\n');
    console.log('L1 tables:', l1Counts.length, '| Total rows:', l1Total.toLocaleString());
    l1Counts.forEach(({ table, count }) => console.log('  l1.' + table + ':', count.toLocaleString()));
    console.log('\nL2 tables:', l2Counts.length, '| Total rows:', l2Total.toLocaleString());
    l2Counts.forEach(({ table, count }) => console.log('  l2.' + table + ':', count.toLocaleString()));
    console.log('\nGrand total:', (l1Total + l2Total).toLocaleString(), 'rows');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
