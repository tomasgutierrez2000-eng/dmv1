/**
 * Covenant engine — covenant packages, testing, breach detection, event cascades.
 *
 * Each facility gets a covenant package appropriate for its rating tier.
 * On each test date, covenants are evaluated against the facility's
 * current financial state. Breaches trigger event cascades:
 *   breach → risk flag (0d) → exception (5d) → waiver request (15d)
 *   → if denied: credit event (30d)
 *
 * Cooldown periods prevent event spam (max 1 event per covenant per quarter).
 */

import type { RatingTier } from '../../../scripts/shared/mvp-config';
import type {
  CovenantType, CovenantDefinition, CovenantPackage, CovenantState,
  FacilityState, FacilityEvent, CounterpartyFinancials,
} from './types';
import { clamp } from './prng';

// ─── Default Covenant Packages by Rating Tier ──────────────────────────

const DEFAULT_PACKAGES: Record<RatingTier, CovenantPackage> = {
  IG_HIGH: {
    covenants: [
      { type: 'MAX_LEVERAGE', threshold: 5.0, direction: 'MAX', warning_buffer_pct: 0.15 },
    ],
    test_frequency: 'ANNUAL',
    cure_period_days: 30,
    cross_default_threshold: 0.50,
  },
  IG_MID: {
    covenants: [
      { type: 'MAX_LEVERAGE', threshold: 4.5, direction: 'MAX', warning_buffer_pct: 0.12 },
      { type: 'MIN_ICR', threshold: 2.0, direction: 'MIN', warning_buffer_pct: 0.10 },
    ],
    test_frequency: 'SEMI_ANNUAL',
    cure_period_days: 30,
    cross_default_threshold: 0.40,
  },
  IG_LOW: {
    covenants: [
      { type: 'MIN_DSCR', threshold: 1.25, direction: 'MIN', warning_buffer_pct: 0.10 },
      { type: 'MAX_LTV', threshold: 0.80, direction: 'MAX', warning_buffer_pct: 0.10 },
      { type: 'MAX_LEVERAGE', threshold: 4.0, direction: 'MAX', warning_buffer_pct: 0.10 },
    ],
    test_frequency: 'QUARTERLY',
    cure_period_days: 30,
    cross_default_threshold: 0.35,
  },
  HY_HIGH: {
    covenants: [
      { type: 'MIN_DSCR', threshold: 1.25, direction: 'MIN', warning_buffer_pct: 0.10 },
      { type: 'MAX_LTV', threshold: 0.75, direction: 'MAX', warning_buffer_pct: 0.10 },
      { type: 'MIN_ICR', threshold: 1.50, direction: 'MIN', warning_buffer_pct: 0.10 },
      { type: 'MAX_LEVERAGE', threshold: 3.5, direction: 'MAX', warning_buffer_pct: 0.10 },
    ],
    test_frequency: 'QUARTERLY',
    cure_period_days: 30,
    cross_default_threshold: 0.30,
  },
  HY_MID: {
    covenants: [
      { type: 'MIN_DSCR', threshold: 1.50, direction: 'MIN', warning_buffer_pct: 0.10 },
      { type: 'MAX_LTV', threshold: 0.65, direction: 'MAX', warning_buffer_pct: 0.08 },
      { type: 'MAX_LEVERAGE', threshold: 3.0, direction: 'MAX', warning_buffer_pct: 0.08 },
      { type: 'MIN_FIXED_CHARGE', threshold: 1.10, direction: 'MIN', warning_buffer_pct: 0.10 },
    ],
    test_frequency: 'QUARTERLY',
    cure_period_days: 30,
    cross_default_threshold: 0.25,
  },
  HY_LOW: {
    covenants: [
      { type: 'MIN_DSCR', threshold: 1.75, direction: 'MIN', warning_buffer_pct: 0.08 },
      { type: 'MAX_LTV', threshold: 0.60, direction: 'MAX', warning_buffer_pct: 0.08 },
      { type: 'MAX_LEVERAGE', threshold: 2.5, direction: 'MAX', warning_buffer_pct: 0.08 },
      { type: 'MIN_FIXED_CHARGE', threshold: 1.25, direction: 'MIN', warning_buffer_pct: 0.08 },
    ],
    test_frequency: 'QUARTERLY',
    cure_period_days: 30,
    cross_default_threshold: 0.20,
  },
};

