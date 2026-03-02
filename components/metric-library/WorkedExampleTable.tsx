'use client';

import React from 'react';
import type { DemoFacility } from '@/lib/metric-library/types';

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const pct = (n: number) => `${n.toFixed(1)}%`;

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  LOAN: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  COMMITMENT: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  SECURITY: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  DERIVATIVE: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  DEPOSIT: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  SFT: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
};

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] ?? { bg: 'bg-gray-500/15', text: 'text-gray-400' };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
      {type}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * POSITION TABLE — shows individual positions within a facility
 * ──────────────────────────────────────────────────────────────────────────── */

export function PositionTable({ facility }: { facility: DemoFacility }) {
  const total = facility.positions.reduce((s, p) => s + p.balance_amount, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 px-3 font-semibold">Position</th>
            <th className="text-left py-2 px-3 font-semibold">Type</th>
            <th className="text-left py-2 px-3 font-semibold">Description</th>
            <th className="text-right py-2 px-3 font-semibold">Balance</th>
          </tr>
        </thead>
        <tbody>
          {facility.positions.map((p) => (
            <tr key={p.position_id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
              <td className="py-2 px-3 font-mono text-xs text-gray-400">{p.position_id}</td>
              <td className="py-2 px-3"><TypeBadge type={p.position_type} /></td>
              <td className="py-2 px-3 text-gray-300">{p.description}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-200">{fmt(p.balance_amount)}</td>
            </tr>
          ))}
          <tr className="bg-white/[0.03] font-semibold">
            <td colSpan={3} className="py-2 px-3 text-gray-400 text-xs uppercase tracking-wider">
              Facility Total (= committed_facility_amt)
            </td>
            <td className="py-2 px-3 text-right font-mono text-emerald-400">{fmt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FACILITY TABLE — shows facilities with committed, collateral, LTV
 * ──────────────────────────────────────────────────────────────────────────── */

interface FacilityTableProps {
  facilities: DemoFacility[];
  groupBy?: 'desk' | 'counterparty';
  showPositionCount?: boolean;
  highlightResult?: boolean;
}

export function FacilityTable({ facilities, groupBy, showPositionCount, highlightResult = true }: FacilityTableProps) {
  const totalCommitted = facilities.reduce((s, f) => s + f.committed_amt, 0);
  const totalCollateral = facilities.reduce((s, f) => s + f.collateral_value, 0);
  const totalLtv = totalCollateral > 0 ? (totalCommitted / totalCollateral) * 100 : 0;

  // Group facilities if requested
  let groups: { label: string; items: DemoFacility[] }[] = [];
  if (groupBy === 'desk') {
    const byDesk = new Map<string, DemoFacility[]>();
    for (const f of facilities) {
      const arr = byDesk.get(f.desk_name) ?? [];
      arr.push(f);
      byDesk.set(f.desk_name, arr);
    }
    groups = Array.from(byDesk.entries()).map(([label, items]) => ({ label, items }));
  } else if (groupBy === 'counterparty') {
    const byCp = new Map<string, DemoFacility[]>();
    for (const f of facilities) {
      const arr = byCp.get(f.counterparty_name) ?? [];
      arr.push(f);
      byCp.set(f.counterparty_name, arr);
    }
    groups = Array.from(byCp.entries()).map(([label, items]) => ({ label, items }));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 px-3 font-semibold">Facility</th>
            {showPositionCount && <th className="text-center py-2 px-3 font-semibold">Positions</th>}
            <th className="text-right py-2 px-3 font-semibold">Committed</th>
            <th className="text-right py-2 px-3 font-semibold">Collateral</th>
            <th className="text-right py-2 px-3 font-semibold">LTV</th>
          </tr>
        </thead>
        <tbody>
          {groups.length > 0 ? (
            groups.map((g) => {
              const gc = g.items.reduce((s, f) => s + f.committed_amt, 0);
              const gv = g.items.reduce((s, f) => s + f.collateral_value, 0);
              const gl = gv > 0 ? (gc / gv) * 100 : 0;
              return (
                <React.Fragment key={g.label}>
                  <tr className="bg-gray-800/30">
                    <td colSpan={showPositionCount ? 5 : 4} className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {g.label}
                    </td>
                  </tr>
                  {g.items.map((f) => (
                    <FacilityRow key={f.facility_id} facility={f} showPositionCount={showPositionCount} />
                  ))}
                  <tr className="bg-white/[0.02]">
                    <td className="py-1.5 px-3 text-xs text-gray-500 italic">Subtotal — {g.label}</td>
                    {showPositionCount && <td />}
                    <td className="py-1.5 px-3 text-right font-mono text-xs text-gray-400">{fmt(gc)}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-xs text-gray-400">{fmt(gv)}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-xs text-amber-400 font-semibold">{pct(gl)}</td>
                  </tr>
                </React.Fragment>
              );
            })
          ) : (
            facilities.map((f) => (
              <FacilityRow key={f.facility_id} facility={f} showPositionCount={showPositionCount} />
            ))
          )}
          {facilities.length > 1 && (
            <tr className={`font-semibold ${highlightResult ? 'bg-emerald-500/10' : 'bg-white/[0.03]'}`}>
              <td className="py-2 px-3 text-gray-300 text-xs uppercase tracking-wider">
                Grand Total
              </td>
              {showPositionCount && (
                <td className="py-2 px-3 text-center font-mono text-xs text-gray-400">
                  {facilities.reduce((s, f) => s + f.positions.length, 0)}
                </td>
              )}
              <td className="py-2 px-3 text-right font-mono text-emerald-400">{fmt(totalCommitted)}</td>
              <td className="py-2 px-3 text-right font-mono text-emerald-400">{fmt(totalCollateral)}</td>
              <td className={`py-2 px-3 text-right font-mono font-bold text-lg ${highlightResult ? 'text-emerald-400' : 'text-white'}`}>
                {pct(totalLtv)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FacilityRow({ facility: f, showPositionCount }: { facility: DemoFacility; showPositionCount?: boolean }) {
  const ltvColor = f.ltv_pct >= 100 ? 'text-red-400' : f.ltv_pct >= 80 ? 'text-amber-400' : 'text-gray-200';
  return (
    <tr className="border-b border-gray-800/50 hover:bg-white/[0.02]">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-gray-500">{f.facility_id}</span>
          <span className="text-gray-300">{f.facility_name}</span>
        </div>
        <div className="text-[10px] text-gray-600 mt-0.5">{f.counterparty_name}</div>
      </td>
      {showPositionCount && (
        <td className="py-2 px-3 text-center font-mono text-xs text-gray-500">{f.positions.length}</td>
      )}
      <td className="py-2 px-3 text-right font-mono text-gray-200">{fmt(f.committed_amt)}</td>
      <td className="py-2 px-3 text-right font-mono text-gray-200">{fmt(f.collateral_value)}</td>
      <td className={`py-2 px-3 text-right font-mono font-semibold ${ltvColor}`}>{pct(f.ltv_pct)}</td>
    </tr>
  );
}

