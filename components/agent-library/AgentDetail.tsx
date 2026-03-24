'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot, Wrench, Shield, Workflow, Calendar, ArrowLeft,
  CheckCircle, Clock, AlertTriangle, Play, FileCode, Database,
} from 'lucide-react';
import type { AgentDefinition, AgentRun, AgentCategory } from '@/lib/agent-library/types';

const CATEGORY_ICONS: Record<AgentCategory, typeof Bot> = {
  expert: Bot, builder: Wrench, reviewer: Shield, workflow: Workflow, session: Calendar,
};

const CATEGORY_COLORS: Record<AgentCategory, string> = {
  expert: 'text-violet-400', builder: 'text-teal-400', reviewer: 'text-amber-400',
  workflow: 'text-blue-400', session: 'text-slate-400',
};

export default function AgentDetail({ slug }: { slug: string }) {
  const [agent, setAgent] = useState<AgentDefinition | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(res.status === 404 ? 'Agent not found' : `Error: ${res.status}`);
        const data = await res.json();
        setAgent(data.agent);
        setRecentRuns(data.recent_runs || []);
        setConnected(data.audit_connected);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-slate-700/50 rounded w-2/3 mb-2" />
          <div className="h-4 bg-slate-700/50 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <Link href="/agents" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to catalog
        </Link>
        <p className="text-red-400">{error || 'Agent not found'}</p>
      </div>
    );
  }

  const CatIcon = CATEGORY_ICONS[agent.category];
  const catColor = CATEGORY_COLORS[agent.category];

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <Link href="/agents" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to catalog
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={`p-3 rounded-lg bg-slate-800 border border-slate-700`}>
          <CatIcon className={`w-6 h-6 ${catColor}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-50 font-mono">{agent.name}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wide ${catColor}`}>
              {agent.category}
            </span>
            {agent.sessionId && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">{agent.sessionId}</span>
            )}
          </div>
          <p className="text-sm text-slate-400">{agent.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {agent.status === 'built' && <CheckCircle className="w-4 h-4 text-green-400" />}
          {agent.status === 'planned' && <Clock className="w-4 h-4 text-slate-400" />}
          {agent.status === 'in-progress' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          <span className="text-xs text-slate-300">{agent.status}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Runs" value={agent.totalRuns} icon={Play} />
        <StatCard label="Success Rate" value={agent.successRate !== null ? `${agent.successRate}%` : '—'} icon={CheckCircle} />
        <StatCard
          label="Last Run"
          value={agent.lastRunAt ? new Date(agent.lastRunAt).toLocaleDateString() : 'Never'}
          icon={Clock}
        />
        <StatCard label="Capabilities" value={agent.capabilities.length} icon={FileCode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capabilities */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Capabilities</h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            {agent.capabilities.length === 0 ? (
              <p className="text-xs text-slate-500">No capabilities parsed</p>
            ) : (
              <div className="space-y-2">
                {agent.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {cap}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dependencies */}
          {agent.dependencies.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Dependencies</h2>
              <div className="flex flex-wrap gap-2">
                {agent.dependencies.map(dep => (
                  <span key={dep} className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md font-mono">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Runs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Recent Runs</h2>
            {agent.totalRuns > 0 && (
              <Link
                href={`/agents/${encodeURIComponent(slug)}/runs`}
                className="text-[10px] text-emerald-400 hover:text-emerald-300"
              >
                View all
              </Link>
            )}
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            {!connected ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Database className="w-3.5 h-3.5" />
                Audit DB not connected
              </div>
            ) : recentRuns.length === 0 ? (
              <p className="text-xs text-slate-500">No runs yet — run this agent to see its history here</p>
            ) : (
              <div className="space-y-2">
                {recentRuns.map(run => (
                  <Link
                    key={run.run_id}
                    href={`/agents/${encodeURIComponent(slug)}/runs/${run.run_id}`}
                    className="block p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <RunStatusBadge status={run.status} />
                      <span className="text-[10px] text-slate-500">
                        {new Date(run.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      {run.duration_ms && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                      {run.token_usage && <span>{run.token_usage.total_tokens.toLocaleString()} tokens</span>}
                      {run.artifact_counts && (
                        <span>
                          {(run.artifact_counts.schema_changes + run.artifact_counts.decompositions + run.artifact_counts.findings)} artifacts
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Play }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-lg font-bold text-slate-100 font-mono">{value}</span>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const config = {
    completed: { color: 'text-green-400 bg-green-500/10', label: 'Completed' },
    failed: { color: 'text-red-400 bg-red-500/10', label: 'Failed' },
    started: { color: 'text-blue-400 bg-blue-500/10', label: 'Running' },
    blocked_by_reviewer: { color: 'text-amber-400 bg-amber-500/10', label: 'Blocked' },
  }[status] || { color: 'text-slate-400 bg-slate-500/10', label: status };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