// ─── Covenant Package Assignment ───────────────────────────────────────

/**
 * Get the default covenant package for a rating tier.
 * Can be overridden by scenario config.
 */
export function getDefaultCovenantPackage(tier: RatingTier): CovenantPackage {
  return structuredClone(DEFAULT_PACKAGES[tier]);
}

/**
 * Initialize covenant states from a package definition.
 */
export function initializeCovenantStates(pkg: CovenantPackage): CovenantState[] {
  return pkg.covenants.map(cov => ({
    covenant_type: cov.type,
    threshold_value: cov.threshold,
    current_value: cov.direction === 'MIN' ? cov.threshold * 1.5 : cov.threshold * 0.5,
    headroom_pct: 0.50, // Start with healthy headroom
    is_breached: false,
    is_warning: false,
    waiver_active: false,
    last_test_date: null,
  }));
}

// ─── Test Date Computation ─────────────────────────────────────────────

/**
 * Check if a date is a covenant test date.
 * Quarter-end months: March (3), June (6), September (9), December (12).
 * Semi-annual: June, December.
 * Annual: December.
 */
export function isTestDate(
  date: string,
  testFrequency: 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL',
  previousDate?: string,
): boolean {
  const month = new Date(date + 'T00:00:00Z').getUTCMonth() + 1;
  const day = new Date(date + 'T00:00:00Z').getUTCDate();
  // Test dates are typically the last business day of the relevant month
  // Window wide enough to catch weekly snapshots (day >= 20 covers ~10 days)
  const isMonthEnd = day >= 20;

  const quarterEndMonths = [3, 6, 9, 12];
  const semiEndMonths = [6, 12];

  // Direct hit: date falls in the last few days of a test month
  const directHit = (() => {
    switch (testFrequency) {
      case 'QUARTERLY':
        return isMonthEnd && quarterEndMonths.includes(month);
      case 'SEMI_ANNUAL':
        return isMonthEnd && semiEndMonths.includes(month);
      case 'ANNUAL':
        return isMonthEnd && month === 12;
    }
  })();

  if (directHit) return true;

  // Proximity check: if a quarter-end fell between previousDate and date,
  // treat this date as the closest available test date.
  if (previousDate) {
    const prevMonth = new Date(previousDate + 'T00:00:00Z').getUTCMonth() + 1;
    const prevYear = new Date(previousDate + 'T00:00:00Z').getUTCFullYear();
    const curYear = new Date(date + 'T00:00:00Z').getUTCFullYear();

    const testMonths = testFrequency === 'QUARTERLY' ? quarterEndMonths
      : testFrequency === 'SEMI_ANNUAL' ? semiEndMonths
      : [12];

    // Check if any test month boundary was crossed between previous and current date
    const prevTotal = prevYear * 12 + prevMonth;
    const curTotal = curYear * 12 + month;
    for (let m = prevTotal + 1; m <= curTotal; m++) {
      const mo = ((m - 1) % 12) + 1;
      if (testMonths.includes(mo)) return true;
    }
  }

  return false;
}

/**
 * Compute the next test date after a given date.
 */
export function nextTestDate(
  currentDate: string,
  testFrequency: 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL',
): string {
  const date = new Date(currentDate + 'T00:00:00Z');
  let month = date.getUTCMonth(); // 0-based
  let year = date.getUTCFullYear();

  const quarterMonths = [2, 5, 8, 11]; // 0-based: Mar, Jun, Sep, Dec
  const semiMonths = [5, 11];
  const annualMonths = [11];

  let targetMonths: number[];
  switch (testFrequency) {
    case 'QUARTERLY': targetMonths = quarterMonths; break;
    case 'SEMI_ANNUAL': targetMonths = semiMonths; break;
    case 'ANNUAL': targetMonths = annualMonths; break;
  }

  // Find next target month
  for (let i = 0; i < 12; i++) {
    month++;
    if (month > 11) { month = 0; year++; }
    if (targetMonths.includes(month)) {
      // Last day of that month
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      return lastDay.toISOString().slice(0, 10);
    }
  }

  // Fallback: 3 months from now
  const fallback = new Date(date);
  fallback.setUTCMonth(fallback.getUTCMonth() + 3);
  return fallback.toISOString().slice(0, 10);
}

// ─── Financial Metric Computation ──────────────────────────────────────

