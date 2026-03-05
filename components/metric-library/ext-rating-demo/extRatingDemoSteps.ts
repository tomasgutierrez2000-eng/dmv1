/* ────────────────────────────────────────────────────────────────────────────
 * External Rating Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, etc.).
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 *
 * External Rating has no variant picker (single lookup/average formula).
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ExtRatingDemoStep {
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
  /** Which formula animation to show */
  formulaKey?: string;
  /** Side-effects when entering this step */
  onEnter?: {
    expandLevel?: string | null;
  };
}

/* ────────────────────────────────────────────────────────────────────────── */

export const EXT_RATING_DEMO_STEPS: ExtRatingDemoStep[] = [
  /* ── Step 0: Welcome ────────────────────────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the External Rating Lineage Demo',
    narration:
      'An external credit rating is a grade assigned by an independent rating agency — S&P, Moody\'s, or Fitch — that assesses a borrower\'s ability to repay debt.\n\nThink of it like a credit score, but for companies and governments. Ratings range from AAA (extremely reliable) down to D (in default).\n\nBanks use these ratings for regulatory capital calculations, risk reporting, and as a benchmark against their own internal risk assessments.\n\nUnlike most metrics in the platform, external ratings are strings (like "BBB+"), not numbers. This creates a unique challenge: how do you "average" a rating like BBB+ with A-?\n\nThis walkthrough shows how the platform solves that problem using a notch conversion system.\n\nClick Next to begin.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Metric Definition ──────────────────────────────────────────── */
  {
    id: 'metric-definition',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'What Makes This Metric Unique',
    narration:
      'External ratings are different from typical financial metrics in three ways:\n\n1. Output is a string — "BBB+", not a number like 66.7% or $5,000,000\n\n2. No facility level — ratings are assigned to borrowers (counterparties), not to individual loans. Every loan to the same borrower shares that borrower\'s rating.\n\n3. Averaging requires conversion — you can\'t add "BBB+" and "A-" together. The platform converts each rating to a numeric "notch" value, averages the numbers, and converts back.\n\nThe metric is classified as HYBRID: Raw at the counterparty level (direct lookup), but Calculated at desk/portfolio/LoB levels (notch averaging).',
    targetSelector: '[data-demo="step1"]',
    insight:
      'The term "notch" comes from credit rating terminology. Moving from BBB+ to A- is a one-notch upgrade. Notch values provide the numeric backbone for rating analytics — migration tracking, averaging, and threshold monitoring.',
  },

  /* ── Step 2: Notch Scale ────────────────────────────────────────────────── */
  {
    id: 'notch-scale',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'The Rating-to-Notch Conversion Scale',
    narration:
      'The rating_scale_dim table is the Rosetta Stone of credit ratings. It maps every rating label to a standardized numeric notch:\n\nAAA = 1 (best possible — only a handful of sovereign borrowers)\nAA+ = 2, AA = 3, AA- = 4\nA+ = 5, A = 6, A- = 7\nBBB+ = 8, BBB = 9, BBB- = 10\n--- Investment Grade boundary ---\nBB+ = 11, BB = 12, BB- = 13\n...\nD = 22 (default)\n\nThe investment grade boundary between BBB- (10) and BB+ (11) is critically important — many institutional investors and regulators treat it as a threshold. A single-notch downgrade from BBB- to BB+ can trigger forced selling, higher capital requirements, and covenant violations.\n\nThe S&P scale is used as the default display scale (EXTERNAL_SP).',
    targetSelector: '[data-demo="notch-scale"]',
    formulaKey: 'notch-scale',
  },

  /* ── Step 3: Source Tables ──────────────────────────────────────────────── */
  {
    id: 'source-tables',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Rating Data Lives',
    narration:
      'External ratings flow through two layers of tables:\n\nL2 Snapshot — counterparty_rating_observation\nThis is the primary data source. Each row records one rating observation: which counterparty was rated, by which agency, what rating they received, and when. The platform filters for rating_type = \'EXTERNAL\' and picks the most recent observation using MAX(as_of_date).\n\nL1 Reference — rating_scale_dim\nThe master dimension table that maps rating_grade_id to human-readable labels (rating_value) and numeric notch values (rating_notch). This is the join target.\n\nL1 Reference — rating_source\nAgency registry with a priority_rank field. When S&P, Moody\'s, and Fitch all rate the same counterparty, the bank selects one based on its configured priority (typically S&P first).\n\nL1 Reference — facility_master, enterprise_business_taxonomy\nThese provide the organizational hierarchy for grouping counterparties by desk, portfolio, and business segment.',
    targetSelector: '[data-demo="step2"]',
  },

  /* ── Step 4: Averaging Mechanism ────────────────────────────────────────── */
  {
    id: 'averaging-mechanism',
    phase: 4,
    phaseLabel: 'Calculation',
    title: 'The 6-Step Averaging Pipeline',
    narration:
      'Let\'s walk through the notch averaging with real numbers from the demo data.\n\nThe CRE Lending Desk has two counterparties:\n• Sunrise Properties — rated BBB+ (notch 8)\n• Meridian Holdings — rated A- (notch 7)\n\nStep 1: Collect distinct counterparties under this desk\nStep 2: Look up each counterparty\'s external rating\nStep 3: Convert to notches: BBB+ → 8, A- → 7\nStep 4: Average: (8 + 7) / 2 = 7.5\nStep 5: Round: ROUND(7.5) = 8\nStep 6: Reverse lookup: notch 8 → "BBB+"\n\nThe CRE Desk\'s average external rating is BBB+.\n\nNow the Corp Lending Desk has only Meridian Holdings (A-, notch 7). Average of a single value is itself: 7 → "A-".',
    targetSelector: '[data-demo="step4"]',
    formulaKey: 'notch-average',
  },

  /* ── Step 5: Counterparty Level ─────────────────────────────────────────── */
  {
    id: 'rollup-counterparty',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 1: Counterparty (Direct Lookup)',
    narration:
      'At the counterparty level, external rating is a simple lookup — no averaging needed.\n\nFor each counterparty:\n1. Query counterparty_rating_observation WHERE counterparty_id = X AND rating_type = \'EXTERNAL\' AND MAX(as_of_date)\n2. JOIN rating_scale_dim to get the display label\n\nDemo data:\n• CP-01 (Sunrise Properties): BBB+ — investment grade, moderate credit quality\n• CP-02 (Meridian Holdings): A- — investment grade, strong credit quality\n\nIf multiple agencies have rated the same counterparty, the platform selects based on rating_source.priority_rank (lowest rank = highest priority).\n\nThis is the only level where external rating is "Raw" (sourcing_type). All higher levels require calculation.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'counterparty-lookup',
    insight:
      'The counterparty level is the natural grain for external ratings. A single borrower has one external rating, regardless of how many loans they have. This is why the facility level is N/A — the rating belongs to the borrower, not the loan.',
  },

  /* ── Step 6: Desk Level ─────────────────────────────────────────────────── */
  {
    id: 'rollup-desk',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 2: Desk (Notch Average)',
    narration:
      'At the desk level, the platform collects all distinct counterparties with facilities under this L3 desk, then averages their rating notches.\n\nCRE Lending Desk:\n• Counterparties: CP-01 (BBB+, notch 8) + CP-02 (A-, notch 7)\n• AVG(8, 7) = 7.5 → ROUND = 8 → BBB+\n\nCorp Lending Desk:\n• Counterparties: CP-02 only (A-, notch 7)\n• AVG(7) = 7.0 → ROUND = 7 → A-\n\nNotice that Meridian Holdings (CP-02) has facilities on BOTH desks. At the desk level, each desk counts CP-02 independently. This is simple arithmetic averaging — each counterparty gets equal weight regardless of exposure size.\n\nAn alternative approach (not used here) would weight by exposure, where larger borrowers influence the average more.',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
    formulaKey: 'desk-rollup',
    insight:
      'Unlike LTV or Interest Income which weight by exposure/commitment, external rating averaging gives each counterparty equal weight. A $1M borrower rated CCC influences the average as much as a $500M borrower rated AAA. This is a deliberate design choice — the metric answers "what is the typical rating quality" not "what is the exposure-weighted risk."',
  },

  /* ── Step 7: Portfolio Level ────────────────────────────────────────────── */
  {
    id: 'rollup-portfolio',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 3: Portfolio',
    narration:
      'At the portfolio level (L2), the platform traverses up the hierarchy using parent_segment_id to include all child L3 desks.\n\nCommercial Real Estate portfolio includes:\n• CRE Lending Desk (L3) — CP-01, CP-02\n• Corp Lending Desk (L3) — CP-02\n\nDistinct counterparties across the portfolio:\n• CP-01 (BBB+, notch 8)\n• CP-02 (A-, notch 7)\n\nAVG(8, 7) = 7.5 → ROUND = 8 → BBB+\n\nImportantly, CP-02 appears on both desks but is counted only once at the portfolio level (DISTINCT counterparty_id). The average would be misleading if we double-counted.',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
  },

  /* ── Step 8: Business Segment Level ─────────────────────────────────────── */
  {
    id: 'rollup-lob',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 4: Business Segment',
    narration:
      'At the Business Segment level (L1 — the highest view), the platform recursively traverses all descendant segments using parent_segment_id.\n\nCommercial Banking (L1) includes:\n• Commercial Real Estate (L2) → CRE Desk (L3) + Corp Desk (L3)\n\nDistinct counterparties: CP-01 (BBB+, notch 8) + CP-02 (A-, notch 7)\nAVG(8, 7) = 7.5 → ROUND = 8 → BBB+\n\nIn our simple demo hierarchy, the Business Segment result matches the portfolio result. In production with hundreds of counterparties across many L3 desks, the Business Segment average provides the CRO with a single credit quality indicator for an entire division of the bank.',
    targetSelector: '[data-demo="rollup-lob"]',
    onEnter: { expandLevel: 'lob' },
  },

  /* ── Step 9: Dashboard ──────────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\'ve walked through — rating lookup, notch conversion, averaging, rounding, and reverse-lookup — comes together on the dashboard.\n\nA user simply selects the aggregation level (counterparty, desk, portfolio, or business segment) and the platform displays the appropriate external rating.\n\nKey dashboard features for external ratings:\n• Rating distribution charts — how many counterparties at each rating level\n• Investment grade vs sub-investment grade split\n• Internal vs external rating comparison (toggle)\n• Rating migration tracking — upgrades and downgrades over time\n\nEvery rating value on the dashboard traces back through the notch averaging pipeline to individual counterparty_rating_observation records. Full auditability.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'The internal vs external rating toggle (controlled by the risk_rating dimension in l3-metrics.ts) lets analysts compare the bank\'s own assessment against agency ratings. Systematic divergence — where internal ratings are consistently better than external — is a red flag for regulators.',
  },
];

/** Resolve a step field (no variant resolution needed for External Rating) */
export function resolveField(field: string): string {
  return field;
}

/** External Rating doesn't use variant placeholders — pass through */
export function resolveSelector(selector: string): string {
  return selector;
}
