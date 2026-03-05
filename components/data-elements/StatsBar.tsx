'use client';

import { Database, Columns3, GitFork } from 'lucide-react';
import type { DataDictionaryTable } from '@/lib/data-dictionary';
import { totalFieldCount } from '@/lib/data-elements/utils';

interface StatsBarProps {
  tables: DataDictionaryTable[];
  relationshipCount: number;
  selectedLayer: string | null;
  onSelectLayer: (layer: string | null) => void;
}

const LAYER_ACTIVE_COLORS: Record<string, string> = {
  L1: 'bg-blue-600 text-white shadow-sm',
  L2: 'bg-amber-600 text-white shadow-sm',
  L3: 'bg-emerald-600 text-white shadow-sm',
};

export default function StatsBar({ tables, relationshipCount, selectedLayer, onSelectLayer }: StatsBarProps) {
  const l1Count = tables.filter((t) => t.layer === 'L1').length;
  const l2Count = tables.filter((t) => t.layer === 'L2').length;
  const l3Count = tables.filter((t) => t.layer === 'L3').length;
  const fieldCount = totalFieldCount(tables);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Aggregate stats */}
        <div className="flex items-center gap-6 mr-auto">
          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-gray-400" aria-hidden />
            <span className="font-semibold text-gray-900">{tables.length}</span>
            <span className="text-gray-500">Tables</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Columns3 className="w-4 h-4 text-gray-400" aria-hidden />
            <span className="font-semibold text-gray-900">{fieldCount.toLocaleString()}</span>
            <span className="text-gray-500">Fields</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <GitFork className="w-4 h-4 text-gray-400" aria-hidden />
            <span className="font-semibold text-gray-900">{relationshipCount.toLocaleString()}</span>
            <span className="text-gray-500">Relationships</span>
          </div>
        </div>

        {/* Layer pills */}
        <div className="flex items-center gap-2" role="group" aria-label="Filter by layer">
          <button
            type="button"
            onClick={() => onSelectLayer(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              !selectedLayer ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            aria-pressed={!selectedLayer}
          >
            All
          </button>
          {(['L1', 'L2', 'L3'] as const).map((layer) => {
            const count = layer === 'L1' ? l1Count : layer === 'L2' ? l2Count : l3Count;
            const label = layer === 'L1' ? 'Reference' : layer === 'L2' ? 'Snapshots' : 'Derived';
            return (
              <button
                key={layer}
                type="button"
                onClick={() => onSelectLayer(selectedLayer === layer ? null : layer)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  selectedLayer === layer
                    ? LAYER_ACTIVE_COLORS[layer]
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                aria-pressed={selectedLayer === layer}
              >
                {layer} {label} ({count})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
