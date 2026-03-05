/* ────────────────────────────────────────────────────────────────────────────
 * Risk Rating Migration Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, etc.).
 *
 * Risk Rating Migration has a single variant ("weighted"), so all fields
 * are plain strings (no variant functions needed).
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { GenericDemoStep } from './useDemoEngine';

export type RRMigVariantKey = 'weighted';

/* ────────────────────────────────────────────────────────────────────────── */

export const RR_MIG_DEMO_STEPS: GenericDemoStep<RRMigVariantKey>[] = [
  /* ── Step 0: Welcome ──────────────────────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the Risk Rating Migration Lineage Demo',
    narration:
      'Risk Rating Migration answers a critical credit quality question: "Is the bank\'s loan portfolio getting riskier or safer over time?"\n\nEvery borrower is assigned an internal risk rating (1 = safest, 5 = highest risk). When a rating changes — say from 2 to 3 — that\'s a "downgrade." From 3 to 2 is an "upgrade." Tracking these changes, weighted by how much money is at stake, gives management an exposure-weighted migration score.\n\nThis guided walkthrough shows the complete journey — from how ratings are sourced, to where the data lives, how the math works, and how the result rolls up from a single loan all the way to the entire bank.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ────────────────────────────────────────── */
  {
    id: 'rrmig-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'The Migration Score Formula',
    narration:
      'The Risk Rating Migration Score uses an exposure-weighted average:\n\nMigration Score = \u03A3(Notch_Change \u00D7 Gross_Exposure) / \u03A3(Gross_Exposure)\n\nwhere Notch_Change = Current_Rating \u2212 Prior_Rating\n\nA positive score means the portfolio is deteriorating (more downgrades). A negative score means improvement (more upgrades). Zero means stability.\n\nCritically, a $500M loan downgraded one notch matters far more than a $1M loan downgraded three notches. Exposure weighting ensures the score reflects materiality — the same principle used in CCAR stress testing and CECL provisioning.',
    targetSelector: '[data-demo="step1-variant-weighted"]',
    insight:
      'Unlike additive metrics like Interest Income, migration scores are ratios and MUST be weighted by exposure. Simple averaging would let a tiny loan\'s migration dominate the score.',
  },

  /* ── Step 2: Current Rating (input 1) ──────────────────────────────── */
  {
    id: 'current-rating',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 1: Current Internal Rating',
    narration:
      'The first input is the Current Internal Rating — the bank\'s own assessment of each borrower\'s creditworthiness as of the reporting date.\n\nFor our example counterparty:\n\nCurrent Rating = 3 (Moderate Risk)\n\nThis comes from the counterparty_rating_observation table, which stores periodic "snapshots" of every borrower\'s internal risk rating. Think of it as a credit report card that gets updated whenever a credit officer reviews the borrower.\n\nThe internal scale runs 1 through 5:\n  1 = Minimal Risk (PD < 0.05%)\n  2 = Low Risk\n  3 = Moderate Risk\n  4 = Elevated Risk\n  5 = High Risk / Default (PD > 10%)',
    targetSelector: '[data-demo="num-section-weighted"]',
    formulaKey: 'current-rating-build',
  },

  /* ── Step 3: Prior Rating (input 2) ─────────────────────────────────── */
  {
    id: 'prior-rating',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 2: Prior Internal Rating',
    narration:
      'The second input is the Prior Internal Rating — what the borrower\'s rating was BEFORE the most recent review.\n\nFor our example counterparty:\n\nPrior Rating = 2 (Low Risk)\n\nThis also comes from counterparty_rating_observation, stored in the prior_rating_value field. The combination of current and prior tells us the direction and magnitude of the change.\n\nNotch Change = 3 \u2212 2 = +1 (one-notch downgrade)\n\nThis means the borrower\'s credit quality deteriorated — they moved from "Low Risk" to "Moderate Risk." This might happen due to declining revenue, increased leverage, or adverse industry conditions.',
    targetSelector: '[data-demo="den-section-weighted"]',
    formulaKey: 'prior-rating-build',
  },

  /* ── Step 4: Result ──────────────────────────────────────────────────── */
  {
    id: 'rrmig-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Result: +1 Notch (Downgrade)',
    narration:
      'Current Rating (3) \u2212 Prior Rating (2) = +1 Notch Change\n\nThis single facility experienced a one-notch downgrade. But to understand what this means for the PORTFOLIO, we need to weight it by the facility\'s gross exposure ($20M).\n\nWeighted contribution = +1 \u00D7 $20M = +$20M\n\nThis weighted contribution will be combined with all other facilities\' weighted contributions and divided by total exposure to produce the portfolio-level migration score.\n\nRegulators (OCC, Fed) require banks to track rating migrations for CCAR/DFAST stress testing, CECL expected credit loss calculations, and Basel III risk-weighted asset determination.',
    targetSelector: '[data-demo="result-weighted"]',
    insight:
      'A one-notch downgrade from 2\u21923 is qualitatively different from 4\u21925 — the latter crosses into "Substandard" regulatory territory and triggers enhanced monitoring, higher reserves, and potential examiner scrutiny.',
    formulaKey: 'notch-result',
  },

  /* ── Step 5: L1 Reference Tables ─────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'Before the formula can run, the system needs to know: Which borrower owns this loan? Which desk manages it? What organizational unit does it belong to?\n\nThis information lives in "L1 Reference Tables" — the bank\'s master data:\n\n\u2022 facility_master — links each loan to its borrower (counterparty_id) and business unit (lob_segment_id)\n\u2022 counterparty — borrower identity, legal name, industry\n\u2022 enterprise_business_taxonomy — the organizational tree: desk \u2192 portfolio \u2192 business segment\n\nThe critical join here is facility_master \u2192 counterparty \u2192 counterparty_rating_observation, which connects a loan\'s exposure to its borrower\'s rating.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'In G-SIB banks, ratings live at the COUNTERPARTY level, not the facility level. All facilities for one borrower share the same internal rating — if Acme Industries is downgraded, all of Acme\'s loans reflect that change.',
  },

  /* ── Step 6: L2 Snapshot Tables ──────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Numbers Come From: Snapshot Tables',
    narration:
      'The actual data feeding the Migration Score formula lives in "L2 Snapshot Tables" — periodic readings captured at each reporting date:\n\n\u2022 counterparty_rating_observation — stores rating_value (current) and prior_rating_value (previous) for each borrower, along with rating_type (INTERNAL vs. EXTERNAL) and rating_date\n\u2022 facility_exposure_snapshot — records gross_exposure_usd (total credit exposure) for each facility\n\nThe join path: counterparty_rating_observation \u2192 counterparty \u2192 facility_master \u2192 facility_exposure_snapshot pairs each rating change with the exposure it affects.',
    targetSelector: '[data-demo="step3"]',
  },

  /* ── Step 7: Calculation Engine ──────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'The Math in Action',
    narration:
      'The calculation engine pulls the current and prior ratings from counterparty_rating_observation (filtered to rating_type = \'INTERNAL\'), computes the notch change, then weights it by gross_exposure_usd from facility_exposure_snapshot:\n\nNotch Change = 3 \u2212 2 = +1\nWeighted = +1 \u00D7 $20,000,000 = +$20,000,000\n\nThis weighted notch-change is the building block. At higher rollup levels, we sum all weighted changes and divide by total exposure to get the migration score.',
    targetSelector: '[data-demo="step4-variant-weighted"]',
  },

  /* ── Step 8: The Golden Rule: Weighted Average ─────────────────────── */
  {
    id: 'foundational-rule',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'The Golden Rule: Exposure-Weighted Average',
    narration:
      'Before we walk through the rollup, one critical rule governs how migration scores combine:\n\nNEVER simple-average pre-computed migration scores.\n\nIf Desk A has a score of +0.44 (2 facilities, $45M) and Desk B has \u22120.64 (3 facilities, $55M), you CANNOT average them to get \u22120.10. The correct answer is:\n\n(+0.44 \u00D7 $45M + (\u22120.64) \u00D7 $55M) / ($45M + $55M) = \u22120.15\n\nThis is the same principle as LTV\'s weighted average and DSCR\'s pooled division: ratio metrics must be re-derived from components, weighted by exposure, at every aggregation level.',
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
      'At the facility level, the migration score is simply the counterparty\'s notch change applied to each facility\'s exposure. Since ratings are assigned at the counterparty level, all facilities for the same borrower share the same notch change.\n\nLet\'s look at five facilities belonging to two borrowers:',
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
      'At the counterparty level, we weight each facility\'s notch change by its exposure:\n\nAcme Industries:\n  (+1 \u00D7 $20M + (\u22121) \u00D7 $15M) / ($20M + $15M) = +$5M / $35M = +0.14\n  Slight net deterioration — the larger CRE loan\'s downgrade outweighs the smaller revolver\'s upgrade.\n\nGlobalCorp:\n  (0 \u00D7 $25M + (+1) \u00D7 $10M + (\u22121) \u00D7 $30M) / ($25M + $10M + $30M) = \u2212$20M / $65M = \u22120.31\n  Net improvement — the large revolver\'s upgrade dominates.',
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
      'At the desk level, we re-weight across all facilities assigned to each desk:\n\nCRE Lending (Fac A + C):\n  (+1 \u00D7 $20M + 0 \u00D7 $25M) / ($20M + $25M) = +$20M / $45M = +0.44\n  The CRE desk shows material deterioration — its only rating change was a downgrade.\n\nCorp Lending (Fac B + D + E):\n  ((\u22121) \u00D7 $15M + (+1) \u00D7 $10M + (\u22121) \u00D7 $30M) / ($15M + $10M + $30M) = \u2212$35M / $55M = \u22120.64\n  The Corp desk shows strong improvement — upgrades outweigh the single downgrade by 3.5\u00D7 in exposure.',
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
      'At the portfolio and business segment levels, the same weighted-average principle continues:\n\nPortfolio Total:\n  (+0.44 \u00D7 $45M + (\u22120.64) \u00D7 $55M) / ($45M + $55M) = \u2212$15M / $100M = \u22120.15\n\nNet improvement across the portfolio. The Corp Lending desk\'s strong upgrade trend ($55M weighted) outweighs the CRE desk\'s deterioration ($45M weighted).\n\nExecutives use this to track:\n\u2022 Credit quality trends — is the portfolio migrating toward or away from risk?\n\u2022 Concentration — which desks are driving migration?\n\u2022 CCAR implications — migration feeds directly into stress scenario projections',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight:
      'A portfolio score of \u22120.15 means that, on a weighted-average basis, the portfolio improved by about 0.15 notches. This would be a positive signal for credit quality, but management would still scrutinize the CRE desk\'s +0.44 deterioration.',
  },

  /* ── Step 13: Dashboard ──────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\'ve walked through — formula definition, data sources, calculation, and rollup — comes together on the dashboard.\n\nA user simply selects:\n\u2022 What level they want to see (individual loan, borrower, desk, portfolio)\n\nThe platform displays the migration score color-coded:\n\u2022 Green (negative) — net improvement\n\u2022 Red (positive) — net deterioration\n\u2022 Gray (near zero) — stable\n\nPlus distribution buckets at portfolio level: % of exposure upgraded, % stable, % downgraded 1 notch, % downgraded 2+ notches.\n\nEvery value traces back through the rollup hierarchy, through the calculation engine, through the snapshot tables, to the original rating observation. Full G-SIB audit trail.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'Rating migration is a leading indicator — it moves before losses materialize. A deteriorating migration score signals future increases in provisions, capital requirements, and potential exam findings.',
  },
];

/** Resolve a step field that may be a function of the variant */
export function resolveRRMigField<T>(field: T | ((v: RRMigVariantKey) => T), variant: RRMigVariantKey): T {
  return typeof field === 'function' ? (field as (v: RRMigVariantKey) => T)(variant) : field;
}

/** Replace {v} placeholder in a selector with the variant key */
export function resolveRRMigSelector(selector: string, variant: RRMigVariantKey): string {
  return selector.replace(/\{v\}/g, variant);
}
