/* ────────────────────────────────────────────────────────────────────────────
 * Interest Income Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, etc.).
 *
 * Interest Income has a single variant ("calculated"), so all fields are
 * plain strings (no variant functions needed).
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { GenericDemoStep } from './useDemoEngine';

export type IntIncomeVariantKey = 'calculated';

/* ────────────────────────────────────────────────────────────────────────── */

export const INT_INCOME_DEMO_STEPS: GenericDemoStep<IntIncomeVariantKey>[] = [
  /* ── Step 0: Welcome (auto-skipped — no variant picker) ──────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the Interest Income Lineage Demo',
    narration:
      'Interest Income answers a fundamental revenue question: "How much does the bank earn from its outstanding loans?"\n\nIt is calculated as the drawn (funded) balance on a loan multiplied by the all-in interest rate. In plain terms — if the bank has lent $120 million at a 6.25% rate, it earns about $7.5 million per year in interest.\n\nThis guided walkthrough will show you the complete journey of this metric — from how it\'s defined, to where the data comes from, how the math works, and how the result rolls up from a single loan all the way up to an entire division of the bank.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ────────────────────────────────────────── */
  {
    id: 'int-income-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'The Interest Income Formula',
    narration:
      'Interest Income uses a straightforward multiplication:\n\nDrawn Amount × All-In Rate ÷ 100\n\nDrawn Amount is how much money the borrower has actually borrowed (also called the "funded balance"). Not all loans are fully drawn — a $50M credit line might only have $30M used.\n\nAll-In Rate is the total annual interest rate the borrower pays. It combines a base rate (like SOFR) plus a spread (the bank\'s margin). For example, SOFR at 4.50% plus a spread of 1.75% gives an all-in rate of 6.25%.\n\nLet\'s walk through each piece with real numbers.',
    targetSelector: '[data-demo="step1-variant-calculated"]',
    insight:
      'Unlike ratio metrics (like DSCR or LTV), Interest Income is a currency amount. This means it rolls up by simple addition — no weighting or averaging is needed.',
  },

  /* ── Step 2: Drawn Amount (input 1) ──────────────────────────────────── */
  {
    id: 'drawn-amount',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 1: Drawn Amount',
    narration:
      'The first input is the Drawn Amount — the actual money that has been disbursed to the borrower.\n\nFor our example facility:\n\nDrawn Amount = $120,000,000\n\nThis comes from the facility_exposure_snapshot table, which records how much of each credit facility has been drawn (used) at a given point in time. Think of it as a monthly "reading" of how much the borrower currently owes.\n\nA revolver might fluctuate — drawn $30M one month, $45M the next. A term loan stays relatively stable.',
    targetSelector: '[data-demo="num-section-calculated"]',
    formulaKey: 'drawn-build',
  },

  /* ── Step 3: All-In Rate (input 2) ───────────────────────────────────── */
  {
    id: 'all-in-rate',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 2: All-In Interest Rate',
    narration:
      'The second input is the All-In Rate — the total annualized interest rate the borrower pays.\n\nFor our example facility:\n\nAll-In Rate = 6.25%\n\nThis comes from the facility_pricing_snapshot table, which captures the current pricing terms. The all-in rate is typically composed of:\n\n• Base Rate (e.g., SOFR): 4.50% — the benchmark market rate\n• Spread: 1.75% (175 basis points) — the bank\'s margin above the benchmark\n\nTotal: 4.50% + 1.75% = 6.25%',
    targetSelector: '[data-demo="den-section-calculated"]',
    formulaKey: 'rate-build',
  },

  /* ── Step 4: Result ──────────────────────────────────────────────────── */
  {
    id: 'int-income-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Result: $7,500,000',
    narration:
      '$120,000,000 × 6.25% ÷ 100 = $7,500,000\n\nThis means the bank earns approximately $7.5 million per year in interest revenue from this single facility.\n\nThis is the annualized gross interest income — the revenue before deducting the bank\'s own funding costs. It\'s a key input to NIM (Net Interest Margin) analysis, CCAR revenue projections, and FR Y-9C interest income reporting.',
    targetSelector: '[data-demo="result-calculated"]',
    insight:
      'This is a gross revenue figure — the "top line" from lending. The bank still needs to subtract its own cost of funds (what it pays depositors and bondholders) to get Net Interest Income.',
    formulaKey: 'multiply-result',
  },

  /* ── Step 5: L1 Reference Tables ─────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'Before the formula can run, the system needs to know the basics: Who is the borrower? What type of loan is this? Which business unit owns it?\n\nThis information lives in "L1 Reference Tables" — think of them as the master address book for the bank. They store relatively permanent facts like:\n\n• Loan (facility) details — type, amount, maturity date\n• Borrower identity — legal name, credit rating, industry\n• Organizational structure — which desk, portfolio, and business segment this loan belongs to\n\nThese tables rarely change and serve as the backbone that connects everything together.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'These reference tables are shared across every metric in the system — not just Interest Income. The same organizational hierarchy that groups Interest Income also groups DSCR, LTV, and every other risk metric.',
  },

  /* ── Step 6: L2 Snapshot Tables ──────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Numbers Come From: Snapshot Tables',
    narration:
      'The actual financial numbers that feed the Interest Income formula live in "L2 Snapshot Tables" — periodic readings of exposure and pricing data, like taking a photo at a point in time:\n\n• facility_exposure_snapshot — records drawn_amount (funded balance) for each facility at each reporting date\n• facility_pricing_snapshot — records all_in_rate_pct (base rate + spread) for each facility at each reporting date\n\nThese two tables are joined on facility_id and as_of_date to pair each loan\'s balance with its current interest rate.',
    targetSelector: '[data-demo="step3"]',
  },

  /* ── Step 7: Calculation Engine ──────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'The Math in Action',
    narration:
      'The calculation engine pulls the drawn amount from facility_exposure_snapshot and the all-in rate from facility_pricing_snapshot, joins them on facility_id + as_of_date, and multiplies:\n\nInterest Income = $120,000,000 × 6.25 / 100 = $7,500,000\n\nThis single number tells you how much annual revenue this particular loan generates for the bank.',
    targetSelector: '[data-demo="step4-variant-calculated"]',
  },

  /* ── Step 8: The Golden Rule: Additive SUM ───────────────────────────── */
  {
    id: 'foundational-rule',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'The Golden Rule: Additive Rollup',
    narration:
      'Before we walk through how Interest Income combines across multiple loans, one key property makes this metric simple:\n\nInterest Income is additive — just add it up.\n\nIf Facility A earns $7.5M and Facility B earns $4.9M, the combined interest income is simply $7.5M + $4.9M = $12.4M. No weighting, no averaging, no special formulas needed.\n\nThis is because Interest Income is a dollar amount (currency), not a ratio. Dollar amounts can always be summed. Ratios like DSCR or LTV cannot — they require weighted averages or pooled calculations.',
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
      'At the individual loan level, Interest Income is calculated directly from the formula. No combining or aggregation is needed — it\'s simply drawn amount times rate for that one loan.\n\nLet\'s look at five facilities belonging to two borrowers:',
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
      'A single borrower may have multiple loans. To see the total revenue from one borrower, simply add up the interest income from all their facilities:\n\nApex Properties: $7,500,000 + $4,887,500 = $12,387,500\nMeridian Corp: $3,195,000 + $1,650,000 + $900,000 = $5,745,000\n\nBecause Interest Income is a dollar amount, this straight sum is always correct — no weighting needed.',
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
      'A trading desk manages a group of facilities. Interest Income at the desk level is the sum of all facility interest incomes assigned to that desk:\n\nCRE Lending: $12,387,500 (2 facilities)\nCorp Lending: $5,745,000 (3 facilities)\n\nUnlike DSCR which must be segmented by product type at the desk level (because CRE and C&I use different formulas), Interest Income can be freely summed across any product mix — a dollar earned is a dollar earned.',
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
      'At the portfolio and business segment levels, the pattern continues — sum all interest income from child segments:\n\nPortfolio Total: $12,387,500 + $5,745,000 = $18,132,500\n\nThis total represents the annualized gross interest revenue across the entire portfolio. Executives use this to track:\n\n• Revenue trends — is lending income growing or shrinking?\n• Concentration — which desks or products generate the most interest?\n• Budget vs. actual — how does realized income compare to projections?',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight:
      'Because Interest Income is additive, the portfolio total is always exact — no approximation, no "weighted average" that can hide pockets of weakness. Every dollar traces back to a specific facility.',
  },

  /* ── Step 13: Dashboard ──────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\'ve walked through — formula definition, data sources, calculation, and rollup — comes together here on the dashboard.\n\nA user simply selects:\n• What level they want to see (individual loan, borrower, desk, portfolio, etc.)\n\nThe platform handles all the joins, calculations, and aggregations behind the scenes. Every Interest Income value on the dashboard can be traced backwards through the rollup hierarchy, through the calculation engine, through the snapshot tables, all the way back to the original reference data.\n\nFull auditability — no SQL, no spreadsheets, no guesswork.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'Interest Income is a key input to NIM (Net Interest Margin), PPNR (Pre-Provision Net Revenue), and RAROC. Each of these downstream metrics depends on accurate, traceable interest income at every level.',
  },
];

/** Resolve a step field that may be a function of the variant */
export function resolveIntIncomeField<T>(field: T | ((v: IntIncomeVariantKey) => T), variant: IntIncomeVariantKey): T {
  return typeof field === 'function' ? (field as (v: IntIncomeVariantKey) => T)(variant) : field;
}

/** Replace {v} placeholder in a selector with the variant key */
export function resolveIntIncomeSelector(selector: string, variant: IntIncomeVariantKey): string {
  return selector.replace(/\{v\}/g, variant);
}
