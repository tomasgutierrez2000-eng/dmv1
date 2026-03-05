/* ────────────────────────────────────────────────────────────────────────────
 * Counterparty Allocation % Lineage Demo — Step Definitions
 *
 * Single metric: participation_pct from facility_counterparty_participation.
 * Raw at facility and counterparty levels. N/A at desk/portfolio/lob.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { GenericDemoStep } from './useDemoEngine';

/* No variant key needed — single metric, but we keep the generic type
   parameter as 'default' so the demo engine interface stays consistent. */
export type AllocPctVariantKey = 'default';

/* ────────────────────────────────────────────────────────────────────────── */

export const ALLOC_PCT_DEMO_STEPS: GenericDemoStep<AllocPctVariantKey>[] = [
  /* ── Step 0: Welcome ───────────────────────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the Counterparty Allocation % Lineage Demo',
    narration:
      'Counterparty Share or Allocation (%) answers a fundamental syndicated-lending question: "What share of this facility does each counterparty hold?"\n\nIn syndicated lending, multiple banks share a single loan. Each bank\'s percentage share — its "allocation" — determines how much of the loan they fund, how fees are split, and how much credit risk they carry.\n\nThis metric is sourced directly from the facility_counterparty_participation table as a raw lookup at both facility and counterparty levels.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ──────────────────────────────────────────── */
  {
    id: 'alloc-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'The Allocation % Lookup',
    narration:
      'Counterparty Allocation % is a SOURCED metric — it is directly looked up from the facility_counterparty_participation table.\n\nFor each (Facility_ID, Counterparty_ID) pair, the system looks up participation_pct which represents that counterparty\'s contractual share of the facility.\n\nFor example, in a $100M syndicated revolver, Bank A might commit to 60% ($60M) and Bank B to 40% ($40M). This percentage is stored as participation_pct.',
    targetSelector: '[data-demo="step1"]',
    insight:
      'Participation percentages across all syndicate members must sum to exactly 100% for each facility.',
  },

  /* ── Step 2: Source field ──────────────────────────────────────────────── */
  {
    id: 'input-participation',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'The Source Field: participation_pct',
    narration:
      'The single input is participation_pct — the counterparty\'s share of the facility.\n\nFor our example facility (Syndicated Revolver, $100M committed):\n\nParticipation % = 60.00%\n\nThis comes from the facility_counterparty_participation table, an L1 reference table that stores the syndication structure. Each row represents one counterparty\'s stake in one facility.\n\nThis table is relatively static — it only changes when a bank assignment, novation, or transfer occurs.',
    targetSelector: '[data-demo="num-section"]',
    formulaKey: 'legal-build',
  },

  /* ── Step 3: Result ────────────────────────────────────────────────────── */
  {
    id: 'alloc-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Result: 60.00%',
    narration:
      'For this facility-counterparty pair:\n\nAllocation % = 60.00%\n\nThis means the counterparty is allocated 60% of this $100M facility (up to $60M). It represents their share of the facility which they can draw on.\n\nThis value is used for commitment tracking, fee allocation, and concentration risk identification.',
    targetSelector: '[data-demo="result"]',
    formulaKey: 'alloc-result',
  },

  /* ── Step 4: L1 Reference Tables ───────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'The allocation metric draws from L1 reference tables — the stable "master data" of the bank:\n\n• facility_master — loan identity, committed amount, counterparty FK\n• facility_counterparty_participation — which counterparties hold what percentage of each facility\n• counterparty — borrower identity, legal name\n\nThe participation table is the key source. For each [Facility_ID] the system looks up [Counterparty_ID] in Facility Master, then looks up [participation_pct] in facility_counterparty_participation WHERE [Counterparty_ID] AND [Facility_ID] match.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'The facility_counterparty_participation table is a many-to-many relationship: one facility has multiple counterparties, and one counterparty can participate in multiple facilities.',
  },

  /* ── Step 5: Facility Level ────────────────────────────────────────────── */
  {
    id: 'rollup-facility',
    phase: 4,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Facility Level: Raw Lookup',
    narration:
      'At the facility level, Allocation % is a direct lookup — one value per (facility, counterparty) pair.\n\nFor each [Facility_ID] lookup [Counterparty_ID] in Facility Master table THEN for each [Counterparty_ID] lookup [participation_pct] in facility_counterparty_participation table.\n\nLet\'s look at the participation structure across five facilities:',
    targetSelector: '[data-demo="rollup-facility"]',
    onEnter: { expandLevel: 'facility' },
    formulaKey: 'rollup-facility',
  },

  /* ── Step 6: Counterparty Level ────────────────────────────────────────── */
  {
    id: 'rollup-counterparty',
    phase: 4,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Counterparty Level: Raw Lookup',
    narration:
      'At the counterparty level, the same raw lookup applies — for each [Counterparty_ID] lookup [Facility_ID] in Facility Master table THEN for each [Facility_ID] lookup [participation_pct] in facility_counterparty_participation table.\n\nEach facility retains its own participation_pct. A counterparty may participate in multiple facilities with different percentages — each is displayed individually.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'rollup-counterparty',
  },

  /* ── Step 7: Higher Levels N/A ─────────────────────────────────────────── */
  {
    id: 'higher-levels-na',
    phase: 4,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Desk / Portfolio / LoB: Not Applicable',
    narration:
      'Allocation % does NOT roll up beyond counterparty level.\n\nDesk, Portfolio, and Department/LoB levels are N/A because allocation % is inherently a facility-counterparty relationship attribute — it describes one counterparty\'s share in one facility.\n\nThis is a key architectural distinction:\n\n• Currency metrics (Interest Income): roll up via SUM to all 5 levels\n• Ratio metrics (DSCR, LTV): roll up via weighted average to all 5 levels\n• Relationship metrics (Allocation %): only meaningful at facility and counterparty levels',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
  },

  /* ── Step 8: Dashboard ─────────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 5,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'On the dashboard, Allocation % serves concentration risk analysis:\n\n• At facility level: "Who are the counterparties and what are their shares?"\n• At counterparty level: "Across all facilities, what share does this counterparty hold in each?"\n\nThis feeds directly into Large Exposure Framework limits and concentration risk identification.\n\nFull auditability: every allocation value traces back to the participation table and the original syndication agreement.',
    targetSelector: '[data-demo="step6"]',
  },
];

/** Resolve a step field that may be a function of the variant */
export function resolveAllocPctField<T>(field: T | ((v: AllocPctVariantKey) => T), variant: AllocPctVariantKey): T {
  return typeof field === 'function' ? (field as (v: AllocPctVariantKey) => T)(variant) : field;
}

/** Replace {v} placeholder in a selector with the variant key */
export function resolveAllocPctSelector(selector: string, variant: AllocPctVariantKey): string {
  return selector.replace(/\{v\}/g, variant);
}
