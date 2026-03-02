'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Database,
  Calculator,
  LayoutDashboard,
  Briefcase,
  ArrowDown,
  Table2,
  Users,
  FolderTree,
  PieChart,
  Building2,
  Layers,
  DollarSign,
  Workflow,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SAMPLE_FACILITY_COMMITTED,
  SAMPLE_COUNTERPARTY_ATTRIBUTION,
  SAMPLE_ULTIMATE_PARENT_COMMITTED,
  SAMPLE_ROLLUP_LEVELS,
} from './committed-lineage-data';

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function fmtDollar(n: number): string {
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + n.toLocaleString('en-US');
}

function SectionHeading({
  id,
  icon: Icon,
  step,
  layerColor,
  title,
  subtitle,
}: {
  id: string;
  icon: React.ElementType;
  step: string;
  layerColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4" id={id}>
      <div className={`w-10 h-10 rounded-xl ${layerColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{step}</span>
        <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3" aria-hidden="true">
      <div className="w-px h-6 bg-gradient-to-b from-gray-700 to-gray-600" />
      {label && (
        <span className="text-[9px] font-medium text-gray-500 bg-gray-900/80 px-2 py-0.5 rounded-full border border-gray-800">
          {label}
        </span>
      )}
      <ArrowDown className="w-4 h-4 text-gray-600" />
    </div>
  );
}

function TableBadge({ layer, table, color = 'blue' }: { layer: string; table: string; color?: 'blue' | 'amber' }) {
  return (
    <span
      className={`text-[9px] font-mono px-2 py-1 rounded border ${
        color === 'amber'
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
      }`}
    >
      {layer}.{table}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 1 — HEADER (in main export)
 * ──────────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 2 — METRIC DEFINITION
 * ──────────────────────────────────────────────────────────────────────────── */

function MetricDefinitionCard() {
  return (
    <div className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
        <span className="text-sm font-bold text-teal-400">Committed (USD)</span>
        <code className="text-[9px] font-mono text-gray-600 ml-auto">committed_amt</code>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Type</span>
          <span className="text-gray-300 font-medium">Currency (USD)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Definition</span>
          <span className="text-gray-300 font-medium">Bank&apos;s share of committed amount in USD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Rollup levels</span>
          <span className="text-gray-300 font-medium">Facility → Counterparty → L3 → L2 → L1 → L0</span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Key notes</div>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>Use DISTINCT(facility_id) to avoid double-counting when a facility has multiple position rows per snapshot.</li>
          <li>One row per facility per as_of_date at facility level.</li>
          <li>total_commitment is full deal amount in local currency; bank_share_pct (0.03–1.0) gives our bank&apos;s share.</li>
          <li>FX converts local currency to USD via l1.fx_rate (rate_type = &apos;SPOT&apos;).</li>
        </ul>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 3 — TWO CALCULATION PATHS
 * ──────────────────────────────────────────────────────────────────────────── */

function FacilityPathCard() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Table2 className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-bold text-amber-400">Facility path</span>
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Formula</div>
      <div className="bg-black/30 rounded-lg p-3 font-mono text-sm text-amber-300">
        [Committed] = total_commitment × fx_rate.rate × bank_share_pct
      </div>
      <div className="mt-3 text-[10px] text-gray-500 mb-2">Filters</div>
      <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
        <li>facility_master.facility_status = &apos;ACTIVE&apos;, is_current_flag = &apos;Y&apos;</li>
        <li>position.as_of_date = @as_of_date</li>
      </ul>
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Table / column map</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500">Full deal (local ccy)</span>
            <TableBadge layer="l2" table="position_detail" color="amber" />
            <code className="font-mono text-amber-300">total_commitment</code>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500">FX to USD</span>
            <TableBadge layer="l1" table="fx_rate" color="blue" />
            <code className="font-mono text-blue-300">rate</code>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500">Bank share</span>
            <TableBadge layer="l1" table="facility_lender_allocation" color="blue" />
            <code className="font-mono text-blue-300">bank_share_pct</code>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Worked example (sample data)</div>
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-5 text-[8px] font-bold uppercase tracking-wider text-gray-600 bg-white/[0.03] px-2 py-1.5 gap-2">
            <div>facility_id</div>
            <div className="text-right">total_commitment</div>
            <div className="text-right">fx_rate</div>
            <div className="text-right">bank_share_pct</div>
            <div className="text-right">committed_usd</div>
          </div>
          {SAMPLE_FACILITY_COMMITTED.map((row) => (
            <div key={row.facility_id} className="grid grid-cols-5 text-[10px] px-2 py-1.5 border-t border-gray-800/30 gap-2">
              <code className="font-mono text-gray-400">{row.facility_id}</code>
              <div className="text-right font-mono text-amber-300">{fmtDollar(row.total_commitment)}</div>
              <div className="text-right font-mono text-blue-300">{row.fx_rate}</div>
              <div className="text-right font-mono text-blue-300">{(row.bank_share_pct * 100).toFixed(0)}%</div>
              <div className="text-right font-mono text-teal-400 font-bold">{fmtDollar(row.committed_usd)}</div>
            </div>
          ))}
          <div className="grid grid-cols-5 text-[10px] font-bold px-2 py-2 border-t border-white/10 bg-white/[0.02] gap-2">
            <div>Total</div>
            <div className="col-span-3" />
            <div className="text-right font-mono text-teal-400">
              {fmtDollar(SAMPLE_FACILITY_COMMITTED.reduce((s, r) => s + r.committed_usd, 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CounterpartyPathCard() {
  return (
    <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-bold text-purple-400">Counterparty path</span>
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Formula</div>
      <div className="bg-black/30 rounded-lg p-3 font-mono text-sm text-purple-300">
        [Committed] = SUM(attributed_exposure_usd) GROUP BY ultimate_parent_id
      </div>
      <p className="mt-2 text-xs text-gray-400">
        attributed_exposure_usd is pre-computed: already includes FX conversion, bank_share_pct, and counterparty attribution_pct.
        Filter is_risk_bearing_flag = &apos;Y&apos; (BORROWER, GUARANTOR, PARTICIPANT, etc.; exclude AGENT, LEAD_ARRANGER, TRUSTEE).
      </p>
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Table / column map</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500">Pre-computed USD exposure</span>
            <TableBadge layer="l2" table="exposure_counterparty_attribution" color="amber" />
            <code className="font-mono text-amber-300">attributed_exposure_usd</code>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500">Risk-bearing filter</span>
            <TableBadge layer="l1" table="counterparty_role_dim" color="blue" />
            <code className="font-mono text-blue-300">is_risk_bearing_flag</code>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500">Ultimate parent obligor</span>
            <TableBadge layer="l1" table="counterparty_hierarchy" color="blue" />
            <code className="font-mono text-blue-300">ultimate_parent_id</code>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Worked example (sample data)</div>
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-4 text-[8px] font-bold uppercase tracking-wider text-gray-600 bg-white/[0.03] px-2 py-1.5 gap-2">
            <div>counterparty_id</div>
            <div>ultimate_parent_id</div>
            <div className="text-right">attributed_exposure_usd</div>
            <div className="text-right">attribution_pct</div>
          </div>
          {SAMPLE_COUNTERPARTY_ATTRIBUTION.map((row) => (
            <div key={row.counterparty_id} className="grid grid-cols-4 text-[10px] px-2 py-1.5 border-t border-gray-800/30 gap-2">
              <code className="font-mono text-gray-400">{row.counterparty_id}</code>
              <code className="font-mono text-blue-300">{row.ultimate_parent_id}</code>
              <div className="text-right font-mono text-amber-300">{fmtDollar(row.attributed_exposure_usd)}</div>
              <div className="text-right font-mono text-gray-400">{row.attribution_pct ?? '—'}%</div>
            </div>
          ))}
          <div className="px-2 py-2 border-t border-white/10 bg-white/[0.02] text-xs">
            <span className="text-gray-500">Committed by ultimate parent (UP-100): </span>
            <span className="font-mono font-bold text-purple-400">{fmtDollar(SAMPLE_ULTIMATE_PARENT_COMMITTED)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 4 — L1 REFERENCE TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

const L1_TABLES = [
  { table: 'facility_master', role: 'Facility identity, currency_code, facility_status, is_current_flag, lob_segment_id (→ LoB desk)' },
  { table: 'fx_rate', role: 'FX conversion to USD (from_currency_code, to_currency_code = USD, rate_type = SPOT, as_of_date)' },
  { table: 'facility_lender_allocation', role: 'Bank share of the deal (bank_share_pct); is_current_flag' },
  { table: 'counterparty_role_dim', role: 'Risk-bearing filter (is_risk_bearing_flag = Y for BORROWER, GUARANTOR, etc.)' },
  { table: 'counterparty_hierarchy', role: 'Ultimate parent obligor (ultimate_parent_id) for counterparty rollup' },
  { table: 'enterprise_business_taxonomy', role: 'LoB hierarchy (parent_segment_id, tree_level 0/1/2/3) for L3/L2/L1/L0 rollup' },
];

function L1ReferenceSection() {
  return (
    <div className="space-y-2">
      {L1_TABLES.map(({ table, role }) => (
        <div
          key={table}
          className="rounded-xl border border-blue-500/30 bg-blue-500/[0.04] p-3 flex items-start gap-3"
        >
          <Database className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <code className="text-xs font-mono font-bold text-blue-300">l1.{table}</code>
            <p className="text-xs text-gray-400 mt-1">{role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 5 — L2 SOURCE TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

const L2_TABLES = [
  { table: 'position', columns: 'position_id, facility_id, as_of_date', role: 'Snapshot filter; join to position_detail and facility_master' },
  { table: 'position_detail', columns: 'position_id, as_of_date, total_commitment', role: 'Full deal commitment in local currency (Facility path)' },
  { table: 'exposure_counterparty_attribution', columns: 'as_of_date, counterparty_id, counterparty_role_code, attributed_exposure_usd, attribution_pct', role: 'Pre-computed USD exposure by counterparty (Counterparty path)' },
];

function L2SourceSection() {
  return (
    <div className="space-y-2">
      {L2_TABLES.map(({ table, columns, role }) => (
        <div
          key={table}
          className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3 flex items-start gap-3"
        >
          <Layers className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <code className="text-xs font-mono font-bold text-amber-300">l2.{table}</code>
            <p className="text-[10px] font-mono text-gray-500 mt-1">{columns}</p>
            <p className="text-xs text-gray-400 mt-1">{role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 6 — ROLLUP HIERARCHY
 * ──────────────────────────────────────────────────────────────────────────── */

const ROLLUP_LEVELS = [
  { key: 'facility', label: 'Facility', icon: Table2, desc: 'One row per facility per as_of_date; formula: total_commitment × fx_rate × bank_share_pct', method: 'DISTINCT facility_id' },
  { key: 'counterparty', label: 'Counterparty', icon: Users, desc: 'SUM(attributed_exposure_usd) by ultimate_parent_id', method: 'Counterparty path' },
  { key: 'L3', label: 'Desk (L3)', icon: Briefcase, desc: 'facility_master.lob_segment_id = managed_segment_id (tree_level=3); SUM over distinct facility_ids in that L3', method: 'SUM across DISTINCT facility_ids' },
  { key: 'L2', label: 'Portfolio (L2)', icon: FolderTree, desc: 'L2 → L3 children via parent_segment_id; facilities in those L3s; same SUM', method: 'One level hierarchy traversal' },
  { key: 'L1', label: 'Line of Business (L1)', icon: PieChart, desc: 'L1 → L2 → L3 traversal; SUM over distinct facility_ids in all descendants', method: 'Two levels traversal' },
  { key: 'L0', label: 'Enterprise (L0)', icon: Building2, desc: 'managed_segment_id = 249 (tree_level=0); full hierarchy; sum of all L1s', method: 'Recursive CTE, 3 levels' },
];

function RollupHierarchySection() {
  const [expanded, setExpanded] = useState<string | null>('facility');
  const sampleByKey = Object.fromEntries(SAMPLE_ROLLUP_LEVELS.map((r) => [r.level, r]));

  return (
    <div className="space-y-2">
      {ROLLUP_LEVELS.map(({ key, label, icon: Icon, desc, method }) => {
        const sample = sampleByKey[key];
        const isExpanded = expanded === key;
        return (
          <div
            key={key}
            className="rounded-xl border border-gray-800 bg-white/[0.02] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : key)}
              aria-expanded={isExpanded}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.03] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Icon className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-white">{label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              {sample && (
                <span className="text-sm font-mono font-bold text-teal-400 tabular-nums flex-shrink-0">
                  {fmtDollar(sample.committed_usd)}
                </span>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {isExpanded && (
              <div className="px-3 pb-3 pt-0 border-t border-gray-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-2">Method</div>
                <p className="text-xs text-gray-400">{method}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 7 — QUICK REFERENCE TABLE & COLUMN MAP
 * ──────────────────────────────────────────────────────────────────────────── */

const QUICK_REF_ROWS = [
  { component: 'Full deal commitment (local ccy)', table: 'l2.position_detail', column: 'total_commitment' },
  { component: 'FX rate to USD', table: 'l1.fx_rate', column: 'rate' },
  { component: "Bank's share of the deal", table: 'l1.facility_lender_allocation', column: 'bank_share_pct' },
  { component: 'Counterparty attribution (pre-computed USD)', table: 'l2.exposure_counterparty_attribution', column: 'attributed_exposure_usd' },
  { component: 'Counterparty split %', table: 'l2.exposure_counterparty_attribution', column: 'attribution_pct' },
  { component: 'Risk-bearing filter', table: 'l1.counterparty_role_dim', column: 'is_risk_bearing_flag' },
  { component: 'Ultimate parent obligor', table: 'l1.counterparty_hierarchy', column: 'ultimate_parent_id' },
  { component: 'Facility → LoB desk mapping', table: 'l1.facility_master', column: 'lob_segment_id' },
  { component: 'LoB hierarchy traversal', table: 'l1.enterprise_business_taxonomy', column: 'parent_segment_id' },
  { component: 'Hierarchy level', table: 'l1.enterprise_business_taxonomy', column: 'tree_level (0/1/2/3)' },
  { component: 'Snapshot date filter', table: 'l2.position', column: 'as_of_date' },
  { component: 'Active facility filter', table: 'l1.facility_master', column: 'facility_status = ACTIVE' },
];

function QuickReferenceTable() {
  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <div className="grid grid-cols-3 gap-2 text-[9px] font-bold uppercase tracking-wider text-gray-600 bg-white/[0.03] px-3 py-2 border-b border-gray-800">
        <div>Formula component</div>
        <div>Table</div>
        <div>Column</div>
      </div>
      {QUICK_REF_ROWS.map((row) => (
        <div
          key={`${row.table}-${row.column}`}
          className="grid grid-cols-3 gap-2 text-xs px-3 py-2 border-b border-gray-800/50 last:border-b-0"
        >
          <span className="text-gray-400">{row.component}</span>
          <code className="font-mono text-amber-300/90">{row.table}</code>
          <code className="font-mono text-teal-300/90">{row.column}</code>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 8 — DASHBOARD / L3 CONSUMPTION
 * ──────────────────────────────────────────────────────────────────────────── */

function DashboardConsumptionSection() {
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <LayoutDashboard className="w-4 h-4 text-teal-400" />
        <span className="text-sm font-bold text-white">Where Committed appears</span>
      </div>
      <ul className="text-xs text-gray-400 space-y-2">
        <li>
          <code className="font-mono text-amber-300">metric_value_fact</code> — Generic metric storage; committed at every aggregation level (facility, counterparty, desk, portfolio, LoB, enterprise).
        </li>
        <li>
          <code className="font-mono text-amber-300">facility_detail_snapshot</code> — Facility-level analytics; committed_amt for drawer pop-ups and facility drill-downs.
        </li>
        <li>
          Executive and portfolio dashboards consume via <code className="font-mono text-blue-300">as_of_date</code> to show point-in-time committed exposure; same formula applies for each snapshot date.
        </li>
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function CommittedLineageView() {
  const headingPrefix = 'committed-lineage';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
        <div className="max-w-[1200px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Link
                href="/metrics/library"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-400 transition-colors mb-0.5 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Data Catalogue
              </Link>
              <h1 className="text-lg font-bold text-white">Committed Amount — End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">Bank&apos;s share of committed amount in USD; Facility and Counterparty paths</p>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-gray-400">committed_amt (USD)</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8 space-y-2">
        {/* Section 2 — Metric definition */}
        <section id="section-definition" aria-labelledby={`${headingPrefix}-definition`}>
          <SectionHeading
            id={`${headingPrefix}-definition`}
            icon={Calculator}
            step="Step 1 — Metric Definition"
            layerColor="bg-teal-600"
            title="Committed (USD)"
            subtitle="Single KPI: bank's share of committed amount in USD across Facility and Counterparty paths"
          />
          <MetricDefinitionCard />
        </section>

        <FlowArrow label="Two calculation paths" />

        {/* Section 3 — Two paths */}
        <section id="section-paths" aria-labelledby={`${headingPrefix}-paths`}>
          <SectionHeading
            id={`${headingPrefix}-paths`}
            icon={Workflow}
            step="Step 2 — Calculation Paths"
            layerColor="bg-cyan-600"
            title="Facility path and Counterparty path"
            subtitle="Both paths produce Committed; Facility uses position detail + FX + bank share; Counterparty uses pre-computed attributed exposure"
          />
          <div className="grid md:grid-cols-2 gap-4">
            <FacilityPathCard />
            <CounterpartyPathCard />
          </div>
        </section>

        <FlowArrow label="L1 reference tables" />

        {/* Section 4 — L1 reference */}
        <section id="section-l1" aria-labelledby={`${headingPrefix}-l1`}>
          <SectionHeading
            id={`${headingPrefix}-l1`}
            icon={Database}
            step="Step 3 — L1 Reference Data"
            layerColor="bg-blue-600"
            title="Reference Tables"
            subtitle="Facility, FX, bank share, counterparty hierarchy, LoB taxonomy"
          />
          <L1ReferenceSection />
        </section>

        <FlowArrow label="L2 source tables" />

        {/* Section 5 — L2 source */}
        <section id="section-l2" aria-labelledby={`${headingPrefix}-l2`}>
          <SectionHeading
            id={`${headingPrefix}-l2`}
            icon={Layers}
            step="Step 4 — L2 Source Data"
            layerColor="bg-amber-600"
            title="Snapshot Tables"
            subtitle="Position, position_detail, exposure_counterparty_attribution"
          />
          <L2SourceSection />
        </section>

        <FlowArrow label="Rollup hierarchy" />

        {/* Section 6 — Rollup */}
        <section id="section-rollup" aria-labelledby={`${headingPrefix}-rollup`}>
          <SectionHeading
            id={`${headingPrefix}-rollup`}
            icon={Building2}
            step="Step 5 — Rollup Hierarchy"
            layerColor="bg-emerald-600"
            title="Facility → Counterparty → L3 → L2 → L1 → L0"
            subtitle="Six aggregation levels; sample totals from mock data"
          />
          <RollupHierarchySection />
        </section>

        <FlowArrow label="Quick reference" />

        {/* Section 7 — Quick reference */}
        <section id="section-quickref" aria-labelledby={`${headingPrefix}-quickref`}>
          <SectionHeading
            id={`${headingPrefix}-quickref`}
            icon={Table2}
            step="Quick Reference"
            layerColor="bg-gray-600"
            title="Table & Column Map"
            subtitle="Formula component → table → column"
          />
          <QuickReferenceTable />
        </section>

        <FlowArrow label="Dashboard consumption" />

        {/* Section 8 — Dashboard */}
        <section id="section-dashboard" aria-labelledby={`${headingPrefix}-dashboard`}>
          <SectionHeading
            id={`${headingPrefix}-dashboard`}
            icon={LayoutDashboard}
            step="Step 6 — Dashboard Consumption"
            layerColor="bg-purple-600"
            title="L3 Output and Dashboards"
            subtitle="Where Committed is stored and how as_of_date is used"
          />
          <DashboardConsumptionSection />
        </section>
      </main>
    </div>
  );
}
