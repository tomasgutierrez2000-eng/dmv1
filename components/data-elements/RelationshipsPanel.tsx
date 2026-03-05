'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';
import type { DataDictionaryRelationship } from '@/lib/data-dictionary';
import { LayerBadge } from './badges';

const MAX_VISIBLE_REFS = 10;

interface RelationshipsPanelProps {
  outgoing: DataDictionaryRelationship[];
  incoming: DataDictionaryRelationship[];
}

function groupByLayer(rels: DataDictionaryRelationship[], layerKey: 'from_layer' | 'to_layer') {
  const groups: Record<string, DataDictionaryRelationship[]> = {};
  for (const r of rels) {
    const layer = r[layerKey];
    if (!groups[layer]) groups[layer] = [];
    groups[layer].push(r);
  }
  return groups;
}

export default function RelationshipsPanel({ outgoing, incoming }: RelationshipsPanelProps) {
  const outGrouped = groupByLayer(outgoing, 'to_layer');
  const inGrouped = groupByLayer(incoming, 'from_layer');
  const [expandedOutLayers, setExpandedOutLayers] = useState<Set<string>>(new Set());
  const [expandedInLayers, setExpandedInLayers] = useState<Set<string>>(new Set());

  function toggleExpand(set: Set<string>, setter: (s: Set<string>) => void, layer: string) {
    const next = new Set(set);
    if (next.has(layer)) next.delete(layer);
    else next.add(layer);
    setter(next);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Outgoing FKs */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Outgoing Foreign Keys ({outgoing.length})
        </h3>
        {outgoing.length === 0 ? (
          <p className="text-xs text-gray-600">No outgoing foreign keys</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(outGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([layer, rels]) => {
              const isExpanded = expandedOutLayers.has(layer);
              const visible = isExpanded ? rels : rels.slice(0, MAX_VISIBLE_REFS);
              const overflow = rels.length - MAX_VISIBLE_REFS;
              return (
                <div key={layer}>
                  <div className="flex items-center gap-2 mb-2">
                    <LayerBadge layer={layer} dark />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {rels.length} reference{rels.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {visible.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-3 rounded hover:bg-white/5">
                        <code className="font-mono text-purple-300">{r.from_field}</code>
                        <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" aria-hidden />
                        <Link
                          href={`/data-elements/${r.to_layer}/${encodeURIComponent(r.to_table)}`}
                          className="font-mono text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {r.to_layer}.{r.to_table}.{r.to_field}
                        </Link>
                      </div>
                    ))}
                  </div>
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(expandedOutLayers, setExpandedOutLayers, layer)}
                      className="mt-1 px-3 py-1 text-[10px] text-gray-500 hover:text-gray-300 inline-flex items-center gap-1"
                    >
                      {isExpanded ? 'Show less' : `+${overflow} more`}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Incoming References */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Incoming References ({incoming.length})
        </h3>
        {incoming.length === 0 ? (
          <p className="text-xs text-gray-600">No other tables reference this table</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(inGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([layer, rels]) => {
              const isExpanded = expandedInLayers.has(layer);
              const visible = isExpanded ? rels : rels.slice(0, MAX_VISIBLE_REFS);
              const overflow = rels.length - MAX_VISIBLE_REFS;
              return (
                <div key={layer}>
                  <div className="flex items-center gap-2 mb-2">
                    <LayerBadge layer={layer} dark />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {rels.length} reference{rels.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {visible.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-3 rounded hover:bg-white/5">
                        <Link
                          href={`/data-elements/${r.from_layer}/${encodeURIComponent(r.from_table)}`}
                          className="font-mono text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {r.from_layer}.{r.from_table}.{r.from_field}
                        </Link>
                        <ArrowLeft className="w-3 h-3 text-gray-600 flex-shrink-0" aria-hidden />
                        <code className="font-mono text-purple-300">{r.to_field}</code>
                      </div>
                    ))}
                  </div>
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(expandedInLayers, setExpandedInLayers, layer)}
                      className="mt-1 px-3 py-1 text-[10px] text-gray-500 hover:text-gray-300 inline-flex items-center gap-1"
                    >
                      {isExpanded ? 'Show less' : `+${overflow} more`}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
