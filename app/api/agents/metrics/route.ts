/**
 * GET /api/agents/metrics — Agent performance metrics and analytics.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess } from '@/lib/api-response';
import { isAuditConnected, getPerformanceSummary, getDailyMetrics } from '@/lib/agent-library/audit-client';
import type { PerformanceOverview } from '@/lib/agent-library/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentName = searchParams.get('agent');
  const days = parseInt(searchParams.get('days') || '30', 10);

  const connected = await isAuditConnected();
  if (!connected) {
    const empty: PerformanceOverview = {
      agents: [],
      global_totals: { total_runs: 0, total_tokens: 0, total_artifacts: 0, avg_success_rate: 0 },
    };
    return jsonSuccess({ ...empty, audit_connected: false });
  }

  const agents = await getPerformanceSummary();

  // If a specific agent requested, enrich with daily metrics
  if (agentName) {
    const daily = await getDailyMetrics(agentName, days);
    const agent = agents.find(a => a.agent_name === agentName);
    if (agent) agent.daily_metrics = daily;
  }

  const totalRuns = agents.reduce((s, a) => s + a.total_runs, 0);
  const totalTokens = agents.reduce((s, a) => s + a.total_tokens, 0);
  const totalArtifacts = agents.reduce((s, a) => s + a.total_artifacts, 0);
  const avgSuccessRate = agents.length > 0
    ? Math.round(agents.reduce((s, a) => s + a.success_rate, 0) / agents.length)
    : 0;

  const response: PerformanceOverview & { audit_connected: boolean } = {
    agents,
    global_totals: { total_runs: totalRuns, total_tokens: totalTokens, total_artifacts: totalArtifacts, avg_success_rate: avgSuccessRate },
    audit_connected: true,
  };

  return jsonSuccess(response);
}
