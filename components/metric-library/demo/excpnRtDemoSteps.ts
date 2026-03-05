/* ────────────────────────────────────────────────────────────────────────────
 * Exception Rate Lineage Demo — Step Definitions
 *
 * Each step defines what to spotlight, what narration to show, and any
 * side-effects (expanding rollup levels, etc.).
 *
 * Exception Rate has two variants:
 *   - all_exceptions: counts ALL policy exceptions
 *   - material_exceptions: counts only MAJOR/CRITICAL severity
 *
 * Narration is written for a non-finance audience — every banking term
 * is explained in plain English when first introduced.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { GenericDemoStep } from './useDemoEngine';

export type ExcpnRtVariantKey = 'all_exceptions' | 'material_exceptions';

/* ────────────────────────────────────────────────────────────────────────── */

export const EXCPN_RT_DEMO_STEPS: GenericDemoStep<ExcpnRtVariantKey>[] = [
  /* ── Step 0: Welcome ───────────────────────────────────────────────────── */
  {
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: 'Welcome to the Exception Rate Lineage Demo',
    narration:
      'Exception Rate answers a critical governance question: "What proportion of our loans were approved outside standard underwriting policy?"\n\nIn banking, an "exception" occurs when a loan is approved even though it violates one or more internal credit policies — for example, the LTV ratio exceeds the 80% limit, or the borrower\'s DSCR falls below 1.25x.\n\nRegulators closely monitor exception rates because a rising rate signals weakening credit standards — a leading indicator of future credit losses.\n\nThis walkthrough will show you how exception data is sourced, calculated, and rolled up from individual loans to the portfolio level.',
    targetSelector: '[data-demo="header"]',
  },

  /* ── Step 1: Formula overview ──────────────────────────────────────────── */
  {
    id: 'excpn-rt-formula-intro',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v: ExcpnRtVariantKey) => v === 'all_exceptions' ? 'The Exception Rate Formula (All)' : 'The Exception Rate Formula (Material)',
    narration: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? 'Exception Rate uses a simple count-based ratio:\n\nException Count / Total Facility Count × 100\n\nException Count is the number of facilities with an active policy exception flag. This flag is set during the credit approval process when underwriters document that a loan deviates from standard policy.\n\nTotal Facility Count is simply the count of all active facilities in scope.\n\nUnlike dollar-weighted metrics (like LTV or DSCR), Exception Rate treats every loan equally — a $1M loan and a $100M loan each count as one.'
        : 'The Material Exception Rate narrows the lens:\n\nMaterial Exception Count / Total Facility Count × 100\n\nOnly exceptions classified as MAJOR or CRITICAL severity are counted. Minor technical exceptions (like a documentation waiver on a renewal) are excluded.\n\nThis distinction matters because regulators and credit committees focus on material exceptions that represent genuine deviations from sound underwriting — not paperwork technicalities.',
    targetSelector: '[data-demo="step1-variant-{v}"]',
    insight:
      'Exception Rate is count-based, not dollar-weighted. This means a small $5M loan exception counts the same as a large $500M exception — intentionally, because the goal is measuring policy adherence, not risk exposure.',
  },

  /* ── Step 2: Exception Flag (input 1) ──────────────────────────────────── */
  {
    id: 'exception-flag',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v: ExcpnRtVariantKey) => v === 'all_exceptions' ? 'Input 1: Exception Flag' : 'Input 1: Exception Flag + Severity Filter',
    narration: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? 'The first input is the Exception Flag — a boolean (true/false) field that indicates whether a facility was approved with a policy exception.\n\nFor our example facility:\n\nexception_flag = true\nexception_type = LTV_BREACH\n\nThis comes from the facility_credit_approval table, which records the outcome of the credit approval process. When a loan officer submits a deal for approval that breaches policy, the credit committee reviews it and either approves with an exception (flag = true) or rejects it.'
        : 'For the Material variant, we need both the exception flag AND the severity classification:\n\nexception_flag = true\nexception_type = LTV_BREACH\nexception_severity = MAJOR\n\nOnly MAJOR and CRITICAL severities count as "material." MINOR exceptions — like a documentation delay or a small covenant technicality — are excluded.\n\nSeverity is assigned by the credit committee at approval time, based on how far the facility deviates from policy and whether compensating factors exist.',
    targetSelector: '[data-demo="num-section-{v}"]',
    formulaKey: 'exception-flag-build',
  },

  /* ── Step 3: Facility Count (input 2) ──────────────────────────────────── */
  {
    id: 'facility-count',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: 'Input 2: Total Facility Count',
    narration:
      'The second input is simply the count of active facilities in scope.\n\nFor our example:\n\nTotal Facilities = 5\n\nThis denominator comes from counting rows in the facility_master table where the facility is active. Every active loan counts as one, regardless of its size, product type, or risk profile.\n\nThe denominator stays the same for both the "All Exceptions" and "Material Exceptions" variants — only the numerator changes.',
    targetSelector: '[data-demo="den-section-{v}"]',
    formulaKey: 'count-build',
  },

  /* ── Step 4: Result ────────────────────────────────────────────────────── */
  {
    id: 'excpn-rt-result',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: (v: ExcpnRtVariantKey) => v === 'all_exceptions' ? 'Result: 60.00%' : 'Result: 40.00%',
    narration: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? '3 exceptions / 5 total facilities × 100 = 60.00%\n\nThis means 60% of the portfolio\'s loans have at least one active policy exception. In practice, a rate this high would trigger immediate regulatory attention.\n\nTypical G-SIB exception rate targets range from 5–15%. A 60% rate would indicate systemic issues in the credit approval process — likely meaning policy limits are set too tight relative to market conditions, or credit standards are genuinely deteriorating.'
        : '2 material exceptions / 5 total facilities × 100 = 40.00%\n\nBy filtering to only MAJOR and CRITICAL exceptions, the rate drops from 60% to 40%. Facility C\'s covenant waiver (MINOR severity) is excluded.\n\nThis filtered view is what the Chief Risk Officer and Board Risk Committee typically review. It strips away noise from technical/minor exceptions and focuses on the loans that represent genuine policy breaches.',
    targetSelector: '[data-demo="result-{v}"]',
    insight: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? 'Exception Rate is a leading indicator — rising rates today predict higher credit losses 12–24 months from now. Regulators pay attention to trends, not just point-in-time levels.'
        : 'The gap between All (60%) and Material (40%) tells its own story. A narrow gap means most exceptions are serious. A wide gap suggests many are technicalities that may warrant policy recalibration.',
    formulaKey: 'divide-result',
  },

  /* ── Step 5: L1 Reference Tables ───────────────────────────────────────── */
  {
    id: 'l1-reference',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Data Lives: Reference Tables',
    narration:
      'Before the formula can run, the system needs to know the basics: Which facility are we looking at? Who is the borrower? Which business unit manages it?\n\nThis information lives in "L1 Reference Tables" — the master data layer:\n\n• facility_master — the canonical record for each loan: facility ID, product type, committed amount, and the foreign keys that link it to a borrower and business unit\n• counterparty — borrower identity: legal name, risk rating, industry\n• enterprise_business_taxonomy — the bank\'s organizational tree: desk → portfolio → business segment\n\nThese tables are relatively static and serve as the backbone for joining everything together.',
    targetSelector: '[data-demo="step2"]',
    insight:
      'These reference tables are shared across every metric — the same counterparty record that groups Exception Rate also groups LTV, DSCR, and Interest Income.',
  },

  /* ── Step 6: L2 Snapshot Tables ────────────────────────────────────────── */
  {
    id: 'l2-snapshot',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'Where the Exception Data Comes From: Approval Records',
    narration:
      'The exception-specific data lives in an "L2 Snapshot Table" — a periodic record of credit approval outcomes:\n\n• facility_credit_approval — records whether each facility has an active exception, its type (LTV_BREACH, DSCR_BREACH, COVENANT_WAIVER, etc.), severity (MINOR/MAJOR/CRITICAL), and the authority that approved it\n\nThis table is keyed by facility_id + as_of_date, just like other L2 snapshots. Exception status is re-evaluated quarterly — a facility that was an exception at origination may cure (come back into compliance) over time as the borrower pays down the loan or collateral values recover.',
    targetSelector: '[data-demo="step3"]',
  },

  /* ── Step 7: Calculation Engine ────────────────────────────────────────── */
  {
    id: 'calc-engine',
    phase: 4,
    phaseLabel: 'Calculation',
    title: (v: ExcpnRtVariantKey) => v === 'all_exceptions' ? 'The Math: 3 / 5 = 60%' : 'The Math: 2 / 5 = 40%',
    narration: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? 'The calculation engine counts facilities with exception_flag = true from facility_credit_approval, divides by the total count of active facilities from facility_master, and multiplies by 100:\n\nCOUNT(WHERE exception_flag = true) / COUNT(*) × 100\n= 3 / 5 × 100 = 60.00%\n\nThis produces a single portfolio-level exception rate. But the real power is in the rollup — seeing this rate broken down by borrower, desk, and business segment.'
        : 'For the Material variant, the calculation adds a severity filter:\n\nCOUNT(WHERE exception_flag = true AND severity IN (\'MAJOR\', \'CRITICAL\')) / COUNT(*) × 100\n= 2 / 5 × 100 = 40.00%\n\nFacility C\'s COVENANT_WAIVER (MINOR severity) is excluded, dropping the count from 3 to 2.',
    targetSelector: '[data-demo="step4-variant-{v}"]',
  },

  /* ── Step 8: The Golden Rule: Pooled Division ──────────────────────────── */
  {
    id: 'foundational-rule',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'The Golden Rule: Re-Pool Counts at Every Level',
    narration:
      'Before we walk through how Exception Rate combines across multiple loans, one key property governs this metric:\n\nException Rate uses POOLED DIVISION — re-pool numerator and denominator at every level.\n\nYou cannot simply average the exception rates of two groups. If CRE Lending has 66.67% (2/3) and Corp Lending has 50.00% (1/2), the portfolio rate is NOT (66.67 + 50.00) / 2 = 58.33%.\n\nThe correct answer is to re-pool: (2+1) / (3+2) = 3/5 = 60.00%.\n\nThis is the same pooled-division pattern used by LTV and DSCR — always sum the numerators and sum the denominators before dividing.',
    targetSelector: '[data-demo="foundational-rule"]',
    formulaKey: 'foundational-rule',
  },

  /* ── Step 9: Facility Level ────────────────────────────────────────────── */
  {
    id: 'rollup-facility',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 1: Individual Loan (Facility)',
    narration:
      'At the individual loan level, Exception Rate is binary — either 100% (has an exception) or 0% (no exception).\n\nLet\'s look at five facilities belonging to two borrowers:',
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
    narration: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? 'A single borrower may have multiple loans. To compute their exception rate, pool the counts:\n\nApex Properties: 2 exceptions / 3 facilities = 66.67%\nMeridian Corp: 1 exception / 2 facilities = 50.00%\n\nNotice this is NOT an average of the individual facility rates — it\'s a fresh division of pooled counts.'
        : 'For the Material variant, only MAJOR/CRITICAL exceptions count:\n\nApex Properties: 1 material / 3 facilities = 33.33%\nMeridian Corp: 1 material / 2 facilities = 50.00%\n\nApex\'s rate drops significantly because Facility C\'s COVENANT_WAIVER (MINOR) is excluded.',
    targetSelector: '[data-demo="rollup-counterparty"]',
    onEnter: { expandLevel: 'counterparty' },
    formulaKey: 'rollup-counterparty',
  },

  /* ── Step 11: Desk Level ───────────────────────────────────────────────── */
  {
    id: 'rollup-desk',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 3: Trading Desk',
    narration: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? 'A trading desk manages a group of facilities. Exception Rate at the desk level pools all facilities assigned to that desk:\n\nCRE Lending: 2 / 3 = 66.67% (3 facilities)\nCorp Lending: 1 / 2 = 50.00% (2 facilities)\n\nThis tells risk managers which desks have the highest concentration of policy exceptions — useful for targeted credit reviews and audit planning.'
        : 'Material Exception Rate by desk:\n\nCRE Lending: 1 / 3 = 33.33%\nCorp Lending: 1 / 2 = 50.00%\n\nInterestingly, Corp Lending has a higher material exception rate than CRE Lending in this example — Facility E\'s DSCR breach was classified as CRITICAL.',
    targetSelector: '[data-demo="rollup-desk"]',
    onEnter: { expandLevel: 'desk' },
    formulaKey: 'rollup-desk',
  },

  /* ── Step 12: Portfolio / LoB Level ────────────────────────────────────── */
  {
    id: 'rollup-portfolio',
    phase: 5,
    phaseLabel: 'Rollup Hierarchy',
    title: 'Level 4 & 5: Portfolio & Business Segment',
    narration: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? 'At the portfolio and business segment levels, the pattern continues — pool all counts from child segments:\n\nPortfolio Total: (2 + 1) / (3 + 2) = 3 / 5 = 60.00%\n\nThis single number appears on the CRO\'s dashboard and in regulatory reports. Trends in this rate over time are scrutinized by:\n\n• OCC examiners (Comptroller\'s Handbook)\n• Internal Audit (exception tracking)\n• Board Risk Committee (quarterly risk appetite reporting)'
        : 'Material Exception Rate at the portfolio level:\n\nPortfolio Total: (1 + 1) / (3 + 2) = 2 / 5 = 40.00%\n\nThis is the number that matters most in CCAR stress testing and regulatory discussions. A material exception rate above policy limits (typically 10–15%) triggers escalation to the Chief Risk Officer and potentially the Board.',
    targetSelector: '[data-demo="rollup-portfolio"]',
    onEnter: { expandLevel: 'portfolio' },
    formulaKey: 'rollup-portfolio',
    insight: (v: ExcpnRtVariantKey) =>
      v === 'all_exceptions'
        ? 'Because Exception Rate is pooled, the portfolio total is always exact — no approximation. Every exception traces back to a specific facility and approval decision.'
        : 'The 20-point gap between All Exceptions (60%) and Material (40%) suggests roughly a third of exceptions are minor. This insight helps calibrate whether credit policies need tightening or if thresholds are too conservative.',
  },

  /* ── Step 13: Dashboard ────────────────────────────────────────────────── */
  {
    id: 'dashboard',
    phase: 6,
    phaseLabel: 'Dashboard Consumption',
    title: 'The Finish Line: Dashboard',
    narration:
      'Everything we\'ve walked through — exception identification, count pooling, severity filtering, and rollup — comes together on the dashboard.\n\nA user selects:\n• Which level to view (facility, borrower, desk, portfolio)\n• Which variant (All Exceptions or Material only)\n\nThe platform handles all the counting, filtering, and pooled division behind the scenes. Every exception rate value can be traced backwards through the rollup hierarchy, through the approval records, all the way back to the individual loan\'s credit decision.\n\nFull auditability — essential for regulatory compliance.',
    targetSelector: '[data-demo="step6"]',
    insight:
      'Exception Rate is often paired with Exception Trend (rate over time) and Exception Aging (how long exceptions remain outstanding). Together, they form a complete credit governance monitoring suite.',
  },
];

/** Resolve a step field that may be a function of the variant */
export function resolveExcpnRtField<T>(field: T | ((v: ExcpnRtVariantKey) => T), variant: ExcpnRtVariantKey): T {
  return typeof field === 'function' ? (field as (v: ExcpnRtVariantKey) => T)(variant) : field;
}

/** Replace {v} placeholder in a selector with the variant key */
export function resolveExcpnRtSelector(selector: string, variant: ExcpnRtVariantKey): string {
  return selector.replace(/\{v\}/g, variant);
}
