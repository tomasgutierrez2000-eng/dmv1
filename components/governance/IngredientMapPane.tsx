'use client';

import { useState, useEffect } from 'react';
import { Database, Table2, ArrowRight, Loader2, Layers, XCircle } from 'lucide-react';

interface IngredientTable {
  key: string;
  layer: string;
  table: string;
  fields: Array<{
    layer: string;
    table: string;
    field: string;
    description: string;
    data_type?: string;
  }>;
  row_count: number;
}

interface JoinRelationship {
  from: string;
  to: string;
  join_type: string;
}

interface IngredientMapPaneProps {
  itemId: string;
}

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  L1: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', badge: 'bg-blue-500/20' },
  L2: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20' },
  L3: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20' },
};

const FIELD_ROLE_COLORS: Record<string, string> = {
  MEASURE: 'text-pwc-orange',
  JOIN_KEY: 'text-blue-400',
  DIMENSION: 'text-purple-400',
  FILTER: 'text-cyan-400',
};

/** Infer field role from name for highlighting */
function inferRole(field: string, table: string): string {
  if (field.endsWith('_amt') || field.endsWith('_pct') || field.endsWith('_bps') || field.endsWith('_value') || field === 'current_valuation_usd') return 'MEASURE';
  // Strip common table suffixes to detect PK (e.g., facility_master → facility_id)
  const baseName = table.replace(/_(master|dim|snapshot|link|calc|observation|type|event|detail|fact)$/, '');
  if (field.endsWith('_id') && field === `${baseName}_id`) return 'JOIN_KEY';
  if (field.endsWith('_id')) return 'DIMENSION';
  if (field === 'as_of_date' || field.endsWith('_flag')) return 'FILTER';
  return '';
}

function TableCard({ table }: { table: IngredientTable }) {
  const [expanded, setExpanded] = useState(true);
  const colors = LAYER_COLORS[table.layer] ?? LAYER_COLORS.L2;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-white/5 transition-colors"
      >
        <Table2 className={`w-3.5 h-3.5 ${colors.text}`} />
        <span className={`text-xs font-semibold ${colors.text}`}>{table.layer}</span>
        <span className="text-sm font-mono text-gray-300">{table.table}</span>
        {table.row_count >= 0 && (
          <span className="ml-auto text-[10px] text-gray-500">
            {table.row_count.toLocaleString()} rows
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-0.5">
          {table.fields.map((f) => {
            const role = inferRole(f.field, table.table);
            const roleColor = FIELD_ROLE_COLORS[role] ?? 'text-gray-400';
            return (
              <div key={f.field} className="flex items-center gap-2 py-0.5">
                <span className={`text-xs font-mono ${roleColor}`}>
                  {f.field}
                </span>
                {f.data_type && (
                  <span className="text-[10px] text-gray-600">{f.data_type}</span>
                )}
                {role && (
                  <span className={`text-[9px] px-1 py-px rounded ${LAYER_COLORS[table.layer]?.badge ?? ''} ${roleColor}`}>
                    {role}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Left pane: shows all source tables and fields (ingredients)
 * that feed into the metric calculation.
 */
export default function IngredientMapPane({ itemId }: IngredientMapPaneProps) {
  const [tables, setTables] = useState<IngredientTable[]>([]);
  const [joinRelationships, setJoinRelationships] = useState<JoinRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    async function load() {
      try {
        const res = await fetch(`/api/metrics/governance/ingredients?item_id=${encodeURIComponent(itemId)}`);
        if (res.ok) {
          const data = await res.json();
          setTables(data.tables ?? []);
          setJoinRelationships(data.join_relationships ?? []);
          setDbConnected(data.db_connected ?? false);
        } else {
          setError(`Server returned ${res.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ingredient data');
      }
      setLoading(false);
    }
    load();
  }, [itemId, fetchKey]);

  // Sort: L2 tables first (atomic data), then L1 (reference)
  const sortedTables = [...tables].sort((a, b) => {
    const order: Record<string, number> = { L2: 0, L1: 1, L3: 2 };
    return (order[a.layer] ?? 9) - (order[b.layer] ?? 9);
  });

  const l2Tables = sortedTables.filter(t => t.layer === 'L2');
  const l1Tables = sortedTables.filter(t => t.layer === 'L1');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-pwc-gray-light shrink-0">
        <Database className="w-4 h-4 text-pwc-orange" />
        <h3 className="text-sm font-semibold text-pwc-white">Ingredient Map</h3>
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${dbConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {dbConnected ? 'DB Connected' : 'No DB'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-gray-700/50 bg-gray-800/30 overflow-hidden animate-pulse">
                <div className="px-3 py-2 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-gray-700" />
                  <div className="w-8 h-3 rounded bg-gray-700" />
                  <div className="w-24 h-3 rounded bg-gray-700" />
                </div>
                <div className="px-3 pb-2 space-y-1">
                  {[1, 2].map(j => (
                    <div key={j} className="flex items-center gap-2 py-0.5">
                      <div className="w-28 h-2.5 rounded bg-gray-700/50" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <XCircle className="w-6 h-6 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => setFetchKey(k => k + 1)}
              className="text-[10px] text-pwc-orange hover:text-pwc-orange/80 underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* L2 Atomic Data */}
            {l2Tables.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    L2 Atomic Data
                  </span>
                </div>
                <div className="space-y-2">
                  {l2Tables.map(t => <TableCard key={t.key} table={t} />)}
                </div>
              </div>
            )}

            {/* L1 Reference Data */}
            {l1Tables.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                    L1 Reference Data
                  </span>
                </div>
                <div className="space-y-2">
                  {l1Tables.map(t => <TableCard key={t.key} table={t} />)}
                </div>
              </div>
            )}

            {/* FK Relationships */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowRight className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Join Relationships
                </span>
              </div>
              {joinRelationships.length > 0 ? (
                <div className="space-y-1 text-xs text-gray-500">
                  {joinRelationships.map((j, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="font-mono text-emerald-400/60">{j.from}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-mono text-emerald-400/60">{j.to}</span>
                      <span className="text-[10px] text-gray-600">({j.join_type})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 italic">Join relationships inferred from data model</p>
              )}
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-pwc-gray-light/30 space-y-1">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Legend</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(FIELD_ROLE_COLORS).map(([role, color]) => (
                  <span key={role} className={`text-[10px] ${color}`}>
                    ● {role}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
