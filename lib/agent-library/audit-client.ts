/**
 * Audit Client — queries the postgres_audit database for agent runs, artifacts, and metrics.
 * Gracefully handles disconnected state (returns empty results with audit_connected: false).
 */

import type {
  AgentRun, SchemaChange, MetricDecomposition, ReviewFinding,
  DataLineageEntry, AgentPerformanceSummary, ArtifactSummary,
  RunStatus, AgentMetricsDaily,
} from './types';

// ─── Connection ──────────────────────────────────────────────────────────────

function getAuditDatabaseUrl(): string | null {
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) return null;
  // Replace database name with postgres_audit
  try {
    const url = new URL(mainUrl);
    url.pathname = '/postgres_audit';
    return url.toString();
  } catch {
    // Fallback: replace last path segment
    return mainUrl.replace(/\/[^/]+$/, '/postgres_audit');
  }
}

async function getPool() {
  const url = getAuditDatabaseUrl();
  if (!url) return null;
  try {
    const pg = await import('pg');
    const Pool = (pg as Record<string, unknown>).default
      ? ((pg as Record<string, unknown>).default as { Pool: typeof import('pg').Pool }).Pool
      : pg.Pool;
    const pool = new Pool({ connectionString: url, max: 3, connectionTimeoutMillis: 5000 });
    // Test connection
    const client = await pool.connect();
    client.release();
    return pool;
  } catch {
    return null;
  }
}

let poolPromise: ReturnType<typeof getPool> | null = null;

function getPoolCached() {
  if (!poolPromise) poolPromise = getPool();
  return poolPromise;
}

export async function isAuditConnected(): Promise<boolean> {
  const pool = await getPoolCached();
  return pool !== null;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPoolCached();
  if (!pool) return [];
  try {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  } catch (err) {
    console.error('[audit-client] Query failed:', (err as Error).message);
    return [];
  }
}

// ─── Agent Runs ──────────────────────────────────────────────────────────────

export async function getAgentRuns(opts: {
  agent_name?: string;
  status?: RunStatus;
  limit?: number;
  offset?: number;
}): Promise<{ runs: AgentRun[]; total: number }> {
  const { agent_name, status, limit = 50, offset = 0 } = opts;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (agent_name) {
    conditions.push(`r.agent_name = $${paramIdx++}`);
    params.push(agent_name);
  }
  if (status) {
    conditions.push(`r.status = $${paramIdx++}`);
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit.agent_runs r ${where}`,
    params
  );
  const total = parseInt(countRows[0]?.count || '0', 10);

  const runs = await query<AgentRun>(
    `SELECT r.*,
       (SELECT COUNT(*) FROM audit.schema_changes sc WHERE sc.run_id = r.run_id) as schema_change_count,
       (SELECT COUNT(*) FROM audit.metric_decompositions md WHERE md.run_id = r.run_id) as decomp_count,
       (SELECT COUNT(*) FROM audit.review_findings rf WHERE rf.run_id = r.run_id) as finding_count,
       (SELECT COUNT(*) FROM audit.data_lineage dl WHERE dl.run_id = r.run_id) as lineage_count
     FROM audit.agent_runs r
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset]
  );

  return {
    runs: runs.map(r => ({
      ...r,
      reasoning_chain: r.reasoning_chain || [],
      actions_taken: r.actions_taken || [],
      artifact_counts: {
        schema_changes: Number((r as unknown as Record<string, unknown>).schema_change_count) || 0,
        decompositions: Number((r as unknown as Record<string, unknown>).decomp_count) || 0,
        findings: Number((r as unknown as Record<string, unknown>).finding_count) || 0,
        lineage_entries: Number((r as unknown as Record<string, unknown>).lineage_count) || 0,
      },
    })),
    total,
  };
}

