'use client';

import React, { useState, useMemo, type DragEvent } from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';
import type { StudioDragPayload } from '@/lib/metric-studio/types';

const LAYER_DOT: Record<string, string> = {
  l1: 'bg-teal-500',
  l2: 'bg-violet-500',
  l3: 'bg-rose-500',
};

const LAYER_LABEL: Record<string, string> = {
  l1: 'L1 Reference Tables',
  l2: 'L2 Atomic Tables',
  l3: 'L3 Derived Tables',
};

// Popular metric templates — IDs from YAML metric definitions
const TEMPLATES = [
  { id: 'EXP-015', name: 'Expected Loss Rate (%)' },
  { id: 'EXP-014', name: 'DSCR' },
  { id: 'RSK-009', name: 'Loan-to-Value (%)' },
  { id: 'EXP-021', name: 'Utilization Status' },
];

export function FieldPalette() {
  const schema = useStudioStore(s => s.schema);
  const schemaLoading = useStudioStore(s => s.schemaLoading);
  const schemaError = useStudioStore(s => s.schemaError);
  const loadMetricTemplate = useStudioStore(s => s.loadMetricTemplate);

  const [search, setSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const filteredTables = useMemo(() => {
    if (!schema) return { l1: [], l2: [], l3: [] };
    const q = search.toLowerCase();
    const filter = (tables: typeof schema.tables) =>
      tables.filter(t =>
        !q || t.name.includes(q) || t.fields.some(f => f.name.includes(q))
      );
    // L3 tables have no fields in schema (lazy-loaded), so filter by name only
    const filterL3 = (tables: typeof schema.tables) =>
      tables.filter(t => !q || t.name.includes(q));
    return {
      l1: filter(schema.tables.filter(t => t.layer === 'l1')),
      l2: filter(schema.tables.filter(t => t.layer === 'l2')),
      l3: filterL3(schema.tables.filter(t => t.layer === 'l3')),
    };
  }, [schema, search]);

  const toggleTable = (name: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const onDragStart = (e: DragEvent, payload: StudioDragPayload) => {
    e.dataTransfer.setData('application/studio-drag', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  if (schemaLoading) {
    return (
      <div className="w-[220px] bg-[#0f1017] border-r border-slate-800 p-3">
        <div className="text-xs text-slate-500 animate-pulse">Loading schema...</div>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="w-[220px] bg-[#0f1017] border-r border-slate-800 p-3">
        <div className="text-xs text-red-400">Schema error: {schemaError}</div>
      </div>
    );
  }

  return (
    <div className="w-[220px] bg-[#0f1017] border-r border-slate-800 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-slate-800">
        <input
          type="text"
          placeholder="Search fields..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1a1a25] border border-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-[#D04A02]/50 placeholder:text-slate-500"
        />
      </div>

      {/* Tables */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* L2 and L1 tables — draggable */}
        {(['l2', 'l1'] as const).map(layer => (
          <div key={layer}>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <span className={`w-2 h-2 rounded-full ${LAYER_DOT[layer]}`} />
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                {LAYER_LABEL[layer]}
              </span>
            </div>
            {filteredTables[layer].map(table => (
              <div key={table.name} className="mb-1">
                <button
                  onClick={() => toggleTable(table.name)}
                  draggable
                  onDragStart={e => onDragStart(e, { type: 'table', layer, tableName: table.name })}
                  className="w-full text-left px-2 py-1 rounded text-xs text-slate-400 hover:bg-[#1a1a25] hover:text-slate-200 flex items-center gap-1 cursor-grab active:cursor-grabbing"
                >
                  <span className="text-[10px] text-slate-600">
                    {expandedTables.has(table.name) ? '▾' : '▸'}
                  </span>
                  <span className="truncate font-mono text-[11px]">{table.name}</span>
                </button>
                {expandedTables.has(table.name) && (
                  <div className="ml-4 mt-0.5 space-y-px">
                    {table.fields.slice(0, 20).map(f => (
                      <div
                        key={f.name}
                        draggable
                        onDragStart={e => onDragStart(e, { type: 'field', layer, tableName: table.name, fieldName: f.name })}
                        className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded hover:bg-[#1e1e2a] hover:text-slate-300 cursor-grab active:cursor-grabbing truncate"
                        title={f.description || f.name}
                      >
                        {f.name}
                      </div>
                    ))}
                    {table.fields.length > 20 && (
                      <div className="text-[9px] text-slate-600 px-1.5">+{table.fields.length - 20} more</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* L3 tables — browse-only, NOT draggable */}
        {filteredTables.l3.length > 0 && (
          <div className="border-t border-slate-800 pt-2 mt-2">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <span className={`w-2 h-2 rounded-full ${LAYER_DOT.l3}`} />
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                {LAYER_LABEL.l3}
              </span>
            </div>
            {filteredTables.l3.map(table => (
              <div key={table.name} className="mb-1">
                <button
                  onClick={() => toggleTable(table.name)}
                  className="w-full text-left px-2 py-1 rounded text-xs text-slate-500 hover:bg-[#1a1a25] hover:text-slate-300 flex items-center gap-1"
                >
                  <span className="text-[10px] text-slate-600">
                    {expandedTables.has(table.name) ? '▾' : '▸'}
                  </span>
                  <span className="truncate font-mono text-[11px]">{table.name}</span>
                </button>
                {expandedTables.has(table.name) && (
                  <div className="ml-4 mt-0.5">
                    {table.fields.length > 0 ? (
                      table.fields.slice(0, 20).map(f => (
                        <div key={f.name} className="text-[10px] text-slate-600 font-mono px-1.5 py-0.5 truncate">
                          {f.name}
                        </div>
                      ))
                    ) : (
                      <div className="text-[9px] text-slate-600 italic px-1.5 py-0.5">Output table — fields loaded on inspect</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Templates */}
        <div className="border-t border-slate-800 pt-2 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium px-1 mb-1.5">
            Metric Templates
          </div>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => loadMetricTemplate(t.id)}
              className="w-full text-left px-2 py-1 rounded text-xs text-slate-400 hover:bg-[#1a1a25] hover:text-[#D04A02] flex items-center gap-1.5"
            >
              <span className="text-[10px]">▶</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
