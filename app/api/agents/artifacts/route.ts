/**
 * GET /api/agents/artifacts — Artifact summary and filtered lists.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import {
  isAuditConnected, getArtifactSummary, getSchemaChanges,
  getDecompositions, getFindings, getLineageEntries,
} from '@/lib/agent-library/audit-client';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type'); // schema_changes | decompositions | findings | lineage
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const connected = await isAuditConnected();
  if (!connected) {
    return jsonSuccess({
      summary: { schema_changes: 0, decompositions: 0, findings: 0, lineage_entries: 0, total: 0 },
      items: [],
      audit_connected: false,
    });
  }

  const summary = await getArtifactSummary();

  let items: unknown[] = [];
  if (type === 'schema_changes') items = await getSchemaChanges({ limit, offset });
  else if (type === 'decompositions') items = await getDecompositions({ limit, offset });
  else if (type === 'findings') items = await getFindings({ limit, offset });
  else if (type === 'lineage') items = await getLineageEntries({ limit, offset });

  return jsonSuccess({ summary, items, audit_connected: true });
}