export async function getRunById(runId: string): Promise<AgentRun | null> {
  const rows = await query<AgentRun>(
    `SELECT r.*,
       (SELECT COUNT(*) FROM audit.schema_changes sc WHERE sc.run_id = r.run_id) as schema_change_count,
       (SELECT COUNT(*) FROM audit.metric_decompositions md WHERE md.run_id = r.run_id) as decomp_count,
       (SELECT COUNT(*) FROM audit.review_findings rf WHERE rf.run_id = r.run_id) as finding_count,
       (SELECT COUNT(*) FROM audit.data_lineage dl WHERE dl.run_id = r.run_id) as lineage_count
     FROM audit.agent_runs r WHERE r.run_id = $1`,
    [runId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r,
    reasoning_chain: r.reasoning_chain || [],
    actions_taken: r.actions_taken || [],
    artifact_counts: {
      schema_changes: Number((r as unknown as Record<string, unknown>).schema_change_count) || 0,
      decompositions: Number((r as unknown as Record<string, unknown>).decomp_count) || 0,
      findings: Number((r as unknown as Record<string, unknown>).finding_count) || 0,
      lineage_entries: Number((r as unknown as Record<string, unknown>).lineage_count) || 0,
    },
  };
}

// ─── Run Stats (for enriching agent definitions) ─────────────────────────────

export async function getRunStatsByAgent(): Promise<Record<string, {
  total_runs: number;
  success_rate: number;
  last_run_at: string | null;
}>> {
  const rows = await query<{
    agent_name: string;
    total_runs: string;
    successful: string;
    last_run: string | null;
  }>(`
    SELECT agent_name,
           COUNT(*) as total_runs,
           COUNT(*) FILTER (WHERE status = 'completed') as successful,
           MAX(created_at)::TEXT as last_run
    FROM audit.agent_runs
    GROUP BY agent_name
  `);

  const stats: Record<string, { total_runs: number; success_rate: number; last_run_at: string | null }> = {};
  for (const row of rows) {
    const total = parseInt(row.total_runs, 10);
    const successful = parseInt(row.successful, 10);
    stats[row.agent_name] = {
      total_runs: total,
      success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
      last_run_at: row.last_run,
    };
  }
  return stats;
}

// ─── Artifacts ───────────────────────────────────────────────────────────────

export async function getArtifactSummary(): Promise<ArtifactSummary> {
  const rows = await query<Record<string, string>>(`
    SELECT
      (SELECT COUNT(*) FROM audit.schema_changes) as schema_changes,
      (SELECT COUNT(*) FROM audit.metric_decompositions) as decompositions,
      (SELECT COUNT(*) FROM audit.review_findings) as findings,
      (SELECT COUNT(*) FROM audit.data_lineage) as lineage_entries
  `);
  if (rows.length === 0) return { schema_changes: 0, decompositions: 0, findings: 0, lineage_entries: 0, total: 0 };
  const r = rows[0];
  const sc = parseInt(r.schema_changes, 10) || 0;
  const dc = parseInt(r.decompositions, 10) || 0;
  const fc = parseInt(r.findings, 10) || 0;
  const lc = parseInt(r.lineage_entries, 10) || 0;
  return { schema_changes: sc, decompositions: dc, findings: fc, lineage_entries: lc, total: sc + dc + fc + lc };
}

export async function getSchemaChanges(opts?: { limit?: number; offset?: number }): Promise<SchemaChange[]> {
  const { limit = 50, offset = 0 } = opts || {};
  return query<SchemaChange>(
    `SELECT sc.*, r.agent_name
     FROM audit.schema_changes sc
     JOIN audit.agent_runs r ON sc.run_id = r.run_id
     ORDER BY sc.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export async function getDecompositions(opts?: { limit?: number; offset?: number }): Promise<MetricDecomposition[]> {
  const { limit = 50, offset = 0 } = opts || {};
  return query<MetricDecomposition>(
    `SELECT md.*, r.agent_name
     FROM audit.metric_decompositions md
     JOIN audit.agent_runs r ON md.run_id = r.run_id
     ORDER BY md.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export async function getFindings(opts?: { status?: string; limit?: number; offset?: number }): Promise<ReviewFinding[]> {
  const { status, limit = 50, offset = 0 } = opts || {};
  const conditions = status ? 'WHERE rf.status = $3' : '';
  const params: unknown[] = status ? [limit, offset, status] : [limit, offset];
  return query<ReviewFinding>(
    `SELECT rf.*, r.agent_name
     FROM audit.review_findings rf
     JOIN audit.agent_runs r ON rf.run_id = r.run_id
     ${conditions}
     ORDER BY
       CASE rf.severity
         WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2
         WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5
       END,
       rf.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
}

export async function getLineageEntries(opts?: { metric_id?: string; limit?: number; offset?: number }): Promise<DataLineageEntry[]> {
  const { metric_id, limit = 50, offset = 0 } = opts || {};
  const conditions = metric_id ? 'WHERE dl.metric_id = $3' : '';
  const params: unknown[] = metric_id ? [limit, offset, metric_id] : [limit, offset];
  return query<DataLineageEntry>(
    `SELECT dl.*
     FROM audit.data_lineage dl
     ${conditions}
     ORDER BY dl.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
}

// ─── Performance Metrics ─────────────────────────────────────────────────────

export async function getPerformanceSummary(): Promise<AgentPerformanceSummary[]> {
  const rows = await query<{
    agent_name: string;
    total_runs: string;
    successful_runs: string;
    failed_runs: string;
    blocked_runs: string;
    avg_duration_ms: string | null;
    p50_duration_ms: string | null;
    p95_duration_ms: string | null;
    total_tokens: string;
    total_artifacts: string;
    last_run_at: string | null;
  }>(`
    SELECT
      r.agent_name,
      COUNT(*) as total_runs,
      COUNT(*) FILTER (WHERE r.status = 'completed') as successful_runs,
      COUNT(*) FILTER (WHERE r.status = 'failed') as failed_runs,
      COUNT(*) FILTER (WHERE r.status = 'blocked_by_reviewer') as blocked_runs,
      AVG(r.duration_ms) FILTER (WHERE r.duration_ms IS NOT NULL) as avg_duration_ms,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.duration_ms) FILTER (WHERE r.duration_ms IS NOT NULL) as p50_duration_ms,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r.duration_ms) FILTER (WHERE r.duration_ms IS NOT NULL) as p95_duration_ms,
      COALESCE(SUM((r.token_usage->>'total_tokens')::BIGINT), 0) as total_tokens,
      (
        SELECT COUNT(*) FROM (
          SELECT run_id FROM audit.schema_changes WHERE run_id IN (SELECT run_id FROM audit.agent_runs WHERE agent_name = r.agent_name)
          UNION ALL
          SELECT run_id FROM audit.metric_decompositions WHERE run_id IN (SELECT run_id FROM audit.agent_runs WHERE agent_name = r.agent_name)
          UNION ALL
          SELECT run_id FROM audit.review_findings WHERE run_id IN (SELECT run_id FROM audit.agent_runs WHERE agent_name = r.agent_name)
        ) sub
      ) as total_artifacts,
      MAX(r.created_at)::TEXT as last_run_at
    FROM audit.agent_runs r
    GROUP BY r.agent_name
    ORDER BY COUNT(*) DESC
  `);

  return rows.map(r => {
    const total = parseInt(r.total_runs, 10);
    const successful = parseInt(r.successful_runs, 10);
    return {
      agent_name: r.agent_name,
      total_runs: total,
      successful_runs: successful,
      failed_runs: parseInt(r.failed_runs, 10),
      blocked_runs: parseInt(r.blocked_runs, 10),
      success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
      avg_duration_ms: r.avg_duration_ms ? parseFloat(r.avg_duration_ms) : null,
      p50_duration_ms: r.p50_duration_ms ? parseFloat(r.p50_duration_ms) : null,
      p95_duration_ms: r.p95_duration_ms ? parseFloat(r.p95_duration_ms) : null,
      total_tokens: parseInt(r.total_tokens, 10),
      total_artifacts: parseInt(r.total_artifacts, 10),
      last_run_at: r.last_run_at,
      daily_metrics: [], // Populated separately if needed
    };
  });
}

export async function getDailyMetrics(agentName: string, days: number = 30): Promise<AgentMetricsDaily[]> {
  return query<AgentMetricsDaily>(
    `SELECT
       r.agent_name,
       DATE(r.created_at) as metric_date,
       COUNT(*) as total_runs,
       COUNT(*) FILTER (WHERE r.status = 'completed') as successful_runs,
       COUNT(*) FILTER (WHERE r.status = 'failed') as failed_runs,
       COUNT(*) FILTER (WHERE r.status = 'blocked_by_reviewer') as blocked_runs,
       AVG(r.duration_ms) as avg_duration_ms,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r.duration_ms) as p95_duration_ms,
       COALESCE(SUM((r.token_usage->>'total_tokens')::BIGINT), 0) as total_tokens,
       0 as artifacts_produced
     FROM audit.agent_runs r
     WHERE r.agent_name = $1
       AND r.created_at >= NOW() - INTERVAL '1 day' * $2
     GROUP BY r.agent_name, DATE(r.created_at)
     ORDER BY DATE(r.created_at)`,
    [agentName, days]
  );
}
