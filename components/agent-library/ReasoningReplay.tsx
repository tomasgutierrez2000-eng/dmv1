'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ChevronDown, ChevronRight, Clock, Zap, Package,
  CheckCircle, XCircle, AlertTriangle, Brain, Database,
} from 'lucide-react';
import type { AgentRun, ReasoningStep, SchemaChange, MetricDecomposition, ReviewFinding } from '@/lib/agent-library/types';

const CONFIDENCE_COLORS = {
  HIGH: 'text-green-400 bg-green-500/10',
  MEDIUM: 'text-amber-400 bg-amber-500/10',
  LOW: 'text-red-400 bg-red-500/10',
};

function ReasoningStepRow({ step, isOpen, onToggle }: { step: ReasoningStep; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-l-2 border-slate-700 pl-4 ml-2">
      <button onClick={onToggle} className="flex items-start gap-2 w-full text-left group">
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] text-slate-500 font-mono">Step {step.step}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${CONFIDENCE_COLORS[step.confidence]}`}>
              {step.confidence}
            </span>
          </div>
          <p className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">
            {step.decision}
          </p>
        </div>
      </button>
      {isOpen && (
        <div className="mt-2 ml-5 p-3 bg-slate-800/50 rounded-md">
          <p className="text-xs text-slate-400 italic">{step.thought}</p>
        </div>
      )}
    </div>
  );
}

interface RunDetailData {
  run: AgentRun;
  artifacts: {
    schema_changes: SchemaChange[];
    decompositions: MetricDecomposition[];
    findings: ReviewFinding[];
  };
}

export default function ReasoningReplay({ agentSlug, runId }: { agentSlug: string; runId: string }) {
  const [data, setData] = useState<RunDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentSlug)}/runs/${runId}`);
        if (!res.ok) throw new Error(res.status === 503 ? 'Audit DB not connected' : `Error: ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentSlug, runId]);

  const toggleStep = (step: number) => {
    setOpenSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-4 bg-slate-700/50 rounded w-2/3" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <Link href={`/agents/${encodeURIComponent(agentSlug)}/runs`} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to runs
        </Link>
        <div className="flex items-center gap-2 text-red-400">
          <Database className="w-4 h-4" />
          <span className="text-sm">{error || 'Run not found'}</span>
        </div>
      </div>
    );
  }

  const { run, artifacts } = data;
  const statusConfig: Record<string, { icon: typeof CheckCircle; color: string }> = {
    completed: { icon: CheckCircle, color: 'text-green-400' },
    failed: { icon: XCircle, color: 'text-red-400' },
    started: { icon: Clock, color: 'text-blue-400' },
    blocked_by_reviewer: { icon: AlertTriangle, color: 'text-amber-400' },
  };
  const st = statusConfig[run.status] || statusConfig.started;
  const StIcon = st.icon;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <Link href={`/agents/${encodeURIComponent(agentSlug)}/runs`} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to runs
      </Link>

      {/* Run header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <StIcon className={`w-5 h-5 ${st.color}`} />
            <h1 className="text-xl font-bold text-slate-50 font-mono">Run {run.run_id.slice(0, 8)}</h1>
          </div>
          <p className="text-xs text-slate-400">
            {new Date(run.created_at).toLocaleString()}
            {run.completed_at && ` — ${new Date(run.completed_at).toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
            <Clock className="w-3 h-3" /> Duration
          </div>
          <span className="text-sm font-mono text-slate-200">
            {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}
          </span>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
            <Zap className="w-3 h-3" /> Tokens
          </div>
          <span className="text-sm font-mono text-slate-200">
            {run.token_usage ? run.token_usage.total_tokens.toLocaleString() : '—'}
          </span>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
            <Brain className="w-3 h-3" /> Reasoning Steps
          </div>
          <span className="text-sm font-mono text-slate-200">{run.reasoning_chain.length}</span>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
            <Package className="w-3 h-3" /> Artifacts
          </div>
          <span className="text-sm font-mono text-slate-200">
            {artifacts.schema_changes.length + artifacts.decompositions.length + artifacts.findings.length}
          </span>
        </div>
      </div>

      {/* Error message */}
      {run.error_message && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400 font-mono">{run.error_message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reasoning Chain */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" /> Reasoning Chain
          </h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            {run.reasoning_chain.length === 0 ? (
              <p className="text-xs text-slate-500">No reasoning data recorded</p>
            ) : (
              <div className="space-y-3">
                {run.reasoning_chain.map((step) => (
                  <ReasoningStepRow
                    key={step.step}
                    step={step}
                    isOpen={openSteps.has(step.step)}
                    onToggle={() => toggleStep(step.step)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Artifacts Produced */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-400" /> Artifacts Produced
          </h2>
          <div className="space-y-3">
            {/* Schema Changes */}
            {artifacts.schema_changes.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-teal-400 mb-2">Schema Changes ({artifacts.schema_changes.length})</h3>
                {artifacts.schema_changes.map(sc => (
                  <div key={sc.change_id} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-300 font-mono">{sc.change_type}</span>
                      <span className="text-slate-400">{sc.object_schema}.{sc.object_name}</span>
                      {sc.approved_by_reviewer && <CheckCircle className="w-3 h-3 text-green-400" />}
                    </div>
                    {sc.ddl_statement && (
                      <pre className="mt-1 text-[10px] text-slate-500 bg-slate-900 rounded p-2 overflow-x-auto">
                        {sc.ddl_statement.slice(0, 200)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Decompositions */}
            {artifacts.decompositions.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-violet-400 mb-2">Decompositions ({artifacts.decompositions.length})</h3>
                {artifacts.decompositions.map(d => (
                  <div key={d.decomp_id} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-300 font-mono">{d.metric_id}</span>
                      <span className="text-slate-400">{d.metric_name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${CONFIDENCE_COLORS[d.confidence_level]}`}>
                        {d.confidence_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Findings */}
            {artifacts.findings.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-amber-400 mb-2">Findings ({artifacts.findings.length})</h3>
                {artifacts.findings.map(f => (
                  <div key={f.finding_id} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-mono ${
                        f.severity === 'CRITICAL' ? 'text-red-400' :
                        f.severity === 'HIGH' ? 'text-amber-400' : 'text-slate-400'
                      }`}>{f.severity}</span>
                      <span className="text-slate-400 truncate">{f.issue_description.slice(0, 80)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {artifacts.schema_changes.length === 0 && artifacts.decompositions.length === 0 && artifacts.findings.length === 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500">No artifacts produced by this run</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions Taken */}
      {run.actions_taken.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Actions Taken</h2>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="space-y-2">
              {run.actions_taken.map((action, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="text-[10px] text-slate-500 font-mono w-12 flex-shrink-0">{action.type}</span>
                  <span className="text-slate-300">{action.detail}</span>
                  {action.timestamp && (
                    <span className="text-slate-500 ml-auto flex-shrink-0">{new Date(action.timestamp).toLocaleTimeString()}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