/**
 * Compute the actual value of a covenant metric from facility/counterparty state.
 */
export function computeCovenantMetric(
  covenantType: CovenantType,
  state: FacilityState,
  financials: CounterpartyFinancials,
): number {
  switch (covenantType) {
    case 'MIN_DSCR': {
      // DSCR = EBITDA / Debt Service
      const debtService = financials.interest_expense + (financials.total_debt * 0.02);
      return debtService > 0 ? financials.ebitda / debtService : 99;
    }
    case 'MAX_LTV': {
      // LTV = Drawn / Collateral Value
      return state.collateral_value > 0
        ? state.drawn_amount / state.collateral_value
        : 1.0;
    }
    case 'MIN_ICR': {
      // ICR = EBITDA / Interest Expense
      return financials.interest_expense > 0
        ? financials.ebitda / financials.interest_expense
        : 99;
    }
    case 'MAX_LEVERAGE': {
      // Leverage = Total Debt / EBITDA
      return financials.ebitda > 0
        ? financials.total_debt / financials.ebitda
        : 99;
    }
    case 'MIN_CURRENT_RATIO': {
      return financials.current_liabilities > 0
        ? financials.current_assets / financials.current_liabilities
        : 99;
    }
    case 'MIN_TANGIBLE_NET_WORTH': {
      return financials.tangible_net_worth;
    }
    case 'MAX_CAPEX': {
      return financials.capex;
    }
    case 'MIN_FIXED_CHARGE': {
      // Fixed Charge Coverage = (EBITDA - CapEx) / Fixed Charges
      return financials.fixed_charges > 0
        ? (financials.ebitda - financials.capex) / financials.fixed_charges
        : 99;
    }
  }
}

// ─── Covenant Testing ──────────────────────────────────────────────────

export interface CovenantTestResult {
  updatedStates: CovenantState[];
  events: FacilityEvent[];
  hasBreach: boolean;
  hasWarning: boolean;
}

/**
 * Test all covenants for a facility on a test date.
 *
 * Returns updated covenant states and any generated events.
 */
export function testCovenants(
  rng: () => number,
  state: FacilityState,
  financials: CounterpartyFinancials,
  date: string,
  previousDate?: string,
): CovenantTestResult {
  if (!state.covenant_package) {
    return { updatedStates: [], events: [], hasBreach: false, hasWarning: false };
  }

  const pkg = state.covenant_package;

  // Check if this is a test date
  if (!isTestDate(date, pkg.test_frequency, previousDate)) {
    return {
      updatedStates: state.covenants,
      events: [],
      hasBreach: false,
      hasWarning: false,
    };
  }

  const updatedStates: CovenantState[] = [];
  const events: FacilityEvent[] = [];
  let hasBreach = false;
  let hasWarning = false;

  for (const covDef of pkg.covenants) {
    const currentValue = computeCovenantMetric(covDef.type, state, financials);
    const threshold = covDef.threshold;

    // Compute headroom (NULLIF-style: guard against threshold === 0 to avoid div-by-zero)
    let headroom_pct: number;
    if (threshold === 0) {
      // With a zero threshold, headroom is undefined — treat as zero headroom
      headroom_pct = 0;
    } else if (covDef.direction === 'MIN') {
      headroom_pct = (currentValue - threshold) / threshold;
    } else {
      headroom_pct = (threshold - currentValue) / threshold;
    }
    headroom_pct = Math.round(headroom_pct * 10000) / 10000;

    // Check breach
    const is_breached = covDef.direction === 'MIN'
      ? currentValue < threshold
      : currentValue > threshold;

    // Check warning (within buffer)
    const is_warning = !is_breached && headroom_pct < covDef.warning_buffer_pct;

    // Determine if waiver is active (50% chance for IG, 25% for HY on breach)
    let waiver_active = false;
    if (is_breached) {
      hasBreach = true;
      const isIG = state.rating_tier.startsWith('IG');
      waiver_active = rng() < (isIG ? 0.50 : 0.25);

      // Generate breach events
      events.push({
        type: 'COVENANT_BREACH',
        date,
        description: `${covDef.type} covenant breached: ${currentValue.toFixed(2)} vs threshold ${threshold.toFixed(2)} (headroom: ${(headroom_pct * 100).toFixed(1)}%)`,
        severity: waiver_active ? 'MEDIUM' : 'HIGH',
        triggered_by: `covenant_test_${covDef.type}`,
        facility_ids: [state.facility_id],
        counterparty_id: state.counterparty_id,
      });

      if (!waiver_active) {
        // No waiver — escalate
        events.push({
          type: 'COVENANT_BREACH_NO_WAIVER',
          date,
          description: `Waiver denied for ${covDef.type} breach. Potential credit event.`,
          severity: 'CRITICAL',
          triggered_by: `covenant_breach_${covDef.type}`,
          facility_ids: [state.facility_id],
          counterparty_id: state.counterparty_id,
        });
      }
    }

    if (is_warning) {
      hasWarning = true;
      events.push({
        type: 'COVENANT_WARNING',
        date,
        description: `${covDef.type} approaching threshold: ${currentValue.toFixed(2)} vs ${threshold.toFixed(2)} (${(headroom_pct * 100).toFixed(1)}% headroom)`,
        severity: 'LOW',
        triggered_by: `covenant_test_${covDef.type}`,
        facility_ids: [state.facility_id],
        counterparty_id: state.counterparty_id,
      });
    }

    updatedStates.push({
      covenant_type: covDef.type,
      threshold_value: threshold,
      current_value: Math.round(currentValue * 10000) / 10000,
      headroom_pct,
      is_breached,
      is_warning,
      waiver_active,
      last_test_date: date,
    });
  }

  return { updatedStates, events, hasBreach, hasWarning };
}

