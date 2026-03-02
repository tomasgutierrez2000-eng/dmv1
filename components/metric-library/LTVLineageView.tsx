'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Database,
  Calculator,
  LayoutDashboard,
  ArrowDown,
  Eye,
  Table2,
  Users,
  FolderTree,
  PieChart,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Play,
  Landmark,
  Network,
  AlertTriangle,
} from 'lucide-react';

import {
  EXAMPLE_FACILITY,
  TAXONOMY_PATH,
  TABLE_SCHEMAS,
  FACILITIES,
  DESK_COUNTERPARTIES,
  PORTFOLIO_BUCKETS,
  COUNTERPARTY_WEIGHTED_LTV,
  DESK_WEIGHTED_LTV,
  exposureWeightedLTV,
  fmt,
  fmtM,
  fmtPct,
  type TableSchema,
  type TableField,
} from './ltv-demo/ltvDemoData';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVLineageView — full lineage page for LTV (Loan-to-Value)
 *
 * Structured in 6 sections with data-demo attributes for the demo overlay.
 * ──────────────────────────────────────────────────────────────────────────── */

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct Calculation — drawn_amount / collateral_value for one facility',
    method: 'Direct Calculation',
    purpose: 'Underwriting, covenant monitoring',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Exposure-Weighted Average — SUM(ltv * exposure) / SUM(exposure)',
    method: 'Exposure-Weighted Average',
    purpose: 'Obligor-level collateral coverage',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'Exposure-Weighted Average across counterparties on the desk',
    method: 'Exposure-Weighted Average',
    purpose: 'Book quality monitoring',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'Exposure-Weighted Average + Distribution Buckets',
    method: 'Weighted Avg + Distribution',
    purpose: 'Risk concentration analysis',
  },
  {
    key: 'lob',
    label: 'Line of Business',
    icon: PieChart,
    desc: 'Exposure-Weighted Average — directional trend only',
    method: 'Trend Indicator',
    purpose: 'CRO-level early warning',
  },
] as const;

/* ── Helpers ───────────────────────────────────────────────────────────────── */

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

function InsightCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-pwc-orange/30 bg-pwc-orange/5 px-4 py-3 flex items-start gap-3 mt-4">
      <div className="w-6 h-6 rounded-lg bg-pwc-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Eye className="w-3.5 h-3.5 text-pwc-orange" aria-hidden="true" />
      </div>
      <div className="text-xs text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

/* ── Mini Table Card ───────────────────────────────────────────────────────── */

