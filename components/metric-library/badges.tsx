'use client';

/** Reusable badges for Metric Library. Consistent semantics and focus. */

const TYPE_COLORS: Record<string, string> = {
  SOURCED: 'bg-sky-100 text-sky-800 border border-sky-200',
  CALCULATED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  HYBRID: 'bg-amber-100 text-amber-800 border border-amber-200',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  DRAFT: 'bg-amber-100 text-amber-800 border border-amber-200',
  DEPRECATED: 'bg-gray-100 text-gray-500 border border-gray-200',
  INACTIVE: 'bg-gray-100 text-gray-500 border border-gray-200',
  PROPOSED: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const TIER_COLORS: Record<string, string> = {
  T1: 'bg-blue-100 text-blue-800 border border-blue-200',
  T2: 'bg-violet-100 text-violet-800 border border-violet-200',
  T3: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
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

export function CalculationAuthorityBadge({
  tier,
  tierName,
}: {
  tier: string;
  tierName?: string;
}) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_COLORS[tier] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
      aria-label={`Calculation Authority: ${tier} ${tierName ?? ''}`}
    >
      {tier}
      {tierName ? ` · ${tierName}` : ''}
    </span>
  );
}
