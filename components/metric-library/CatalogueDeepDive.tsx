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
import Link from 'next/link';
import type { CatalogueItem, DemoFacility } from '@/lib/metric-library/types';
import LevelStepWalkthrough from './LevelStepWalkthrough';
import type { FlowStep } from './LevelStepWalkthrough';
import { PositionTable, FacilityTable } from './WorkedExampleTable';
import HierarchyPyramid from './HierarchyPyramid';
import TableTraversalDemo from './TableTraversalDemo';

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const pct = (n: number) => `${n.toFixed(1)}%`;

const fmtDscr = (n: number) => `${n.toFixed(2)}x`;

type MetricMode = 'LTV' | 'DSCR' | 'GENERIC';

function detectMetricMode(item: CatalogueItem): MetricMode {
  if (item.abbreviation === 'LTV') return 'LTV';
  if (item.abbreviation === 'DSCR') return 'DSCR';
  return 'GENERIC';
}

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
  { key: 'lob',          label: 'Business Segment', icon: PieChart,   color: 'pink',    activeBg: 'bg-pink-500',    activeText: 'text-white' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * LTV STEP BUILDERS
 * ──────────────────────────────────────────────────────────────────────────── */

function buildPositionSteps(fac: DemoFacility, formula: string): FlowStep[] {
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
      layer: 'Calc', table: formula, action: 'Apply formula (same at every level)',
      value: `${fmt(fac.committed_amt)} / ${fmt(fac.collateral_value)} × 100 = ${pct(fac.ltv_pct)}`,
      detail: `Formula: ${formula} — scope: 1 facility (${fac.facility_id})`,
      color: 'emerald',
    },
  ];
}

function buildFacilitySteps(fac: DemoFacility, formula: string): FlowStep[] {
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
      layer: 'Calc', table: formula, action: 'Apply formula (same at every level)',
      value: `${fmt(fac.committed_amt)} / ${fmt(fac.collateral_value)} × 100 = ${pct(fac.ltv_pct)}`,
      detail: `Formula: ${formula} — scope: 1 facility, direct division, no aggregation`,
      color: 'emerald',
    },
  ];
}

