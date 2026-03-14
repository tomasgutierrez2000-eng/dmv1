/**
 * Change Logger — writes metric change audit entries to PostgreSQL.
 *
 * Every mutation to a CatalogueItem is recorded with before/after
 * JSONB snapshots, a computed diff summary, user identity, and
 * change reason.
 *
 * Falls back to local JSON file if DATABASE_URL is not set.
 */

import type { CatalogueItem } from '@/lib/metric-library/types';
import type { GovernanceUser } from './identity';
import { computeMetricDiff, diffToJsonSummary } from './diff-engine';

/* ── Types ──────────────────────────────────────────────────────── */

export type ChangeType = 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'ROLLBACK' | 'EXCEPTION';

export interface ChangeLogEntry {
  change_id?: number;
  item_id: string;
  change_type: ChangeType;
  changed_by_id: string | null;
  changed_by_name: string | null;
  changed_by_role: string | null;
  change_reason: string | null;
  ticket_reference: string | null;
  before_snapshot: CatalogueItem | null;
  after_snapshot: CatalogueItem;
  diff_summary: Record<string, { old: unknown; new: unknown }>;
  governance_status: string | null;
  created_ts?: string;
}

export interface LogMetricChangeParams {
  itemId: string;
  changeType: ChangeType;
  user: GovernanceUser | null;
  reason: string | null;
  ticketReference?: string | null;
  before: CatalogueItem | null;
  after: CatalogueItem;
  governanceStatus?: string | null;
}

/* ── Strip demo_data to keep snapshots small ────────────────────── */

function stripLargeFields(item: CatalogueItem | null): CatalogueItem | null {
  if (!item) return null;
  const copy = { ...item };
  delete (copy as Record<string, unknown>).demo_data;
  return copy;
}

/* ── PostgreSQL Logger ──────────────────────────────────────────── */

async function logToPostgres(entry: ChangeLogEntry): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set');

  // Dynamic import to avoid bundling pg in client
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl });

  try {
    await client.connect();

    await client.query(
      `INSERT INTO l3.metric_change_log (
        item_id, change_type,
        changed_by_id, changed_by_name, changed_by_role,
        change_reason, ticket_reference,
        before_snapshot, after_snapshot, diff_summary,
        governance_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        entry.item_id,
        entry.change_type,
        entry.changed_by_id,
        entry.changed_by_name,
        entry.changed_by_role,
        entry.change_reason,
        entry.ticket_reference,
        entry.before_snapshot ? JSON.stringify(entry.before_snapshot) : null,
        JSON.stringify(entry.after_snapshot),
        JSON.stringify(entry.diff_summary),
        entry.governance_status,
      ],
    );
  } finally {
    await client.end();
  }
}

/* ── Local JSON Fallback ────────────────────────────────────────── */

async function logToLocalFile(entry: ChangeLogEntry): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const { atomicWriteJson } = await import('./safe-file-writer');

  const logDir = path.join(process.cwd(), 'data', 'governance');
  const logFile = path.join(logDir, 'local-audit-log.json');

  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  let entries: ChangeLogEntry[] = [];
  try {
    const raw = await fs.readFile(logFile, 'utf-8');
    entries = JSON.parse(raw);
  } catch {
    entries = [];
  }

  entries.push({
    ...entry,
    change_id: entries.length + 1,
    created_ts: new Date().toISOString(),
  });

  await atomicWriteJson(logFile, entries);
}

/* ── Main Logger ────────────────────────────────────────────────── */

/**
 * Log a metric change. Writes to PostgreSQL if DATABASE_URL is set,
 * otherwise falls back to local JSON. Never blocks the caller on failure.
 */
export async function logMetricChange(params: LogMetricChangeParams): Promise<void> {
  const diff = computeMetricDiff(params.before, params.after);
  const diffSummary = diffToJsonSummary(diff);

  const entry: ChangeLogEntry = {
    item_id: params.itemId,
    change_type: params.changeType,
    changed_by_id: params.user?.user_id ?? null,
    changed_by_name: params.user?.display_name ?? null,
    changed_by_role: params.user?.role ?? null,
    change_reason: params.reason,
    ticket_reference: params.ticketReference ?? null,
    before_snapshot: stripLargeFields(params.before),
    after_snapshot: stripLargeFields(params.after) as CatalogueItem,
    diff_summary: diffSummary,
    governance_status: params.governanceStatus ?? params.after.status ?? null,
  };

  try {
    if (process.env.DATABASE_URL) {
      await logToPostgres(entry);
    } else {
      await logToLocalFile(entry);
    }
  } catch (err) {
    // Fire-and-forget: log failure should never block the mutation
    console.error('[governance] Failed to log metric change:', err);
  }
}

/* ── Query Functions ────────────────────────────────────────────── */

export interface ChangeHistoryOptions {
  itemId: string;
  limit?: number;
  offset?: number;
}

export interface ChangeHistoryResult {
  entries: ChangeLogEntry[];
  total: number;
}

/**
 * Fetch change history for a metric. Returns from PostgreSQL or local file.
 */
export async function getChangeHistory(opts: ChangeHistoryOptions): Promise<ChangeHistoryResult> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  if (process.env.DATABASE_URL) {
    return getHistoryFromPostgres(opts.itemId, limit, offset);
  }
  return getHistoryFromLocalFile(opts.itemId, limit, offset);
}

async function getHistoryFromPostgres(
  itemId: string,
  limit: number,
  offset: number,
): Promise<ChangeHistoryResult> {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const [countResult, dataResult] = await Promise.all([
      client.query(
        'SELECT COUNT(*)::int AS total FROM l3.metric_change_log WHERE item_id = $1',
        [itemId],
      ),
      client.query(
        `SELECT change_id, item_id, change_type,
                changed_by_id, changed_by_name, changed_by_role,
                change_reason, ticket_reference,
                before_snapshot, after_snapshot, diff_summary,
                governance_status, created_ts
         FROM l3.metric_change_log
         WHERE item_id = $1
         ORDER BY created_ts DESC
         LIMIT $2 OFFSET $3`,
        [itemId, limit, offset],
      ),
    ]);

    return {
      entries: dataResult.rows.map(r => ({
        change_id: r.change_id,
        item_id: r.item_id,
        change_type: r.change_type,
        changed_by_id: r.changed_by_id,
        changed_by_name: r.changed_by_name,
        changed_by_role: r.changed_by_role,
        change_reason: r.change_reason,
        ticket_reference: r.ticket_reference,
        before_snapshot: r.before_snapshot,
        after_snapshot: r.after_snapshot,
        diff_summary: r.diff_summary,
        governance_status: r.governance_status,
        created_ts: r.created_ts?.toISOString?.() ?? r.created_ts,
      })),
      total: countResult.rows[0]?.total ?? 0,
    };
  } finally {
    await client.end();
  }
}

async function getHistoryFromLocalFile(
  itemId: string,
  limit: number,
  offset: number,
): Promise<ChangeHistoryResult> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const logFile = path.join(process.cwd(), 'data', 'governance', 'local-audit-log.json');

  let entries: ChangeLogEntry[] = [];
  try {
    const raw = await fs.readFile(logFile, 'utf-8');
    entries = JSON.parse(raw);
  } catch {
    return { entries: [], total: 0 };
  }

  const filtered = entries
    .filter(e => e.item_id === itemId)
    .sort((a, b) => {
      const ta = a.created_ts ?? '';
      const tb = b.created_ts ?? '';
      return tb.localeCompare(ta);
    });

  return {
    entries: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}
