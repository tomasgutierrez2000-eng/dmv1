/**
 * Schema Change Logger — writes data model mutation audit entries to PostgreSQL.
 *
 * Every mutation to the data dictionary (add/update/delete tables and fields)
 * is recorded in l3.schema_change_log with before/after JSONB snapshots.
 *
 * Append-only: PG rules block UPDATE/DELETE on schema_change_log.
 * Falls back to local JSON file if DATABASE_URL is not set.
 */

import type { NextRequest } from 'next/server';

/* ── Types ──────────────────────────────────────────────────────── */

export type SchemaChangeType =
  | 'ADD_TABLE'
  | 'UPDATE_TABLE'
  | 'DELETE_TABLE'
  | 'ADD_FIELD'
  | 'UPDATE_FIELD'
  | 'DELETE_FIELD'
  | 'APPLY_DDL';

export interface SchemaChangeLogEntry {
  change_type: SchemaChangeType;
  layer: string;
  table_name: string;
  field_name?: string | null;
  changed_by_id?: string | null;
  changed_by_name?: string | null;
  change_reason?: string | null;
  before_snapshot?: unknown;
  after_snapshot?: unknown;
}

/* ── Identity Extraction ─────────────────────────────────────────── */

/**
 * Extract user identity from request headers (same pattern as governance identity).
 * Falls back to 'system' if no headers present.
 */
export function extractSchemaUser(req: NextRequest): { id: string; name: string } {
  const userId = req.headers.get('X-User-ID') ?? req.headers.get('x-user-id') ?? 'system';
  const userName = req.headers.get('X-User-Name') ?? req.headers.get('x-user-name') ?? 'System';
  return { id: userId, name: userName };
}

/* ── PostgreSQL Logger ──────────────────────────────────────────── */

async function logToPostgres(entry: SchemaChangeLogEntry): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set');

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl });

  try {
    await client.connect();
    await client.query(
      `INSERT INTO l3.schema_change_log (
        change_type, layer, table_name, field_name,
        changed_by_id, changed_by_name, change_reason,
        before_snapshot, after_snapshot
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.change_type,
        entry.layer,
        entry.table_name,
        entry.field_name ?? null,
        entry.changed_by_id ?? null,
        entry.changed_by_name ?? null,
        entry.change_reason ?? null,
        entry.before_snapshot ? JSON.stringify(entry.before_snapshot) : null,
        entry.after_snapshot ? JSON.stringify(entry.after_snapshot) : null,
      ],
    );
  } finally {
    await client.end();
  }
}

/* ── Local JSON Fallback ────────────────────────────────────────── */

async function logToLocalFile(entry: SchemaChangeLogEntry): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const logDir = path.join(process.cwd(), 'data', 'governance');
  const logFile = path.join(logDir, 'schema-change-log.json');

  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  let entries: (SchemaChangeLogEntry & { created_ts: string })[] = [];
  try {
    const raw = await fs.readFile(logFile, 'utf-8');
    entries = JSON.parse(raw);
  } catch {
    entries = [];
  }

  entries.push({
    ...entry,
    created_ts: new Date().toISOString(),
  });

  await fs.writeFile(logFile, JSON.stringify(entries, null, 2));
}

/* ── Main Logger ────────────────────────────────────────────────── */

/**
 * Log a schema change. Writes to PostgreSQL if DATABASE_URL is set,
 * otherwise falls back to local JSON. Never blocks the caller on failure.
 */
export async function logSchemaChange(entry: SchemaChangeLogEntry): Promise<void> {
  try {
    if (process.env.DATABASE_URL) {
      await logToPostgres(entry);
    } else {
      await logToLocalFile(entry);
    }
  } catch (err) {
    // Fire-and-forget: log failure should never block the mutation
    console.error('[governance] Failed to log schema change:', err);
  }
}
