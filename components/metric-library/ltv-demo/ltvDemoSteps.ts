/* ────────────────────────────────────────────────────────────────────────────
 * LTV Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, etc.).
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 *
 * LTV has a single variant (Exposure / Collateral Value × 100) so there
 * is no variant picker — the demo starts directly.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LTVDemoStep {
  id: string;
  phase: number;
  phaseLabel: string;
  title: string;
  narration: string;
  /** CSS selector for spotlight target */
  targetSelector: string;
  /** Optional sub-element selector for ring highlight */
  highlightSelector?: string;
  insight?: string;
  /** Which formula animation to show (see LTVDemoFormulaAnimation) */
  formulaKey?: string;
  /** Side-effects when entering this step */
  onEnter?: {
    expandLevel?: string | null;
  };
}

/* ────────────────────────────────────────────────────────────────────────── */

export const LTV_DEMO_STEPS: LTVDemoStep[] = [
  /* ── Step 0: Welcome ────────────────────────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the LTV Lineage Demo',
    narration:
      'LTV stands for Loan-to-Value Ratio. It answers one question: "How much of this loan is covered by collateral?"\n\nIt divides the loan amount (called "exposure") by the value of the assets pledged against it. An LTV of 75% means for every $1 of collateral, the bank has lent $0.75. The remaining $0.25 is the bank\'s "cushion" — if the borrower defaults, the bank can sell the collateral and (in theory) recover the full loan amount.\n\nLower LTV = safer. Unlike DSCR which measures cash flow, LTV measures asset coverage.\n\nThis guided walkthrough will show you the complete journey of LTV — from how it\'s defined, to where the data comes from, how the math works, and how the result flows from a single loan all the way up to an entire division of the bank.\n\nClick Next to begin.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ───────────────────────────────────────────── */
  {
    id: 'ltv-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'The LTV Formula',
    narration:
      'LTV uses a deceptively simple formula:\n\nExposure ÷ Collateral Value × 100\n\nExposure is the total amount the bank has lent — a single number from the exposure snapshot.\n\nCollateral Value is the combined worth of all assets pledged against the loan. This is where the complexity hides: a single loan may be secured by multiple collateral items — real estate, cash deposits, securities — each with different risk profiles.\n\nRegulators also require "haircuts" — safety discounts that reduce the recognized collateral value. A building appraised at $20M might only count as $18M after a 10% haircut.\n\nLet\'s walk through each piece of this formula with real numbers.',
    targetSelector: '[data-demo="step1"]',
    insight:
      'Unlike DSCR where the numerator is complex (NOI or EBITDA with multiple components), LTV has a simple numerator (just exposure) but a complex denominator (multiple collateral pieces with different haircuts and eligibility rules).',
  },

  /* ── Step 2: Numerator — Exposure ───────────────────────────────────────── */
  {
    id: 'numerator-exposure',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Numerator: Gross Exposure',
    narration:
      'The top of the LTV formula is the committed facility amount — the total commitment the bank has made to this borrower for this facility.\n\nThis comes from a single field in one table:\n\nfacility_exposure_snapshot.committed_amount = $15,000,000\n\nUnlike DSCR where the numerator requires assembling 4+ components (rents, expenses, depreciation), LTV\'s numerator is a single snapshot value. The simplicity is deceptive — getting this number right requires handling currency conversion, commitment vs. drawn amounts, and multi-tranche facilities.\n\nWatch as the exposure value appears in the animation below.',
    targetSelector: '[data-demo="num-section"]',
    formulaKey: 'numerator-exposure',
  },

  /* ── Step 3: Denominator — Collateral Inventory ─────────────────────────── */
  {
    id: 'collateral-inventory',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Denominator: Collateral Inventory',
    narration:
      'A single loan may be secured by multiple collateral items. Each has its own valuation and risk profile:\n\n1. Commercial Building (Real Estate): valued at $20,000,000\n   — A physical property appraised by a licensed appraiser\n\n2. Cash Deposit: $3,000,000\n   — Money in a pledged bank account — the safest collateral type\n\n3. Accounts Receivable: $2,200,000\n   — Money owed to the borrower by their customers — less certain\n\nTotal raw collateral = $25,200,000\n\nBut not all collateral is created equal. Regulators require "haircuts" — safety margins that reduce the recognized value based on how easy (or hard) it would be to liquidate each asset.',
    targetSelector: '[data-demo="den-section"]',
    formulaKey: 'collateral-waterfall',
  },

  /* ── Step 4: Haircut Application ────────────────────────────────────────── */
  {
    id: 'haircut-application',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Haircuts: From Raw to Eligible Value',
    narration:
      'Haircuts reduce collateral value to account for liquidation risk — the chance that in a fire sale, assets fetch less than their appraised value:\n\nCommercial Building: $20,000,000 × (1 − 10%) = $18,000,000\n  — Real estate is relatively stable but takes months to sell\n\nCash Deposit: $3,000,000 × (1 − 0%) = $3,000,000\n  — Cash is cash — no haircut needed\n\nAccounts Receivable: $2,200,000 × (1 − 25%) = $1,650,000\n  — Receivables are uncertain — customers might not pay\n\nTotal Eligible Value = $22,650,000\n\nThe "eligible" value is what regulators recognize for credit risk mitigation. Some collateral (marked M2 = "Ineligible") has economic value but doesn\'t count toward regulatory capital relief.',
    targetSelector: '[data-demo="den-total"]',
    formulaKey: 'haircut-waterfall',
  },

  /* ── Step 5: Final LTV result ───────────────────────────────────────────── */
  {
    id: 'ltv-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Result: 59.5% LTV',
    narration:
      '$15,000,000 ÷ $25,200,000 × 100 = 59.5%\n\nThis means the loan represents 59.5% of the collateral value. There is a 40.5% cushion — the bank could lose 40.5% of collateral value before the loan becomes "underwater."\n\nLTV Threshold Bands:\n• < 60% = Low Risk ← this facility\n• 60–80% = Moderate Risk\n• 80–100% = High Risk\n• > 100% = Underwater (loan exceeds collateral)\n\nAt the individual loan level, the bank provides their LTV calculation and the platform independently recalculates from the raw data. This dual-check (T2 authority) catches discrepancies — especially important because collateral appraisals can be subjective.',
    targetSelector: '[data-demo="result"]',
    insight:
      'An LTV of 59.5% means the bank has lent $0.595 for every $1 of collateral. Most CRE regulators consider LTV below 60% as low risk. The "underwater" threshold (> 100%) is unique to LTV — it means the loan exceeds collateral value, and in a default, the bank cannot fully recover.',
    formulaKey: 'ltv-division',
  },

  /* ── Step 6: L1 Reference ───────────────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'Before the formula can run, the system needs structural context: Who is the borrower? What collateral is pledged? Which business unit owns the loan?\n\nThis information lives in "L1 Reference Tables" — think of them as the master address book for the bank:\n\n• facility_master — loan identity: type, committed amount, maturity date\n• counterparty — borrower identity: legal name, credit rating, industry\n• collateral_asset_master — collateral identity: asset type, location, appraisal method\n• enterprise_business_taxonomy — organizational hierarchy: LoB, portfolio, desk\n\nA critical table for LTV that DSCR does not need: collateral_asset_master. This L1 table defines WHAT the collateral is (property type, location, appraisal frequency), while the L2 snapshot captures its VALUE at a point in time.\n\nThese tables rarely change and serve as the backbone connecting everything.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'LTV uses the same core L1 tables as DSCR (facility_master, counterparty, enterprise_business_taxonomy) plus collateral_asset_master. This shared reference layer is what enables cross-metric consistency — the same organizational hierarchy groups LTV, DSCR, and every other risk metric.',
  },

  /* ── Step 7: L2 Snapshot ────────────────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Numbers Come From: Snapshot Tables',
    narration:
      'The actual financial numbers that feed the LTV formula live in "L2 Snapshot Tables" — periodic readings of financial data, like taking a photo of the loan\'s collateral position at a point in time:\n\n• facility_exposure_snapshot — the loan amount (LTV numerator):\n  committed_amount, gross_exposure_usd, ead_amount\n\n• collateral_snapshot — the collateral values (LTV denominator):\n  current_valuation_usd, haircut_pct, eligible_value_usd, allocated_amount_usd, mitigant_group_code, mitigant_subtype\n\nThe fields highlighted on the page are the specific ones used by the LTV formula. The non-highlighted fields serve other metrics (like EAD for Expected Loss calculations) or other reporting needs.',
    targetSelector: '[data-demo="step3"]',
  },

  /* ── Step 8: Calculation Engine ─────────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'The Math in Action: LTV Calculation',
    narration:
      'The calculation engine follows these steps for each facility:\n\n1. Pull committed_amount from facility_exposure_snapshot\n   → $15,000,000\n\n2. JOIN collateral_snapshot to get ALL collateral items pledged to this facility\n   → 3 items: Building ($20M), Cash ($3M), Receivables ($2.2M)\n\n3. SUM current_valuation_usd across all collateral items\n   → $25,200,000\n\n4. DIVIDE: exposure ÷ total collateral value × 100\n   → $15,000,000 ÷ $25,200,000 × 100 = 59.5%\n\nThe JOIN in step 2 is where LTV\'s data model differs from DSCR. DSCR joins to financial snapshot tables; LTV joins to collateral snapshot tables. The collateral join is one-to-many: one facility can have many collateral items.',
    targetSelector: '[data-demo="step4"]',
  },

  /* ── Step 9: T2 Authority ───────────────────────────────────────────────── */
  {
    id: 't2-authority',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'Collateral Valuation: Source of Truth',
    narration:
      'LTV at the facility level operates under "T2 authority" — a built-in safety mechanism:\n\n1. The bank calculates LTV using their own collateral appraisal\n2. The platform independently recalculates from the raw collateral snapshot data\n3. Differences trigger reconciliation\n\nCommon discrepancy sources:\n• Stale appraisals — bank using an 18-month-old property value vs. current mark\n• Different haircut methodologies — regulatory vs. internal risk models\n• Partial allocation — only a portion of a property securing this specific loan\n• Currency mismatch — collateral denominated in different currencies\n\nFor all higher-level rollups (borrower, desk, portfolio, etc.), the platform ALWAYS calculates from scratch — the bank never sends pre-aggregated LTV values.',
    targetSelector: '[data-demo="step4"]',
    insight:
      'Collateral valuation is the most disputed data point in credit risk. Unlike income (which comes from audited financials), property values depend on appraisal methodology, comparable sales, and market conditions. The dual-calculation approach catches both data errors and methodological differences.',
  },

  /* ── Step 10: Foundational Rule ─────────────────────────────────────────── */
  {
    id: 'foundational-rule',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'How LTV Rolls Up: Aggregate Ratio',
    narration:
      'Before we walk through how LTV combines across multiple loans, one key rule:\n\nRollup LTV uses the aggregate ratio: SUM(committed_amount) / SUM(collateral_value) × 100.\n\nThis sums the numerators and denominators across all facilities, then divides. Larger facilities naturally carry more weight. For example:\n\n• Facility A: $50M committed / $52.6M collateral → 95%\n• Facility B: $3M committed / $10M collateral → 30%\n\nBorrower LTV = ($50M + $3M) / ($52.6M + $10M) = $53M / $62.6M = 84.7%\n\nNotice this is NOT (95% + 30%) / 2 = 62.5%. The $50M facility dominates because it represents the vast majority of exposure. Unsecured facilities (no collateral) are excluded entirely.',
    targetSelector: '[data-demo="foundational-rule"]',
    insight:
      'The aggregate ratio naturally weights larger facilities more heavily. A $500M underwater facility cannot be hidden by averaging it with small low-LTV facilities. This is the standard G-SIB approach for LTV rollup across all levels.',
    formulaKey: 'foundational-rule-ltv',
  },

  /* ── Step 11: Facility Level ────────────────────────────────────────────── */
  {
    id: 'rollup-facility',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 1: Individual Loan (Facility)',
    narration:
      'At the facility level, LTV is calculated directly:\n\nExposure ÷ SUM(Collateral Value) × 100\n\nThe key complexity: multiple collateral items per facility. A single CRE loan might be secured by the property itself, a cash reserve account, and assigned receivables.\n\nLet\'s look at three facilities belonging to one borrower:',
    targetSelector: '[data-demo="rollup-facility"]',
    onEnter: { expandLevel: 'facility' },
    formulaKey: 'rollup-facility',
  },

  /* ── Step 12: Counterparty Level ────────────────────────────────────────── */
  {
    id: 'rollup-counterparty',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 2: Borrower (Counterparty)',
    narration:
      'A single borrower (called a "counterparty" in banking) may have multiple loans, each with different collateral packages. To see the borrower\'s overall collateral coverage:\n\nBorrower LTV = SUM(committed_amount) / SUM(collateral_value) × 100\n\nThis is an aggregate ratio — pool all exposure and all collateral, then divide. Larger facilities naturally dominate the result. Unsecured facilities (no collateral) are excluded entirely.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'rollup-counterparty',
    insight:
      'For Counterparty A with three secured facilities: SUM(committed) = $15M + $8M + $25M = $48M, SUM(collateral) = $25.2M + $12M + $22M = $59.2M. Borrower LTV = $48M / $59.2M = 81.1%. The $25M underwater facility pulls the ratio up significantly.',
  },

  /* ── Step 13: Desk Level ────────────────────────────────────────────────── */
  {
    id: 'rollup-desk',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 3: Trading Desk',
    narration:
      'At the desk level, LTV aggregation is more straightforward than DSCR because the formula is the same across all product types — exposure divided by collateral value. There is no "definitional inconsistency" problem like DSCR has with NOI vs EBITDA.\n\nHowever, the nature of collateral varies dramatically:\n• CRE desk — mostly real estate collateral (appraised, illiquid)\n• Corporate desk — receivables, inventory, equipment (variable quality)\n• Securities desk — financial assets with daily marks (liquid but volatile)\n\nReporting LTV by collateral type reveals the quality of coverage. A desk with 70% LTV backed entirely by real estate is very different from 70% LTV backed by receivables.',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
    formulaKey: 'rollup-desk',
    insight:
      'Unlike DSCR which must be segmented by product type (CRE vs C&I) because the numerators measure different things, LTV can be meaningfully compared across product types. The formula is always exposure / collateral — what changes is the collateral quality.',
  },

  /* ── Step 14: Portfolio Level ───────────────────────────────────────────── */
  {
    id: 'rollup-portfolio',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 4: Portfolio',
    narration:
      'At the portfolio level, LTV uses the aggregate ratio: SUM(committed_amount) / SUM(collateral_value) for all secured facilities in the portfolio.\n\nBut the distribution buckets tell the real story:\n\n• < 60%: Low Risk — 12 facilities, $350M exposure\n• 60–80%: Moderate — 18 facilities, $680M exposure\n• 80–100%: High Risk — 8 facilities, $420M exposure\n• > 100%: Underwater — 4 facilities, $180M exposure\n\nThe "underwater" bucket (LTV > 100%) is unique to LTV and is the most watched metric in CRE portfolios. It means the loan exceeds collateral value — if the borrower defaults, the bank cannot fully recover.\n\nA portfolio LTV of 72% might look healthy, but if $180M of exposure is underwater, that demands immediate attention.',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight:
      'Beware of "Simpson\'s Paradox": a healthy portfolio-level LTV can hide pockets of severely under-collateralized loans. The distribution buckets — especially the "underwater" bucket — reveal what a single aggregate number conceals.',
  },

  /* ── Step 15: LoB Level ─────────────────────────────────────────────────── */
  {
    id: 'rollup-lob',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 5: Line of Business',
    narration:
      'At the Line of Business (LoB) level — the highest view — LTV serves as a collateral coverage trend indicator.\n\nUnlike DSCR, LTV comparisons across LoBs are more meaningful because the formula is consistent. However, interpretation differs:\n\n• CRE LoB — LTV is the primary risk metric (property value drives everything)\n• Corporate LoB — LTV is secondary to DSCR (cash flow matters more than collateral)\n• Securities LoB — LTV changes daily with market prices\n\nThe Chief Risk Officer uses LoB-level LTV to monitor portfolio-wide collateral trends and detect systemic exposure to property market declines. If CRE LTV is trending upward quarter over quarter, it may signal a weakening real estate market.',
    targetSelector: '[data-demo="rollup-lob"]',
    onEnter: { expandLevel: 'lob' },
    formulaKey: 'rollup-lob',
  },

  /* ── Step 16: Dashboard ─────────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\'ve walked through — formula definition, data sources, collateral aggregation, calculation, validation, and rollup — comes together here on the dashboard.\n\nA user simply selects:\n• What aggregation level (individual loan, borrower, portfolio, etc.)\n• What time period to view\n\nThe platform handles all the collateral joins, haircut applications, exposure-weighted calculations, and distribution bucketing behind the scenes. No SQL queries, no spreadsheets, no guesswork.\n\nKey LTV-specific dashboard features:\n• Threshold band visualization (green/yellow/orange/red)\n• Underwater exposure tracking (LTV > 100%)\n• Collateral type breakdown within any aggregation level\n• Trend over time to detect deteriorating collateral coverage',
    targetSelector: '[data-demo="step6"]',
    insight:
      'This is the power of end-to-end lineage: every LTV value on the dashboard can be traced backwards through the rollup hierarchy, through the calculation engine, through the collateral and exposure snapshots, all the way back to the original reference data. Full auditability — same principle as DSCR.',
  },
];

/** Resolve a step field (for LTV, fields are always plain strings, no variant resolution) */
export function resolveField(field: string): string {
  return field;
}

/** LTV doesn't use variant placeholders, but keep consistent API */
export function resolveSelector(selector: string): string {
  return selector;
}
