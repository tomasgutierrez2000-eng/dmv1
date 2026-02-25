'use client';

/** Reusable badges for Metric Library. */

const TYPE_COLORS: Record<string, string> = {
  SOURCED: 'bg-sky-100 text-sky-800 border border-sky-200',
  CALCULATED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  HYBRID: 'bg-amber-100 text-amber-800 border border-amber-200',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  DRAFT: 'bg-amber-100 text-amber-800 border border-amber-200',
  DEPRECATED: 'bg-gray-100 text-gray-500 border border-gray-200',
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700 border border-gray-200'}`}
      aria-label={`Type: ${type}`}
    >
      {type}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT}`}
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}
