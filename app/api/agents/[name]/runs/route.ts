/**
 * GET /api/agents/[name]/runs — Paginated run history for an agent.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { parseAllAgents } from '@/lib/agent-library/agent-parser';
import { getAgentRuns, isAuditConnected } from '@/lib/agent-library/audit-client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

  const agents = parseAllAgents();
  const agent = agents.find(a => a.slug === decoded || a.slug.endsWith(`/${decoded}`));
  if (!agent) return jsonError('Agent not found', { status: 404 });

  const connected = await isAuditConnected();
  if (!connected) {
    return jsonSuccess({ runs: [], total: 0, page, page_size: pageSize, audit_connected: false });
  }

  const result = await getAgentRuns({
    agent_name: agent.name,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return jsonSuccess({
    ...result,
    page,
    page_size: pageSize,
    audit_connected: true,
  });
}
