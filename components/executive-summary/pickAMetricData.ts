import type { LucideIcon } from 'lucide-react';
import {
  ShieldCheck,
  TrendingUp,
  Landmark,
  BarChart3,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface MetricSourceField {
  table: string;
  field: string;
  layer: 'L1' | 'L2';
  description: string;
}

export interface MetricRollupLevel {
  level: string;
  label: string;
  method: string;
  formula: string;
  sampleValue: string;
  stepType: 'SOURCING' | 'CALCULATION' | 'HYBRID';
}

export interface MetricJourneyDef {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  domainColor: string;
  domainLabel: string;
  tagline: string;
  direction: string;
  formula: string;
  formulaParts: { label: string; value: string; color: string }[];
  result: string;
  resultLabel: string;
  sourceSystemIds: string[];
  sourceFields: MetricSourceField[];
  rollupLevels: MetricRollupLevel[];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Source system mapping (subset labels from architectureData)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SOURCE_SYSTEM_MAP: Record<string, { label: string; subtitle: string }> = {
  'core-banking': { label: 'Core Banking', subtitle: 'Loans & Deposits' },
  'collateral': { label: 'Collateral Systems', subtitle: 'Valuations & Liens' },
  'gl-finance': { label: 'GL / Finance', subtitle: 'Reconciliation' },
  'risk-ratings': { label: 'Risk Rating Systems', subtitle: 'PD, LGD, Grades' },
  'market-data': { label: 'Market Data', subtitle: 'Pricing & Rates' },
  'treasury': { label: 'Treasury / Funding', subtitle: 'Borrowings & Lines' },
  'derivatives': { label: 'Derivatives & SFTs', subtitle: 'Repo, SBL, Margin' },
  'securities': { label: 'Securities / Investment', subtitle: 'HQLA, AFS, HTM' },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * 6 Metric definitions
 * ═══════════════════════════════════════════════════════════════════════════ */

export const METRICS: MetricJourneyDef[] = [
  {
    id: 'ltv',
    name: 'Loan-to-Value Ratio',
    shortName: 'LTV',
    icon: ShieldCheck,
    domainColor: '#f59e0b',
    domainLabel: 'Collateral & Mitigation',
    tagline: 'How much of the collateral is consumed by the loan',
    direction: 'Lower is better',
    formula: 'Outstanding Balance / Collateral Value × 100',
    formulaParts: [
      { label: 'Outstanding Balance', value: '$178.3M', color: '#60a5fa' },
      { label: 'Collateral Value', value: '$273.5M', color: '#f59e0b' },
    ],
    result: '65.2%',
    resultLabel: 'LTV Ratio',
    sourceSystemIds: ['core-banking', 'collateral'],
    sourceFields: [
      { table: 'facility_exposure_snapshot', field: 'drawn_amount', layer: 'L2', description: 'Current outstanding balance' },
      { table: 'collateral_snapshot', field: 'current_valuation_usd', layer: 'L2', description: 'Latest collateral valuation' },
      { table: 'facility_master', field: 'committed_facility_amt', layer: 'L1', description: 'Weight for rollup' },
    ],
    rollupLevels: [
      { level: 'facility', label: 'Facility', method: 'Direct Calculation', formula: 'drawn / collateral_value', sampleValue: '65.2%', stepType: 'CALCULATION' },
      { level: 'counterparty', label: 'Counterparty', method: 'Committed-Weighted Avg', formula: 'Σ(ltv × committed) / Σ(committed)', sampleValue: '68.1%', stepType: 'HYBRID' },
      { level: 'desk', label: 'Desk', method: 'Committed-Weighted Avg', formula: 'Σ(ltv × committed) / Σ(committed)', sampleValue: '62.4%', stepType: 'HYBRID' },
      { level: 'portfolio', label: 'Portfolio', method: 'Committed-Weighted Avg', formula: 'Σ(ltv × committed) / Σ(committed)', sampleValue: '64.7%', stepType: 'HYBRID' },
      { level: 'lob', label: 'Business Segment', method: 'Committed-Weighted Avg', formula: 'Σ(ltv × committed) / Σ(committed)', sampleValue: '63.9%', stepType: 'HYBRID' },
    ],
  },
  {
    id: 'dscr',
    name: 'Debt Service Coverage Ratio',
    shortName: 'DSCR',
    icon: TrendingUp,
    domainColor: '#22c55e',
    domainLabel: 'Financial Performance',
    tagline: 'Can the borrower cover their debt payments from cash flow',
    direction: 'Higher is better',
    formula: 'Net Operating Income / Total Debt Service',
    formulaParts: [
      { label: 'Net Operating Income', value: '$1.59M', color: '#22c55e' },
      { label: 'Total Debt Service', value: '$1.20M', color: '#ef4444' },
    ],
    result: '1.32x',
    resultLabel: 'DSCR',
    sourceSystemIds: ['core-banking', 'gl-finance'],
    sourceFields: [
      { table: 'facility_financial_snapshot', field: 'ebitda_amt', layer: 'L2', description: 'EBITDA or NOI' },
      { table: 'cash_flow', field: 'amount', layer: 'L2', description: 'Debt service components' },
      { table: 'facility_master', field: 'committed_facility_amt', layer: 'L1', description: 'Weight for rollup' },
    ],
    rollupLevels: [
      { level: 'facility', label: 'Facility', method: 'Direct Calculation', formula: 'NOI / debt_service', sampleValue: '1.32x', stepType: 'CALCULATION' },
      { level: 'counterparty', label: 'Counterparty', method: 'Exposure-Weighted Avg', formula: 'Σ(dscr × exposure) / Σ(exposure)', sampleValue: '1.45x', stepType: 'HYBRID' },
      { level: 'desk', label: 'Desk', method: 'Exposure-Weighted Avg', formula: 'Σ(dscr × exposure) / Σ(exposure)', sampleValue: '1.51x', stepType: 'HYBRID' },
      { level: 'portfolio', label: 'Portfolio', method: 'Exposure-Weighted Avg', formula: 'Σ(dscr × exposure) / Σ(exposure)', sampleValue: '1.48x', stepType: 'HYBRID' },
      { level: 'lob', label: 'Business Segment', method: 'Exposure-Weighted Avg', formula: 'Σ(dscr × exposure) / Σ(exposure)', sampleValue: '1.52x', stepType: 'HYBRID' },
    ],
  },
  {
    id: 'ead',
    name: 'Exposure at Default',
    shortName: 'EAD',
    icon: Landmark,
    domainColor: '#3b82f6',
    domainLabel: 'Exposure & Limits',
    tagline: 'Total exposure if the borrower defaults today',
    direction: 'Lower is better',
    formula: 'Drawn + CCF × (Committed - Drawn)',
    formulaParts: [
      { label: 'Drawn Amount', value: '$12.4M', color: '#3b82f6' },
      { label: 'CCF × Undrawn', value: '$3.9M', color: '#8b5cf6' },
    ],
    result: '$16.3M',
    resultLabel: 'EAD',
    sourceSystemIds: ['core-banking', 'risk-ratings'],
    sourceFields: [
      { table: 'facility_exposure_snapshot', field: 'drawn_amount', layer: 'L2', description: 'Current drawn balance' },
      { table: 'facility_exposure_snapshot', field: 'undrawn_amount', layer: 'L2', description: 'Available credit' },
      { table: 'facility_risk_snapshot', field: 'ccf', layer: 'L2', description: 'Credit conversion factor' },
      { table: 'facility_master', field: 'committed_facility_amt', layer: 'L1', description: 'Total commitment' },
    ],
    rollupLevels: [
      { level: 'facility', label: 'Facility', method: 'Direct Calculation', formula: 'drawn + ccf × undrawn', sampleValue: '$16.3M', stepType: 'CALCULATION' },
      { level: 'counterparty', label: 'Counterparty', method: 'SUM', formula: 'SUM(facility.ead)', sampleValue: '$48.7M', stepType: 'HYBRID' },
      { level: 'desk', label: 'Desk', method: 'SUM', formula: 'SUM(counterparty.ead)', sampleValue: '$285M', stepType: 'HYBRID' },
      { level: 'portfolio', label: 'Portfolio', method: 'SUM', formula: 'SUM(desk.ead)', sampleValue: '$1.2B', stepType: 'HYBRID' },
      { level: 'lob', label: 'Business Segment', method: 'SUM', formula: 'SUM(portfolio.ead)', sampleValue: '$4.8B', stepType: 'HYBRID' },
    ],
  },
  {
    id: 'pd',
    name: 'Probability of Default',
    shortName: 'PD',
    icon: AlertTriangle,
    domainColor: '#ef4444',
    domainLabel: 'Credit Risk',
    tagline: 'Likelihood the borrower defaults within one year',
    direction: 'Lower is better',
    formula: 'Model-assigned PD from internal rating scorecard',
    formulaParts: [
      { label: 'Internal Risk Rating', value: 'BB+', color: '#f59e0b' },
      { label: 'Mapped PD', value: '1.82%', color: '#ef4444' },
    ],
    result: '1.82%',
    resultLabel: 'PD',
    sourceSystemIds: ['risk-ratings', 'core-banking'],
    sourceFields: [
      { table: 'counterparty_rating_observation', field: 'pd_pct', layer: 'L2', description: 'Point-in-time PD' },
      { table: 'counterparty_rating_observation', field: 'rating_source_id', layer: 'L2', description: 'INTERNAL or EXTERNAL' },
      { table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', layer: 'L2', description: 'Weight for rollup' },
    ],
    rollupLevels: [
      { level: 'facility', label: 'Facility', method: 'Direct Sourcing', formula: 'counterparty.pd_pct', sampleValue: '1.82%', stepType: 'SOURCING' },
      { level: 'counterparty', label: 'Counterparty', method: 'Direct Sourcing', formula: 'rating_observation.pd_pct', sampleValue: '1.82%', stepType: 'SOURCING' },
      { level: 'desk', label: 'Desk', method: 'EAD-Weighted Avg', formula: 'Σ(pd × ead) / Σ(ead)', sampleValue: '2.14%', stepType: 'HYBRID' },
      { level: 'portfolio', label: 'Portfolio', method: 'EAD-Weighted Avg', formula: 'Σ(pd × ead) / Σ(ead)', sampleValue: '1.97%', stepType: 'HYBRID' },
      { level: 'lob', label: 'Business Segment', method: 'EAD-Weighted Avg', formula: 'Σ(pd × ead) / Σ(ead)', sampleValue: '2.05%', stepType: 'HYBRID' },
    ],
  },
  {
    id: 'committed',
    name: 'Committed Facility Amount',
    shortName: 'Committed Amt',
    icon: DollarSign,
    domainColor: '#3b82f6',
    domainLabel: 'Exposure & Limits',
    tagline: 'Total credit commitment across all facilities',
    direction: 'Neutral',
    formula: 'SUM of committed_facility_amt (FX-adjusted)',
    formulaParts: [
      { label: 'Committed Amount', value: '$20.0M', color: '#3b82f6' },
      { label: 'FX Rate × Bank Share', value: '× 1.0 × 100%', color: '#6b7280' },
    ],
    result: '$20.0M',
    resultLabel: 'Committed',
    sourceSystemIds: ['core-banking', 'market-data'],
    sourceFields: [
      { table: 'facility_master', field: 'committed_facility_amt', layer: 'L1', description: 'Original commitment' },
      { table: 'fx_rate_snapshot', field: 'exchange_rate', layer: 'L2', description: 'Daily FX rate' },
      { table: 'facility_master', field: 'bank_share_pct', layer: 'L1', description: 'Participation share' },
    ],
    rollupLevels: [
      { level: 'facility', label: 'Facility', method: 'Direct Sourcing', formula: 'committed × fx × share', sampleValue: '$20.0M', stepType: 'SOURCING' },
      { level: 'counterparty', label: 'Counterparty', method: 'SUM', formula: 'SUM(facility.committed)', sampleValue: '$28.8M', stepType: 'HYBRID' },
      { level: 'desk', label: 'Desk', method: 'SUM', formula: 'SUM(counterparty.committed)', sampleValue: '$125M', stepType: 'HYBRID' },
      { level: 'portfolio', label: 'Portfolio', method: 'SUM', formula: 'SUM(desk.committed)', sampleValue: '$380M', stepType: 'HYBRID' },
      { level: 'lob', label: 'Business Segment', method: 'SUM', formula: 'SUM(portfolio.committed)', sampleValue: '$1.2B', stepType: 'HYBRID' },
    ],
  },
  {
    id: 'el',
    name: 'Expected Loss',
    shortName: 'EL',
    icon: BarChart3,
    domainColor: '#8b5cf6',
    domainLabel: 'Portfolio Analytics',
    tagline: 'Statistical estimate of credit losses over one year',
    direction: 'Lower is better',
    formula: 'PD × LGD × EAD',
    formulaParts: [
      { label: 'PD', value: '1.82%', color: '#ef4444' },
      { label: 'LGD', value: '45.0%', color: '#f59e0b' },
      { label: 'EAD', value: '$16.3M', color: '#3b82f6' },
    ],
    result: '$133K',
    resultLabel: 'Expected Loss',
    sourceSystemIds: ['risk-ratings', 'core-banking', 'collateral'],
    sourceFields: [
      { table: 'counterparty_rating_observation', field: 'pd_pct', layer: 'L2', description: 'Probability of default' },
      { table: 'facility_risk_snapshot', field: 'lgd_pct', layer: 'L2', description: 'Loss given default' },
      { table: 'facility_exposure_snapshot', field: 'drawn_amount', layer: 'L2', description: 'For EAD calculation' },
      { table: 'facility_risk_snapshot', field: 'ccf', layer: 'L2', description: 'Credit conversion factor' },
    ],
    rollupLevels: [
      { level: 'facility', label: 'Facility', method: 'Direct Calculation', formula: 'pd × lgd × ead', sampleValue: '$133K', stepType: 'CALCULATION' },
      { level: 'counterparty', label: 'Counterparty', method: 'SUM', formula: 'SUM(facility.el)', sampleValue: '$412K', stepType: 'HYBRID' },
      { level: 'desk', label: 'Desk', method: 'SUM', formula: 'SUM(counterparty.el)', sampleValue: '$2.8M', stepType: 'HYBRID' },
      { level: 'portfolio', label: 'Portfolio', method: 'SUM', formula: 'SUM(desk.el)', sampleValue: '$11.4M', stepType: 'HYBRID' },
      { level: 'lob', label: 'Business Segment', method: 'SUM', formula: 'SUM(portfolio.el)', sampleValue: '$48.2M', stepType: 'HYBRID' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Step type styling
 * ═══════════════════════════════════════════════════════════════════════════ */

export const STEP_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  SOURCING: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  CALCULATION: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  HYBRID: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Journey step definitions
 * ═══════════════════════════════════════════════════════════════════════════ */

export const JOURNEY_STEPS = [
  { id: 'source', label: 'Source', description: 'Where the raw data comes from' },
  { id: 'tables', label: 'Ingest & Enrich', description: 'Tables and fields used' },
  { id: 'calculate', label: 'Calculate', description: 'Formula at facility level' },
  { id: 'aggregate', label: 'Aggregate', description: 'Roll up through hierarchy' },
  { id: 'dashboard', label: 'Dashboard', description: 'Final output in context' },
] as const;

export type JourneyStepId = typeof JOURNEY_STEPS[number]['id'];
