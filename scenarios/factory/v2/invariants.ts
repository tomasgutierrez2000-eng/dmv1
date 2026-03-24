/**
 * Inter-stage invariant checker — runs after each stage mutation to catch
 * state corruption at the source, not 7 stages later in the QC pipeline.
 *
 * Invariants are lightweight checks (~0.01ms per facility) that verify
 * FacilityState consistency after each pipeline stage.
 */

import type { FacilityState } from './types';

export interface InvariantViolation {
  facility_id: string;
  stage: string;
  field: string;
  message: string;
  value: unknown;
}

/**
 * Check all invariants on a FacilityState after a stage mutation.
 * Returns empty array if all invariants pass.
 */
export function checkInvariants(
  state: FacilityState,
  stageName: string,
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const fid = state.facility_id;

  function fail(field: string, message: string, value: unknown): void {
    violations.push({ facility_id: fid, stage: stageName, field, message, value });
  }

  // Balance invariants
  if (state.drawn_amount < 0) {
    fail('drawn_amount', 'Negative drawn amount', state.drawn_amount);
  }
  if (state.committed_amount <= 0) {
    fail('committed_amount', 'Non-positive committed amount', state.committed_amount);
  }
  if (state.drawn_amount > state.committed_amount * 1.001) {
    // Allow 0.1% tolerance for floating point
    fail('drawn_amount', `Drawn (${state.drawn_amount}) exceeds committed (${state.committed_amount})`, state.drawn_amount);
  }
  if (state.undrawn_amount < -0.01) {
    fail('undrawn_amount', 'Negative undrawn amount', state.undrawn_amount);
  }

  // PD invariants
  if (state.pd_annual < 0) {
    fail('pd_annual', 'Negative PD', state.pd_annual);
  }
  if (state.pd_annual > 1) {
    fail('pd_annual', 'PD exceeds 100%', state.pd_annual);
  }

  // LGD invariants
  if (state.lgd_current < 0) {
    fail('lgd_current', 'Negative LGD', state.lgd_current);
  }
  if (state.lgd_current > 1) {
    fail('lgd_current', 'LGD exceeds 100%', state.lgd_current);
  }

  // Risk weight invariants
  if (state.risk_weight_pct < 0) {
    fail('risk_weight_pct', 'Negative risk weight', state.risk_weight_pct);
  }

  // Spread invariants
  if (state.spread_bps < 0) {
    fail('spread_bps', 'Negative spread', state.spread_bps);
  }
  if (state.spread_bps > 5000) {
    fail('spread_bps', 'Unrealistic spread (>5000bps)', state.spread_bps);
  }

  // Collateral invariants
  if (state.collateral_value < 0) {
    fail('collateral_value', 'Negative collateral value', state.collateral_value);
  }

  // DPD invariants
  if (state.days_past_due < 0) {
    fail('days_past_due', 'Negative DPD', state.days_past_due);
  }

  // IFRS 9 stage invariants
  if (![1, 2, 3].includes(state.ifrs9_stage)) {
    fail('ifrs9_stage', `Invalid IFRS 9 stage (must be 1, 2, or 3)`, state.ifrs9_stage);
  }

  // Rate invariants
  if (state.all_in_rate_pct < 0) {
    fail('all_in_rate_pct', 'Negative all-in rate', state.all_in_rate_pct);
  }

  // EAD/RWA/ECL invariants
  if (state.ead < 0) {
    fail('ead', 'Negative EAD', state.ead);
  }
  if (state.rwa < 0) {
    fail('rwa', 'Negative RWA', state.rwa);
  }

  // Cross-field consistency (lessons learned from eng review)
  // DPD > 90 should correlate with IFRS 9 stage 3
  if (state.days_past_due > 90 && state.ifrs9_stage === 1) {
    fail('ifrs9_stage', `DPD=${state.days_past_due} but IFRS9 stage=1 (should be 2 or 3)`, state.ifrs9_stage);
  }

  // DEFAULT credit status should have elevated PD
  if (state.credit_status === 'DEFAULT' && state.pd_annual < 0.10) {
    fail('pd_annual', `Credit status=DEFAULT but PD=${state.pd_annual} (<10%)`, state.pd_annual);
  }

  // Undrawn identity: committed - drawn should approximately equal undrawn
  const expectedUndrawn = state.committed_amount - state.drawn_amount;
  if (Math.abs(state.undrawn_amount - expectedUndrawn) > 1) {
    fail('undrawn_amount', `Undrawn (${state.undrawn_amount}) != committed-drawn (${expectedUndrawn})`, state.undrawn_amount);
  }

  return violations;
}

/**
 * Aggregate invariant violations across all facilities and report.
 * Returns true if all invariants pass.
 */
export function reportInvariants(
  violations: InvariantViolation[],
  verbose = false,
): boolean {
  if (violations.length === 0) return true;

  // Group by stage
  const byStage = new Map<string, InvariantViolation[]>();
  for (const v of violations) {
    const arr = byStage.get(v.stage) ?? [];
    arr.push(v);
    byStage.set(v.stage, arr);
  }

  console.warn(`\n⚠ ${violations.length} invariant violation(s) detected:`);
  for (const [stage, stageViolations] of byStage) {
    console.warn(`  Stage "${stage}": ${stageViolations.length} violation(s)`);
    if (verbose) {
      for (const v of stageViolations.slice(0, 5)) {
        console.warn(`    facility ${v.facility_id}: ${v.field} — ${v.message} (value: ${v.value})`);
      }
      if (stageViolations.length > 5) {
        console.warn(`    ... and ${stageViolations.length - 5} more`);
      }
    }
  }

  return false;
}
