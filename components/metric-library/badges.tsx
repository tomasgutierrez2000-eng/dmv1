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

const KIND_COLORS: Record<string, string> = {
  DATA_ELEMENT: 'bg-blue-100 text-blue-800 border border-blue-200',
  METRIC: 'bg-purple-100 text-purple-800 border border-purple-200',
};

const KIND_LABELS: Record<string, string> = {
  DATA_ELEMENT: 'Data Element',
  METRIC: 'Metric',
};

export function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${KIND_COLORS[kind] ?? 'bg-gray-100 text-gray-700 border border-gray-200'}`}
      aria-label={`Kind: ${KIND_LABELS[kind] ?? kind}`}
    >
      {KIND_LABELS[kind] ?? kind}
    </span>
  );
}

const SOURCING_COLORS: Record<string, string> = {
  Raw: 'bg-slate-100 text-slate-700',
  Calc: 'bg-emerald-100 text-emerald-700',
  Agg: 'bg-amber-100 text-amber-700',
  Avg: 'bg-sky-100 text-sky-700',
};

export function SourcingBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${SOURCING_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {type}
    </span>
  );
}
