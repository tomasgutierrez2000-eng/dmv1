/* ────────────────────────────────────────────────────────────────────────────
 * DSCR Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, setting L2 filter, etc.).
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

export type VariantKey = 'CRE' | 'CI';

export interface DemoStep {
  id: string;
  phase: number;
  phaseLabel: string;
  title: string | ((v: VariantKey) => string);
  narration: string | ((v: VariantKey) => string);
  /** CSS selector — {v} is replaced with lowercase variant key */
  targetSelector: string;
  /** Optional sub-element selector for ring highlight */
  highlightSelector?: string;
  insight?: string | ((v: VariantKey) => string);
  /** Which formula animation to show (see DemoFormulaAnimation) */
  formulaKey?: string;
  /** Side-effects when entering this step */
  onEnter?: {
    expandLevel?: string | null;
    l2Filter?: 'both' | 'CRE' | 'CI';
  };
}

/* ── helpers ── */

const V_LABEL: Record<VariantKey, string> = { CRE: 'CRE DSCR (NOI)', CI: 'C&I DSCR (EBITDA)' };
const V_NUM: Record<VariantKey, string> = { CRE: 'NOI', CI: 'EBITDA' };
const V_DEN: Record<VariantKey, string> = { CRE: 'Senior Debt Service', CI: 'Global Debt Service' };
const V_FORMULA: Record<VariantKey, string> = { CRE: 'NOI \u00f7 Senior Debt Service', CI: 'EBITDA \u00f7 Global Debt Service' };
const V_RESULT: Record<VariantKey, string> = { CRE: '1.32x', CI: '4.09x' };
const V_NUM_TOTAL: Record<VariantKey, string> = { CRE: '$1,585,000', CI: '$5,640,000' };
const V_DEN_TOTAL: Record<VariantKey, string> = { CRE: '$1,200,000', CI: '$1,380,000' };

/* ────────────────────────────────────────────────────────────────────────── */

