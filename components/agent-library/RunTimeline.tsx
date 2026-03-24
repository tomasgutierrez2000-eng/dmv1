'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Database, Clock, Zap, Package } from 'lucide-react';
import type { AgentRun } from '@/lib/agent-library/types';

function RunStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    completed: { color: 'text-green-400 bg-green-500/10', label: 'Completed' },
    failed: { color: 'text-red-400 bg-red-500/10', label: 'Failed' },
    started: { color: 'text-blue-400 bg-blue-500/10', label: 'Running' },
    blocked_by_reviewer: { color: 'text-amber-400 bg-amber-500/10', label: 'Blocked' },
  };
  const c = config[status] || { color: 'text-slate-400 bg-slate-500/10', label: status };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.color}`}>{c.label}</span>;
}

export default function RunTimeline({ agentSlug }: { agentSlug: string }) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentSlug)}/runs?page=${page}&page_size=${pageSize}`);
        const data = await res.json();
        setRuns(data.runs || []);
        setTotal(data.total || 0);
        setConnected(data.audit_connected !== false);
      } catch {
        setRuns([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentSlug, page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <Link href={`/agents/${encodeURIComponent(agentSlug)}`} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to agent
      </Link>

      <h1 className="text-2xl font-bold text-slate-50 font-mono mb-6">Run History</h1>

      {!connected && (
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
          <Database className="w-4 h-4" />
          Audit database not connected — no run data available
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 border border-slate-700/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No runs yet — run this agent to see its history here</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {runs.map(run => (
              <Link
                key={run.run_id}
                href={`/agents/${encodeURIComponent(agentSlug)}/runs/${run.run_id}`}
                className="block bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <RunStatusBadge status={run.status} />
                    <span className="text-xs text-slate-300 font-mono">
                      {run.run_id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {run.trigger_source}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  {run.duration_ms !== null && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(run.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                  {run.token_usage && (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {run.token_usage.total_tokens.toLocaleString()} tokens
                    </span>
                  )}
                  {run.artifact_counts && (
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {run.artifact_counts.schema_changes + run.artifact_counts.decompositions + run.artifact_counts.findings + run.artifact_counts.lineage_entries} artifacts
                    </span>
                  )}
                  {run.reasoning_chain.length > 0 && (
                    <span>{run.reasoning_chain.length} reasoning steps</span>
                  )}
                  {run.error_message && (
                    <span className="text-red-400 truncate max-w-[300px]">{run.error_message}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
