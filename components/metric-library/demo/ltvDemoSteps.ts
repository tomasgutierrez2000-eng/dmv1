/* ────────────────────────────────────────────────────────────────────────────
 * LTV Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, setting L2 filter, etc.).
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { GenericDemoStep } from './useDemoEngine';

export type LTVVariantKey = 'standard' | 'stressed';

/* ── helpers ── */

const V_LABEL: Record<LTVVariantKey, string> = {
  standard: 'Standard LTV',
  stressed: 'Stressed LTV',
};
const V_FORMULA: Record<LTVVariantKey, string> = {
  standard: 'Drawn Amount \u00f7 Collateral Value \u00d7 100',
  stressed: 'Drawn Amount \u00f7 Stressed Collateral Value \u00d7 100',
};
const V_RESULT: Record<LTVVariantKey, string> = { standard: '68.6%', stressed: '80.0%' };
const V_NUM: Record<LTVVariantKey, string> = { standard: '$120,000,000', stressed: '$120,000,000' };
const V_DEN: Record<LTVVariantKey, string> = { standard: '$175,000,000', stressed: '$150,000,000' };

/* ────────────────────────────────────────────────────────────────────────── */

export const LTV_DEMO_STEPS: GenericDemoStep<LTVVariantKey>[] = [
  /* ── Step 0: Welcome / Variant Picker ──────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the LTV Lineage Demo',
    narration:
      'LTV stands for Loan-to-Value ratio. In simple terms, it answers one question: "How much of a property\u2019s value is covered by the loan?"\n\nIf you borrow $68 to buy a $100 house, your LTV is 68%. A higher LTV means more risk for the lender — there\u2019s less of a safety cushion if property values drop.\n\nThis guided walkthrough will show you the complete journey of this metric — from how it\u2019s defined, to where the data comes from, how the math works, and how the result flows from a single loan all the way up to an entire division of the bank.\n\nSelect your variant to begin.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ──────────────────────────────────────────── */
  {
    id: 'ltv-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `The ${V_LABEL[v]} Formula`,
    narration: (v) =>
      v === 'standard'
        ? 'Standard LTV uses a straightforward formula:\n\nDrawn Amount \u00f7 Collateral Value \u00d7 100\n\nDrawn Amount is how much the borrower has actually borrowed against the facility — the outstanding loan balance.\n\nCollateral Value is the current appraised market value of the asset(s) pledged to secure the loan — typically real estate, but it could also be securities, equipment, or other assets.\n\nLet\u2019s walk through each piece of this formula with real numbers.'
        : 'Stressed LTV applies a "haircut" to the collateral value to simulate what could happen during a market downturn:\n\nDrawn Amount \u00f7 Stressed Collateral Value \u00d7 100\n\nThe Stressed Collateral Value reduces the current appraisal by a haircut percentage. This haircut reflects how much the collateral might lose in value if the bank had to sell it quickly during a crisis.\n\nFor example, a 14.3% haircut on a $175M property means the stressed value is only $150M.\n\nLet\u2019s walk through each piece of this formula with real numbers.',
    targetSelector: '[data-demo="step1-variant-{v}"]',
    insight:
      'The formula structure is identical for both variants — only the denominator changes. Standard uses current market value; Stressed uses a reduced value to simulate downside scenarios.',
  },

  /* ── Step 2: Numerator ─────────────────────────────────────────────────── */
  {
    id: 'numerator-exposure',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Numerator: Drawn Amount',
    narration: (v) =>
      `The top of the formula (the "numerator") is the Drawn Amount — the actual outstanding loan balance:\n\nDrawn Amount: ${V_NUM[v]}\n\nThis comes from a single field in facility_exposure_snapshot.drawn_amount. It represents how much the borrower has actually taken out of their credit facility.\n\nNote: The drawn amount is the same for both Standard and Stressed LTV. The variants only differ in how they value the collateral.`,
    targetSelector: '[data-demo="num-section-{v}"]',
    formulaKey: 'ltv-numerator',
  },

  /* ── Step 3: Denominator ───────────────────────────────────────────────── */
  {
    id: 'denominator-collateral',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `Denominator: ${v === 'standard' ? 'Collateral Value' : 'Stressed Collateral Value'}`,
    narration: (v) =>
      v === 'standard'
        ? 'The bottom of the formula (the "denominator") is the Collateral Value — the current market appraisal of the pledged asset(s):\n\nCollateral Value: $175,000,000\n\nThis is the sum of all current_valuation_usd values from collateral_snapshot for this facility. A single loan may be secured by multiple collateral assets (e.g., a building + a parking lot), so the platform sums their valuations.\n\nThis represents the bank\u2019s best estimate of what the collateral is worth today.'
        : 'The Stressed Collateral Value applies a haircut to the current appraisal:\n\nCurrent Valuation: $175,000,000\nHaircut: 14.3%\nStressed Value: $175,000,000 \u00d7 (1 \u2212 0.143) = $150,000,000\n\nThe haircut_pct field in collateral_snapshot represents how much value the bank expects to lose if it had to liquidate the collateral quickly during market stress.\n\nDifferent collateral types have different haircuts — real estate might be 10\u201320%, while equities could be 25\u201350%.',
    targetSelector: '[data-demo="den-section-{v}"]',
    formulaKey: 'ltv-denominator',
  },

  /* ── Step 4: Result ────────────────────────────────────────────────────── */
  {
    id: 'ltv-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `Result: ${V_RESULT[v]}`,
    narration: (v) =>
      v === 'standard'
        ? '$120,000,000 \u00f7 $175,000,000 \u00d7 100 = 68.6%\n\nThis means the loan covers 68.6% of the collateral\u2019s value. The remaining 31.4% is the bank\u2019s "equity cushion" — the buffer that protects the bank if the property loses value.\n\nMost banks consider an LTV below 65% as conservative, 65\u201380% as standard, and above 80% as high risk.'
        : '$120,000,000 \u00f7 $150,000,000 \u00d7 100 = 80.0%\n\nUnder stress, the LTV jumps from 68.6% to 80.0% because the collateral is worth less. The equity cushion shrinks from 31.4% to just 20%.\n\nThis is exactly why Stressed LTV matters — it reveals how vulnerable the bank is to a market downturn. A loan that looks safe under normal conditions (68.6%) may be uncomfortably close to underwater (>100%) in a stressed scenario.',
    targetSelector: '[data-demo="result-{v}"]',
    insight: (v) =>
      v === 'standard'
        ? 'An LTV of 68.6% means the property could lose about 31% of its value before the bank\u2019s loan exceeds what the collateral is worth. This is the "margin of safety" lenders focus on.'
        : 'Stressed LTV moved from 68.6% to 80.0% — a 12 percentage point jump. Regulatory stress tests (CCAR, DFAST) use similar haircuts to assess portfolio resilience.',
    formulaKey: 'ltv-division',
  },

  /* ── Step 5: L1 Reference Tables ───────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'Before the formula can run, the system needs to know the basics: Which loan is this? Who is the borrower? What collateral secures it? Which business unit owns the loan?\n\nThis information lives in "L1 Reference Tables" — the master address book for the bank:\n\n\u2022 facility_master — loan details: type, amount, maturity date\n\u2022 counterparty — borrower identity: legal name, credit rating, industry\n\u2022 collateral_asset_master — collateral identity: what type of asset, lien priority, regulatory eligibility\n\u2022 enterprise_business_taxonomy — organizational hierarchy: which desk, portfolio, and line of business owns this loan\n\nThese tables rarely change and serve as the backbone connecting everything together.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'The enterprise_business_taxonomy table is especially important for LTV — it defines the self-referencing hierarchy (desk \u2192 portfolio \u2192 LoB) that determines how LTV rolls up through the organization.',
  },

  /* ── Step 6: L2 Snapshot Tables ────────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Numbers Come From: Snapshot Tables',
    narration: (v) =>
      `The actual numbers that feed the LTV formula live in "L2 Snapshot Tables" — periodic readings of financial data, like taking a photo of the loan\u2019s status at a point in time:\n\n\u2022 facility_exposure_snapshot — the loan\u2019s drawn balance, total exposure, and organizational assignment\n\u2022 collateral_snapshot — current collateral valuations, haircut percentages, and eligible amounts\n\nThe fields highlighted on the page are the specific ones used by the ${V_LABEL[v]} formula. ${v === 'stressed' ? 'Notice that Stressed LTV also uses the haircut_pct field, which Standard LTV ignores.' : 'Standard LTV only needs the current_valuation_usd field from collateral_snapshot.'}`,
    targetSelector: '[data-demo="step3"]',
    onEnter: { l2Filter: 'standard' }, // overridden at runtime by resolveL2Filter
  },

  /* ── Step 7: Calculation Engine ────────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: (v) => `The Math in Action: ${V_LABEL[v]}`,
    narration: (v) =>
      `The calculation engine pulls the raw numbers from the snapshot tables, plugs them into the formula, and produces the LTV percentage.\n\nAt the individual loan level, this is straightforward division:\n\n${V_FORMULA[v]} = ${V_NUM[v]} \u00f7 ${V_DEN[v]} = ${V_RESULT[v]}\n\nA key detail: collateral values are aggregated per facility first (a loan may have multiple collateral assets), then divided into the drawn amount.`,
    targetSelector: '[data-demo="step4-variant-{v}"]',
  },

  /* ── Step 8: Unsecured Handling ────────────────────────────────────────── */
  {
    id: 'unsecured-handling',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'The Golden Rule: Unsecured Facilities',
    narration:
      'Not every loan has collateral. An unsecured facility (like a revolving credit line backed only by the borrower\u2019s promise to pay) has no collateral value — and therefore no meaningful LTV.\n\nThe critical rule:\n\nNEVER assign an LTV of 0% to an unsecured facility. Instead, assign NULL (no value).\n\nWhy? Because including unsecured facilities as "0% LTV" would artificially drag down the average, making the portfolio look far riskier than it actually is. A 0% LTV implies the loan is 100% underwater, which isn\u2019t true — the loan simply has a different risk profile (credit risk vs. collateral risk).\n\nThe platform uses NULLIF(collateral_value, 0) to prevent division by zero and produces NULL for all rollup levels.',
    targetSelector: '[data-demo="step4"]',
    insight:
      'This is the most common mistake in LTV implementations. Rating agencies like Moody\u2019s exclude unsecured exposure from LTV calculations entirely — they report "secured-only LTV" alongside "% unsecured."',
    formulaKey: 'unsecured-rule',
  },

  /* ── Step 9: Facility Level ────────────────────────────────────────────── */
  {
    id: 'rollup-facility',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 1: Individual Loan (Facility)',
    narration:
      'At the individual loan level, LTV is calculated directly from the formula. No combining or aggregation is needed — it\u2019s just drawn amount divided by collateral value for that one loan.\n\nLet\u2019s look at three facilities belonging to one borrower:\n\n\u2022 Facility A (CRE Multifamily): LTV = 68.6% — standard risk\n\u2022 Facility B (CRE Office): LTV = 60.7% — conservative\n\u2022 Facility C (Term Loan): LTV = NULL — unsecured, excluded from rollups',
    targetSelector: '[data-demo="rollup-facility"]',
    onEnter: { expandLevel: 'facility' },
    formulaKey: 'rollup-facility',
  },

  /* ── Step 10: Counterparty Level ───────────────────────────────────────── */
  {
    id: 'rollup-counterparty',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 2: Borrower (Counterparty)',
    narration:
      'A single borrower may have multiple loans. To see the borrower\u2019s overall LTV, we use an exposure-weighted average — but only across secured facilities:\n\n1. For each secured facility: multiply its LTV by its exposure\n2. Sum those weighted LTVs\n3. Divide by the total secured exposure\n\nThe unsecured Facility C ($45M) is excluded entirely from the calculation. Its exposure does not appear in either the numerator or denominator of the weighted average.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'rollup-counterparty',
    insight:
      'Notice the counterparty LTV (65.2%) is weighted toward the larger Facility A ($120M exposure at 68.6%) vs. the smaller Facility B ($85M at 60.7%). Size matters — a simple average would give 64.7%, but the exposure-weighted result correctly reflects where most of the money is.',
  },

  /* ── Step 11: Desk Level ───────────────────────────────────────────────── */
  {
    id: 'rollup-desk',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 3: Trading Desk',
    narration:
      'A trading desk manages a collection of loans. Desk-level LTV uses the same exposure-weighted formula, grouping all secured facilities assigned to that desk.\n\nThe desk assignment comes from enterprise_business_taxonomy — each facility\u2019s lob_segment_id in facility_master links to a leaf node (tree_level = 3) in the LoB hierarchy tree.\n\nLTV is primarily meaningful for desks that manage collateralized lending (CRE, asset-backed). For desks focused on unsecured corporate lending, the desk-level LTV may be NULL or cover only a small subset of their book.',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
    formulaKey: 'rollup-desk',
    insight:
      'The enterprise_business_taxonomy table\u2019s self-referencing hierarchy (managed_segment_id \u2192 parent_segment_id) is walked via three LEFT JOINs: desk (leaf) \u2192 portfolio (parent) \u2192 LoB (root).',
  },

  /* ── Step 12: Portfolio Level ───────────────────────────────────────────── */
  {
    id: 'rollup-portfolio',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 4: Portfolio',
    narration:
      'A portfolio spans multiple desks and property types. At this scale, a single weighted-average LTV can be misleading — so the platform also shows distribution buckets:\n\n\u2022 < 50%: Conservative (well-secured)\n\u2022 50\u201365%: Moderate\n\u2022 65\u201380%: Standard\n\u2022 80\u2013100%: High risk\n\u2022 > 100%: Underwater (loan exceeds collateral value)\n\nThese buckets reveal hidden pockets of risk that a single number might conceal.',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight:
      'A portfolio with an average LTV of 65% might look healthy, but 15% of its loans could be above 80% LTV. Distribution analysis catches what the average hides — this is critical for CCAR stress testing.',
  },

  /* ── Step 13: Dashboard ────────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\u2019ve walked through — formula definition, data sources, calculation, unsecured handling, and rollup — comes together here on the dashboard.\n\nA user simply selects:\n\u2022 Which LTV variant they want (Standard or Stressed)\n\u2022 What level they want to see (individual loan, borrower, desk, portfolio, or LoB)\n\nThe platform handles all the joins, calculations, and aggregations behind the scenes. Every number traces back to the raw data through the complete lineage chain we just walked through.\n\nStandard and Stressed LTV sit side by side, letting risk managers instantly see how resilient their portfolios are to collateral value declines.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'This is the power of end-to-end lineage: every LTV value on the dashboard can be traced backwards through the rollup hierarchy, through the calculation engine, through the snapshot tables, all the way back to the original collateral appraisals. Full auditability.',
  },
];

/** Resolve a step field that may be a function of the variant */
export function resolveField<T>(field: T | ((v: string) => T), variant: string): T {
  return typeof field === 'function' ? (field as (v: string) => T)(variant) : field;
}

/** Replace {v} placeholder in a selector with the lowercase variant key */
export function resolveSelector(selector: string, variant: LTVVariantKey): string {
  return selector.replace(/\{v\}/g, variant);
}