export const DEMO_STEPS: DemoStep[] = [
  /* ── Step 0: Welcome / Variant Picker ──────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the DSCR Lineage Demo',
    narration:
      'DSCR stands for Debt Service Coverage Ratio. In simple terms, it answers one question: "Can this borrower afford their loan payments?"\n\nIt compares how much money the borrower earns to how much they owe in loan payments each period. A DSCR of 1.0x means the borrower earns exactly enough to cover their debt. Above 1.0x means they have a cushion; below 1.0x means they\u2019re falling short.\n\nThis guided walkthrough will show you the complete journey of this metric \u2014 from how it\u2019s defined, to where the data comes from, how the math works, and how the result flows from a single loan all the way up to an entire division of the bank.\n\nSelect your variant to begin.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ──────────────────────────────────────────── */
  {
    id: 'dscr-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `The ${V_LABEL[v]} Formula`,
    narration: (v) =>
      v === 'CRE'
        ? 'For Commercial Real Estate (CRE) loans, DSCR uses a simple formula:\n\nNOI \u00f7 Senior Debt Service\n\nNOI (Net Operating Income) is the money a property earns after paying its operating costs \u2014 think of it as the "profit from running the building" before making any loan payments.\n\nSenior Debt Service is the total loan payments (interest + principal) the borrower owes on their primary/senior loan.\n\nLet\u2019s walk through each piece of this formula with real numbers.'
        : 'For Corporate / C&I (Commercial & Industrial) loans, DSCR uses this formula:\n\nEBITDA \u00f7 Global Debt Service\n\nEBITDA (Earnings Before Interest, Taxes, Depreciation & Amortization) measures a company\u2019s operating earnings \u2014 how much cash the business generates from its core operations.\n\nGlobal Debt Service is the total of ALL loan payments the borrower owes across every lender, not just the senior loan.\n\nLet\u2019s walk through each piece of this formula with real numbers.',
    targetSelector: '[data-demo="step1-variant-{v}"]',
    insight:
      'The formula structure is identical for every product type \u2014 only the specific income and debt components change. CRE uses property income; C&I uses company earnings.',
  },

  /* ── Step 2: Numerator components ──────────────────────────────────────── */
  {
    id: 'numerator-components',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `Numerator: ${V_NUM[v]} Components`,
    narration: (v) =>
      v === 'CRE'
        ? 'The top of the formula (the "numerator") is Net Operating Income. It\u2019s built by adding up all the money the property brings in, then subtracting its costs:\n\n+ Gross Potential Rent: $2,400,000 \u2014 total rent if every unit were occupied\n+ Other Income: $85,000 \u2014 parking fees, laundry, late fees, etc.\n\u2212 Vacancy & Credit Loss: $120,000 \u2014 estimated lost rent from empty units\n\u2212 Operating Expenses: $780,000 \u2014 maintenance, insurance, property tax, management fees\n\nWatch as each piece appears in the animation below.'
        : 'The top of the formula (the "numerator") is EBITDA. It starts with the company\u2019s bottom-line profit, then adds back non-cash charges to show true operating cash flow:\n\n+ Net Income: $3,200,000 \u2014 the company\u2019s profit after all expenses\n+ Interest Expense: $890,000 \u2014 added back because we want earnings BEFORE debt costs\n+ Tax Provision: $1,100,000 \u2014 added back to normalize across tax situations\n+ Depreciation & Amortization: $450,000 \u2014 added back because these are accounting entries, not actual cash spent\n\nWatch as each piece appears in the animation below.',
    targetSelector: '[data-demo="num-section-{v}"]',
    formulaKey: 'numerator-build',
  },

  /* ── Step 3: Numerator total ───────────────────────────────────────────── */
  {
    id: 'numerator-total',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `Numerator Total: ${V_NUM[v]}`,
    narration: (v) =>
      v === 'CRE'
        ? 'Adding it all up:\n\n$2,400,000 + $85,000 \u2212 $120,000 \u2212 $780,000 = $1,585,000\n\nThis is the Net Operating Income \u2014 the cash this property generates after paying all its operating costs, but before making any loan payments. This is the money available to service debt.'
        : 'Adding it all up:\n\n$3,200,000 + $890,000 + $1,100,000 + $450,000 = $5,640,000\n\nThis is EBITDA \u2014 the cash the company generates from its core business operations. By adding back interest, taxes, and depreciation, we get a cleaner picture of how much cash is truly available to pay lenders.',
    targetSelector: '[data-demo="num-total-{v}"]',
    formulaKey: 'numerator-total',
  },

  /* ── Step 4: Denominator components ────────────────────────────────────── */
  {
    id: 'denominator-components',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `Denominator: ${V_DEN[v]}`,
    narration: (v) =>
      v === 'CRE'
        ? 'The bottom of the formula (the "denominator") is Senior Debt Service \u2014 the actual loan payments the property owner must make:\n\n+ Senior Interest: $720,000 \u2014 the cost of borrowing the money\n+ Senior Principal: $480,000 \u2014 paying back the loan balance\n\n"Senior" means this is the primary loan that gets paid first. If there are additional (junior/mezzanine) loans, they are not included here.'
        : 'The bottom of the formula (the "denominator") is Global Debt Service \u2014 ALL loan payments the company owes across every lender:\n\n+ Senior Interest: $720,000 \u2014 the cost of the primary loan\n+ Senior Principal: $480,000 \u2014 repaying the primary loan balance\n+ Mezzanine / Sub Debt P&I: $180,000 \u2014 payments on additional, lower-priority loans\n\n"Global" means we count every loan, not just the senior one. This gives a more conservative view of the borrower\u2019s total burden.',
    targetSelector: '[data-demo="den-section-{v}"]',
    formulaKey: 'denominator-build',
  },

  /* ── Step 5: Denominator total ─────────────────────────────────────────── */
  {
    id: 'denominator-total',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `Denominator Total: ${V_DEN[v]}`,
    narration: (v) =>
      v === 'CRE'
        ? '$720,000 + $480,000 = $1,200,000\n\nThis is the total the borrower must pay their lender each year. Think of it as the "bill" that must be covered by the property\u2019s income.'
        : '$720,000 + $480,000 + $180,000 = $1,380,000\n\nThis is the total the company owes to ALL its lenders each year. Every dollar of EBITDA needs to cover this combined bill.',
    targetSelector: '[data-demo="den-total-{v}"]',
    formulaKey: 'denominator-total',
  },

  /* ── Step 6: Final DSCR ────────────────────────────────────────────────── */
  {
    id: 'dscr-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v) => `Result: ${V_RESULT[v]}`,
    narration: (v) =>
      v === 'CRE'
        ? '$1,585,000 \u00f7 $1,200,000 = 1.32x\n\nThis means for every $1.00 the borrower owes in loan payments, the property earns $1.32. There\u2019s a 32-cent cushion on every dollar.\n\nA DSCR above 1.25x is generally considered "adequate" for CRE loans. This property passes that threshold.\n\nAt the individual loan level, both the bank and the platform calculate this number independently and compare results. This double-check ("T2 authority") catches errors before they reach a dashboard.'
        : '$5,640,000 \u00f7 $1,380,000 = 4.09x\n\nThis means for every $1.00 the company owes in total debt payments, it earns $4.09. That\u2019s a very strong cushion.\n\nCorporate borrowers typically show higher DSCRs than real estate because EBITDA captures the entire company\u2019s earnings, not just one property.\n\nAt the individual loan level, both the bank and the platform calculate this independently and compare. This double-check ("T2 authority") catches errors.',
    targetSelector: '[data-demo="result-{v}"]',
    insight: (v) =>
      v === 'CRE'
        ? 'A DSCR of 1.32x means income could fall by about 24% before the borrower can no longer cover their loan payments. This "margin of safety" is what lenders focus on.'
        : 'A DSCR of 4.09x means earnings could fall by about 75% before the borrower can\u2019t cover debt payments. This is an extremely strong margin of safety.',
    formulaKey: 'dscr-division',
  },

  /* ── Step 7: L1 Reference ──────────────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'Before the formula can run, the system needs to know the basics: Who is the borrower? What type of loan is this? Which business unit owns it?\n\nThis information lives in "L1 Reference Tables" \u2014 think of them as the master address book for the bank. They store relatively permanent facts like:\n\n\u2022 Loan (facility) details \u2014 type, amount, maturity date\n\u2022 Borrower identity \u2014 legal name, credit rating, industry\n\u2022 Organizational structure \u2014 which desk, portfolio, and line of business this loan belongs to\n\nThese tables rarely change and serve as the backbone that connects everything together.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'These reference tables are shared across every metric in the system \u2014 not just DSCR. The same organizational hierarchy that groups DSCR also groups exposure, LTV, and every other risk metric.',
  },

  /* ── Step 8: L2 Snapshot ───────────────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Numbers Come From: Snapshot Tables',
    narration: (v) =>
      `The actual financial numbers that feed the DSCR formula live in "L2 Snapshot Tables" \u2014 periodic readings of financial data, like taking a photo of the borrower\u2019s finances at a point in time:\n\n\u2022 facility_financial_snapshot \u2014 quarterly financial data: rental income, operating expenses, earnings, and debt service breakdowns\n\u2022 cash_flow \u2014 individual loan payment records (each interest and principal payment)\n\nThe fields highlighted on the page are the specific ones used by the ${V_LABEL[v]} formula. The non-highlighted fields serve other variants or other metrics entirely.`,
    targetSelector: '[data-demo="step3"]',
    onEnter: { l2Filter: 'CRE' }, // overridden at runtime by useDemoEngine
  },

  /* ── Step 9: Calculation Engine ────────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: (v) => `The Math in Action: ${V_LABEL[v]}`,
    narration: (v) =>
      `The calculation engine pulls the raw numbers from the snapshot tables, plugs them into the formula, and produces the DSCR value.\n\nAt the individual loan level, this is straightforward division:\n\n${V_FORMULA[v]} = ${V_NUM_TOTAL[v]} \u00f7 ${V_DEN_TOTAL[v]} = ${V_RESULT[v]}\n\nThis single number tells you whether this particular loan is healthy.`,
    targetSelector: '[data-demo="step4-variant-{v}"]',
  },

  /* ── Step 10: T2 Authority ─────────────────────────────────────────────── */
  {
    id: 't2-authority',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'Double-Check: How the Platform Validates',
    narration:
      'At the individual loan level, DSCR operates under what\u2019s called "T2 authority" \u2014 a built-in safety mechanism:\n\n1. The bank calculates DSCR using their own systems and sends the result\n2. The platform independently recalculates it from the raw data\n3. If the two numbers don\u2019t match (beyond a tolerance), a flag is raised for investigation\n\nThis dual-calculation approach catches data entry errors, formula misconfigurations, and stale inputs before they reach a dashboard.\n\nFor all higher-level rollups (borrower, desk, portfolio, etc.), the platform ALWAYS calculates from scratch \u2014 the bank never sends pre-aggregated DSCR.',
    targetSelector: '[data-demo="step4"]',
    insight:
      'Why does the bank also calculate? Because banks sometimes apply deal-specific adjustments (e.g., a covenant might exclude one-time costs). The reconciliation process surfaces these legitimate differences so they can be reviewed.',
  },

  /* ── Step 11: Foundational Rule ────────────────────────────────────────── */
  {
    id: 'foundational-rule',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'The Golden Rule of DSCR Rollups',
    narration:
      'Before we walk through how DSCR combines across multiple loans, one critical rule:\n\nNEVER take the average of individual DSCRs.\n\nWhy? Because a simple average ignores how big each loan is. Imagine:\n\n\u2022 A $100M loan with DSCR of 1.1x (barely covering payments)\n\u2022 A $1M loan with DSCR of 3.0x (very healthy)\n\nAveraging gives 2.05x \u2014 which sounds great! But 99% of the money is in the struggling loan. The correct approach: add up all income across both loans, add up all debt payments, then divide once. That gives a much more accurate picture.',
    targetSelector: '[data-demo="foundational-rule"]',
    insight:
      'This is the most common mistake banks make when implementing DSCR. Rating agencies like S&P use the same "pool-and-divide" method \u2014 never averaging pre-computed ratios.',
    formulaKey: 'foundational-rule',
  },

  /* ── Step 12: Facility Level ───────────────────────────────────────────── */
  {
    id: 'rollup-facility',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 1: Individual Loan (Facility)',
    narration:
      'At the individual loan level, DSCR is calculated directly from the formula. No combining or aggregation is needed \u2014 it\u2019s just income divided by debt payments for that one loan.\n\nLet\u2019s look at three loans belonging to one borrower:',
    targetSelector: '[data-demo="rollup-facility"]',
    onEnter: { expandLevel: 'facility' },
    formulaKey: 'rollup-facility',
  },

  /* ── Step 13: Counterparty Level ───────────────────────────────────────── */
  {
    id: 'rollup-counterparty',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 2: Borrower (Counterparty)',
    narration:
      'A single borrower (called a "counterparty" in banking) may have multiple loans. To see the borrower\u2019s overall health, we pool all the numbers:\n\n1. Add up ALL income across every loan\n2. Add up ALL debt payments across every loan\n3. Divide once\n\nThis is called a "pooled ratio" \u2014 it correctly weights each loan by its size.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'rollup-counterparty',
    insight: (v) => {
      const facilities = v === 'CRE'
        ? [1.32, 1.50, 0.94]
        : [4.09, 3.05, 1.13];
      const avg = (facilities.reduce((s, f) => s + f, 0) / facilities.length).toFixed(2);
      const pooled = v === 'CRE' ? '1.29' : '2.75';
      return `Notice the pooled result (${pooled}x) differs from the simple average of ${facilities.join('x, ')}x (which would be ${avg}x). The pooled method correctly gives more weight to larger loans.`;
    },
  },

  /* ── Step 14: Desk Level ───────────────────────────────────────────────── */
  {
    id: 'rollup-desk',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 3: Trading Desk',
    narration:
      'A trading desk may manage both real estate loans (which use NOI) and corporate loans (which use EBITDA). Since these measure different things, mixing them into one number would be misleading.\n\nThe solution: report DSCR separately by product type. The CRE desk DSCR only pools CRE loans, and the C&I desk DSCR only pools C&I loans. This keeps the comparison meaningful \u2014 apples with apples.',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
    formulaKey: 'rollup-desk',
    insight:
      'Most large banks keep DSCRs segmented at the desk level and only blend at higher levels where the goal is a high-level directional view rather than precise measurement.',
  },

  /* ── Step 15: Portfolio Level ──────────────────────────────────────────── */
  {
    id: 'rollup-portfolio',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 4: Portfolio',
    narration:
      'A portfolio spans dozens of industries and borrower types. At this scale, the approach shifts to an "exposure-weighted average" \u2014 each borrower\u2019s DSCR is weighted by how much money the bank has lent them.\n\nA borrower with a $50M loan has 5x more influence on the portfolio DSCR than a borrower with a $10M loan.\n\nBut one number can be deceiving! That\u2019s why the platform also shows distribution buckets (< 1.0x, 1.0\u20131.25x, 1.25\u20131.5x, etc.) to reveal hidden pockets of weakness.',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight:
      'Beware of "Simpson\u2019s Paradox": a healthy average can hide a group of struggling borrowers. For example, a portfolio DSCR of 1.45x might mask 15% of loans below 1.0x. The distribution buckets reveal what the average conceals.',
  },

  /* ── Step 16: LoB Level ────────────────────────────────────────────────── */
  {
    id: 'rollup-lob',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 5: Line of Business',
    narration:
      'At the Line of Business (LoB) level \u2014 the highest view \u2014 DSCR serves a completely different purpose. It\u2019s no longer a precise measure of individual loan health. Instead, it\u2019s a trend indicator.\n\nThe Chief Risk Officer uses LoB-level DSCR to ask one question: "Is our overall borrower quality getting better or worse over time?"\n\nHard limits at this level are set on total lending and concentration, NOT on DSCR. Comparing DSCR across different business lines (CRE vs Corporate vs Leveraged Finance) requires caution because the underlying formulas differ.',
    targetSelector: '[data-demo="rollup-lob"]',
    onEnter: { expandLevel: 'lob' },
    formulaKey: 'rollup-lob',
  },

  /* ── Step 17: Dashboard ────────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\u2019ve walked through \u2014 formula definition, data sources, calculation, validation, and rollup \u2014 comes together here on the dashboard.\n\nA user simply selects:\n\u2022 Which DSCR variant they want (CRE, C&I, etc.)\n\u2022 What level they want to see (individual loan, borrower, portfolio, etc.)\n\nThe platform handles all the joins, calculations, and aggregations behind the scenes. No SQL queries, no spreadsheets, no guesswork. Every number traces back to the raw data through the complete lineage chain we just walked through.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'This is the power of end-to-end lineage: every single DSCR value on the dashboard can be traced backwards through the rollup hierarchy, through the calculation engine, through the snapshot tables, all the way back to the original reference data. Full auditability.',
  },
];

/** Resolve a step field that may be a function of the variant */
export function resolveField<T>(field: T | ((v: VariantKey) => T), variant: VariantKey): T {
  return typeof field === 'function' ? (field as (v: VariantKey) => T)(variant) : field;
}

/** Replace {v} placeholder in a selector with the lowercase variant key */
export function resolveSelector(selector: string, variant: VariantKey): string {
  return selector.replace(/\{v\}/g, variant.toLowerCase());
}
