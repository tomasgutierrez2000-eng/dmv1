'use client';

import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react';
import type { TableStatus } from '@/lib/db-status';

const CONFIG: Record<TableStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  has_data: {
    label: 'Has data',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2,
  },
  empty: {
    label: 'Empty',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: Circle,
  },
  not_in_db: {
    label: 'Loading stage',
    className: 'bg-gray-50 text-gray-500 border-dashed border-gray-300',
    Icon: Clock,
  },
  not_in_dd: {
    label: 'Orphan',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    Icon: AlertTriangle,
  },
};

export default function StatusBadge({
  status,
  rowCount,
  compact,
}: {
  status: TableStatus;
  rowCount?: number | null;
  compact?: boolean;
}) {
  const { label, className, Icon } = CONFIG[status];

  if (compact) {
    // Small dot only — for TableCard integration
    // not_in_db uses a hollow circle (border only) to visually distinguish from filled dots
    const dotClass =
      status === 'has_data'
        ? 'w-2 h-2 bg-emerald-500'
        : status === 'empty'
          ? 'w-2 h-2 bg-amber-400'
          : status === 'not_in_db'
            ? 'w-[9px] h-[9px] border-[1.5px] border-gray-400 bg-transparent'
            : 'w-2 h-2 bg-orange-500';

    const tooltip =
      status === 'has_data'
        ? `In DB (${rowCount?.toLocaleString() ?? '?'} rows)`
        : status === 'empty'
          ? 'In DB (empty)'
          : status === 'not_in_db'
            ? 'Not in database'
            : 'In DB but not in data dictionary';

    return (
      <span title={tooltip} className={`inline-block rounded-full flex-shrink-0 ${dotClass}`} />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${className}`}
    >
      <Icon className="w-3 h-3" />
      {label}
      {status === 'has_data' && rowCount != null && (
        <span className="text-emerald-600 tabular-nums ml-0.5">{rowCount.toLocaleString()}</span>
      )}
    </span>
  );
}
