/**
 * GET /api/agents/[name] — Get a single agent definition with recent runs.
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

  const agents = parseAllAgents();
  const agent = agents.find(a => a.slug === decoded || a.slug.endsWith(`/${decoded}`));

  if (!agent) {
    return jsonError('Agent not found', { status: 404 });
  }

  const connected = await isAuditConnected();
  let recentRuns: unknown[] = [];
  if (connected) {
    const result = await getAgentRuns({ agent_name: agent.name, limit: 5 });
    recentRuns = result.runs;
  }

  return jsonSuccess({
    agent,
    recent_runs: recentRuns,
    audit_connected: connected,
  });
}
