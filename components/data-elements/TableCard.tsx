'use client';

import Link from 'next/link';
import { Key, Link2, Columns3 } from 'lucide-react';
import type { DataDictionaryTable } from '@/lib/data-dictionary';
import type { TableStatus } from '@/lib/db-status';
import { countPKs, countFKs } from '@/lib/data-elements/utils';
import StatusBadge from '@/components/db-status/StatusBadge';
import { LayerBadge } from './badges';

const HOVER_BORDER: Record<string, string> = {
  L1: 'hover:border-blue-200',
  L2: 'hover:border-amber-200',
  L3: 'hover:border-emerald-200',
};

export default function TableCard({
  table,
  dbStatus,
  dbRowCount,
}: {
  table: DataDictionaryTable;
  dbStatus?: TableStatus | null;
  dbRowCount?: number | null;
}) {
  const pkCount = countPKs(table);
  const fkCount = countFKs(table);

  return (
    <Link
      href={`/data-elements/${table.layer}/${encodeURIComponent(table.name)}`}
      className={`bg-white rounded-lg border border-gray-200 p-5 ${HOVER_BORDER[table.layer] ?? 'hover:border-gray-300'} hover:shadow-md cursor-pointer transition-all duration-200 block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 no-underline`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <LayerBadge layer={table.layer} />
            {dbStatus && <StatusBadge status={dbStatus} rowCount={dbRowCount} compact />}
            <h2 className="text-base font-bold text-gray-900 font-mono truncate">{table.name}</h2>
          </div>
          <p className="text-sm text-gray-500 mb-2">{table.category}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Columns3 className="w-3.5 h-3.5" aria-hidden />
              {table.fields.length} field{table.fields.length !== 1 ? 's' : ''}
            </span>
            {pkCount > 0 && (
              <span className="inline-flex items-center gap-1 text-yellow-600">
                <Key className="w-3.5 h-3.5" aria-hidden />
                {pkCount} PK
              </span>
            )}
            {fkCount > 0 && (
              <span className="inline-flex items-center gap-1 text-indigo-600">
                <Link2 className="w-3.5 h-3.5" aria-hidden />
                {fkCount} FK{fkCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
          <div className="text-2xl font-bold text-gray-900 tabular-nums">{table.fields.length}</div>
          <div className="text-xs text-gray-500">fields</div>
        </div>
      </div>
    </Link>
  );
}
