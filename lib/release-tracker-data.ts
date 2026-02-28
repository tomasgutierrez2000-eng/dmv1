export interface ReleaseEntry {
  date: string;
  layer: 'L1' | 'L2' | 'L3';
  table: string;
  field: string;
  changeType: 'Added' | 'Removed' | 'Moved';
  rationale: string;
}

/** All data model changes, newest first. */
export const RELEASE_ENTRIES: ReleaseEntry[] = [
  // ── 2026-02-27: Data model enhancements — product tagging, active flag, criticized portfolios, cross-entity exposure ──
  { date: '2026-02-27', layer: 'L2', table: 'position', field: 'product_node_id', changeType: 'Added', rationale: 'Added position-level product tagging (FK to enterprise_product_taxonomy) to capture granular product type (e.g. Revolving Loan, Term Loan). Facility-level product_node_id remains for parent product groups.' },
  { date: '2026-02-27', layer: 'L1', table: 'facility_master', field: 'active_flag', changeType: 'Added', rationale: 'Added explicit active flag (CHAR(1), Y/N) to facility_master, derived from facility_status. Follows the same pattern used by 33+ other L1 reference tables. Replaces application-layer derivation of is_active.' },
  { date: '2026-02-27', layer: 'L3', table: 'lob_credit_quality_summary', field: 'criticized_exposure_amt', changeType: 'Added', rationale: 'Added total exposure amount for facilities flagged as CRITICIZED within each LOB. Complements the existing criticized_portfolio_count (which was already in the DDL but had no population SQL). Population procedure l3.populate_lob_credit_quality_criticized now computes both fields.' },
  { date: '2026-02-27', layer: 'L3', table: 'lob_deterioration_summary', field: 'criticized_exposure_amt', changeType: 'Added', rationale: 'Added total exposure amount for criticized facilities to the deterioration summary. Population procedure l3.populate_lob_deterioration_criticized now computes both criticized_portfolio_count and criticized_exposure_amt.' },

  // ── 2026-02-25: Atomic metrics moved L3 → L2 ──────────────────────
  { date: '2026-02-25', layer: 'L2', table: 'facility_exposure_snapshot', field: 'number_of_loans', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2 — L2 holds source-system values, L3 only derived' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_exposure_snapshot', field: 'number_of_facilities', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_exposure_snapshot', field: 'days_until_maturity', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_exposure_snapshot', field: 'facility_utilization_status', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_exposure_snapshot', field: 'limit_status_code', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_exposure_snapshot', field: 'rwa_amt', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_exposure_snapshot', field: 'internal_risk_rating_bucket_code', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_financial_snapshot', field: 'dscr_value', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_financial_snapshot', field: 'ltv_pct', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_financial_snapshot', field: 'net_income_amt', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'facility_financial_snapshot', field: 'interest_rate_sensitivity_pct', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'counterparty_rating_observation', field: 'risk_rating_status', changeType: 'Added', rationale: 'Atomic observed value (Downgrade/Upgrade/Stable) moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L2', table: 'counterparty_rating_observation', field: 'risk_rating_change_steps', changeType: 'Added', rationale: 'Atomic observed value moved from L3 to L2' },
  { date: '2026-02-25', layer: 'L3', table: 'counterparty_exposure_summary', field: 'number_of_loans', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2.facility_exposure_snapshot' },
  { date: '2026-02-25', layer: 'L3', table: 'lob_exposure_summary', field: 'number_of_loans', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2.facility_exposure_snapshot' },
  { date: '2026-02-25', layer: 'L3', table: 'lob_profitability_summary', field: 'return_on_rwa_pct', changeType: 'Removed', rationale: 'Was atomic, not calculated — removed from L3' },
  { date: '2026-02-25', layer: 'L3', table: 'facility_detail_snapshot', field: 'pricing_tier', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2.facility_pricing_snapshot' },
  { date: '2026-02-25', layer: 'L3', table: 'facility_detail_snapshot', field: 'pricing_exception_flag', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2.facility_pricing_snapshot' },
  { date: '2026-02-25', layer: 'L3', table: 'facility_detail_snapshot', field: 'number_of_loans', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2.facility_exposure_snapshot' },
  { date: '2026-02-25', layer: 'L3', table: 'lob_risk_ratio_summary', field: 'dscr_value', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2.facility_financial_snapshot' },
  { date: '2026-02-25', layer: 'L3', table: 'lob_risk_ratio_summary', field: 'ltv_pct', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2.facility_financial_snapshot' },
  { date: '2026-02-25', layer: 'L3', table: 'lob_risk_ratio_summary', field: 'interest_rate_sensitivity_pct', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2.facility_financial_snapshot' },
  { date: '2026-02-25', layer: 'L3', table: 'lob_risk_ratio_summary', field: 'return_on_rwa_pct', changeType: 'Removed', rationale: 'Was atomic, not calculated — removed from L3' },
  { date: '2026-02-25', layer: 'L3', table: 'lob_rating_distribution', field: 'internal_risk_rating_bucket_code', changeType: 'Removed', rationale: 'Was atomic, not calculated — moved to L2' },

  // ── 2026-02-24: New table for syndicated deal modeling ─────────────
  { date: '2026-02-24', layer: 'L1', table: 'facility_lender_allocation', field: '(new table)', changeType: 'Added', rationale: 'Issuer-side bank share tracking for multi-bank syndicated deals' },
  { date: '2026-02-24', layer: 'L1', table: 'facility_lender_allocation', field: 'lender_allocation_id', changeType: 'Added', rationale: 'Primary key for lender allocation records' },
  { date: '2026-02-24', layer: 'L1', table: 'facility_lender_allocation', field: 'facility_id', changeType: 'Added', rationale: 'FK to facility_master — links allocation to facility' },
  { date: '2026-02-24', layer: 'L1', table: 'facility_lender_allocation', field: 'legal_entity_id', changeType: 'Added', rationale: 'FK to legal_entity — which bank entity holds this share' },
  { date: '2026-02-24', layer: 'L1', table: 'facility_lender_allocation', field: 'bank_share_pct', changeType: 'Added', rationale: 'Percentage of facility held by this legal entity' },
  { date: '2026-02-24', layer: 'L1', table: 'facility_lender_allocation', field: 'bank_commitment_amt', changeType: 'Added', rationale: 'Absolute commitment amount for this allocation' },
  { date: '2026-02-24', layer: 'L1', table: 'facility_lender_allocation', field: 'allocation_role', changeType: 'Added', rationale: 'Role in syndication (Lead, Participant, Agent, etc.)' },
  { date: '2026-02-24', layer: 'L1', table: 'facility_lender_allocation', field: 'is_lead_flag', changeType: 'Added', rationale: 'Boolean flag indicating lead arranger status' },

  // ── 2026-02-24: Missing data elements for metric coverage ──────────
  { date: '2026-02-24', layer: 'L1', table: 'internal_risk_rating_bucket_dim', field: '(new table)', changeType: 'Added', rationale: 'Maps risk scores to buckets: Critical, High, Moderate, Non-High Risk' },
  { date: '2026-02-24', layer: 'L1', table: 'pricing_tier_dim', field: '(new table)', changeType: 'Added', rationale: 'Ordinal pricing tiers reference dimension' },
  { date: '2026-02-24', layer: 'L2', table: 'position_detail', field: 'delinquent_payment_flag', changeType: 'Added', rationale: 'Required by delinquency metrics — gap analysis against data element audit' },
  { date: '2026-02-24', layer: 'L2', table: 'position_detail', field: 'overdue_amt_0_30', changeType: 'Added', rationale: 'Overdue bucket for 0-30 day aging — required for delinquency reporting' },
  { date: '2026-02-24', layer: 'L2', table: 'position_detail', field: 'overdue_amt_31_60', changeType: 'Added', rationale: 'Overdue bucket for 31-60 day aging' },
  { date: '2026-02-24', layer: 'L2', table: 'position_detail', field: 'overdue_amt_61_90_plus', changeType: 'Added', rationale: 'Overdue bucket for 61-90+ day aging' },
  { date: '2026-02-24', layer: 'L2', table: 'facility_delinquency_snapshot', field: 'delinquent_payment_flag', changeType: 'Added', rationale: 'Facility-level delinquency flag for snapshot reporting' },
  { date: '2026-02-24', layer: 'L2', table: 'facility_delinquency_snapshot', field: 'overdue_amt_0_30', changeType: 'Added', rationale: 'Facility-level overdue aging bucket' },
  { date: '2026-02-24', layer: 'L2', table: 'facility_delinquency_snapshot', field: 'overdue_amt_31_60', changeType: 'Added', rationale: 'Facility-level overdue aging bucket' },
  { date: '2026-02-24', layer: 'L2', table: 'facility_delinquency_snapshot', field: 'overdue_amt_61_90_plus', changeType: 'Added', rationale: 'Facility-level overdue aging bucket' },
  { date: '2026-02-24', layer: 'L2', table: 'facility_pricing_snapshot', field: 'pricing_tier', changeType: 'Added', rationale: 'Links to pricing_tier_dim for tier classification' },
  { date: '2026-02-24', layer: 'L2', table: 'facility_pricing_snapshot', field: 'pricing_exception_flag', changeType: 'Added', rationale: 'Flags facilities with non-standard pricing' },
  { date: '2026-02-24', layer: 'L2', table: 'facility_pricing_snapshot', field: 'fee_rate_pct', changeType: 'Added', rationale: 'Fee rate percentage for facility pricing' },

  // ── 2026-02-21: L2 columns for L3 compatibility ────────────────────
  { date: '2026-02-21', layer: 'L2', table: 'position_detail', field: 'notional_amt', changeType: 'Added', rationale: 'Required by L3 exposure calculations joining on position_detail' },
  { date: '2026-02-21', layer: 'L2', table: 'position_detail', field: 'ccf_pct', changeType: 'Added', rationale: 'Credit conversion factor needed by EAD calculations in L3' },
  { date: '2026-02-21', layer: 'L2', table: 'position_detail', field: 'lgd_pct', changeType: 'Added', rationale: 'Loss given default input for expected loss calculations in L3' },
  { date: '2026-02-21', layer: 'L2', table: 'facility_exposure_snapshot', field: 'outstanding_balance_amt', changeType: 'Added', rationale: 'Core balance field needed by multiple L3 utilization and exposure metrics' },
  { date: '2026-02-21', layer: 'L2', table: 'facility_exposure_snapshot', field: 'undrawn_commitment_amt', changeType: 'Added', rationale: 'Undrawn amount needed for utilization and EAD calculations in L3' },
  { date: '2026-02-21', layer: 'L2', table: 'netting_set_exposure_snapshot', field: 'netting_benefit_amt', changeType: 'Added', rationale: 'Netting benefit amount for counterparty-level net exposure calculations' },
  { date: '2026-02-21', layer: 'L2', table: 'financial_metric_observation', field: 'metric_code', changeType: 'Added', rationale: 'VARCHAR metric code enabling flexible metric identification in observations' },

  // ── 2026-02-16: L2 layer introduced ────────────────────────────────
  { date: '2026-02-16', layer: 'L2', table: '(26 tables)', field: '(entire layer)', changeType: 'Added', rationale: 'New consolidated snapshot layer between L1 (atomic) and L3 (derived) — enables date-partitioned snapshots instead of complex multi-table L1 joins' },

  // ── 2026-02-16: Initial L1 schema ──────────────────────────────────
  { date: '2026-02-16', layer: 'L1', table: '(~60 tables)', field: '(entire layer)', changeType: 'Added', rationale: 'Foundation layer: GSIB credit/lending data warehouse with SCD Type 0/1/2 support' },
];
