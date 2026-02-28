'use client';

import React, { useState } from 'react';
import {
  Layers,
  Table2,
  Users,
  Briefcase,
  FolderTree,
  PieChart,
  Info,
} from 'lucide-react';
import type { CatalogueItem, DemoFacility } from '@/lib/metric-library/types';
import LevelStepWalkthrough from './LevelStepWalkthrough';
import type { FlowStep } from './LevelStepWalkthrough';
import { PositionTable, FacilityTable } from './WorkedExampleTable';

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const pct = (n: number) => `${n.toFixed(1)}%`;

/* ────────────────────────────────────────────────────────────────────────────
 * TAB DEFINITIONS
 * ──────────────────────────────────────────────────────────────────────────── */

type TabKey = 'position' | 'facility' | 'counterparty' | 'desk' | 'portfolio' | 'lob';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  activeText: string;
}

const TABS: TabDef[] = [
  { key: 'position',     label: 'Position',     icon: Layers,     color: 'cyan',    activeBg: 'bg-cyan-500',    activeText: 'text-white' },
  { key: 'facility',     label: 'Facility',     icon: Table2,     color: 'blue',    activeBg: 'bg-blue-500',    activeText: 'text-white' },
  { key: 'counterparty', label: 'Counterparty', icon: Users,      color: 'purple',  activeBg: 'bg-purple-500',  activeText: 'text-white' },
  { key: 'desk',         label: 'Desk',         icon: Briefcase,  color: 'amber',   activeBg: 'bg-amber-500',   activeText: 'text-white' },
  { key: 'portfolio',    label: 'Portfolio',     icon: FolderTree, color: 'emerald', activeBg: 'bg-emerald-500', activeText: 'text-white' },
  { key: 'lob',          label: 'LoB',          icon: PieChart,   color: 'pink',    activeBg: 'bg-pink-500',    activeText: 'text-white' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * STEP BUILDERS — generate FlowStep[] for each tab from demo data
 * ──────────────────────────────────────────────────────────────────────────── */

function buildPositionSteps(fac: DemoFacility): FlowStep[] {
  const posLines = fac.positions
    .map((p) => `${p.position_id} ${p.position_type} ${fmt(p.balance_amount)}`)
    .join(', ');
  const sumExpr = fac.positions.map((p) => fmt(p.balance_amount)).join(' + ');
  return [
    {
      layer: 'L1', table: 'facility_master', action: `Pick facility ${fac.facility_id}`,
      value: `facility_id = ${fac.facility_id}`,
      detail: `${fac.facility_name} — ${fac.counterparty_name}, ${fmt(fac.committed_amt)} committed`,
      color: 'blue',
    },
    {
      layer: 'L2', table: 'position', action: `Query positions WHERE facility_id = ${fac.facility_id}`,
      value: `${fac.positions.length} positions found`,
      detail: posLines,
      color: 'cyan',
    },
    {
      layer: 'L2', table: 'position', action: 'Sum balance_amount across positions',
      value: `${sumExpr} = ${fmt(fac.committed_amt)}`,
      detail: 'Position balances aggregate to the facility committed amount',
      color: 'cyan',
    },
    {
      layer: 'L2', table: 'collateral_snapshot', action: 'Look up collateral valuation',
      value: `valuation_amount = ${fmt(fac.collateral_value)}`,
      detail: `Pre-haircut collateral value for ${fac.facility_id}`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: 'LTV Formula', action: 'Calculate LTV',
      value: `${fmt(fac.committed_amt)} / ${fmt(fac.collateral_value)} × 100 = ${pct(fac.ltv_pct)}`,
      detail: 'Committed_Facility_Amt / Collateral_Value × 100',
      color: 'emerald',
    },
  ];
}

function buildFacilitySteps(fac: DemoFacility): FlowStep[] {
  return [
    {
      layer: 'L1', table: 'facility_master', action: `Pick facility ${fac.facility_id}`,
      value: `facility_id = ${fac.facility_id}`,
      detail: `${fac.facility_name} — ${fac.counterparty_name}`,
      color: 'blue',
    },
    {
      layer: 'L1', table: 'facility_master', action: 'Read committed amount',
      value: `committed_facility_amt = ${fmt(fac.committed_amt)}`,
      detail: 'Total authorized credit line for this facility',
      color: 'blue',
    },
    {
      layer: 'L2', table: 'collateral_snapshot', action: 'Look up collateral valuation',
      value: `valuation_amount = ${fmt(fac.collateral_value)}`,
      detail: `Pre-haircut collateral value as of snapshot date`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: 'LTV Formula', action: 'Calculate LTV',
      value: `${fmt(fac.committed_amt)} / ${fmt(fac.collateral_value)} × 100 = ${pct(fac.ltv_pct)}`,
      detail: 'At facility level, it\'s a direct division — no aggregation needed',
      color: 'emerald',
    },
  ];
}

function buildCounterpartySteps(facilities: DemoFacility[], cpName: string, cpId: string): FlowStep[] {
  const cpFacs = facilities.filter((f) => f.counterparty_id === cpId);
  const facIds = cpFacs.map((f) => f.facility_id).join(', ');
  const totalC = cpFacs.reduce((s, f) => s + f.committed_amt, 0);
  const totalV = cpFacs.reduce((s, f) => s + f.collateral_value, 0);
  const ltv = totalV > 0 ? (totalC / totalV) * 100 : 0;
  const cExpr = cpFacs.map((f) => fmt(f.committed_amt)).join(' + ');
  const vExpr = cpFacs.map((f) => fmt(f.collateral_value)).join(' + ');

  return [
    {
      layer: 'L1', table: 'counterparty', action: `Pick counterparty ${cpId}`,
      value: `counterparty_id = ${cpId}`,
      detail: `${cpName}`,
      color: 'purple',
    },
    {
      layer: 'L1', table: 'facility_master', action: `Find facilities WHERE counterparty_id = ${cpId}`,
      value: `${cpFacs.length} facilities: ${facIds}`,
      detail: cpFacs.map((f) => `${f.facility_id} ${f.facility_name}`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Agg', table: 'SUM(committed)', action: 'Sum committed amounts',
      value: `${cExpr} = ${fmt(totalC)}`,
      detail: `Total committed across all ${cpName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Agg', table: 'SUM(collateral)', action: 'Sum collateral values',
      value: `${vExpr} = ${fmt(totalV)}`,
      detail: `Total collateral across all ${cpName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: 'LTV Formula', action: 'Calculate counterparty LTV',
      value: `${fmt(totalC)} / ${fmt(totalV)} × 100 = ${pct(ltv)}`,
      detail: `Group by counterparty_id, then Σ(committed) / Σ(collateral)`,
      color: 'emerald',
    },
  ];
}

function buildDeskSteps(facilities: DemoFacility[], deskName: string, segId: string): FlowStep[] {
  const deskFacs = facilities.filter((f) => f.lob_segment_id === segId);
  const totalC = deskFacs.reduce((s, f) => s + f.committed_amt, 0);
  const totalV = deskFacs.reduce((s, f) => s + f.collateral_value, 0);
  const ltv = totalV > 0 ? (totalC / totalV) * 100 : 0;

  return [
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: `Pick desk "${deskName}"`,
      value: `segment_name = '${deskName}' AND tree_level = 3`,
      detail: `Resolve organizational unit at L3 (desk) level`,
      color: 'blue',
    },
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = ${segId}`,
      detail: `Hierarchy node for ${deskName}`,
      color: 'blue',
    },
    {
      layer: 'L1', table: 'facility_master', action: `Find facilities WHERE lob_segment_id = ${segId}`,
      value: `${deskFacs.length} facilities: ${deskFacs.map((f) => f.facility_id).join(', ')}`,
      detail: deskFacs.map((f) => `${f.facility_id} ${f.facility_name}`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Agg', table: 'SUM(committed)', action: 'Sum committed amounts',
      value: `= ${fmt(totalC)}`,
      detail: `Total committed across all ${deskName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Agg', table: 'SUM(collateral)', action: 'Sum collateral values',
      value: `= ${fmt(totalV)}`,
      detail: `Total collateral across all ${deskName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: 'LTV Formula', action: 'Calculate desk LTV',
      value: `${fmt(totalC)} / ${fmt(totalV)} × 100 = ${pct(ltv)}`,
      detail: `Resolve via taxonomy tree_level = 3, then aggregate facilities under this desk`,
      color: 'emerald',
    },
  ];
}

function buildPortfolioSteps(facilities: DemoFacility[]): FlowStep[] {
  // All facilities share the same portfolio in our demo
  const portfolioName = facilities[0]?.portfolio_name ?? 'Portfolio';
  const totalC = facilities.reduce((s, f) => s + f.committed_amt, 0);
  const totalV = facilities.reduce((s, f) => s + f.collateral_value, 0);
  const ltv = totalV > 0 ? (totalC / totalV) * 100 : 0;

  // Get unique desks
  const desks = [...new Set(facilities.map((f) => f.desk_name))];
  const deskSegIds = [...new Set(facilities.map((f) => f.lob_segment_id))];

  return [
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: `Pick portfolio "${portfolioName}"`,
      value: `segment_name = '${portfolioName}' AND tree_level = 2`,
      detail: `Resolve organizational unit at L2 (portfolio) level`,
      color: 'blue',
    },
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = SEG-L2-CRE`,
      detail: `Hierarchy node for ${portfolioName}`,
      color: 'blue',
    },
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: 'Find child desks via parent_segment_id',
      value: `WHERE parent_segment_id = SEG-L2-CRE → [${deskSegIds.join(', ')}]`,
      detail: `${desks.length} child desks: ${desks.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'L1', table: 'facility_master', action: 'Find all facilities under child desks',
      value: `${facilities.length} facilities across ${desks.length} desks`,
      detail: facilities.map((f) => `${f.facility_id} (${f.desk_name})`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Calc', table: 'LTV Formula', action: 'Calculate portfolio LTV',
      value: `${fmt(totalC)} / ${fmt(totalV)} × 100 = ${pct(ltv)}`,
      detail: `parent_segment_id traversal from L2 → child L3 desks → aggregate all facilities`,
      color: 'emerald',
    },
  ];
}

function buildLobSteps(facilities: DemoFacility[]): FlowStep[] {
  const lobName = facilities[0]?.lob_name ?? 'LoB';
  const totalC = facilities.reduce((s, f) => s + f.committed_amt, 0);
  const totalV = facilities.reduce((s, f) => s + f.collateral_value, 0);
  const ltv = totalV > 0 ? (totalC / totalV) * 100 : 0;

  const portfolios = [...new Set(facilities.map((f) => f.portfolio_name))];
  const desks = [...new Set(facilities.map((f) => f.desk_name))];

  return [
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: `Pick LoB "${lobName}"`,
      value: `segment_name = '${lobName}' AND tree_level = 1`,
      detail: `Resolve organizational unit at L1 (department) level`,
      color: 'blue',
    },
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = SEG-L1-003`,
      detail: `Hierarchy node for ${lobName}`,
      color: 'blue',
    },
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: 'Recursive: find L2 children',
      value: `WHERE parent_segment_id = SEG-L1-003 → ${portfolios.length} portfolio(s)`,
      detail: `L2 children: ${portfolios.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'L1', table: 'enterprise_business_taxonomy', action: 'Recursive: find L3 grandchildren',
      value: `${desks.length} desks across ${portfolios.length} portfolio(s)`,
      detail: `L3 grandchildren: ${desks.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'L1', table: 'facility_master', action: 'Find all facilities under all descendants',
      value: `${facilities.length} facilities total`,
      detail: facilities.map((f) => `${f.facility_id}`).join(', '),
      color: 'blue',
    },
    {
      layer: 'Calc', table: 'LTV Formula', action: 'Calculate LoB LTV',
      value: `${fmt(totalC)} / ${fmt(totalV)} × 100 = ${pct(ltv)}`,
      detail: `Recursive parent_segment_id traversal: L1 → L2 portfolios → L3 desks → all facilities`,
      color: 'emerald',
    },
  ];
}

/* ────────────────────────────────────────────────────────────────────────────
 * INSIGHT CALLOUTS — contextual explanation per tab
 * ──────────────────────────────────────────────────────────────────────────── */

const INSIGHTS: Record<TabKey, string> = {
  position: 'Positions are the finest grain — individual loans, commitments, and securities that compose a facility. Their balance_amount values sum to the facility\'s committed_facility_amt.',
  facility: 'At facility level, LTV is a direct division — no aggregation needed. One facility, one committed amount, one collateral value.',
  counterparty: 'Group by counterparty_id to find all facilities belonging to one obligor, then Σ(committed) / Σ(collateral) × 100.',
  desk: 'Resolve via enterprise_business_taxonomy WHERE tree_level = 3 to find the desk\'s managed_segment_id, then find facilities via lob_segment_id.',
  portfolio: 'Traverse parent_segment_id from L2 portfolio node down to all L3 desk children, then aggregate all underlying facilities.',
  lob: 'Recursive parent_segment_id traversal: L1 → L2 portfolios → L3 desks. Collects all descendant facilities across the entire department.',
};

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function CatalogueDeepDive({ item }: { item: CatalogueItem }) {
  const [activeTab, setActiveTab] = useState<TabKey>('position');

  const demo = item.demo_data;
  if (!demo || !demo.facilities.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No demo data available for this item.</p>
      </div>
    );
  }

  const facilities = demo.facilities;

  // Example entities for each tab
  const exampleFacility = facilities[0]; // F-001
  const exampleCpId = 'CP-02';          // Meridian — has 3 facilities
  const exampleCpName = 'Meridian Holdings';
  const exampleDeskName = 'CRE Lending Desk';
  const exampleDeskSegId = 'SEG-L3-CRE';

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Deep-dive level tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                isActive
                  ? `${tab.activeBg} ${tab.activeText} shadow-md`
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Insight callout */}
      <div className="flex items-start gap-3 bg-blue-950/30 rounded-lg p-3 border border-blue-900/40">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-blue-200 leading-relaxed">{INSIGHTS[activeTab]}</p>
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === 'position' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={buildPositionSteps(exampleFacility)}
              title="Position → Facility Rollup"
              subtitle={`${exampleFacility.facility_id} — ${exampleFacility.facility_name}`}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Positions in {exampleFacility.facility_id} — {exampleFacility.facility_name}
              </div>
              <PositionTable facility={exampleFacility} />
            </div>
          </div>
        )}

        {activeTab === 'facility' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={buildFacilitySteps(exampleFacility)}
              title="Facility-Level LTV"
              subtitle={`Direct calculation for ${exampleFacility.facility_id}`}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Facility Detail
              </div>
              <FacilityTable facilities={[exampleFacility]} showPositionCount />
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Position Breakdown
                </div>
                <PositionTable facility={exampleFacility} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'counterparty' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={buildCounterpartySteps(facilities, exampleCpName, exampleCpId)}
              title="Counterparty-Level LTV"
              subtitle={`${exampleCpName} (${exampleCpId}) — 3 facilities`}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {exampleCpName} Facilities
              </div>
              <FacilityTable
                facilities={facilities.filter((f) => f.counterparty_id === exampleCpId)}
                showPositionCount
              />
            </div>
          </div>
        )}

        {activeTab === 'desk' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={buildDeskSteps(facilities, exampleDeskName, exampleDeskSegId)}
              title="Desk-Level LTV (L3)"
              subtitle={`${exampleDeskName} via taxonomy lookup`}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {exampleDeskName} Facilities
              </div>
              <FacilityTable
                facilities={facilities.filter((f) => f.lob_segment_id === exampleDeskSegId)}
                showPositionCount
              />
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={buildPortfolioSteps(facilities)}
              title="Portfolio-Level LTV (L2)"
              subtitle={`${facilities[0]?.portfolio_name} — parent_segment_id traversal`}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                All Facilities by Desk
              </div>
              <FacilityTable facilities={facilities} groupBy="desk" showPositionCount />
            </div>
          </div>
        )}

        {activeTab === 'lob' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={buildLobSteps(facilities)}
              title="LoB-Level LTV (L1)"
              subtitle={`${facilities[0]?.lob_name} — recursive hierarchy traversal`}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                All Facilities by Desk (Full Department)
              </div>
              <FacilityTable facilities={facilities} groupBy="desk" showPositionCount />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