function buildCounterpartySteps(facilities: DemoFacility[], cpName: string, cpId: string, formula: string): FlowStep[] {
  const cpFacs = facilities.filter((f) => f.counterparty_id === cpId);
  const facIds = cpFacs.map((f) => f.facility_id).join(', ');
  const totalC = cpFacs.reduce((s, f) => s + f.committed_amt, 0);
  const totalV = cpFacs.reduce((s, f) => s + f.collateral_value, 0);
  const ltv = totalV > 0 ? (totalC / totalV) * 100 : 0;
  const cExpr = cpFacs.map((f) => fmt(f.committed_amt)).join(' + ');
  const vExpr = cpFacs.map((f) => fmt(f.collateral_value)).join(' + ');

  return [
    {
      layer: 'Scope', table: 'counterparty', action: `Pick counterparty ${cpId}`,
      value: `counterparty_id = ${cpId}`,
      detail: `${cpName} — defines which facilities are in scope`,
      color: 'purple',
    },
    {
      layer: 'Scope', table: 'facility_master', action: `Resolve facilities WHERE counterparty_id = ${cpId}`,
      value: `${cpFacs.length} facilities in scope: ${facIds}`,
      detail: cpFacs.map((f) => `${f.facility_id} ${f.facility_name}`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Agg', table: 'Σ committed', action: 'Sum committed across in-scope facilities',
      value: `${cExpr} = ${fmt(totalC)}`,
      detail: `Numerator: total committed across all ${cpName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Agg', table: 'Σ collateral', action: 'Sum collateral across in-scope facilities',
      value: `${vExpr} = ${fmt(totalV)}`,
      detail: `Denominator: total collateral across all ${cpName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: formula, action: 'Apply formula (same at every level)',
      value: `${fmt(totalC)} / ${fmt(totalV)} × 100 = ${pct(ltv)}`,
      detail: `Formula: ${formula} — scope: ${cpFacs.length} facilities (counterparty ${cpId})`,
      color: 'emerald',
    },
  ];
}

function buildDeskSteps(facilities: DemoFacility[], deskName: string, segId: string, formula: string): FlowStep[] {
  const deskFacs = facilities.filter((f) => f.lob_segment_id === segId);
  const totalC = deskFacs.reduce((s, f) => s + f.committed_amt, 0);
  const totalV = deskFacs.reduce((s, f) => s + f.collateral_value, 0);
  const ltv = totalV > 0 ? (totalC / totalV) * 100 : 0;

  return [
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: `Pick desk "${deskName}"`,
      value: `segment_name = '${deskName}' AND tree_level = 3`,
      detail: `Resolve organizational unit at L3 (desk) level — defines facility scope`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = ${segId}`,
      detail: `Hierarchy node for ${deskName}`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'facility_master', action: `Resolve facilities WHERE lob_segment_id = ${segId}`,
      value: `${deskFacs.length} facilities in scope: ${deskFacs.map((f) => f.facility_id).join(', ')}`,
      detail: deskFacs.map((f) => `${f.facility_id} ${f.facility_name}`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Agg', table: 'Σ committed', action: 'Sum committed across in-scope facilities',
      value: `= ${fmt(totalC)}`,
      detail: `Numerator: total committed across all ${deskName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Agg', table: 'Σ collateral', action: 'Sum collateral across in-scope facilities',
      value: `= ${fmt(totalV)}`,
      detail: `Denominator: total collateral across all ${deskName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: formula, action: 'Apply formula (same at every level)',
      value: `${fmt(totalC)} / ${fmt(totalV)} × 100 = ${pct(ltv)}`,
      detail: `Formula: ${formula} — scope: ${deskFacs.length} facilities (desk ${deskName})`,
      color: 'emerald',
    },
  ];
}

function buildPortfolioSteps(facilities: DemoFacility[], formula: string): FlowStep[] {
  const portfolioName = facilities[0]?.portfolio_name ?? 'Portfolio';
  const totalC = facilities.reduce((s, f) => s + f.committed_amt, 0);
  const totalV = facilities.reduce((s, f) => s + f.collateral_value, 0);
  const ltv = totalV > 0 ? (totalC / totalV) * 100 : 0;

  const desks = [...new Set(facilities.map((f) => f.desk_name))];
  const deskSegIds = [...new Set(facilities.map((f) => f.lob_segment_id))];

  return [
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: `Pick portfolio "${portfolioName}"`,
      value: `segment_name = '${portfolioName}' AND tree_level = 2`,
      detail: `Resolve organizational unit at L2 (portfolio) level — defines facility scope`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = SEG-L2-CRE`,
      detail: `Hierarchy node for ${portfolioName}`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Traverse parent_segment_id → find child desks',
      value: `WHERE parent_segment_id = SEG-L2-CRE → [${deskSegIds.join(', ')}]`,
      detail: `${desks.length} child desks: ${desks.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'Scope', table: 'facility_master', action: 'Resolve all facilities under child desks',
      value: `${facilities.length} facilities in scope across ${desks.length} desks`,
      detail: facilities.map((f) => `${f.facility_id} (${f.desk_name})`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Calc', table: formula, action: 'Apply formula (same at every level)',
      value: `${fmt(totalC)} / ${fmt(totalV)} × 100 = ${pct(ltv)}`,
      detail: `Formula: ${formula} — scope: ${facilities.length} facilities (portfolio ${portfolioName})`,
      color: 'emerald',
    },
  ];
}

function buildLobSteps(facilities: DemoFacility[], formula: string): FlowStep[] {
  const lobName = facilities[0]?.lob_name ?? 'Business Segment';
  const totalC = facilities.reduce((s, f) => s + f.committed_amt, 0);
  const totalV = facilities.reduce((s, f) => s + f.collateral_value, 0);
  const ltv = totalV > 0 ? (totalC / totalV) * 100 : 0;

  const portfolios = [...new Set(facilities.map((f) => f.portfolio_name))];
  const desks = [...new Set(facilities.map((f) => f.desk_name))];

  return [
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: `Pick Business Segment "${lobName}"`,
      value: `segment_name = '${lobName}' AND tree_level = 1`,
      detail: `Resolve organizational unit at L1 (department) level — defines facility scope`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = SEG-L1-003`,
      detail: `Hierarchy node for ${lobName}`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Recursive: find L2 children (portfolios)',
      value: `WHERE parent_segment_id = SEG-L1-003 → ${portfolios.length} portfolio(s)`,
      detail: `L2 children: ${portfolios.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Recursive: find L3 grandchildren (desks)',
      value: `${desks.length} desks across ${portfolios.length} portfolio(s)`,
      detail: `L3 grandchildren: ${desks.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'Scope', table: 'facility_master', action: 'Resolve all facilities under all descendants',
      value: `${facilities.length} facilities in scope`,
      detail: facilities.map((f) => `${f.facility_id}`).join(', '),
      color: 'blue',
    },
    {
      layer: 'Calc', table: formula, action: 'Apply formula (same at every level)',
      value: `${fmt(totalC)} / ${fmt(totalV)} × 100 = ${pct(ltv)}`,
      detail: `Formula: ${formula} — scope: ${facilities.length} facilities (Business Segment ${lobName})`,
      color: 'emerald',
    },
  ];
}

/* ────────────────────────────────────────────────────────────────────────────
 * DSCR STEP BUILDERS
 * ──────────────────────────────────────────────────────────────────────────── */

function dscrWeightedAvg(facs: DemoFacility[]): number {
  const totalExp = facs.reduce((s, f) => s + f.committed_amt, 0);
  if (totalExp === 0) return 0;
  const weighted = facs.reduce((s, f) => s + (f.dscr_value ?? 0) * f.committed_amt, 0);
  return weighted / totalExp;
}

function buildDscrPositionSteps(fac: DemoFacility, formula: string): FlowStep[] {
  const posLines = fac.positions
    .map((p) => `${p.position_id} ${p.position_type} ${fmt(p.balance_amount)}`)
    .join(', ');
  const sumExpr = fac.positions.map((p) => fmt(p.balance_amount)).join(' + ');
  const cfLabel = fac.cashflow_label ?? 'NOI';
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
      detail: 'Position balances aggregate to the facility committed amount (exposure basis)',
      color: 'cyan',
    },
    {
      layer: 'L2', table: 'facility_financial_snapshot', action: `Look up ${cfLabel} and Debt Service`,
      value: `${cfLabel} = ${fmt(fac.noi_amt ?? 0)}, DS = ${fmt(fac.debt_service_amt ?? 0)}`,
      detail: `Financial snapshot for ${fac.facility_id} — ${cfLabel}-based cashflow`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: formula, action: 'Apply formula: Cashflow / Total Debt Service',
      value: `${fmt(fac.noi_amt ?? 0)} / ${fmt(fac.debt_service_amt ?? 0)} = ${fmtDscr(fac.dscr_value ?? 0)}`,
      detail: `Formula: ${formula} — scope: 1 facility (${fac.facility_id})`,
      color: 'emerald',
    },
  ];
}

function buildDscrFacilitySteps(fac: DemoFacility, formula: string): FlowStep[] {
  const cfLabel = fac.cashflow_label ?? 'NOI';
  return [
    {
      layer: 'L1', table: 'facility_master', action: `Pick facility ${fac.facility_id}`,
      value: `facility_id = ${fac.facility_id}`,
      detail: `${fac.facility_name} — ${fac.counterparty_name}`,
      color: 'blue',
    },
    {
      layer: 'L1', table: 'facility_master', action: 'Read committed amount (exposure basis)',
      value: `committed_facility_amt = ${fmt(fac.committed_amt)}`,
      detail: 'Used as weighting basis for rollup to higher levels',
      color: 'blue',
    },
    {
      layer: 'L2', table: 'facility_financial_snapshot', action: `Look up ${cfLabel}`,
      value: `${cfLabel.toLowerCase()} = ${fmt(fac.noi_amt ?? 0)}`,
      detail: `${cfLabel === 'NOI' ? 'Net Operating Income' : 'Earnings Before Interest, Taxes, Depreciation & Amortization'}`,
      color: 'amber',
    },
    {
      layer: 'L2', table: 'facility_financial_snapshot', action: 'Look up total debt service',
      value: `debt_service = ${fmt(fac.debt_service_amt ?? 0)}`,
      detail: 'Annual total debt service obligations',
      color: 'amber',
    },
    {
      layer: 'Calc', table: formula, action: 'Apply formula: Cashflow / Total Debt Service',
      value: `${fmt(fac.noi_amt ?? 0)} / ${fmt(fac.debt_service_amt ?? 0)} = ${fmtDscr(fac.dscr_value ?? 0)}`,
      detail: `Formula: ${formula} — scope: 1 facility, direct division, no aggregation`,
      color: 'emerald',
    },
  ];
}

function buildDscrCounterpartySteps(facilities: DemoFacility[], cpName: string, cpId: string): FlowStep[] {
  const cpFacs = facilities.filter((f) => f.counterparty_id === cpId);
  const facIds = cpFacs.map((f) => f.facility_id).join(', ');
  const wtdDscr = dscrWeightedAvg(cpFacs);
  const wtdExpr = cpFacs.map((f) => `${fmtDscr(f.dscr_value ?? 0)}×${fmt(f.committed_amt)}`).join(' + ');
  const totalExp = cpFacs.reduce((s, f) => s + f.committed_amt, 0);

  return [
    {
      layer: 'Scope', table: 'counterparty', action: `Pick counterparty ${cpId}`,
      value: `counterparty_id = ${cpId}`,
      detail: `${cpName} — defines which facilities are in scope`,
      color: 'purple',
    },
    {
      layer: 'Scope', table: 'facility_master', action: `Resolve facilities WHERE counterparty_id = ${cpId}`,
      value: `${cpFacs.length} facilities in scope: ${facIds}`,
      detail: cpFacs.map((f) => `${f.facility_id} ${f.facility_name} (DSCR ${fmtDscr(f.dscr_value ?? 0)})`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Agg', table: 'Σ(DSCR × Exposure)', action: 'Compute weighted sum: Σ(DSCR × exposure)',
      value: wtdExpr,
      detail: `Numerator of exposure-weighted average`,
      color: 'amber',
    },
    {
      layer: 'Agg', table: 'Σ Exposure', action: 'Sum exposure across in-scope facilities',
      value: `Total exposure = ${fmt(totalExp)}`,
      detail: `Denominator: total exposure across all ${cpName} facilities`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: 'Σ(DSCR×Exp) / Σ(Exp)', action: 'Apply exposure-weighted average',
      value: `Weighted Avg DSCR = ${fmtDscr(wtdDscr)}`,
      detail: `Scope: ${cpFacs.length} facilities (counterparty ${cpId})`,
      color: 'emerald',
    },
  ];
}

function buildDscrDeskSteps(facilities: DemoFacility[], deskName: string, segId: string): FlowStep[] {
  const deskFacs = facilities.filter((f) => f.lob_segment_id === segId);
  const wtdDscr = dscrWeightedAvg(deskFacs);

  return [
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: `Pick desk "${deskName}"`,
      value: `segment_name = '${deskName}' AND tree_level = 3`,
      detail: `Resolve organizational unit at L3 (desk) level — defines facility scope`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = ${segId}`,
      detail: `Hierarchy node for ${deskName}`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'facility_master', action: `Resolve facilities WHERE lob_segment_id = ${segId}`,
      value: `${deskFacs.length} facilities in scope: ${deskFacs.map((f) => f.facility_id).join(', ')}`,
      detail: deskFacs.map((f) => `${f.facility_id} ${f.facility_name} (${fmtDscr(f.dscr_value ?? 0)})`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Agg', table: 'Per-facility DSCR', action: 'Read facility-level DSCR and exposure for each',
      value: deskFacs.map((f) => `${f.facility_id}: ${fmtDscr(f.dscr_value ?? 0)} @ ${fmt(f.committed_amt)}`).join(', '),
      detail: `Facility DSCRs and exposures for weighting`,
      color: 'amber',
    },
    {
      layer: 'Calc', table: 'Σ(DSCR×Exp) / Σ(Exp)', action: 'Apply exposure-weighted average',
      value: `Weighted Avg DSCR = ${fmtDscr(wtdDscr)}`,
      detail: `Scope: ${deskFacs.length} facilities (desk ${deskName})`,
      color: 'emerald',
    },
  ];
}

function buildDscrPortfolioSteps(facilities: DemoFacility[]): FlowStep[] {
  const portfolioName = facilities[0]?.portfolio_name ?? 'Portfolio';
  const wtdDscr = dscrWeightedAvg(facilities);
  const desks = [...new Set(facilities.map((f) => f.desk_name))];
  const deskSegIds = [...new Set(facilities.map((f) => f.lob_segment_id))];

  return [
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: `Pick portfolio "${portfolioName}"`,
      value: `segment_name = '${portfolioName}' AND tree_level = 2`,
      detail: `Resolve organizational unit at L2 (portfolio) level — defines facility scope`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = SEG-L2-CRE`,
      detail: `Hierarchy node for ${portfolioName}`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Traverse parent_segment_id → find child desks',
      value: `WHERE parent_segment_id = SEG-L2-CRE → [${deskSegIds.join(', ')}]`,
      detail: `${desks.length} child desks: ${desks.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'Scope', table: 'facility_master', action: 'Resolve all facilities under child desks',
      value: `${facilities.length} facilities in scope across ${desks.length} desks`,
      detail: facilities.map((f) => `${f.facility_id} (${f.desk_name})`).join(' · '),
      color: 'blue',
    },
    {
      layer: 'Calc', table: 'Σ(DSCR×Exp) / Σ(Exp)', action: 'Apply exposure-weighted average across all facilities',
      value: `Weighted Avg DSCR = ${fmtDscr(wtdDscr)}`,
      detail: `Scope: ${facilities.length} facilities (portfolio ${portfolioName})`,
      color: 'emerald',
    },
  ];
}

function buildDscrLobSteps(facilities: DemoFacility[]): FlowStep[] {
  const lobName = facilities[0]?.lob_name ?? 'Business Segment';
  const wtdDscr = dscrWeightedAvg(facilities);
  const portfolios = [...new Set(facilities.map((f) => f.portfolio_name))];
  const desks = [...new Set(facilities.map((f) => f.desk_name))];

  return [
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: `Pick Business Segment "${lobName}"`,
      value: `segment_name = '${lobName}' AND tree_level = 1`,
      detail: `Resolve organizational unit at L1 (department) level — defines facility scope`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Get managed_segment_id',
      value: `managed_segment_id = SEG-L1-003`,
      detail: `Hierarchy node for ${lobName}`,
      color: 'blue',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Recursive: find L2 children (portfolios)',
      value: `WHERE parent_segment_id = SEG-L1-003 → ${portfolios.length} portfolio(s)`,
      detail: `L2 children: ${portfolios.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'Scope', table: 'enterprise_business_taxonomy', action: 'Recursive: find L3 grandchildren (desks)',
      value: `${desks.length} desks across ${portfolios.length} portfolio(s)`,
      detail: `L3 grandchildren: ${desks.join(', ')}`,
      color: 'purple',
    },
    {
      layer: 'Scope', table: 'facility_master', action: 'Resolve all facilities under all descendants',
      value: `${facilities.length} facilities in scope`,
      detail: facilities.map((f) => `${f.facility_id}`).join(', '),
      color: 'blue',
    },
    {
      layer: 'Calc', table: 'Σ(DSCR×Exp) / Σ(Exp)', action: 'Apply exposure-weighted average across all facilities',
      value: `Weighted Avg DSCR = ${fmtDscr(wtdDscr)}`,
      detail: `Scope: ${facilities.length} facilities (Business Segment ${lobName})`,
      color: 'emerald',
    },
  ];
}

/* ────────────────────────────────────────────────────────────────────────────
 * INSIGHT CALLOUTS — contextual explanation per tab, per metric
 * ──────────────────────────────────────────────────────────────────────────── */

const LTV_INSIGHTS: Record<TabKey, string> = {
  position: 'Positions are the finest grain — individual loans, commitments, and securities that compose a facility. Their balance_amount values sum to the facility\'s committed_facility_amt. The formula is always the same: Σ(committed) / Σ(collateral) × 100.',
  facility: 'At facility level, the formula is applied directly — one facility, one committed amount, one collateral value. No aggregation needed. This is the atomic unit that every higher level resolves back to.',
  counterparty: 'The formula doesn\'t change — only the scope does. Group by counterparty_id to find all facilities belonging to one obligor, then apply Σ(committed) / Σ(collateral) × 100 across those facilities.',
  desk: 'Same formula, different scope. Resolve the desk via enterprise_business_taxonomy (tree_level = 3) to find which facilities belong to it, then Σ(committed) / Σ(collateral) × 100.',
  portfolio: 'Same formula, wider scope. Traverse parent_segment_id from the L2 portfolio node to all L3 desk children, collect all underlying facilities, then Σ(committed) / Σ(collateral) × 100.',
  lob: 'Same formula, widest scope. Recursive parent_segment_id traversal: L1 → L2 portfolios → L3 desks. Collect all descendant facilities, then Σ(committed) / Σ(collateral) × 100.',
};

const DSCR_INSIGHTS: Record<TabKey, string> = {
  position: 'Positions are the finest grain — individual loans and commitments within a facility. Their balance_amount values sum to committed_facility_amt (the exposure basis for weighting). DSCR itself comes from the facility\'s financial snapshot: Cashflow / Debt Service.',
  facility: 'At facility level, DSCR is computed directly from facility_financial_snapshot: NOI (for CRE) or EBITDA (for C&I) divided by total debt service. This is the atomic unit — no aggregation needed.',
  counterparty: 'Group facilities by counterparty_id. The counterparty DSCR is an exposure-weighted average: Σ(DSCR × exposure) / Σ(exposure). This avoids distortion from unequal facility sizes.',
  desk: 'Resolve the desk via enterprise_business_taxonomy (tree_level = 3). Collect all underlying facilities, then compute exposure-weighted average DSCR across the desk.',
  portfolio: 'Traverse parent_segment_id from the L2 portfolio node to all L3 desk children. Collect all underlying facilities, then Σ(DSCR × exposure) / Σ(exposure) for a portfolio-wide weighted average.',
  lob: 'Recursive parent_segment_id traversal: L1 → L2 portfolios → L3 desks. Collect all descendant facilities, then Σ(DSCR × exposure) / Σ(exposure) for the broadest weighted average.',
};

function getInsights(mode: MetricMode): Record<TabKey, string> {
  if (mode === 'DSCR') return DSCR_INSIGHTS;
  return LTV_INSIGHTS;
}

/* ────────────────────────────────────────────────────────────────────────────
 * LINEAGE PAGE ROUTES — metrics with dedicated lineage pages
 * ──────────────────────────────────────────────────────────────────────────── */

const LINEAGE_ROUTES: Record<string, { href: string; label: string }> = {
  LTV:              { href: '/metrics/ltv-lineage',       label: 'LTV End-to-End Lineage' },
  DSCR:             { href: '/metrics/dscr-lineage',      label: 'DSCR End-to-End Lineage' },
  WABR:             { href: '/metrics/wabr-lineage',      label: 'WABR End-to-End Lineage' },
  INT_INCOME:       { href: '/metrics/int-income-lineage', label: 'Interest Income End-to-End Lineage' },
  COMMITTED_AMOUNT: { href: '/metrics/committed-lineage',  label: 'Committed Amount End-to-End Lineage' },
};

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function CatalogueDeepDive({ item }: { item: CatalogueItem }) {
  const [activeTab, setActiveTab] = useState<TabKey>('position');

  const demo = item.demo_data;
  const lineageRoute = LINEAGE_ROUTES[item.abbreviation];

  if (!demo || !demo.facilities.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        {lineageRoute ? (
          <>
            <p className="text-sm mb-4">This metric has a dedicated interactive lineage diagram with guided demo walkthrough.</p>
            <Link
              href={lineageRoute.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              View {lineageRoute.label} →
            </Link>
          </>
        ) : (
          <p className="text-sm">No demo data available for this item.</p>
        )}
      </div>
    );
  }

  const facilities = demo.facilities;
  const formula = item.generic_formula;
  const mode = detectMetricMode(item);
  const insights = getInsights(mode);
  const metricLabel = item.abbreviation;

  // Example entities for each tab
  const exampleFacility = facilities[0];
  const exampleCpId = 'CP-02';
  const exampleCpName = 'Meridian Holdings';
  const exampleDeskName = 'CRE Lending Desk';
  const exampleDeskSegId = 'SEG-L3-CRE';

  // Step builder dispatch
  function stepsFor(tab: TabKey): FlowStep[] {
    if (mode === 'DSCR') {
      switch (tab) {
        case 'position': return buildDscrPositionSteps(exampleFacility, formula);
        case 'facility': return buildDscrFacilitySteps(exampleFacility, formula);
        case 'counterparty': return buildDscrCounterpartySteps(facilities, exampleCpName, exampleCpId);
        case 'desk': return buildDscrDeskSteps(facilities, exampleDeskName, exampleDeskSegId);
        case 'portfolio': return buildDscrPortfolioSteps(facilities);
        case 'lob': return buildDscrLobSteps(facilities);
      }
    }
    // LTV (default)
    switch (tab) {
      case 'position': return buildPositionSteps(exampleFacility, formula);
      case 'facility': return buildFacilitySteps(exampleFacility, formula);
      case 'counterparty': return buildCounterpartySteps(facilities, exampleCpName, exampleCpId, formula);
      case 'desk': return buildDeskSteps(facilities, exampleDeskName, exampleDeskSegId, formula);
      case 'portfolio': return buildPortfolioSteps(facilities, formula);
      case 'lob': return buildLobSteps(facilities, formula);
    }
  }

  function titleFor(tab: TabKey): string {
    const titles: Record<TabKey, string> = {
      position: `Position → Facility Rollup`,
      facility: `Facility-Level ${metricLabel}`,
      counterparty: `Counterparty-Level ${metricLabel}`,
      desk: `Desk-Level ${metricLabel} (L3)`,
      portfolio: `Portfolio-Level ${metricLabel} (L2)`,
      lob: `Business Segment-Level ${metricLabel} (L1)`,
    };
    return titles[tab];
  }

  function subtitleFor(tab: TabKey): string {
    switch (tab) {
      case 'position': return `${exampleFacility.facility_id} — ${exampleFacility.facility_name}`;
      case 'facility': return `Direct calculation for ${exampleFacility.facility_id}`;
      case 'counterparty': {
        const cpFacs = facilities.filter((f) => f.counterparty_id === exampleCpId);
        return `${exampleCpName} (${exampleCpId}) — ${cpFacs.length} facilities`;
      }
      case 'desk': return `${exampleDeskName} via taxonomy lookup`;
      case 'portfolio': return `${facilities[0]?.portfolio_name} — parent_segment_id traversal`;
      case 'lob': return `${facilities[0]?.lob_name} — recursive hierarchy traversal`;
    }
  }

  const isDscr = mode === 'DSCR';

  // Formula banner description
  const formulaBannerDesc = isDscr
    ? <>At facility level, DSCR = Cashflow / Debt Service. At higher levels, rollup uses <strong className="text-purple-200">exposure-weighted average</strong>: Σ(DSCR × Exposure) / Σ(Exposure).</>
    : <>The formula never changes — only the <strong className="text-purple-200">scope of facilities</strong> varies by level. Every rollup resolves back to &quot;which facilities are in scope?&quot; then applies the same calculation.</>;

  return (
    <div className="space-y-4">
      {/* Formula constant banner */}
      <div className="bg-purple-950/30 rounded-lg p-3 border border-purple-900/40">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
            {isDscr ? 'Formula + Rollup' : 'Formula (constant)'}
          </span>
          <code className="text-sm font-mono text-purple-300 font-semibold">{formula}</code>
        </div>
        <p className="text-[11px] text-purple-300/70 mt-1">
          {formulaBannerDesc}
        </p>
      </div>

      {/* Table Traversal Demo — animated walkthrough of how tables connect per dimension (LTV-specific) */}
      {item.abbreviation === 'LTV' && <TableTraversalDemo />}

      {/* Hierarchy pyramid — visual overview */}
      <HierarchyPyramid item={item} activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabKey)} />

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
        <p className="text-xs text-blue-200 leading-relaxed">{insights[activeTab]}</p>
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === 'position' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('position')}
              title={titleFor('position')}
              subtitle={subtitleFor('position')}
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
              steps={stepsFor('facility')}
              title={titleFor('facility')}
              subtitle={subtitleFor('facility')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Facility Detail
              </div>
              <FacilityTable facilities={[exampleFacility]} showPositionCount metricType={mode !== 'GENERIC' ? mode : undefined} />
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
              steps={stepsFor('counterparty')}
              title={titleFor('counterparty')}
              subtitle={subtitleFor('counterparty')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {exampleCpName} Facilities
              </div>
              <FacilityTable
                facilities={facilities.filter((f) => f.counterparty_id === exampleCpId)}
                showPositionCount
                metricType={mode !== 'GENERIC' ? mode : undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'desk' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('desk')}
              title={titleFor('desk')}
              subtitle={subtitleFor('desk')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {exampleDeskName} Facilities
              </div>
              <FacilityTable
                facilities={facilities.filter((f) => f.lob_segment_id === exampleDeskSegId)}
                showPositionCount
                metricType={mode !== 'GENERIC' ? mode : undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('portfolio')}
              title={titleFor('portfolio')}
              subtitle={subtitleFor('portfolio')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                All Facilities by Desk
              </div>
              <FacilityTable facilities={facilities} groupBy="desk" showPositionCount metricType={mode !== 'GENERIC' ? mode : undefined} />
            </div>
          </div>
        )}

        {activeTab === 'lob' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('lob')}
              title={titleFor('lob')}
              subtitle={subtitleFor('lob')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                All Facilities by Desk (Full Department)
              </div>
              <FacilityTable facilities={facilities} groupBy="desk" showPositionCount metricType={mode !== 'GENERIC' ? mode : undefined} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
