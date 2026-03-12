#!/usr/bin/env npx tsx
/**
 * Execute a SQL file against the DATABASE_URL PostgreSQL instance.
 * Usage: npx tsx scripts/run-sql.ts <path-to-sql-file>
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: npx tsx scripts/run-sql.ts <path-to-sql-file>');
    process.exit(1);
  }

  const filePath = path.resolve(sqlFile);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`Executing ${path.basename(filePath)} against database...`);

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err: any) {
    console.error(`Migration failed: ${err.message}`);
    // Show position info if available
    if (err.position) {
      const lines = sql.substring(0, parseInt(err.position)).split('\n');
      console.error(`  Near line ${lines.length}: ${lines[lines.length - 1]?.trim()}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
