'use client';

import { useEffect, useState } from 'react';
import {
  Database, GitBranch, Brain, AlertTriangle, Link2,
  CheckCircle, XCircle, Shield,
} from 'lucide-react';
import type {
  ArtifactSummary, SchemaChange, MetricDecomposition,
  ReviewFinding, DataLineageEntry,
} from '@/lib/agent-library/types';

type ArtifactTab = 'schema_changes' | 'decompositions' | 'findings' | 'lineage';

const TAB_CONFIG: { key: ArtifactTab; label: string; icon: typeof Database }[] = [
  { key: 'schema_changes', label: 'Schema Changes', icon: GitBranch },
  { key: 'decompositions', label: 'Decompositions', icon: Brain },
  { key: 'findings', label: 'Findings', icon: AlertTriangle },
  { key: 'lineage', label: 'Data Lineage', icon: Link2 },
];

export default function ArtifactExplorer() {
  const [summary, setSummary] = useState<ArtifactSummary | null>(null);
  const [tab, setTab] = useState<ArtifactTab>('schema_changes');
  const [items, setItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/agents/artifacts?type=${tab}`);
        const data = await res.json();
        setSummary(data.summary);
        setItems(data.items || []);
        setConnected(data.audit_connected !== false);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tab]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-1">
        <Database className="w-6 h-6 text-teal-400" />
        <h1 className="text-2xl font-bold text-slate-50 font-mono">Artifact Explorer</h1>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Trace every artifact back to the agent decision that created it
      </p>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {TAB_CONFIG.map(t => {
            const count = summary[t.key as keyof ArtifactSummary] as number;
            const TIcon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`p-3 rounded-lg border transition-colors text-left ${
                  tab === t.key
                    ? 'bg-slate-800 border-teal-500/50'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] text-slate-500">{t.label}</span>
                </div>
                <span className="text-lg font-bold text-slate-100 font-mono">{count}</span>
              </button>
            );
          })}
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] text-slate-500">Total</span>
            </div>
            <span className="text-lg font-bold text-slate-100 font-mono">{summary.total}</span>
          </div>
        </div>
      )}

      {!connected && (
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
          <Database className="w-4 h-4" />
          Audit database not connected — no artifact data available
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 border border-slate-700/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No {tab.replace('_', ' ')} recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tab === 'schema_changes' && (items as SchemaChange[]).map(sc => (
            <SchemaChangeRow key={sc.change_id} change={sc} />
          ))}
          {tab === 'decompositions' && (items as MetricDecomposition[]).map(d => (
            <DecompositionRow key={d.decomp_id} decomp={d} />
          ))}
          {tab === 'findings' && (items as ReviewFinding[]).map(f => (
            <FindingRow key={f.finding_id} finding={f} />
          ))}
          {tab === 'lineage' && (items as DataLineageEntry[]).map(l => (
            <LineageRow key={l.lineage_id} entry={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function SchemaChangeRow({ change }: { change: SchemaChange }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-teal-400">{change.change_type}</span>
          <span className="text-xs text-slate-300">
            {change.object_schema}.{change.object_name}
          </span>
          {change.approved_by_reviewer ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {change.agent_name && <span>by {change.agent_name}</span>}
          <span>{new Date(change.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      {change.ddl_statement && (
        <pre className="text-[10px] text-slate-500 bg-slate-900/50 rounded p-2 overflow-x-auto font-mono">
          {change.ddl_statement.slice(0, 300)}{change.ddl_statement.length > 300 ? '...' : ''}
        </pre>
      )}
    </div>
  );
}

function DecompositionRow({ decomp }: { decomp: MetricDecomposition }) {
  const confColor = { HIGH: 'text-green-400', MEDIUM: 'text-amber-400', LOW: 'text-red-400' }[decomp.confidence_level];
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-violet-400">{decomp.metric_id}</span>
          <span className="text-xs text-slate-300">{decomp.metric_name}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded bg-slate-700 ${confColor}`}>
            {decomp.confidence_level}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="bg-slate-700 px-1.5 py-0.5 rounded">{decomp.risk_stripe}</span>
          <span>{new Date(decomp.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      {decomp.ingredients && decomp.ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {decomp.ingredients.slice(0, 6).map((ing, i) => (
            <span key={i} className="text-[9px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              {ing.source_table}.{ing.source_field}
            </span>
          ))}
          {decomp.ingredients.length > 6 && (
            <span className="text-[9px] text-slate-500">+{decomp.ingredients.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
}

function FindingRow({ finding }: { finding: ReviewFinding }) {
  const sevColor: Record<string, string> = {
    CRITICAL: 'text-red-400 bg-red-500/10',
    HIGH: 'text-amber-400 bg-amber-500/10',
    MEDIUM: 'text-yellow-400 bg-yellow-500/10',
    LOW: 'text-slate-300 bg-slate-500/10',
    INFORMATIONAL: 'text-blue-400 bg-blue-500/10',
  };
  const statusColor: Record<string, string> = {
    BLOCKING: 'text-red-400', WARNING: 'text-amber-400', INFORMATIONAL: 'text-blue-400',
    RESOLVED: 'text-green-400', WAIVED: 'text-slate-400',
  };
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sevColor[finding.severity] || ''}`}>
            {finding.severity}
          </span>
          {finding.mra_classification !== 'N/A' && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Shield className="w-3 h-3" /> {finding.mra_classification}
            </span>
          )}
          <span className="text-xs text-slate-400">{finding.domain}</span>
        </div>
        <span className={`text-[10px] font-medium ${statusColor[finding.status] || 'text-slate-400'}`}>
          {finding.status}
        </span>
      </div>
      <p className="text-xs text-slate-300">{finding.issue_description}</p>
      {finding.required_action && (
        <p className="text-[10px] text-slate-500 mt-1">Action: {finding.required_action.slice(0, 150)}</p>
      )}
    </div>
  );
}

function LineageRow({ entry }: { entry: DataLineageEntry }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-blue-400">{entry.metric_id}</span>
          <span className="text-xs text-slate-300">{entry.ingredient_name}</span>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded bg-slate-700 ${
          entry.data_quality_tier === 'T1' ? 'text-green-400' :
          entry.data_quality_tier === 'T2' ? 'text-amber-400' : 'text-red-400'
        }`}>
          {entry.data_quality_tier}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
        <span>{entry.source_table}.{entry.source_field}</span>
        {entry.target_table && (
          <>
            <span className="text-slate-600">→</span>
            <span>{entry.target_table}.{entry.target_field}</span>
          </>
        )}
      </div>
      {entry.bcbs239_principle_ref && (
        <span className="inline-block mt-1 text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
          {entry.bcbs239_principle_ref}
        </span>
      )}
    </div>
  );
}
