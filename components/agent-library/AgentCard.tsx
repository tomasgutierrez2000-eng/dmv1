'use client';

import Link from 'next/link';
import { Bot, Wrench, Shield, Workflow, Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { AgentDefinition, AgentCategory } from '@/lib/agent-library/types';

const CATEGORY_CONFIG: Record<AgentCategory, { icon: typeof Bot; color: string; label: string }> = {
  expert: { icon: Bot, color: 'text-violet-400', label: 'Expert' },
  builder: { icon: Wrench, color: 'text-teal-400', label: 'Builder' },
  reviewer: { icon: Shield, color: 'text-amber-400', label: 'Reviewer' },
  workflow: { icon: Workflow, color: 'text-blue-400', label: 'Workflow' },
  session: { icon: Calendar, color: 'text-slate-400', label: 'Session' },
};

const STATUS_CONFIG = {
  built: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Built' },
  planned: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Planned' },
  'in-progress': { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'In Progress' },
};

function HealthPulse({ successRate, totalRuns }: { successRate: number | null; totalRuns: number }) {
  if (totalRuns === 0) return <span className="w-2 h-2 rounded-full bg-slate-600" title="No runs yet" />;
  const rate = successRate ?? 0;
  const color = rate >= 90 ? 'bg-green-400' : rate >= 70 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <span className={`w-2 h-2 rounded-full ${color} animate-pulse`} title={`${rate}% success rate (${totalRuns} runs)`} />
  );
}

export default function AgentCard({ agent }: { agent: AgentDefinition }) {
  const cat = CATEGORY_CONFIG[agent.category];
  const st = STATUS_CONFIG[agent.status];
  const CatIcon = cat.icon;
  const StIcon = st.icon;

  // Truncate description to first sentence
  const desc = agent.description.length > 120
    ? agent.description.slice(0, 120).replace(/\s+\S*$/, '') + '...'
    : agent.description;

  const phaseCount = new Set(agent.capabilities.map(c => c.phase)).size;

  return (
    <Link
      href={`/agents/${encodeURIComponent(agent.slug)}`}
      className="block bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 hover:bg-slate-800/80 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <CatIcon className={`w-4 h-4 ${cat.color} flex-shrink-0`} />
          <h3 className="text-sm font-medium text-slate-50 truncate group-hover:text-white">
            {agent.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <HealthPulse successRate={agent.successRate} totalRuns={agent.totalRuns} />
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>
            {st.label}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{desc}</p>

      <div className="flex items-center justify-between">
        <span className={`text-[10px] ${cat.color} font-medium uppercase tracking-wide`}>
          {cat.label}
          {agent.sessionId && <span className="text-slate-500 ml-1">({agent.sessionId})</span>}
        </span>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          {agent.totalRuns > 0 && (
            <span>{agent.totalRuns} run{agent.totalRuns !== 1 ? 's' : ''}</span>
          )}
          {agent.lastRunAt && (
            <span>{new Date(agent.lastRunAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {agent.capabilities.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-emerald-400/80 font-medium">
              {agent.capabilities.length} {agent.capabilities.length === 1 ? 'capability' : 'capabilities'}
            </span>
            {phaseCount > 1 && (
              <span className="text-[10px] text-slate-600">across {phaseCount} phases</span>
            )}
          </div>
          <div className="space-y-0.5">
            {agent.capabilities.slice(0, 2).map((cap, i) => (
              <p key={i} className="text-[10px] text-slate-500 line-clamp-1 font-mono">
                {cap.title}
              </p>
            ))}
          </div>
        </div>
      )}
    </Link>
  );
}
