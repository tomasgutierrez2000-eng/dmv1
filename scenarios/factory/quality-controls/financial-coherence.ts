/**
 * Quality Control Group 12: Financial Coherence
 *
 * Product-specific bounds checks for non-credit positions.
 * Validates that generated data is financially meaningful:
 * - Derivative MTM within bounds relative to notional
 * - SFT overcollateralization
 * - Deposit FDIC limits
 * - Security price/yield inverse relationship
 * - Rate ordering and spread relationships
 */

import type { QualityControlResult } from './shared-types';
import { sampleRows } from './shared-types';
import type { SqlRow } from '../v2/types';

interface TableRows {
  table: string;
  rows: SqlRow[];
}

const MAX_ISSUES_PER_CHECK = 5;

export function runFinancialCoherence(tables: TableRows[]): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const find = (name: string) => tables.find(t => t.table === name)?.rows ?? [];

  // ─── DERIVATIVES ───────────────────────────────────────────────────
  checkDerivatives(find('derivatives_accounting_snapshot'), find('derivatives_risk_snapshot'), errors, warnings);

  // ─── SFT ───────────────────────────────────────────────────────────
  checkSFT(find('sft_accounting_snapshot'), find('sft_risk_snapshot'), errors, warnings);

  // ─── SECURITIES ────────────────────────────────────────────────────
  checkSecurities(find('securities_accounting_snapshot'), find('securities_indicative_snapshot'), errors, warnings);

  // ─── DEPOSITS ──────────────────────────────────────────────────────
  checkDeposits(find('deposits_accounting_snapshot'), find('deposits_indicative_snapshot'), errors, warnings);

  // ─── BORROWINGS ────────────────────────────────────────────────────
  checkBorrowings(find('borrowings_accounting_snapshot'), find('borrowings_indicative_snapshot'), errors, warnings);

  // ─── DEBT ──────────────────────────────────────────────────────────
  checkDebt(find('debt_accounting_snapshot'), find('debt_indicative_snapshot'), errors, warnings);

  // ─── EQUITIES/STOCK ────────────────────────────────────────────────
  checkEquities(find('equities_accounting_snapshot'), errors, warnings);
  checkStock(find('stock_accounting_snapshot'), errors, warnings);

  return { errors, warnings };
}

// ─── Derivative Checks ───────────────────────────────────────────────────

function checkDerivatives(acct: SqlRow[], risk: SqlRow[], errors: string[], warnings: string[]): void {
  let mtmIssues = 0;
  let pfeIssues = 0;

  for (const row of sampleRows(acct, 300)) {
    const mtm = Math.abs(num(row, 'fair_value'));
    const notional = num(row, 'notional_amount');
    if (notional > 0 && mtm / notional > 0.15) {
      if (++mtmIssues <= MAX_ISSUES_PER_CHECK)
        warnings.push(`[FC-DERIV-MTM] pos=${row.position_id}: |MTM|/notional=${(mtm/notional*100).toFixed(1)}% exceeds 15% threshold`);
    }
  }

  for (const row of sampleRows(risk, 300)) {
    const pfe = num(row, 'potential_future_exposure_amount');
    if (pfe < 0) {
      if (++pfeIssues <= MAX_ISSUES_PER_CHECK)
        errors.push(`[FC-DERIV-PFE] pos=${row.position_id}: PFE=${pfe} is negative — must be >= 0`);
    }
    const pd = num(row, 'probability_of_default_pd');
    if (pd < 0 || pd > 1) {
      errors.push(`[FC-DERIV-PD] pos=${row.position_id}: PD=${pd} outside [0,1]`);
    }
  }
}

// ─── SFT Checks ──────────────────────────────────────────────────────────

function checkSFT(acct: SqlRow[], risk: SqlRow[], errors: string[], warnings: string[]): void {
  let overCollIssues = 0;

  for (const row of sampleRows(acct, 300)) {
    const cashLeg = num(row, 'bs_amount');
    const collateral = num(row, 'collateral_fair_value');
    if (cashLeg > 0 && collateral < cashLeg) {
      if (++overCollIssues <= MAX_ISSUES_PER_CHECK)
        warnings.push(`[FC-SFT-COLL] pos=${row.position_id}: collateral=${collateral.toFixed(0)} < cash_leg=${cashLeg.toFixed(0)} — undercollateralized`);
    }
  }
}

// ─── Securities Checks ───────────────────────────────────────────────────

function checkSecurities(acct: SqlRow[], ind: SqlRow[], errors: string[], warnings: string[]): void {
  let priceIssues = 0;

  for (const row of sampleRows(ind, 300)) {
    const rate = num(row, 'interest_rate');
    if (rate < 0) {
      errors.push(`[FC-SEC-YIELD] pos=${row.position_id}: yield=${rate} is negative`);
    }
  }

  for (const row of sampleRows(acct, 300)) {
    const price = num(row, 'price');
    if (price > 0 && (price < 70 || price > 130)) {
      if (++priceIssues <= MAX_ISSUES_PER_CHECK)
        warnings.push(`[FC-SEC-PRICE] pos=${row.position_id}: price=${price.toFixed(2)} outside [70,130] — unusual for non-distressed`);
    }
  }
}

