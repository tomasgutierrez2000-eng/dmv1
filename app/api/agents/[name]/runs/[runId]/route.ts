/**
 * GET /api/agents/[name]/runs/[runId] — Single run detail with full reasoning chain.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { getRunById, isAuditConnected, getSchemaChanges, getDecompositions, getFindings } from '@/lib/agent-library/audit-client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string; runId: string }> }
) {
  const { runId } = await params;

  const connected = await isAuditConnected();
  if (!connected) {
    return jsonError('Audit database not connected', { status: 503 });
  }

  const run = await getRunById(runId);
  if (!run) {
    return jsonError('Run not found', { status: 404 });
  }

  // Fetch artifacts produced by this run
  const [schemaChanges, decompositions, findings] = await Promise.all([
    getSchemaChanges({ limit: 100 }),
    getDecompositions({ limit: 100 }),
    getFindings({ limit: 100 }),
  ]);

  return jsonSuccess({
    run,
    artifacts: {
      schema_changes: schemaChanges.filter(sc => sc.run_id === runId),
      decompositions: decompositions.filter(d => d.run_id === runId),
      findings: findings.filter(f => f.run_id === runId),
    },
  });
}
