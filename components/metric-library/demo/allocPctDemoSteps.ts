/* ────────────────────────────────────────────────────────────────────────────
 * Counterparty Allocation % Lineage Demo — Step Definitions
 *
 * Two variants: 'legal' (contractual) and 'economic' (post-CRM).
 * Variant-aware fields use functions: (v) => { ... }.
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { GenericDemoStep } from './useDemoEngine';

export type AllocPctVariantKey = 'legal' | 'economic';

/* ── Variant helpers ─────────────────────────────────────────────────────── */

const V_LABEL: Record<AllocPctVariantKey, string> = {
  legal: 'Legal Participation %',
  economic: 'Economic Allocation %',
};

const V_SOURCE: Record<AllocPctVariantKey, string> = {
  legal: 'facility_counterparty_participation (L1)',
  economic: 'counterparty_allocation_snapshot (L2)',
};

const V_FIELD: Record<AllocPctVariantKey, string> = {
  legal: 'participation_pct',
  economic: 'economic_allocation_pct',
};

const V_SAMPLE: Record<AllocPctVariantKey, string> = {
  legal: '60.00%',
  economic: '45.00%',
};

/* ────────────────────────────────────────────────────────────────────────── */

export const ALLOC_PCT_DEMO_STEPS: GenericDemoStep<AllocPctVariantKey>[] = [
  /* ── Step 0: Welcome & Variant Picker ────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the Counterparty Allocation % Lineage Demo',
    narration:
      'Counterparty Allocation % answers a fundamental syndicated-lending question: "What share of this facility does each counterparty hold?"\n\nIn syndicated lending, multiple banks share a single loan. Each bank\'s percentage share — its "allocation" — determines how much of the loan they fund, how fees are split, and how much credit risk they carry.\n\nThis metric has two variants:\n\n• Legal Participation % — the contractual share from the loan agreement\n• Economic Allocation % — the effective exposure share after credit risk mitigation (CDS, sub-participations, guarantees)\n\nSelect a variant to begin the walkthrough.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ────────────────────────────────────────── */
  {
    id: 'alloc-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `The ${V_LABEL[v]} Formula`,
    narration: (v) =>
      v === 'legal'
        ? 'Legal Participation % is the simplest metric class — OBSERVED.\n\nIt is directly sourced from the loan syndication agreement. When multiple banks form a lending syndicate, each bank\'s participation percentage is contractually fixed at closing.\n\nFor example, in a $100M syndicated revolver, Bank A might commit to 60% ($60M) and Bank B to 40% ($40M). This percentage rarely changes unless a bank sells or transfers its position.\n\nThe field is:\n\nparticipation_pct — stored directly in facility_counterparty_participation.'
        : 'Economic Allocation % adds a calculation layer on top of the legal participation.\n\nWhile the legal share tells you what the contract says, the economic share tells you what your actual risk exposure is after accounting for credit risk mitigation (CRM):\n\nEconomic Allocation = Legal Participation − CRM Adjustment\n\nCRM adjustments include CDS protection purchased, sub-participations sold, risk participations, and guarantees received. A bank might legally hold 60% of a facility but have CDS covering 15%, reducing its economic exposure to 45%.',
    targetSelector: '[data-demo="step1-variant-{v}"]',
    insight: (v) =>
      v === 'legal'
        ? 'Legal participation percentages across all syndicate members must sum to exactly 100% for each facility.'
        : 'Economic allocations may NOT sum to 100% — risk can be transferred to parties outside the original syndicate (e.g., CDS counterparties).',
  },

  /* ── Step 2: Input 1 — participation_pct or legal_participation_pct ──── */
  {
    id: 'input-participation',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => v === 'legal' ? 'The Source Field: participation_pct' : 'Input 1: Legal Participation %',
    narration: (v) =>
      v === 'legal'
        ? 'The single input is participation_pct — the contractual percentage share.\n\nFor our example facility (Syndicated Revolver, $100M committed):\n\nParticipation % = 60.00%\n\nThis comes from the facility_counterparty_participation table, an L1 reference table that stores the syndication structure. Each row represents one bank\'s stake in one facility.\n\nThis table is relatively static — it only changes when a bank assignment, novation, or transfer occurs.'
        : 'The first input is the legal participation percentage — the starting point before CRM adjustments.\n\nFor our example:\n\nLegal Participation = 60.00%\n\nThis is denormalized from the L1 participation table into the L2 counterparty_allocation_snapshot for audit trail purposes. Having both the legal and economic values in one snapshot row makes point-in-time comparison straightforward.',
    targetSelector: '[data-demo="num-section-{v}"]',
    formulaKey: 'legal-build',
  },

  /* ── Step 3: Input 2 — CRM adjustment (economic only) / Committed Amt ── */
  {
    id: 'input-crm',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => v === 'legal' ? 'Weighting Basis: Committed Amount' : 'Input 2: CRM Adjustment %',
    narration: (v) =>
      v === 'legal'
        ? 'While the legal participation % is a direct lookup per (facility, counterparty) pair, rolling it up to the counterparty level requires a weighting basis.\n\nCommitted Amount = $100,000,000\n\nThe committed_facility_amt from facility_master tells us how large each facility is. A counterparty\'s 60% share in a $100M facility carries more weight than their 100% share in a $10M facility.\n\nAt the counterparty level:\n\nWeighted Avg Participation = Σ(participation_pct × committed_amt) / Σ(committed_amt)'
        : 'The second input is the CRM adjustment — the total credit risk mitigation that reduces economic exposure.\n\nFor our example:\n\nCRM Adjustment = 15.00%\n\nThis comes from the counterparty_allocation_snapshot table (L2), which records point-in-time CRM positions. The adjustment aggregates all CRM instruments:\n\n• CDS protection purchased → reduces exposure\n• Sub-participations sold → transfers funded exposure\n• Risk participations → transfers unfunded risk\n• Guarantees received → substitution of obligor\n\nThe crm_methodology field records whether SUBSTITUTION or COMPREHENSIVE approach was used (per Basel III CRE guidelines).',
    targetSelector: '[data-demo="den-section-{v}"]',
    formulaKey: 'input2-build',
  },

  /* ── Step 4: Result ──────────────────────────────────────────────────── */
  {
    id: 'alloc-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => v === 'legal' ? 'Result: 60.00%' : 'Result: 45.00%',
    narration: (v) =>
      v === 'legal'
        ? 'For this facility-counterparty pair:\n\nLegal Participation = 60.00%\n\nThis means the bank is contractually committed to fund 60% of any draws on this $100M facility (up to $60M). It receives 60% of all fees and interest, and bears 60% of the credit risk — at least on paper.\n\nThe actual economic exposure may differ due to CRM instruments (the "Economic Allocation" variant shows this).\n\nThis value is used for commitment tracking, fee allocation, and voting rights in syndicate decisions.'
        : '60.00% − 15.00% = 45.00%\n\nThe bank\'s economic exposure is only 45% despite holding a 60% legal participation. The 15% CRM adjustment comes from a CDS (credit default swap) that transfers credit risk to a protection seller.\n\nThis 45% is what matters for:\n\n• Regulatory capital (Basel III SA/IRB) — capital is held against economic exposure\n• Large Exposure Framework — concentration limits use economic share\n• CCAR/DFAST — stress testing uses economic exposure for loss projections\n• FR Y-14Q Schedule H.1 — requires both legal and economic reporting',
    targetSelector: '[data-demo="result-{v}"]',
    insight: (v) =>
      v === 'legal'
        ? 'Legal participation is the "face value" of the bank\'s commitment. Economic allocation is the "risk-adjusted" value. G-SIBs track both for regulatory compliance.'
        : 'A 15 percentage point CRM reduction on a $100M facility means $15M of credit risk has been transferred. At a 10% risk weight, this saves ~$120K in regulatory capital.',
    formulaKey: 'alloc-result',
  },

  /* ── Step 5: L1 Reference Tables ─────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'The allocation metric draws from L1 reference tables — the stable "master data" of the bank:\n\n• facility_master — loan identity, committed amount, counterparty FK\n• facility_counterparty_participation — the syndication structure: which banks hold what percentage of each facility\n• counterparty — borrower identity, legal name\n• enterprise_business_taxonomy — organizational hierarchy (desk → portfolio → segment)\n\nThe participation table is the unique table here. Unlike other metrics that derive from snapshot data, the legal participation is stored in an L1 reference table because it changes infrequently — only on assignment or transfer events.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'The facility_counterparty_participation table is a many-to-many relationship: one facility has multiple counterparties, and one counterparty can participate in multiple facilities.',
  },

  /* ── Step 6: L2 Snapshot Tables ──────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Point-in-Time Snapshots: CRM-Adjusted Allocation',
    narration: (v) =>
      v === 'legal'
        ? 'For the Legal Participation variant, L2 snapshot tables are not directly needed — the value comes from the L1 participation table.\n\nHowever, the committed_facility_amt from facility_master (L1) serves as the weighting basis for counterparty-level rollup. When calculating a counterparty\'s average participation across multiple facilities, larger facilities carry proportionally more weight.\n\nThe counterparty_allocation_snapshot (L2) is used exclusively by the Economic Allocation variant.'
        : 'The Economic Allocation variant depends on a dedicated L2 snapshot table:\n\n• counterparty_allocation_snapshot — captures the point-in-time CRM-adjusted allocation for each (facility, counterparty) pair\n\nKey fields:\n\n• legal_participation_pct — denormalized from L1 for audit trail\n• crm_adjustment_pct — total CRM reduction\n• economic_allocation_pct — net effective allocation\n• crm_methodology — SUBSTITUTION or COMPREHENSIVE (per Basel III)\n• as_of_date — snapshot date\n\nThis table changes whenever CRM positions are opened, closed, or modified — typically daily or weekly depending on the instrument.',
    targetSelector: '[data-demo="step3"]',
  },

  /* ── Step 7: Calculation Engine ──────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: (v) => v === 'legal' ? 'Direct Lookup: No Calculation Needed' : 'The CRM Adjustment Calculation',
    narration: (v) =>
      v === 'legal'
        ? 'Legal Participation % requires no calculation — it\'s a direct field lookup:\n\nSELECT participation_pct\nFROM facility_counterparty_participation\nWHERE facility_id = \'F-201\' AND counterparty_id = \'CP-01\'\n\nResult: 60.00%\n\nThis is the simplest possible metric class: OBSERVED. The value is taken directly from the source system without transformation.'
        : 'The Economic Allocation calculation is straightforward subtraction:\n\nlegal_participation_pct − crm_adjustment_pct = economic_allocation_pct\n\n60.00% − 15.00% = 45.00%\n\nThe crm_adjustment_pct itself is pre-calculated by the CRM engine, which aggregates all mitigation instruments:\n• CDS notional as % of facility commitment\n• Sub-participation % sold\n• Risk participation % transferred\n• Guarantee coverage %',
    targetSelector: '[data-demo="step4-variant-{v}"]',
  },

  /* ── Step 8: Foundational Rule ───────────────────────────────────────── */
  {
    id: 'foundational-rule',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'The Golden Rule: Exposure-Weighted Average',
    narration:
      'Before walking through rollup, one key property of Allocation % must be understood:\n\nAllocation % is a PERCENTAGE — it cannot be simply summed or averaged.\n\nIf a counterparty has 60% of a $100M facility and 35% of a $200M facility, their "average allocation" is NOT (60+35)/2 = 47.5%. It must be exposure-weighted:\n\n(60×100M + 35×200M) / (100M + 200M) = 13000M / 300M = 43.33%\n\nThe larger facility carries proportionally more weight. This is the same approach used for DSCR and LTV rollup — percentage/ratio metrics always need weighting.\n\nImportant: This metric only rolls up to the counterparty level. Desk, portfolio, and business segment levels are N/A because allocation % is a relationship attribute between facility and counterparty, not an organizational metric.',
    targetSelector: '[data-demo="foundational-rule"]',
    formulaKey: 'foundational-rule',
  },

  /* ── Step 9: Facility Level ──────────────────────────────────────── */
  {
    id: 'rollup-facility',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 1: Facility-Counterparty Pair',
    narration: (v) =>
      v === 'legal'
        ? 'At the facility level, Allocation % is a direct lookup — one value per (facility, counterparty) pair.\n\nLet\'s look at the participation structure across five facilities:'
        : 'At the facility level, Economic Allocation is computed per (facility, counterparty) pair by subtracting the CRM adjustment from the legal participation.\n\nLet\'s see how CRM changes the picture:',
    targetSelector: '[data-demo="rollup-facility"]',
    onEnter: { expandLevel: 'facility' },
    formulaKey: 'rollup-facility',
  },

  /* ── Step 10: Counterparty Level ─────────────────────────────────────── */
  {
    id: 'rollup-counterparty',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 2: Counterparty (Weighted Average)',
    narration: (v) =>
      v === 'legal'
        ? 'A counterparty may participate in multiple facilities with different percentages. The counterparty-level allocation is a weighted average by committed amount:\n\nApex Properties:\n(60%×$100M + 100%×$75M + 35%×$200M) / ($100M + $75M + $200M)\n= $20,500M / $375M = 54.67%\n\nMeridian Corp:\n(100%×$50M + 45%×$150M) / ($50M + $150M)\n= $11,750M / $200M = 58.75%\n\nThe weighted average tells risk managers: "On average, weighted by facility size, how much of their syndicated facilities does this counterparty hold?"'
        : 'The economic weighted average shows the CRM-adjusted picture:\n\nApex Properties:\n(45%×$100M + 80%×$75M + 35%×$200M) / ($100M + $75M + $200M)\n= $17,500M / $375M = 46.67%\n\nMeridian Corp:\n(85%×$50M + 45%×$150M) / ($50M + $150M)\n= $11,000M / $200M = 55.00%\n\nCompare to legal: Apex drops from 54.67% to 46.67% — CRM reduces their average economic exposure by ~8 percentage points. Meridian drops from 58.75% to 55.00% — less CRM activity.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'rollup-counterparty',
    insight:
      'This is the highest aggregation level for Allocation %. Unlike currency metrics (Interest Income) or coverage ratios (DSCR), allocation percentage is a facility-counterparty relationship attribute — it doesn\'t aggregate meaningfully to desk or portfolio level.',
  },

  /* ── Step 11: Higher Levels N/A ──────────────────────────────────────── */
  {
    id: 'higher-levels-na',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Levels 3-5: Not Applicable',
    narration:
      'Allocation % does NOT roll up beyond counterparty level. Here\'s why:\n\nDesk / Portfolio / Business Segment levels aggregate across counterparties. But allocation % is inherently a two-party relationship — it describes one counterparty\'s share in one facility.\n\n"What is the CRE Lending Desk\'s allocation percentage?" is a meaningless question. The desk doesn\'t "allocate" — individual counterparties do.\n\nThis is a key architectural distinction:\n\n• Currency metrics (Interest Income): roll up via SUM to all 5 levels\n• Ratio metrics (DSCR, LTV): roll up via weighted average to all 5 levels\n• Relationship metrics (Allocation %): only meaningful at facility and counterparty levels',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
  },

  /* ── Step 12: Dashboard ──────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'On the dashboard, Allocation % serves concentration risk analysis:\n\n• At facility level: "Who are the syndicate members and what are their shares?"\n• At counterparty level: "Across all facilities, what is this counterparty\'s average weighted participation?"\n\nThe legal vs. economic toggle lets risk managers see:\n— Legal view: contractual obligations and fee entitlements\n— Economic view: true risk exposure after CRM\n\nThis feeds directly into Large Exposure Framework limits, CCAR counterparty stress testing, and FR Y-14Q Schedule H.1 reporting.\n\nFull auditability: every allocation value traces back through the CRM engine, the participation table, all the way to the original loan agreement.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'Allocation % is a key input to the Collateral Market Value metric at counterparty level. When computing a counterparty\'s share of facility-level collateral, the platform multiplies collateral_value × allocation_pct.',
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
