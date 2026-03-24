/**
 * GET /api/agents — List all agents with optional audit stats enrichment.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { parseAllAgents } from '@/lib/agent-library/agent-parser';
import { getRunStatsByAgent, isAuditConnected } from '@/lib/agent-library/audit-client';
import type { AgentCatalogResponse, AgentCategory } from '@/lib/agent-library/types';

export async function GET(req: NextRequest) {
  try {
    const agents = parseAllAgents();
    const connected = await isAuditConnected();

    // Enrich with audit stats if connected
    if (connected) {
      const stats = await getRunStatsByAgent();
      for (const agent of agents) {
        const agentStats = stats[agent.name] || stats[agent.slug];
        if (agentStats) {
          agent.totalRuns = agentStats.total_runs;
          agent.successRate = agentStats.success_rate;
          agent.lastRunAt = agentStats.last_run_at;
        }
      }
    }

    const categories: Record<AgentCategory, number> = {
      expert: 0, builder: 0, reviewer: 0, workflow: 0, session: 0,
    };
    for (const a of agents) categories[a.category]++;

    const response: AgentCatalogResponse = {
      agents,
      categories,
      total_runs: agents.reduce((sum, a) => sum + a.totalRuns, 0),
      audit_connected: connected,
    };

    return jsonSuccess(response);
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