function MiniTableCard({
  schema,
  active,
}: {
  schema: TableSchema;
  active?: boolean;
}) {
  const layerColor = schema.layer === 'L1' ? 'bg-blue-500' : 'bg-amber-500';
  const layerBorder = schema.layer === 'L1' ? 'border-blue-500/30' : 'border-amber-500/30';
  const layerBg = schema.layer === 'L1' ? 'bg-blue-500/5' : 'bg-amber-500/5';

  return (
    <div
      className={`rounded-xl border ${active ? layerBorder : 'border-gray-800'} ${active ? layerBg : 'bg-white/[0.02]'} transition-all duration-300`}
    >
      {/* Table header */}
      <div className={`px-3 py-2 border-b ${active ? layerBorder : 'border-gray-800'} flex items-center gap-2`}>
        <div className={`w-5 h-5 rounded ${layerColor} flex items-center justify-center`}>
          <span className="text-[8px] font-bold text-white">{schema.layer}</span>
        </div>
        <code className="text-xs font-bold text-white">{schema.label}</code>
      </div>
      <div className="px-3 py-1.5">
        <div className="text-[10px] text-gray-500 mb-2">{schema.description}</div>
        {/* Fields */}
        <div className="space-y-0.5">
          {schema.fields.map((f) => (
            <FieldRow key={f.name} field={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldRow({ field }: { field: TableField }) {
  const hlColor =
    field.highlight === 'numerator'
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : field.highlight === 'denominator'
        ? 'bg-amber-500/10 border-amber-500/20'
        : field.highlight === 'fk'
          ? 'bg-blue-500/5 border-blue-500/10'
          : 'bg-transparent border-transparent';

  const valColor =
    field.highlight === 'numerator'
      ? 'text-emerald-400'
      : field.highlight === 'denominator'
        ? 'text-amber-400'
        : field.highlight === 'fk'
          ? 'text-blue-400'
          : 'text-gray-400';

  return (
    <div className={`flex items-center justify-between text-[10px] px-1.5 py-0.5 rounded border ${hlColor}`}>
      <div className="flex items-center gap-1 min-w-0">
        <code className="text-gray-300 font-mono">{field.name}</code>
        {field.pk && (
          <span className="text-[7px] font-bold px-1 py-0 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            PK
          </span>
        )}
        {field.fk && (
          <span className="text-[7px] font-bold px-1 py-0 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            FK
          </span>
        )}
      </div>
      <span className={`font-mono flex-shrink-0 ml-2 ${valColor}`}>{field.value}</span>
    </div>
  );
}

/* ── LTV Rollup Level Detail ───────────────────────────────────────────────── */

function LevelDetail({ levelKey }: { levelKey: string }) {
  switch (levelKey) {
    case 'facility':
      return (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 mb-1">
            Direct calculation for each secured facility
          </div>
          {FACILITIES.map((f) => (
            <div key={f.facilityId} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-white/[0.02]">
              <div className="text-gray-400">
                <span className="font-mono text-[10px] text-gray-500">{f.facilityId}</span>{' '}
                {f.name}
              </div>
              <div className="font-mono flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-emerald-400 text-[10px]">{fmt(f.drawnAmount)}</span>
                <span className="text-gray-600">/</span>
                <span className="text-amber-400 text-[10px]">{fmt(f.collateralValue)}</span>
                <span className="text-gray-600">=</span>
                <span className={`font-bold ${f.ltv > 0.75 ? 'text-amber-400' : 'text-white'}`}>{fmtPct(f.ltv)}</span>
              </div>
            </div>
          ))}
        </div>
      );
    case 'counterparty':
      return (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 mb-1">
            SUM(ltv &times; facility_exposure) / SUM(facility_exposure)
          </div>
          {FACILITIES.map((f) => (
            <div key={f.facilityId} className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">{f.name}</span>
              <span className="text-white">{fmtPct(f.ltv)} &times; {fmtM(f.exposure)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-white/5">
            <span className="text-gray-300">Weighted Avg</span>
            <span className="text-white">{fmtPct(COUNTERPARTY_WEIGHTED_LTV)}</span>
          </div>
        </div>
      );
    case 'desk':
      return (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 mb-1">
            CRE Origination Desk — weighted across counterparties
          </div>
          {DESK_COUNTERPARTIES.map((cp) => (
            <div key={cp.name} className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">{cp.name}</span>
              <span className="text-white">{fmtPct(cp.ltv)} &times; {fmtM(cp.exposure)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-white/5">
            <span className="text-gray-300">Desk Weighted Avg</span>
            <span className="text-white">{fmtPct(DESK_WEIGHTED_LTV)}</span>
          </div>
        </div>
      );
    case 'portfolio':
      return (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 mb-1">
            Commercial Real Estate Portfolio — distribution buckets
          </div>
          {PORTFOLIO_BUCKETS.map((b) => (
            <div key={b.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 font-bold">{b.label}</span>
                <span className="text-gray-500">{b.count} facilities</span>
              </div>
              <span className="font-mono text-gray-400">{fmtM(b.exposure)}</span>
            </div>
          ))}
        </div>
      );
    case 'lob':
      return (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 mb-1">
            Trend only — track quarter-over-quarter direction
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded bg-blue-500/10 border border-blue-500/20 p-2">
              <div className="text-blue-300 font-bold">CRE</div>
              <div className="font-mono text-blue-400">67.8%</div>
            </div>
            <div className="rounded bg-purple-500/10 border border-purple-500/20 p-2">
              <div className="text-purple-300 font-bold">Lev Fin</div>
              <div className="font-mono text-purple-400">52.3%</div>
            </div>
            <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2">
              <div className="text-amber-300 font-bold">Corp</div>
              <div className="font-mono text-amber-400">&mdash;</div>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

interface LTVLineageViewProps {
  onStartDemo?: () => void;
  demoExpandedLevel?: string | null;
  demoActiveTable?: string | null;
}

export default function LTVLineageView({
  onStartDemo,
  demoExpandedLevel,
  demoActiveTable,
}: LTVLineageViewProps) {
  const headingPrefix = useId();
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // Demo can override the expanded level
  const effectiveExpandedLevel = demoExpandedLevel !== undefined ? demoExpandedLevel : expandedLevel;

  const toggleLevel = (k: string) => {
    setExpandedLevel((prev) => (prev === k ? null : k));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Header ── */}
      <header data-demo="header" className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/metrics"
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
              title="Back to Metrics"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">LTV End-to-End Lineage</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  C104
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Loan-to-Value — from 4 source tables through hierarchy traversal to dashboard
              </p>
            </div>
          </div>
          {onStartDemo && (
            <button
              onClick={onStartDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pwc-orange hover:bg-pwc-orange-light text-white text-xs font-bold transition-colors flex-shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              Start Demo
            </button>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* ── Section 1: Formula ── */}
        <section data-demo="formula" aria-labelledby={`${headingPrefix}-formula`}>
          <SectionHeading
            id={`${headingPrefix}-formula`}
            icon={Calculator}
            step="Step 1"
            layerColor="bg-blue-600"
            title="The LTV Formula"
            subtitle="One formula, two inputs, four source tables"
          />

          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
            {/* Formula display */}
            <div className="text-center mb-4">
              <code className="text-lg font-bold text-blue-400">
                LTV = Drawn Amount &divide; Collateral Value
              </code>
            </div>

            {/* Example */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3">
                <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 mb-2">
                  Numerator — Drawn Amount
                </div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  $10,500,000
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  From: facility_exposure_snapshot.drawn_amount
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3">
                <div className="text-[9px] font-bold uppercase tracking-widest text-amber-500 mb-2">
                  Denominator — Collateral Value
                </div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  $15,000,000
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  From: collateral_snapshot.current_valuation_usd
                </div>
              </div>
            </div>

            {/* Result */}
            <div data-demo="formula-result" className="mt-4 pt-4 border-t border-blue-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">
                  {EXAMPLE_FACILITY.counterparty_name}
                </div>
                <div className="text-[10px] text-gray-500">
                  {EXAMPLE_FACILITY.facility_type} — {EXAMPLE_FACILITY.collateral_description}
                </div>
              </div>
              <div className="text-2xl font-black text-blue-400 tabular-nums">70.0%</div>
            </div>
          </div>
        </section>

        <FlowArrow label="Where does this data live?" />

        {/* ── Section 2: Data Sources — Table Traversal ── */}
        <section data-demo="tables-overview" aria-labelledby={`${headingPrefix}-tables`}>
          <SectionHeading
            id={`${headingPrefix}-tables`}
            icon={Database}
            step="Step 2"
            layerColor="bg-amber-600"
            title="Data Sources — 4 Tables, 2 Layers"
            subtitle="L1 reference tables + L2 snapshot tables joined to compute LTV"
          />

          {/* Layer explanation */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">L1</span>
                </div>
                <span className="text-xs font-bold text-blue-400">Reference Tables</span>
              </div>
              <div className="text-[10px] text-gray-500">
                Permanent facts: loan details, borrower identity, org hierarchy
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">L2</span>
                </div>
                <span className="text-xs font-bold text-amber-400">Snapshot Tables</span>
              </div>
              <div className="text-[10px] text-gray-500">
                Point-in-time readings: balances, valuations, updated each reporting date
              </div>
            </div>
          </div>

          {/* Table cards */}
          <div className="space-y-3">
            <div data-demo="table-facility-master">
              <MiniTableCard
                schema={TABLE_SCHEMAS.facility_master}
                active={demoActiveTable === 'facility_master'}
              />
            </div>

            <div className="flex items-center justify-center gap-4 py-1 text-[9px] text-gray-600" aria-hidden="true">
              <span className="flex items-center gap-1">
                <span className="w-3 h-px bg-blue-500/40" />facility_id
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-px bg-blue-500/40" />facility_id
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-px bg-blue-500/40" />lob_segment_id
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div data-demo="table-exposure">
                <MiniTableCard
                  schema={TABLE_SCHEMAS.facility_exposure_snapshot}
                  active={demoActiveTable === 'facility_exposure_snapshot'}
                />
              </div>
              <div data-demo="table-collateral">
                <MiniTableCard
                  schema={TABLE_SCHEMAS.collateral_snapshot}
                  active={demoActiveTable === 'collateral_snapshot'}
                />
              </div>
              <div data-demo="table-taxonomy">
                <MiniTableCard
                  schema={TABLE_SCHEMAS.enterprise_business_taxonomy}
                  active={demoActiveTable === 'enterprise_business_taxonomy'}
                />
              </div>
            </div>
          </div>

          <InsightCallout>
            These 4 tables are the complete data footprint for LTV. The same
            tables serve every secured-lending metric — PD uses counterparty,
            Spread uses facility_pricing_snapshot, but ALL of them join
            through facility_master as the anchor.
          </InsightCallout>
        </section>

        <FlowArrow label="How does the hierarchy work?" />

        {/* ── Section 3: Taxonomy Traversal ── */}
        <section data-demo="taxonomy-tree" aria-labelledby={`${headingPrefix}-taxonomy`}>
          <SectionHeading
            id={`${headingPrefix}-taxonomy`}
            icon={Network}
            step="Step 3"
            layerColor="bg-purple-600"
            title="Climbing the Hierarchy Tree"
            subtitle="parent_segment_id creates a tree from Desk → Portfolio → LoB"
          />

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5">
            <div className="text-xs text-gray-400 mb-4">
              Starting from facility F-10042&apos;s <code className="text-blue-400">lob_segment_id</code>, the
              system walks up the hierarchy:
            </div>

            <div className="space-y-0">
              {TAXONOMY_PATH.map((node, i) => {
                const boxStyles = [
                  'border-blue-500/30 bg-blue-500/5',
                  'border-purple-500/30 bg-purple-500/5',
                  'border-orange-500/30 bg-orange-500/5',
                ];
                const labelStyles = [
                  'text-blue-400',
                  'text-purple-400',
                  'text-orange-400',
                ];
                return (
                  <div key={node.managed_segment_id}>
                    <div className={`rounded-lg border p-3 ${boxStyles[i] || 'border-gray-800'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-[9px] font-bold uppercase tracking-wider ${labelStyles[i] || 'text-gray-400'}`}>
                            {node.level_label}
                          </div>
                          <div className="text-sm font-bold text-white mt-0.5">{node.segment_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-gray-600 font-mono">{node.managed_segment_id}</div>
                          {node.parent_segment_id && (
                            <div className="text-[8px] text-gray-700 font-mono mt-0.5">
                              parent &rarr; {node.parent_segment_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {i < TAXONOMY_PATH.length - 1 && (
                      <div className="flex flex-col items-center py-1" aria-hidden="true">
                        <div className="text-[8px] text-gray-600 font-mono">parent_segment_id</div>
                        <ArrowDown className="w-3 h-3 text-gray-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <InsightCallout>
              This same hierarchy traversal is shared by every metric. Changing the taxonomy
              (e.g., moving a desk from one portfolio to another) automatically updates the
              rollup grouping for LTV, DSCR, Exposure, and all other metrics.
            </InsightCallout>
          </div>
        </section>

        <FlowArrow label="How is the math done?" />

        {/* ── Section 4: Calculation ── */}
        <section data-demo="calc-section" aria-labelledby={`${headingPrefix}-calc`}>
          <SectionHeading
            id={`${headingPrefix}-calc`}
            icon={Calculator}
            step="Step 4"
            layerColor="bg-emerald-600"
            title="Calculation"
            subtitle="From raw fields to the final LTV percentage"
          />

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="text-center space-y-2 mb-4">
              <div className="text-xs font-mono">
                <span className="text-gray-500">drawn_amount =</span>{' '}
                <span className="text-emerald-400">$10,500,000</span>
              </div>
              <div className="text-gray-600 text-lg">&divide;</div>
              <div className="text-xs font-mono">
                <span className="text-gray-500">SUM(current_valuation_usd) =</span>{' '}
                <span className="text-amber-400">$15,000,000</span>
              </div>
              <div className="pt-2 border-t border-emerald-500/20 text-center">
                <span className="text-[10px] text-gray-500">LTV =</span>
                <span className="text-2xl font-black text-blue-400 ml-2 tabular-nums">70.0%</span>
              </div>
            </div>

            {/* Source table badges */}
            <div className="flex justify-center gap-3">
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                L2.facility_exposure_snapshot
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                L2.collateral_snapshot
              </span>
            </div>
          </div>

          {/* Golden Rule */}
          <div data-demo="golden-rule" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-400">Never Average LTVs</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <div className="text-[9px] font-bold uppercase text-red-400 mb-2">Wrong: Simple Average</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>$100M loan</span><span>85%</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>$5M loan</span><span>40%</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-red-500/15 text-xs font-mono text-center">
                  Avg = <span className="text-red-400 font-bold">62.5%</span>
                  <span className="text-red-400/70 text-[9px] ml-1">(misleading)</span>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-[9px] font-bold uppercase text-emerald-400 mb-2">Correct: Exposure-Weighted</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>85% &times; $100M</span><span className="text-emerald-400">$85M</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>40% &times; $5M</span><span className="text-emerald-400">$2M</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-500/15 text-xs font-mono text-center">
                  Weighted = <span className="text-emerald-400 font-bold">82.9%</span>
                  <span className="text-emerald-400/70 text-[9px] ml-1">(accurate)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FlowArrow label="How does it roll up?" />

        {/* ── Section 5: Rollup Hierarchy ── */}
        <section data-demo="rollup-section" aria-labelledby={`${headingPrefix}-rollup`}>
          <SectionHeading
            id={`${headingPrefix}-rollup`}
            icon={Landmark}
            step="Step 5"
            layerColor="bg-red-600"
            title="Rollup Hierarchy"
            subtitle="Facility → Counterparty → Desk → Portfolio → Line of Business"
          />

          <div className="space-y-2">
            {ROLLUP_LEVELS.map((level, i) => {
              const expanded = effectiveExpandedLevel === level.key;
              const Icon = level.icon;
              return (
                <button
                  key={level.key}
                  data-demo={`rollup-${level.key}`}
                  onClick={() => toggleLevel(level.key)}
                  aria-expanded={expanded}
                  className={`w-full rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    expanded
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gray-700'
                  }`}
                  style={{ marginLeft: `${i * 4}px`, marginRight: `${i * 4}px` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expanded ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                        <Icon className={`w-4 h-4 ${expanded ? 'text-blue-400' : 'text-gray-500'}`} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{level.label}</span>
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-gray-800">
                            {level.method}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500">{level.purpose}</div>
                      </div>
                    </div>
                    {expanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    )}
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <LevelDetail levelKey={level.key} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <FlowArrow label="Dashboard" />

        {/* ── Section 6: Dashboard ── */}
        <section data-demo="dashboard" aria-labelledby={`${headingPrefix}-dashboard`}>
          <SectionHeading
            id={`${headingPrefix}-dashboard`}
            icon={LayoutDashboard}
            step="Step 6"
            layerColor="bg-pink-600"
            title="Dashboard Consumption"
            subtitle="Every LTV value traces back to drawn_amount and current_valuation_usd"
          />

          <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5">
            <div className="text-xs text-gray-300 leading-relaxed mb-4">
              A user selects a hierarchy level, and the platform handles the rest:
              joins across all 4 tables, taxonomy traversal, null-safe division,
              exposure-weighted aggregation, and distribution bucketing.
            </div>

            {/* Simulated dashboard widget */}
            <div className="rounded-lg bg-white/[0.02] border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">LTV by Hierarchy Level</span>
                <span className="text-[9px] text-gray-500 font-mono">as_of_date: 2025-03-31</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'CRE Origination Desk', level: 'L3', ltv: '67.3%' },
                  { label: 'Commercial Real Estate', level: 'L2', ltv: '67.8%' },
                  { label: 'Corp & Inv Banking', level: 'L1', ltv: '64.2%' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-xs px-3 py-2 rounded bg-white/[0.02] border border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {row.level}
                      </span>
                      <span className="text-gray-300">{row.label}</span>
                    </div>
                    <span className="font-mono font-bold text-white">{row.ltv}</span>
                  </div>
                ))}
              </div>
            </div>

            <InsightCallout>
              Full auditability: every LTV value on the dashboard traces backwards through
              the rollup hierarchy, through the calculation engine, through the taxonomy
              traversal, all the way to <code className="text-emerald-400">drawn_amount</code>{' '}
              and <code className="text-amber-400">current_valuation_usd</code> in the source tables.
            </InsightCallout>
          </div>
        </section>
      </main>
    </div>
  );
}
