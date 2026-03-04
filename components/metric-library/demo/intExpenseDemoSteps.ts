/* ────────────────────────────────────────────────────────────────────────────
 * Interest Expense Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, etc.).
 *
 * Interest Expense has a single variant ("calculated"), so all fields are
 * plain strings (no variant functions needed).
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { GenericDemoStep } from './useDemoEngine';

export type IntExpenseVariantKey = 'calculated';

/* ────────────────────────────────────────────────────────────────────────── */

export const INT_EXPENSE_DEMO_STEPS: GenericDemoStep<IntExpenseVariantKey>[] = [
  /* ── Step 0: Welcome (auto-skipped — no variant picker) ──────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the Interest Expense Lineage Demo',
    narration:
      'Interest Expense answers a fundamental cost question: "How much does the bank pay to fund its loans?"\n\nIt is calculated as the drawn (funded) balance multiplied by the cost-of-funds rate — the rate the bank\'s Treasury charges each desk via Funds Transfer Pricing (FTP). In plain terms — if the bank has funded $95 million at a 4.50% FTP rate, it costs about $4.3 million per year to carry that loan.\n\nThis guided walkthrough will show you the complete journey of this metric — from how it\'s defined, to where the data comes from, how the math works, and how the result rolls up from a single loan all the way up to an entire division of the bank.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ────────────────────────────────────────── */
  {
    id: 'int-expense-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'The Interest Expense Formula',
    narration:
      'Interest Expense uses a straightforward multiplication:\n\nDrawn Amount × Cost of Funds Rate ÷ 100\n\nDrawn Amount is how much money the borrower has actually borrowed (the "funded balance"). This is the same field used in Interest Income — it represents the capital the bank has deployed.\n\nCost of Funds Rate is the internal funding charge set by Treasury through Funds Transfer Pricing (FTP). It represents what it costs the bank to source the money it lends. For example, a 4.50% FTP rate means the bank pays 4.50% annually to fund that loan.\n\nLet\'s walk through each piece with real numbers.',
    targetSelector: '[data-demo="step1-variant-calculated"]',
    insight:
      'Interest Expense is the "cost side" sibling of Interest Income. Together they determine Net Interest Margin (NIM) — the bank\'s core lending profitability.',
  },

  /* ── Step 2: Drawn Amount (input 1) ──────────────────────────────────── */
  {
    id: 'drawn-amount',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 1: Drawn Amount',
    narration:
      'The first input is the Drawn Amount — the actual money that has been disbursed to the borrower.\n\nFor our example facility:\n\nDrawn Amount = $95,000,000\n\nThis comes from the facility_exposure_snapshot table, which records how much of each credit facility has been drawn (used) at a given point in time. Think of it as a monthly "reading" of how much the borrower currently owes.\n\nThis is the same drawn_amount field used for Interest Income — the bank earns interest on this balance AND pays funding costs on it.',
    targetSelector: '[data-demo="num-section-calculated"]',
    formulaKey: 'drawn-build',
  },

  /* ── Step 3: Cost of Funds Rate (input 2) ──────────────────────────── */
  {
    id: 'cost-of-funds-rate',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 2: Cost of Funds Rate',
    narration:
      'The second input is the Cost of Funds Rate — the annualized FTP charge assigned by Treasury.\n\nFor our example facility:\n\nCost of Funds Rate = 4.50%\n\nThis comes from the facility_pricing_snapshot table, which captures the current pricing terms. The cost-of-funds rate is set by the bank\'s Treasury unit through Funds Transfer Pricing (FTP). It\'s composed of:\n\n\u2022 Matched-maturity funding curve rate — what it costs to borrow for the same tenor as the loan\n\u2022 Liquidity premium — additional cost for holding illiquid assets\n\nThe desk "earns" the all-in rate and "pays" the FTP rate. The difference is their margin.',
    targetSelector: '[data-demo="den-section-calculated"]',
    formulaKey: 'rate-build',
  },

  /* ── Step 4: Result ──────────────────────────────────────────────────── */
  {
    id: 'int-expense-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Result: $4,275,000',
    narration:
      '$95,000,000 × 4.50% ÷ 100 = $4,275,000\n\nThis means the bank pays approximately $4.3 million per year in funding costs to carry this single loan.\n\nThis is the annualized gross interest expense — the cost of sourcing the capital. It\'s a key input to NIM (Net Interest Margin) analysis, CCAR stress testing (where funding costs may spike under adverse scenarios), and FR Y-9C Schedule HI interest expense reporting.',
    targetSelector: '[data-demo="result-calculated"]',
    insight:
      'This is a cost figure — the "bottom line" deduction from lending revenue. Subtracting Interest Expense from Interest Income gives Net Interest Income, the bank\'s core profit from lending.',
    formulaKey: 'multiply-result',
  },

  /* ── Step 5: L1 Reference Tables ─────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'Before the formula can run, the system needs to know the basics: Who is the borrower? What type of loan is this? Which business unit owns it?\n\nThis information lives in "L1 Reference Tables" — think of them as the master address book for the bank. They store relatively permanent facts like:\n\n\u2022 Loan (facility) details — type, amount, maturity date\n\u2022 Borrower identity — legal name, credit rating, industry\n\u2022 Organizational structure — which desk, portfolio, and business segment this loan belongs to\n\nThese tables rarely change and serve as the backbone that connects everything together.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'These reference tables are shared across every metric in the system — not just Interest Expense. The same organizational hierarchy that groups Interest Expense also groups Interest Income, DSCR, LTV, and every other risk metric.',
  },

  /* ── Step 6: L2 Snapshot Tables ──────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Numbers Come From: Snapshot Tables',
    narration:
      'The actual financial numbers that feed the Interest Expense formula live in "L2 Snapshot Tables" — periodic readings of exposure and pricing data, like taking a photo at a point in time:\n\n\u2022 facility_exposure_snapshot — records drawn_amount (funded balance) for each facility at each reporting date\n\u2022 facility_pricing_snapshot — records cost_of_funds_pct (FTP charge rate) for each facility at each reporting date\n\nThese two tables are joined on facility_id and as_of_date to pair each loan\'s balance with its current funding cost.',
    targetSelector: '[data-demo="step3"]',
  },

  /* ── Step 7: Calculation Engine ──────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'The Math in Action',
    narration:
      'The calculation engine pulls the drawn amount from facility_exposure_snapshot and the cost-of-funds rate from facility_pricing_snapshot, joins them on facility_id + as_of_date, and multiplies:\n\nInterest Expense = $95,000,000 × 4.50 / 100 = $4,275,000\n\nThis single number tells you how much annual funding cost this particular loan imposes on the bank.',
    targetSelector: '[data-demo="step4-variant-calculated"]',
  },

  /* ── Step 8: The Golden Rule: Additive SUM ───────────────────────────── */
  {
    id: 'foundational-rule',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'The Golden Rule: Additive Rollup',
    narration:
      'Before we walk through how Interest Expense combines across multiple loans, one key property makes this metric simple:\n\nInterest Expense is additive — just add it up.\n\nIf Facility A costs $4.3M and Facility B costs $1.7M, the combined interest expense is simply $4.3M + $1.7M = $5.9M. No weighting, no averaging, no special formulas needed.\n\nThis is because Interest Expense is a dollar amount (currency), not a ratio. Dollar amounts can always be summed. Ratios like DSCR or LTV cannot — they require weighted averages or pooled calculations.',
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
      'At the individual loan level, Interest Expense is calculated directly from the formula. No combining or aggregation is needed — it\'s simply drawn amount times the FTP rate for that one loan.\n\nLet\'s look at five facilities belonging to two borrowers:',
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
      'A single borrower may have multiple loans. To see the total funding cost from one borrower, simply add up the interest expense from all their facilities:\n\nApex Manufacturing: $4,275,000 + $1,660,000 + $1,560,000 = $7,495,000\nMeridian Healthcare: $5,775,000 + $3,087,500 = $8,862,500\n\nBecause Interest Expense is a dollar amount, this straight sum is always correct — no weighting needed.',
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
      'A trading desk manages a group of facilities. Interest Expense at the desk level is the sum of all facility funding costs assigned to that desk:\n\nIndustrials: $7,495,000 (3 facilities)\nHealthcare: $8,862,500 (2 facilities)\n\nDesks with higher Interest Expense relative to their Interest Income have thinner margins. This is how Treasury performance and FTP pricing effectiveness get evaluated at the desk level.',
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
      'At the portfolio and business segment levels, the pattern continues — sum all interest expense from child segments:\n\nPortfolio Total: $7,495,000 + $8,862,500 = $16,357,500\n\nThis total represents the annualized gross funding cost across the entire portfolio. Executives use this to track:\n\n\u2022 Funding cost trends — are FTP rates rising or falling?\n\u2022 NIM pressure — how does expense growth compare to revenue growth?\n\u2022 Stress scenarios — CCAR projections model how funding costs spike under adverse conditions',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight:
      'Because Interest Expense is additive, the portfolio total is always exact — no approximation, no "weighted average" that can hide pockets of inefficiency. Every dollar traces back to a specific facility.',
  },

  /* ── Step 13: Dashboard ──────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\'ve walked through — formula definition, data sources, calculation, and rollup — comes together here on the dashboard.\n\nA user simply selects:\n\u2022 What level they want to see (individual loan, borrower, desk, portfolio, etc.)\n\nThe platform handles all the joins, calculations, and aggregations behind the scenes. Every Interest Expense value on the dashboard can be traced backwards through the rollup hierarchy, through the calculation engine, through the snapshot tables, all the way back to the original reference data.\n\nFull auditability — no SQL, no spreadsheets, no guesswork.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'Interest Expense is a key input to NIM (Net Interest Margin), PPNR (Pre-Provision Net Revenue), and FTP performance attribution. Each of these downstream metrics depends on accurate, traceable interest expense at every level.',
  },
];

/** Resolve a step field that may be a function of the variant */
export function resolveIntExpenseField<T>(field: T | ((v: IntExpenseVariantKey) => T), variant: IntExpenseVariantKey): T {
  return typeof field === 'function' ? (field as (v: IntExpenseVariantKey) => T)(variant) : field;
}

/** Replace {v} placeholder in a selector with the variant key */
export function resolveIntExpenseSelector(selector: string, variant: IntExpenseVariantKey): string {
  return selector.replace(/\{v\}/g, variant);
}
