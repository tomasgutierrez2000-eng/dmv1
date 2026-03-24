'use client';

import { useEffect } from 'react';
import { Bot, Search, Database, AlertCircle } from 'lucide-react';
import { useAgentLibraryStore } from '@/store/agentLibraryStore';
import AgentCard from './AgentCard';
import AgentDependencyGraph from './AgentDependencyGraph';
import type { AgentCategory } from '@/lib/agent-library/types';

const CATEGORY_TABS: { key: AgentCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expert', label: 'Experts' },
  { key: 'builder', label: 'Builders' },
  { key: 'reviewer', label: 'Reviewers' },
  { key: 'workflow', label: 'Workflows' },
  { key: 'session', label: 'Sessions' },
];

export default function AgentCatalog() {
  const {
    agents, agentsLoading, agentsError, auditConnected,
    selectedCategory, searchQuery,
    setAgents, setAgentsLoading, setAgentsError,
    setSelectedCategory, setSearchQuery, filteredAgents,
  } = useAgentLibraryStore();

  useEffect(() => {
    async function load() {
      setAgentsLoading(true);
      try {
        const res = await fetch('/api/agents');
        if (!res.ok) throw new Error(`Failed to load agents: ${res.status}`);
        const data = await res.json();
        setAgents(data.agents, data.audit_connected);
      } catch (err) {
        setAgentsError((err as Error).message);
      }
    }
    load();
  }, [setAgents, setAgentsLoading, setAgentsError]);

  const filtered = filteredAgents();
  const builtCount = agents.filter(a => a.status === 'built').length;
  const totalRuns = agents.reduce((s, a) => s + a.totalRuns, 0);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Bot className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-slate-50 font-mono">Agent Library</h1>
        </div>
        <p className="text-sm text-slate-400">
          Artifact-centric observatory for GSIB agent governance
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Agents:</span>
          <span className="text-slate-200 font-mono">{agents.length}</span>
          <span className="text-slate-600">({builtCount} built)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Total Runs:</span>
          <span className="text-slate-200 font-mono">{totalRuns}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database className={`w-3 h-3 ${auditConnected ? 'text-green-400' : 'text-slate-600'}`} />
          <span className={auditConnected ? 'text-green-400' : 'text-slate-500'}>
            {auditConnected ? 'Audit DB connected' : 'Audit DB not connected'}
          </span>
        </div>
      </div>

      {/* Search + Category filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 pl-8 pr-3 py-1.5 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
        <div className="flex gap-1">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedCategory === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {agentsError && (
        <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{agentsError}</span>
        </div>
      )}

      {/* Loading */}
      {agentsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-700/50 rounded w-full mb-2" />
              <div className="h-3 bg-slate-700/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Agent grid */}
      {!agentsLoading && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No agents found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(agent => (
                <AgentCard key={agent.slug} agent={agent} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dependency Graph */}
      {!agentsLoading && agents.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 font-mono">Agent Dependencies</h2>
          <AgentDependencyGraph agents={agents} />
        </div>
      )}
    </div>
  );
}