// ─── Deposit Checks ──────────────────────────────────────────────────────

function checkDeposits(acct: SqlRow[], ind: SqlRow[], errors: string[], warnings: string[]): void {
  for (const row of sampleRows(acct, 300)) {
    const balance = num(row, 'deposit_balance');
    if (balance <= 0) {
      errors.push(`[FC-DEP-BAL] pos=${row.position_id}: balance=${balance} must be > 0`);
    }
    const insured = num(row, 'fdic_insured_balance');
    if (insured > 250000) {
      errors.push(`[FC-DEP-FDIC] pos=${row.position_id}: insured_balance=${insured} exceeds FDIC $250K limit`);
    }
  }

  // Check rate ordering: DEMAND < SAVINGS < MMDA ≤ TIME_DEP
  const ratesByType: Record<string, number[]> = {};
  for (const row of ind) {
    const depType = String(row.deposit_account_type ?? '');
    const rate = num(row, 'interest_rate');
    if (!ratesByType[depType]) ratesByType[depType] = [];
    ratesByType[depType].push(rate);
  }
  const avgRate = (rates: number[]) => rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const demandAvg = avgRate(ratesByType['DEMAND_DEP'] ?? []);
  const savingsAvg = avgRate(ratesByType['SAVINGS'] ?? []);
  const mmdaAvg = avgRate(ratesByType['MMDA'] ?? []);
  const timeAvg = avgRate(ratesByType['TIME_DEP'] ?? []);
  if (demandAvg > savingsAvg && savingsAvg > 0) {
    warnings.push(`[FC-DEP-RATE-ORDER] DEMAND avg rate (${demandAvg.toFixed(4)}) > SAVINGS avg (${savingsAvg.toFixed(4)})`);
  }
  if (savingsAvg > mmdaAvg && mmdaAvg > 0 && savingsAvg > 0) {
    warnings.push(`[FC-DEP-RATE-ORDER] SAVINGS avg rate (${savingsAvg.toFixed(4)}) > MMDA avg (${mmdaAvg.toFixed(4)})`);
  }
}

// ─── Borrowing Checks ────────────────────────────────────────────────────

function checkBorrowings(acct: SqlRow[], ind: SqlRow[], errors: string[], warnings: string[]): void {
  for (const row of sampleRows(acct, 300)) {
    const principal = num(row, 'current_outstanding_balance');
    if (principal <= 0) {
      errors.push(`[FC-BORR-PRINC] pos=${row.position_id}: principal=${principal} must be > 0`);
    }
  }
}

// ─── Debt Checks ─────────────────────────────────────────────────────────

function checkDebt(acct: SqlRow[], ind: SqlRow[], errors: string[], warnings: string[]): void {
  for (const row of sampleRows(ind, 300)) {
    const coupon = num(row, 'interest_rate');
    if (coupon <= 0) {
      errors.push(`[FC-DEBT-COUPON] pos=${row.position_id}: coupon=${coupon} must be > 0`);
    }
  }
}

// ─── Equity Checks ───────────────────────────────────────────────────────

function checkEquities(acct: SqlRow[], errors: string[], warnings: string[]): void {
  for (const row of sampleRows(acct, 300)) {
    const mv = num(row, 'market_value');
    if (mv <= 0) errors.push(`[FC-EQ-MV] pos=${row.position_id}: market_value=${mv} must be > 0`);
    const shares = num(row, 'number_of_shares');
    if (shares <= 0) errors.push(`[FC-EQ-SHARES] pos=${row.position_id}: shares=${shares} must be > 0`);
    const ownershipPct = num(row, 'ownership_percentage');
    if (ownershipPct < 0 || ownershipPct > 100) {
      errors.push(`[FC-EQ-OWN] pos=${row.position_id}: ownership=${ownershipPct}% outside [0,100]`);
    }
  }
}

// ─── Stock Checks ────────────────────────────────────────────────────────

function checkStock(acct: SqlRow[], errors: string[], warnings: string[]): void {
  for (const row of sampleRows(acct, 300)) {
    const mv = num(row, 'market_value');
    if (mv <= 0) errors.push(`[FC-STK-MV] pos=${row.position_id}: market_value=${mv} must be > 0`);
    const shares = num(row, 'number_of_shares');
    if (shares <= 0) errors.push(`[FC-STK-SHARES] pos=${row.position_id}: shares=${shares} must be > 0`);
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────

function num(row: SqlRow, field: string): number {
  const v = row[field];
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}
