'use client';

import { useState, useEffect } from 'react';
import { Database, Table2, ArrowRight, Loader2, Layers } from 'lucide-react';

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
    role?: string;
  }>;
  row_count: number;
  source?: 'formula' | 'ingredient' | 'both';
  join_type?: string;
}

interface JoinRelationship {
  from: string;
  to: string;
  join_type: string;
}

interface IngredientMapPaneProps {
  itemId: string;
  level?: string;
}

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  L1: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', badge: 'bg-blue-500/20' },
  L2: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20' },
  L3: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20' },
};

const FIELD_ROLE_COLORS: Record<string, string> = {
  MEASURE: 'text-pwc-orange',
  FORMULA_REF: 'text-green-400',
  JOIN_KEY: 'text-blue-400',
  DIMENSION: 'text-purple-400',
  FILTER: 'text-cyan-400',
};

/** Infer field role from name for highlighting (fallback when server doesn't provide role) */
function inferRole(field: string, table: string): string {
  if (field.endsWith('_amt') || field === 'current_valuation_usd') return 'MEASURE';
  if (field.endsWith('_pct') || field.endsWith('_bps') || field.endsWith('_value')) return 'MEASURE';
  if (field.endsWith('_id') && field === `${table.replace(/_/g, '_')}_id`) return 'JOIN_KEY';
  if (field.endsWith('_id')) return 'DIMENSION';
  if (field === 'as_of_date') return 'FILTER';
  if (field.endsWith('_flag')) return 'FILTER';
  return '';
}

const JOIN_TYPE_STYLES: Record<string, string> = {
  FROM: 'bg-emerald-500/20 text-emerald-400',
  INNER: 'bg-cyan-500/20 text-cyan-400',
  LEFT: 'bg-gray-500/20 text-gray-400',
  RIGHT: 'bg-gray-500/20 text-gray-400',
  FULL: 'bg-gray-500/20 text-gray-400',
  CROSS: 'bg-gray-500/20 text-gray-400',
};

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
        <Table2 className={`w-3.5 h-3.5 ${colors.text} shrink-0`} />
        <span className={`text-xs font-semibold ${colors.text}`}>{table.layer}</span>
        <span className="text-sm font-mono text-gray-300 truncate">{table.table}</span>

        {table.join_type && (
          <span className={`text-[9px] px-1 py-px rounded font-mono shrink-0 ${JOIN_TYPE_STYLES[table.join_type] ?? JOIN_TYPE_STYLES.INNER}`}>
            {table.join_type}
          </span>
        )}

        {table.source === 'formula' && (
          <span className="text-[9px] px-1 py-px rounded bg-purple-500/20 text-purple-400 shrink-0">SQL</span>
        )}

        {table.row_count >= 0 && (
          <span className="ml-auto text-[10px] text-gray-500 shrink-0">
            {table.row_count.toLocaleString()} rows
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-0.5">
          {table.fields.map((f) => {
            const role = f.role || inferRole(f.field, table.table);
            const roleColor = FIELD_ROLE_COLORS[role] ?? 'text-gray-400';
            return (
              <div key={f.field} className="flex items-center gap-2 py-0.5" title={f.description || undefined}>
                <span className={`text-xs font-mono ${roleColor}`}>
                  {f.field}
                </span>
                {f.data_type && (
                  <span className="text-[10px] text-gray-600">{f.data_type}</span>
                )}
                {role && (
                  <span className={`text-[9px] px-1 py-px rounded ${LAYER_COLORS[table.layer]?.badge ?? ''} ${roleColor}`}>
                    {role === 'FORMULA_REF' ? 'REF' : role}
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

const LEVEL_LABELS: Record<string, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  desk: 'Desk',
  portfolio: 'Portfolio',
  business_segment: 'Segment',
};

/**
 * Left pane: shows all source tables and fields (ingredients)
 * that feed into the metric calculation.
 *
 * When `level` is provided, dynamically extracts tables from formula_sql
 * for that dimension, showing infrastructure tables (EBT, FX, etc.)
 * that only appear at aggregate levels.
 */
export default function IngredientMapPane({ itemId, level }: IngredientMapPaneProps) {
  const [tables, setTables] = useState<IngredientTable[]>([]);
  const [joinRelationships, setJoinRelationships] = useState<JoinRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        let url = `/api/metrics/governance/ingredients?item_id=${encodeURIComponent(itemId)}`;
        if (level) {
          url += `&level=${encodeURIComponent(level)}`;
        }
        const res = await fetch(url);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTables(data.tables ?? []);
          setJoinRelationships(data.join_relationships ?? []);
          setDbConnected(data.db_connected ?? false);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [itemId, level]);

  // Sort: source=both first, then formula, then ingredient-only. Within: L2 > L1 > L3
  const sortedTables = [...tables].sort((a, b) => {
    const sourceOrder: Record<string, number> = { both: 0, formula: 1, ingredient: 2 };
    const layerOrder: Record<string, number> = { L2: 0, L1: 1, L3: 2 };
    const srcDiff = (sourceOrder[a.source ?? 'ingredient'] ?? 9) - (sourceOrder[b.source ?? 'ingredient'] ?? 9);
    if (srcDiff !== 0) return srcDiff;
    return (layerOrder[a.layer] ?? 9) - (layerOrder[b.layer] ?? 9);
  });

  const l2Tables = sortedTables.filter(t => t.layer === 'L2');
  const l1Tables = sortedTables.filter(t => t.layer === 'L1');
  const l3Tables = sortedTables.filter(t => t.layer === 'L3');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-pwc-gray-light shrink-0">
        <Database className="w-4 h-4 text-pwc-orange" />
        <h3 className="text-sm font-semibold text-pwc-white">Ingredient Map</h3>
        {level && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-pwc-orange/20 text-pwc-orange">
            {LEVEL_LABELS[level] ?? level}
          </span>
        )}
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${dbConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {dbConnected ? 'DB Connected' : 'No DB'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
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
                  <span className="text-[10px] text-gray-600">{l2Tables.length}</span>
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
                  <span className="text-[10px] text-gray-600">{l1Tables.length}</span>
                </div>
                <div className="space-y-2">
                  {l1Tables.map(t => <TableCard key={t.key} table={t} />)}
                </div>
              </div>
            )}

            {/* L3 Derived Data */}
            {l3Tables.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                    L3 Derived Data
                  </span>
                  <span className="text-[10px] text-gray-600">{l3Tables.length}</span>
                </div>
                <div className="space-y-2">
                  {l3Tables.map(t => <TableCard key={t.key} table={t} />)}
                </div>
              </div>
            )}

            {/* FK Relationships */}
            {joinRelationships.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ArrowRight className="w-3 h-3 text-gray-500" />
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Join Relationships
                  </span>
                  <span className="text-[10px] text-gray-600">{joinRelationships.length}</span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  {joinRelationships.map((j, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="font-mono text-emerald-400/60">{j.from}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-mono text-emerald-400/60">{j.to}</span>
                      <span className={`text-[10px] ${j.join_type === 'LEFT' ? 'text-gray-600' : 'text-cyan-400/60'}`}>
                        ({j.join_type})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="pt-2 border-t border-pwc-gray-light/30 space-y-1">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Legend</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(FIELD_ROLE_COLORS).map(([role, color]) => (
                  <span key={role} className={`text-[10px] ${color}`}>
                    ● {role === 'FORMULA_REF' ? 'REF' : role}
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
