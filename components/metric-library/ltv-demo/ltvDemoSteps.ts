/* ────────────────────────────────────────────────────────────────────────────
 * LTV Lineage Demo — Step Definitions
 *
 * 16 steps across 6 phases. Unlike the DSCR demo there is no variant
 * picker — LTV has a single formula.  The emphasis is on table traversal
 * and showing how data is sourced from 4 tables across L1/L2.
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LTVDemoStep {
  id: string;
  phase: number;
  phaseLabel: string;
  title: string;
  narration: string;
  targetSelector: string;
  insight?: string;
  formulaKey?: string;
  onEnter?: {
    expandLevel?: string | null;
    activeTable?: string | null;
  };
}

/* ────────────────────────────────────────────────────────────────────────── */

export const LTV_DEMO_STEPS: LTVDemoStep[] = [
  /* ── Phase 1: Introduction ───────────────────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the LTV Lineage Demo',
    narration:
      'LTV stands for Loan-to-Value Ratio. It answers one simple question:\n\n"If this borrower defaults, does the collateral cover the loan?"\n\nImagine a bank lends $10.5 million to a company that pledges a $15 million office building as collateral. LTV = $10.5M / $15M = 70%. The bank has a 30% cushion before the collateral no longer covers the loan.\n\nThis guided walkthrough will show you the complete journey of this metric — which tables store the data, how the system joins them together, how LTV is calculated, and how the result rolls up from a single loan all the way to an entire division of the bank.\n\nClick Next to begin.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Phase 2: The Formula ────────────────────────────────────────────────── */
  {
    id: 'ltv-formula',
    phase: 2,
    phaseLabel: 'The Formula',
    title: 'The LTV Formula',
    narration:
      'LTV uses the simplest formula in credit risk:\n\nLTV = Drawn Amount / Collateral Value\n\nThe "drawn amount" is how much money the borrower has actually taken from the loan. The "collateral value" is the appraised value of the asset pledged as security.\n\nOur example: Meridian Office Partners LLC has a Term Loan secured by a Class A office building at 200 Market Street, San Francisco.\n\n• Drawn Amount: $10,500,000\n• Collateral Value: $15,000,000 (last appraisal)\n\nLet\'s see the math.',
    targetSelector: '[data-demo="formula"]',
    formulaKey: 'ltv-formula-build',
  },
  {
    id: 'ltv-result',
    phase: 2,
    phaseLabel: 'The Formula',
    title: 'Result: 70.0% LTV',
    narration:
      '$10,500,000 / $15,000,000 = 70.0%\n\nThis means for every $1.00 of collateral, the bank has lent $0.70. There\'s a 30-cent cushion on every dollar.\n\nMost banks require CRE (Commercial Real Estate) LTV below 75–80% for new originations. At 70%, this facility passes comfortably.\n\nBut where do the numbers $10.5M and $15M actually come from? They live in 4 different tables across 2 data layers. Let\'s walk through each one.',
    targetSelector: '[data-demo="formula-result"]',
    formulaKey: 'ltv-result',
    insight:
      'A lower LTV is better for the bank — it means more collateral cushion. An LTV above 100% means the loan exceeds the collateral value, putting the bank at risk of a shortfall if the borrower defaults.',
  },

  /* ── Phase 3: Data Sources — Table Traversal ─────────────────────────────── */
  {
    id: 'table-overview',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'The 4 Tables Behind LTV',
    narration:
      'Computing LTV requires data from 4 tables across 2 layers:\n\nL1 Reference (permanent facts):\n• facility_master — "Which loan? Who\'s the borrower? What business unit?"\n• enterprise_business_taxonomy — "Which desk, portfolio, and LoB?"\n\nL2 Snapshots (point-in-time readings):\n• facility_exposure_snapshot — "How much is drawn today?"\n• collateral_snapshot — "What\'s the collateral worth today?"\n\nThink of L1 tables as the address book and L2 tables as periodic photos of the financials. Let\'s examine each table.',
    targetSelector: '[data-demo="tables-overview"]',
    onEnter: { activeTable: null },
  },
  {
    id: 'table-facility-master',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Table 1: facility_master',
    narration:
      'The anchor table. Every LTV calculation starts here.\n\nFor facility F-10042, this table tells us:\n• counterparty_id = CP-2001 — links to the borrower (Meridian Office Partners)\n• lob_segment_id = L1-002-L2-03-L3-04 — links to the organizational hierarchy (which desk owns this loan)\n• facility_type = "Term Loan CRE"\n• committed_facility_amt = $12,000,000\n\nThe two foreign keys (counterparty_id and lob_segment_id) are how the system connects this loan to its borrower and its place in the bank\'s org chart.',
    targetSelector: '[data-demo="table-facility-master"]',
    onEnter: { activeTable: 'facility_master' },
    insight:
      'facility_master is an L1 (reference) table — its data rarely changes. The facility type, committed amount, and organizational assignment are set at origination and only updated during amendments.',
  },
  {
    id: 'table-exposure',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Table 2: facility_exposure_snapshot',
    narration:
      'This L2 snapshot table provides the NUMERATOR of LTV.\n\nJoins to facility_master on: facility_id\n\nFor facility F-10042 as of 2025-03-31:\n• drawn_amount = $10,500,000  ← This is the LTV numerator\n• gross_exposure_usd = $12,000,000\n\nThe drawn_amount is what the borrower has actually used from their credit facility. It changes with every drawdown or repayment.\n\nThis is an L2 (snapshot) table — a new row is written every reporting date, creating a time series of how much the borrower owes.',
    targetSelector: '[data-demo="table-exposure"]',
    onEnter: { activeTable: 'facility_exposure_snapshot' },
  },
  {
    id: 'table-collateral',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Table 3: collateral_snapshot',
    narration:
      'This L2 snapshot table provides the DENOMINATOR of LTV.\n\nJoins to facility_master on: facility_id + as_of_date\n\nFor facility F-10042 as of 2025-03-31:\n• current_valuation_usd = $15,000,000  ← This is the LTV denominator\n\nThe "current valuation" comes from the most recent property appraisal. For CRE loans, banks typically order a new appraisal every 1–3 years, or when market conditions change significantly.\n\nNote: If a single facility has multiple collateral pledges (e.g., two buildings), the system sums their valuations at the facility level before computing LTV.',
    targetSelector: '[data-demo="table-collateral"]',
    onEnter: { activeTable: 'collateral_snapshot' },
    insight:
      'Collateral values are "lagging" — appraisals reflect the past, not the present. In a rapidly declining market, the true LTV may be worse than what\'s reported. This is why stress-testing applies haircuts to collateral values.',
  },
  {
    id: 'table-taxonomy',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Table 4: enterprise_business_taxonomy',
    narration:
      'This table tells the system WHERE in the bank\'s organizational hierarchy this loan belongs.\n\nfacility_master.lob_segment_id links to → enterprise_business_taxonomy.managed_segment_id\n\nFor facility F-10042:\n• lob_segment_id = L1-002-L2-03-L3-04\n• This resolves to segment_name = "CRE Origination Desk"\n\nBut the real power of this table is the parent_segment_id column. It creates a tree structure that allows the system to "climb" from a desk all the way up to the line of business.\n\nLet\'s see how.',
    targetSelector: '[data-demo="table-taxonomy"]',
    onEnter: { activeTable: 'enterprise_business_taxonomy' },
  },
  {
    id: 'taxonomy-traversal',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Climbing the Hierarchy Tree',
    narration:
      'Starting from "CRE Origination Desk" (L3), the system follows parent_segment_id upward:\n\nL3 Desk: "CRE Origination Desk"\n   managed_segment_id = L1-002-L2-03-L3-04\n   parent_segment_id  = L1-002-L2-03  ↑\n\nL2 Portfolio: "Commercial Real Estate"\n   managed_segment_id = L1-002-L2-03\n   parent_segment_id  = L1-002  ↑\n\nL1 Line of Business: "Corporate & Investment Banking"\n   managed_segment_id = L1-002\n   parent_segment_id  = L0-001 (Enterprise root)\n\nThis is how a single facility\'s LTV flows into desk-level, portfolio-level, and LoB-level aggregations. The same traversal is used for every metric in the system — not just LTV.',
    targetSelector: '[data-demo="taxonomy-tree"]',
    formulaKey: 'taxonomy-tree',
    insight:
      'The taxonomy table is shared across all metrics. The same parent_segment_id traversal that groups LTV also groups exposure, DSCR, PD, and every other risk metric. Change the hierarchy once, and every metric\'s rollup updates automatically.',
  },

  /* ── Phase 4: Calculation ────────────────────────────────────────────────── */
  {
    id: 'calc-facility',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'Facility-Level Calculation',
    narration:
      'At the individual facility level, LTV is straightforward division:\n\nLTV = drawn_amount / collateral_value_usd\n    = $10,500,000 / $15,000,000\n    = 70.0%\n\nThe SQL pulls from all 4 tables:\n\n1. facility_exposure_snapshot → drawn_amount (numerator)\n2. collateral_snapshot → SUM(current_valuation_usd) (denominator)\n3. facility_master → facility_id (join key)\n4. enterprise_business_taxonomy → hierarchy (for GROUP BY at higher levels)\n\nFor unsecured facilities (no collateral), LTV is NULL and excluded from weighted aggregates.',
    targetSelector: '[data-demo="calc-section"]',
    formulaKey: 'ltv-division',
  },
  {
    id: 'golden-rule',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'The Golden Rule: Never Average LTVs',
    narration:
      'Before we roll up LTV across multiple loans, one critical rule:\n\nNEVER take the simple average of individual LTVs.\n\nWhy? Because a simple average ignores how big each loan is. Example:\n\n• $100M loan at 85% LTV (high risk, barely below policy limit)\n• $5M loan at 40% LTV (low risk, well-secured)\n\nSimple average: (85% + 40%) / 2 = 62.5%  — looks fine!\nExposure-weighted: (85% × $100M + 40% × $5M) / $105M = 82.9%\n\nThe correct answer (82.9%) reveals the portfolio is actually near the 85% policy ceiling, dominated by the large risky loan. The simple average hid that.',
    targetSelector: '[data-demo="golden-rule"]',
    formulaKey: 'golden-rule',
    insight:
      'This is the same "pool-and-weight" principle used for DSCR, PD, LGD, and every weighted-average metric. Rating agencies use it too. Never average pre-computed ratios.',
  },

  /* ── Phase 5: Rollup Hierarchy ───────────────────────────────────────────── */
  {
    id: 'rollup-facility',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 1: Individual Facility',
    narration:
      'At the facility level, LTV is calculated directly — no aggregation needed.\n\nLet\'s look at three facilities belonging to one borrower (Meridian Office Partners):',
    targetSelector: '[data-demo="rollup-facility"]',
    onEnter: { expandLevel: 'facility' },
    formulaKey: 'rollup-facility',
  },
  {
    id: 'rollup-counterparty',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 2: Counterparty (Weighted Avg)',
    narration:
      'A single borrower may have multiple secured loans. To see the borrower\'s overall collateral coverage, we use an exposure-weighted average:\n\nSUM(ltv × facility_exposure) / SUM(facility_exposure)\n\nThe larger the loan, the more it pulls the weighted average. This correctly reflects where the bank\'s money is actually at risk.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'rollup-counterparty',
    insight:
      'Notice the weighted result (68.7%) differs from a simple average of 70%, 62%, 78% (which would be 70.0%). The larger office loan dominates, while the small but risky warehouse loan has less influence.',
  },
  {
    id: 'rollup-desk',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 3: Desk',
    narration:
      'A desk manages multiple counterparty relationships. The desk-level LTV is the exposure-weighted average across all counterparties assigned to this desk.\n\nThe system identifies desk membership by traversing enterprise_business_taxonomy — the same hierarchy climb we saw in Phase 3. Each counterparty\'s LTV is weighted by their total exposure on this desk.',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
    formulaKey: 'rollup-desk',
  },
  {
    id: 'rollup-portfolio',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 4: Portfolio',
    narration:
      'At the portfolio level (L2 in the taxonomy), a single number can be deceiving. That\'s why the platform shows both:\n\n1. The exposure-weighted average LTV — the headline number\n2. Distribution buckets — revealing hidden pockets of risk\n\nFor example, a portfolio with 68% average LTV might contain 6 facilities above 80% with $90M in exposure. The buckets make this visible.',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight:
      'Regulators (OCC, Fed) focus on distribution, not just averages. A well-managed CRE portfolio should have most exposure in the < 70% bucket. Concentration in > 80% triggers heightened supervisory scrutiny.',
  },
  {
    id: 'rollup-lob',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 5: Line of Business',
    narration:
      'At the Line of Business (LoB) level — the highest view — LTV serves as a trend indicator, not a precise measure.\n\nThe Chief Risk Officer uses LoB-level LTV to ask: "Is our overall collateral coverage getting better or worse over time?"\n\nLTV at this level is most meaningful for CRE-heavy business lines. For business lines with mostly unsecured lending, LoB-level LTV may be sparsely populated.\n\nThis completes the full journey: from raw field values in 4 tables, through the taxonomy traversal, to a single trend number on the CRO\'s dashboard.',
    targetSelector: '[data-demo="rollup-lob"]',
    onEnter: { expandLevel: 'lob' },
    formulaKey: 'rollup-lob',
  },
];