// ─── Cross-Default Detection ───────────────────────────────────────────

/**
 * Check if a covenant breach triggers cross-default on other facilities
 * of the same counterparty.
 *
 * Cross-default: if one facility in a credit agreement defaults,
 * other facilities under the same or related agreements may also default.
 */
export function checkCrossDefault(
  breachedFacilityId: number,
  counterpartyFacilities: FacilityState[],
  crossDefaultThreshold: number,
  currentDate?: string,
): FacilityEvent[] {
  const events: FacilityEvent[] = [];
  const breachedFacility = counterpartyFacilities.find(f => f.facility_id === breachedFacilityId);
  if (!breachedFacility) return events;

  const eventDate = breachedFacility.covenants.find(c => c.is_breached)?.last_test_date
    ?? currentDate ?? '1970-01-01';

  // Primary scope: facilities under the same credit agreement
  const sameAgreement = counterpartyFacilities.filter(
    f => f.credit_agreement_id === breachedFacility.credit_agreement_id
      && f.facility_id !== breachedFacilityId
  );
  const agreementExposure = sameAgreement.reduce((s, f) => s + f.drawn_amount, 0)
    + breachedFacility.drawn_amount;

  if (agreementExposure > 0
    && breachedFacility.drawn_amount / agreementExposure >= crossDefaultThreshold
    && sameAgreement.length > 0) {
    events.push({
      type: 'CROSS_DEFAULT',
      date: eventDate,
      description: `Cross-default triggered by facility ${breachedFacilityId} within agreement ${breachedFacility.credit_agreement_id} (${(breachedFacility.drawn_amount / agreementExposure * 100).toFixed(1)}% of agreement exposure)`,
      severity: 'CRITICAL',
      triggered_by: `cross_default_${breachedFacilityId}`,
      facility_ids: sameAgreement.map(f => f.facility_id),
      counterparty_id: breachedFacility.counterparty_id,
    });
  }

  // Secondary scope: other agreements for the same counterparty (warning-level contagion)
  const otherAgreements = counterpartyFacilities.filter(
    f => f.credit_agreement_id !== breachedFacility.credit_agreement_id
      && f.facility_id !== breachedFacilityId
  );
  if (otherAgreements.length > 0) {
    const totalExposure = counterpartyFacilities.reduce((s, f) => s + f.drawn_amount, 0);
    if (totalExposure > 0
      && breachedFacility.drawn_amount / totalExposure >= crossDefaultThreshold) {
      events.push({
        type: 'CROSS_DEFAULT_CONTAGION',
        date: eventDate,
        description: `Cross-default contagion from agreement ${breachedFacility.credit_agreement_id} to other counterparty agreements`,
        severity: 'HIGH',
        triggered_by: `cross_default_contagion_${breachedFacilityId}`,
        facility_ids: otherAgreements.map(f => f.facility_id),
        counterparty_id: breachedFacility.counterparty_id,
      });
    }
  }

  return events;
}
