/* ────────────────────────────────────────────────────────────────────────────
 * Current Collateral Market Value Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, etc.).
 *
 * COLL_MV has a single variant ("gross"), so all fields are
 * plain strings (no variant functions needed).
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { GenericDemoStep } from './useDemoEngine';

export type CollMvVariantKey = 'gross';

/* ────────────────────────────────────────────────────────────────────────── */

export const COLL_MV_DEMO_STEPS: GenericDemoStep<CollMvVariantKey>[] = [
  /* ── Step 0: Welcome (auto-skipped — no variant picker) ──────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the Collateral Market Value Lineage Demo',
    narration:
      'Current Collateral Market Value answers a fundamental credit risk question: "How much is the collateral backing our loans actually worth today?"\n\nCollateral is any asset — real estate, equipment, inventory, securities — pledged by a borrower to secure a loan. If the borrower defaults, the bank can seize and sell the collateral to recover losses.\n\nThis guided walkthrough will show you the complete journey of this metric — from where collateral valuations are sourced, how they aggregate from individual assets up through the hierarchy, and how participation ownership affects counterparty-level reporting.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ────────────────────────────────────────── */
  {
    id: 'coll-mv-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'The Collateral MV Aggregation',
    narration:
      'Current Collateral Market Value uses a straightforward summation at the facility level:\n\nSUM(current_valuation_usd) for each collateral asset linked to the facility\n\nA single loan may be secured by multiple collateral assets — for example, a CRE loan might be backed by three separate real estate properties. The facility-level MV is simply the total of all those current market appraisals.\n\nAt the counterparty level, an additional step applies: each facility\'s collateral value is multiplied by the counterparty\'s participation_pct before summing, because a borrower may only own a portion of a syndicated facility.',
    targetSelector: '[data-demo="step1-variant-gross"]',
    insight:
      'Unlike ratio metrics (like LTV or DSCR), Collateral MV is a currency amount. At desk and higher levels, it rolls up by simple addition — no weighting or averaging needed. The counterparty level is special because it applies participation percentages.',
  },

  /* ── Step 2: Current Valuation (input 1) ────────────────────────────── */
  {
    id: 'current-valuation',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 1: Current Valuation (USD)',
    narration:
      'The primary input is current_valuation_usd — the most recent market appraisal of each collateral asset in US dollars.\n\nFor our example facility (CRE Multifamily):\n\n3 collateral assets: $55M + $40M + $25M = $120,000,000\n\nThis comes from the collateral_snapshot table, which records periodic valuations of each pledged asset. Valuations may be updated by appraisals (for real estate), market prices (for securities), or periodic assessments (for equipment and inventory).\n\nA facility can have any number of collateral assets — some CRE loans have one property, while leveraged finance deals might have dozens of pledged assets.',
    targetSelector: '[data-demo="num-section-gross"]',
    formulaKey: 'valuation-build',
  },

  /* ── Step 3: Participation Pct (input 2) ────────────────────────────── */
  {
    id: 'participation-pct',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 2: Participation Percentage',
    narration:
      'The second input — used only at the counterparty level — is participation_pct from the facility_counterparty_participation table.\n\nFor most facilities, one borrower owns 100% participation. But in syndicated lending, a facility may be shared across multiple counterparties:\n\nFacility E (CRE Retail): $50M total collateral\n• Apex Properties: 60% participation → $30M attributed\n• TechForge Mfg: 40% participation → $20M attributed\n\nParticipation_pct ensures collateral value is correctly attributed to each party\'s ownership stake — critical for FR Y-14Q reporting and counterparty-level exposure analysis.',
    targetSelector: '[data-demo="den-section-gross"]',
    formulaKey: 'participation-build',
  },

  /* ── Step 4: Result ──────────────────────────────────────────────────── */
  {
    id: 'coll-mv-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Result: $120,000,000',
    narration:
      'Facility A: SUM($55M, $40M, $25M) = $120,000,000\n\nThis means the bank holds $120 million in current market value of collateral securing this single CRE Multifamily facility.\n\nThis value is critical for multiple downstream calculations:\n• LTV ratio: $120M drawn ÷ $120M collateral = 100% LTV\n• LGD estimation: Higher collateral → lower Loss Given Default\n• RWA reduction: Basel III CRM framework allows capital relief for eligible collateral\n• Recovery analysis: Expected recovery amount if the borrower defaults',
    targetSelector: '[data-demo="result-gross"]',
    insight:
      'This is the gross market value — before any regulatory haircuts. The eligible (post-haircut) value used for Basel III CRM purposes would be lower, reflecting liquidation risk.',
    formulaKey: 'sum-result',
  },

  /* ── Step 5: L1 Reference Tables ─────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'Before the aggregation can run, the system needs to resolve key relationships: Which collateral assets belong to which facility? Who are the participating counterparties? What organizational unit manages this loan?\n\nThis information lives in "L1 Reference Tables" — the master data layer:\n\n• facility_master — links facility_id to counterparty_id and lob_segment_id\n• facility_counterparty_participation — stores participation_pct for each counterparty\'s stake in a facility\n• counterparty — borrower identity, legal name, risk rating\n• enterprise_business_taxonomy — organizational hierarchy (desk → portfolio → segment)',
    targetSelector: '[data-demo="step2"]',
    insight:
      'The facility_counterparty_participation table is the key differentiator for this metric. Most currency metrics just SUM at the counterparty level, but Collateral MV must apply participation percentages first — making the counterparty-level logic a "Calculation" rather than a simple "Aggregation."',
  },

  /* ── Step 6: L2 Snapshot Tables ──────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Valuations Come From: Snapshot Tables',
    narration:
      'The actual collateral valuations live in the "L2 Snapshot Table" — periodic readings of each collateral asset\'s value:\n\n• collateral_snapshot — records current_valuation_usd for each collateral asset at each reporting date. Key fields:\n  - collateral_snapshot_id (PK)\n  - facility_id (FK to facility_master)\n  - current_valuation_usd — today\'s market appraisal\n  - original_valuation_usd — value at origination\n  - haircut_pct — regulatory risk adjustment\n  - eligible_value_usd — post-haircut value\n\nEach facility may have MULTIPLE rows in this table (one per collateral asset). The facility-level MV is the SUM across all linked assets.',
    targetSelector: '[data-demo="step3"]',
  },

  /* ── Step 7: Calculation Engine ──────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'The Math in Action',
    narration:
      'The calculation engine pulls all collateral_snapshot rows for a given facility_id and sums their current_valuation_usd values:\n\nFacility A: SUM($55M, $40M, $25M) = $120,000,000\n\nThis is a pure aggregation — no multiplication or division. The derived facility-level total is then stored for use in higher-level rollups.\n\nFor counterparty attribution, the engine applies: Facility MV × participation_pct per counterparty.',
    targetSelector: '[data-demo="step4-variant-gross"]',
  },

  /* ── Step 8: Golden Rule: SUM with Participation ─────────────────────── */
  {
    id: 'foundational-rule',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'The Golden Rule: SUM with Participation Attribution',
    narration:
      'Before we walk through the rollup levels, two key properties govern how Collateral MV aggregates:\n\n1. At the FACILITY level and above (desk, portfolio, segment): pure additive SUM — just add the collateral values. This works because Collateral MV is a dollar amount, not a ratio.\n\n2. At the COUNTERPARTY level: participation-weighted SUM. Each facility\'s collateral MV is multiplied by the counterparty\'s participation_pct before summing. This prevents double-counting when multiple counterparties share a facility.\n\nThis dual behavior — simple SUM for organizational rollups, participation-weighted for counterparty rollups — reflects how GSIBs actually track collateral in their risk systems.',
    targetSelector: '[data-demo="foundational-rule"]',
    formulaKey: 'foundational-rule',
  },

  /* ── Step 9: Facility Level ──────────────────────────────────────────── */
  {
    id: 'rollup-facility',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 1: Individual Loan (Facility)',
    narration:
      'At the individual loan level, Collateral MV is aggregated directly from the collateral_snapshot table. No combining or weighting is needed — just SUM all collateral assets linked to this facility.\n\nLet\'s look at five facilities belonging to two borrowers:',
    targetSelector: '[data-demo="rollup-facility"]',
    onEnter: { expandLevel: 'facility' },
    formulaKey: 'rollup-facility',
  },

  /* ── Step 10: Counterparty Level ─────────────────────────────────────── */
  {
    id: 'rollup-counterparty',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 2: Borrower (Counterparty)',
    narration:
      'At the counterparty level, participation_pct comes into play. Each facility\'s collateral MV is multiplied by the counterparty\'s ownership share:\n\nApex Properties:\n• Facility A: 100% × $120M = $120M\n• Facility B: 100% × $65M = $65M\n• Facility E: 60% × $50M = $30M\n• Total: $215,000,000\n\nTechForge Mfg:\n• Facility C: 100% × $40M = $40M\n• Facility D: 100% × $25M = $25M\n• Facility E: 40% × $50M = $20M\n• Total: $85,000,000\n\nNotice how Facility E\'s $50M is split: $30M to Apex and $20M to TechForge. The grand total still equals $300M — no double-counting.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'rollup-counterparty',
  },

  /* ── Step 11: Desk Level ─────────────────────────────────────────────── */
  {
    id: 'rollup-desk',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 3: Trading Desk',
    narration:
      'A trading desk manages a group of facilities. Collateral MV at the desk level is the sum of all facility collateral values assigned to that desk (no participation weighting — that\'s only for the counterparty dimension):\n\nCRE Lending: $120M + $65M + $50M = $235,000,000 (3 facilities)\nC&I Middle Market: $40M + $25M = $65,000,000 (2 facilities)\n\nThe desk-level view tells risk managers how much collateral coverage exists within each business unit — essential for concentration risk monitoring and Basel III CRM reporting.',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
    formulaKey: 'rollup-desk',
  },

  /* ── Step 12: Portfolio / LoB Level ──────────────────────────────────── */
  {
    id: 'rollup-portfolio',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 4 & 5: Portfolio & Business Segment',
    narration:
      'At the portfolio and business segment levels, the pattern continues — sum all collateral MV from child segments:\n\nPortfolio Total: $235,000,000 + $65,000,000 = $300,000,000\n\nThis total represents the bank\'s aggregate collateral coverage. Executives use this to track:\n\n• Secured vs. unsecured mix — what fraction of the portfolio has collateral?\n• Collateral concentration — are we over-reliant on one asset type (e.g., CRE)?\n• Recovery capacity — in a stress scenario, what\'s the expected recovery pool?\n• Regulatory capital impact — Basel III CRM allows RWA reduction for eligible collateral',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight:
      'Because Collateral MV is additive at the organizational level, the portfolio total is always exact. However, counterparty-level totals use participation weighting, so the sum of counterparty values also equals the portfolio total — a built-in consistency check.',
  },

  /* ── Step 13: Dashboard ──────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\'ve walked through — collateral sourcing, participation attribution, aggregation, and rollup — comes together here on the dashboard.\n\nA user simply selects:\n• What level they want to see (individual loan, borrower, desk, portfolio, etc.)\n\nThe platform handles all the joins, calculations, and aggregations behind the scenes. Every Collateral MV value on the dashboard can be traced backwards through the rollup hierarchy, through the aggregation engine, through the snapshot tables, all the way back to individual collateral appraisals.\n\nFull auditability — from board-level collateral coverage down to a single property appraisal.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'Collateral MV feeds directly into LTV calculations, LGD models, Basel III CRM capital relief, and CCAR stress testing. Each of these downstream consumers depends on accurate, traceable collateral valuations at every level.',
  },
];

/** Resolve a step field that may be a function of the variant */
export function resolveCollMvField<T>(field: T | ((v: CollMvVariantKey) => T), variant: CollMvVariantKey): T {
  return typeof field === 'function' ? (field as (v: CollMvVariantKey) => T)(variant) : field;
}

/** Replace {v} placeholder in a selector with the variant key */
export function resolveCollMvSelector(selector: string, variant: CollMvVariantKey): string {
  return selector.replace(/\{v\}/g, variant);
}
