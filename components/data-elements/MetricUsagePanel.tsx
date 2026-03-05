'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import type { CatalogueItem } from '@/lib/metric-library/types';

interface MetricUsagePanelProps {
  usage: { item: CatalogueItem; fields: string[] }[];
}

export default function MetricUsagePanel({ usage }: MetricUsagePanelProps) {
  if (usage.length === 0) {
    return (
      <p className="text-xs text-gray-600">No catalogue metrics reference fields from this table.</p>
    );
  }

  return (
    <div className="space-y-2">
      {usage.map(({ item, fields }) => (
        <Link
          key={item.item_id}
          href={`/metrics/library/${encodeURIComponent(item.item_id)}`}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors no-underline group"
        >
          <div className="flex-shrink-0 mt-0.5">
            <Activity className="w-4 h-4 text-purple-400" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                {item.abbreviation}
              </span>
              <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                {item.item_name}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {fields.map((f) => (
                <code key={f} className="text-[10px] font-mono bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                  {f}
                </code>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
