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
  // ── 2026-02-28: Date bucket derived fields ────────────────────────
  { date: '2026-02-28', layer: 'L3', table: 'facility_detail_snapshot', field: 'maturity_date_bucket', changeType: 'Added', rationale: 'Derived remaining-maturity bucket (0-1Y/1-3Y/3-5Y/5-10Y/10Y+/Expired) for GSIB maturity concentration analysis' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_detail_snapshot', field: 'origination_date_bucket', changeType: 'Added', rationale: 'Derived vintage bucket (0-1Y/1-3Y/3-5Y/5-7Y/7Y+/New) for portfolio age distribution analysis' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_detail_snapshot', field: 'effective_date_bucket', changeType: 'Added', rationale: 'Derived effective-date bucket — same logic as origination bucket since effective_date = origination_date' },

  // ── 2026-02-28: Facility active_flag ──────────────────────────────
  { date: '2026-02-28', layer: 'L1', table: 'facility_master', field: 'active_flag', changeType: 'Added', rationale: 'Boolean Y/N flag derived from facility_status — follows standard L1 dimension pattern for operational gating' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_detail_snapshot', field: 'facility_active_flag', changeType: 'Added', rationale: 'Propagates L1 facility_master.active_flag to L3 facility detail for snapshot-level filtering' },

  // ── 2026-02-28: Bank share % surfaced to facility atomic record ───
  { date: '2026-02-28', layer: 'L3', table: 'facility_detail_snapshot', field: 'bank_share_pct', changeType: 'Added', rationale: 'Surfaces bank_share_pct from L1.facility_lender_allocation to facility atomic record for syndication analysis' },

  // ── 2026-02-28: Counterparty financial snapshot (total_assets_amt) ─
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: '(new table)', changeType: 'Added', rationale: 'Borrower-level financial statement data (revenue, OPEX, net income, total assets/liabilities, EBITDA, NOI) for credit analysis metrics' },
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: 'financial_snapshot_id', changeType: 'Added', rationale: 'Primary key for counterparty financial snapshot records' },
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: 'counterparty_id', changeType: 'Added', rationale: 'FK to counterparty — links financial data to borrower' },
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: 'total_assets_amt', changeType: 'Added', rationale: 'Borrower total assets from financial statements — source field for ROA and balance sheet analysis' },
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: 'revenue_amt', changeType: 'Added', rationale: 'Top-line revenue for borrower financial health analysis' },
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: 'net_income_amt', changeType: 'Added', rationale: 'Bottom-line net income for borrower profitability analysis' },
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: 'ebitda_amt', changeType: 'Added', rationale: 'EBITDA for DSCR and leveraged lending analysis' },
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: 'noi_amt', changeType: 'Added', rationale: 'Net Operating Income for CRE and real estate portfolio analysis' },
  { date: '2026-02-28', layer: 'L2', table: 'counterparty_financial_snapshot', field: 'shareholders_equity_amt', changeType: 'Added', rationale: 'Equity for leverage and ROE calculations' },

  // ── 2026-02-28: Product-specific position extension tables ────────
  { date: '2026-02-28', layer: 'L2', table: 'loan_position_detail', field: '(new table)', changeType: 'Added', rationale: 'Loan-specific position extension with amortization, rate index, DPD, covenant compliance, and LCR/NSFR/capital fields' },
  { date: '2026-02-28', layer: 'L2', table: 'derivative_position_detail', field: '(new table)', changeType: 'Added', rationale: 'Derivative-specific extension with MTM, PFE, CVA, netting, margin, clearing method, and SA-CCR exposure fields' },
  { date: '2026-02-28', layer: 'L2', table: 'sft_position_detail', field: '(new table)', changeType: 'Added', rationale: 'SFT-specific extension with repo rate, haircut, collateral, security type, and HQLA/LCR/NSFR fields' },
  { date: '2026-02-28', layer: 'L2', table: 'guarantee_lc_position_detail', field: '(new table)', changeType: 'Added', rationale: 'Guarantee/LC-specific extension with CCF, beneficiary, irrevocability, fee rate, and capital fields' },
  { date: '2026-02-28', layer: 'L2', table: 'bond_security_position_detail', field: '(new table)', changeType: 'Added', rationale: 'Bond/security-specific extension with ISIN/CUSIP, coupon, accounting classification, HQLA level, and capital risk weight' },

  // ── 2026-02-28: Derived KPI fields surfaced into FacilitySummary + rollups ──
  { date: '2026-02-28', layer: 'L2', table: 'facility_exposure_snapshot', field: 'rwa_amt (MVP)', changeType: 'Added', rationale: 'Surfaced RWA amount into FacilitySummary from L2 exposure snapshot — derived as EAD × risk weight' },
  { date: '2026-02-28', layer: 'L2', table: 'facility_exposure_snapshot', field: 'internal_risk_rating_bucket_code (MVP)', changeType: 'Added', rationale: 'Surfaced risk rating bucket into FacilitySummary from L2 exposure snapshot — categorical bucketing of numeric rating' },
  { date: '2026-02-28', layer: 'L2', table: 'facility_profitability_snapshot', field: 'total_debt_service_amt (MVP)', changeType: 'Added', rationale: 'Surfaced total debt service into FacilitySummary from L2 profitability snapshot' },
  { date: '2026-02-28', layer: 'L2', table: 'facility_profitability_snapshot', field: 'interest_rate_sensitivity_pct (MVP)', changeType: 'Added', rationale: 'Surfaced IR sensitivity into FacilitySummary from L2 profitability snapshot' },
  { date: '2026-02-28', layer: 'L2', table: 'facility_pricing_snapshot', field: 'pricing_exception_flag (MVP)', changeType: 'Added', rationale: 'Surfaced pricing exception flag into FacilitySummary from L2 pricing snapshot' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_summary', field: 'return_on_rwa_pct', changeType: 'Added', rationale: 'Facility-level return on RWA (total_revenue_amt / rwa_amt × 100) — derived metric added to FacilitySummary' },
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'avg_roe_pct', changeType: 'Added', rationale: 'Exposure-weighted avg ROE added to desk/LOB rollup summaries — ROE already existed at facility level' },
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'total_rwa_amt', changeType: 'Added', rationale: 'Sum of RWA amounts added to desk/LOB rollup summaries' },
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'total_debt_service_amt', changeType: 'Added', rationale: 'Sum of total debt service added to desk/LOB rollup summaries' },
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'avg_ir_sensitivity_pct', changeType: 'Added', rationale: 'Exposure-weighted avg IR sensitivity added to desk/LOB rollup summaries' },
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'avg_return_on_rwa_pct', changeType: 'Added', rationale: 'Return on RWA (total_revenue / total_rwa × 100) added to desk/LOB rollup summaries' },
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'pricing_exception_count', changeType: 'Added', rationale: 'Count of pricing exceptions added to desk/LOB rollup summaries' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'avg_roe_pct', changeType: 'Added', rationale: 'Exposure-weighted avg ROE added to L1 LOB summary — LobL1Summary is standalone, not inherited from DeskSummary' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'total_rwa_amt', changeType: 'Added', rationale: 'Sum of RWA amounts added to L1 LOB summary' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'total_debt_service_amt', changeType: 'Added', rationale: 'Sum of total debt service added to L1 LOB summary' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'avg_ir_sensitivity_pct', changeType: 'Added', rationale: 'Exposure-weighted avg IR sensitivity added to L1 LOB summary' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'avg_return_on_rwa_pct', changeType: 'Added', rationale: 'Return on RWA added to L1 LOB summary' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'pricing_exception_count', changeType: 'Added', rationale: 'Count of pricing exceptions added to L1 LOB summary' },

  // ── 2026-02-28: Data model enhancement — EAD, Expected Loss, FCCR, TNW, Cross-Entity, Active rollups ──
  { date: '2026-02-28', layer: 'L3', table: 'FacilitySummary', field: 'ead_usd', changeType: 'Added', rationale: 'Exposure at Default surfaced from L2 facility_exposure_snapshot.ead_amount to FacilitySummary for facility-level EAD visibility' },
  { date: '2026-02-28', layer: 'L3', table: 'FacilitySummary', field: 'expected_loss_usd', changeType: 'Added', rationale: 'Expected loss (PD × LGD × EAD) derived at facility level using risk-rating-based PD and collateral-adjusted LGD' },
  { date: '2026-02-28', layer: 'L3', table: 'FacilitySummary', field: 'expected_loss_rate_pct', changeType: 'Added', rationale: 'Expected loss rate (EL / outstanding exposure) for facility-level loss intensity comparison' },
  { date: '2026-02-28', layer: 'L3', table: 'FacilitySummary', field: 'tangible_net_worth_usd', changeType: 'Added', rationale: 'Counterparty-level TNW (Total Equity − Intangible Assets) attributed to each facility per GSIB practice — not prorated' },
  { date: '2026-02-28', layer: 'L3', table: 'DeskSummary', field: 'total_ead_usd', changeType: 'Added', rationale: 'Sum of facility-level EAD rolled up to desk level' },
  { date: '2026-02-28', layer: 'L3', table: 'DeskSummary', field: 'total_expected_loss_usd', changeType: 'Added', rationale: 'Sum of facility-level expected loss rolled up to desk level' },
  { date: '2026-02-28', layer: 'L3', table: 'DeskSummary', field: 'avg_expected_loss_rate_pct', changeType: 'Added', rationale: 'Portfolio-level EL rate (total EL / total exposure) at desk level' },
  { date: '2026-02-28', layer: 'L3', table: 'DeskSummary', field: 'avg_fccr', changeType: 'Added', rationale: 'Exposure-weighted average FCCR at desk level — complements existing avg_dscr and avg_ltv' },
  { date: '2026-02-28', layer: 'L3', table: 'DeskSummary', field: 'avg_tangible_net_worth_usd', changeType: 'Added', rationale: 'Exposure-weighted average counterparty TNW at desk level for financial health monitoring' },
  { date: '2026-02-28', layer: 'L3', table: 'DeskSummary', field: 'total_cross_entity_exposure_usd', changeType: 'Added', rationale: 'Sum of cross-entity exposure at desk level for interconnection risk monitoring' },
  { date: '2026-02-28', layer: 'L3', table: 'DeskSummary', field: 'cross_entity_facility_count', changeType: 'Added', rationale: 'Count of facilities with cross-entity exposure at desk level' },
  { date: '2026-02-28', layer: 'L3', table: 'DeskSummary', field: 'active_facility_count', changeType: 'Added', rationale: 'Count of active (non-matured, non-expired) facilities at desk level' },
  { date: '2026-02-28', layer: 'L3', table: 'LobL1Summary', field: 'total_ead_usd', changeType: 'Added', rationale: 'Sum of facility-level EAD rolled up to L1 LoB level' },
  { date: '2026-02-28', layer: 'L3', table: 'LobL1Summary', field: 'total_expected_loss_usd', changeType: 'Added', rationale: 'Sum of facility-level expected loss rolled up to L1 LoB level' },
  { date: '2026-02-28', layer: 'L3', table: 'LobL1Summary', field: 'avg_expected_loss_rate_pct', changeType: 'Added', rationale: 'Portfolio-level EL rate at L1 LoB level' },
  { date: '2026-02-28', layer: 'L3', table: 'LobL1Summary', field: 'avg_fccr', changeType: 'Added', rationale: 'Exposure-weighted average FCCR at L1 LoB level' },
  { date: '2026-02-28', layer: 'L3', table: 'LobL1Summary', field: 'avg_tangible_net_worth_usd', changeType: 'Added', rationale: 'Exposure-weighted average counterparty TNW at L1 LoB level' },
  { date: '2026-02-28', layer: 'L3', table: 'LobL1Summary', field: 'total_cross_entity_exposure_usd', changeType: 'Added', rationale: 'Sum of cross-entity exposure at L1 LoB level' },
  { date: '2026-02-28', layer: 'L3', table: 'LobL1Summary', field: 'cross_entity_facility_count', changeType: 'Added', rationale: 'Count of facilities with cross-entity exposure at L1 LoB level' },
  { date: '2026-02-28', layer: 'L3', table: 'LobL1Summary', field: 'active_facility_count', changeType: 'Added', rationale: 'Count of active facilities at L1 LoB level' },
  { date: '2026-02-28', layer: 'L2', table: 'financial_metric_observation', field: 'FCCR metric_code', changeType: 'Added', rationale: 'FCCR (Fixed Charge Coverage Ratio) generation added — previously defined in schema but never generated, resulting in null values' },
  { date: '2026-02-28', layer: 'L2', table: 'financial_metric_observation', field: 'TNW metric_code', changeType: 'Added', rationale: 'Tangible Net Worth added as counterparty-level financial metric observation — sourced from balance sheet, attributed to facilities via counterparty_id' },

  // ── 2026-02-28: KPI enhancements — new L2 source fields ────────────
  { date: '2026-02-28', layer: 'L2', table: 'facility_exposure_snapshot', field: 'allocated_equity_amt', changeType: 'Added', rationale: 'Allocated equity at facility level — used to derive capital adequacy ratio (CAR = equity / RWA)' },
  { date: '2026-02-28', layer: 'L2', table: 'facility_financial_snapshot', field: 'operating_expense_amt', changeType: 'Added', rationale: 'Facility-level operating cost — surfaced from L2 profitability data for cost-to-income analysis' },

  // ── 2026-02-28: KPI enhancements — new L3 facility_summary fields ──
  { date: '2026-02-28', layer: 'L3', table: 'facility_summary', field: 'operating_expense_amt', changeType: 'Added', rationale: 'Facility-level operating expense joined from L2 profitability snapshot' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_summary', field: 'capital_adequacy_ratio_pct', changeType: 'Added', rationale: 'Derived: allocated_equity_amt / rwa_amt × 100 — Basel capital adequacy ratio per facility' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_summary', field: 'number_of_loans', changeType: 'Added', rationale: 'Loan count joined from L2 exposure snapshot — re-surfaced on facility_summary after prior L3 removal' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_summary', field: 'external_rating_status', changeType: 'Added', rationale: 'Rating migration status (Upgrade/Downgrade/Stable) derived from external rating scale CCC→AA' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_summary', field: 'external_rating_change_steps', changeType: 'Added', rationale: 'Notch change in external rating between current and previous observation' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_summary', field: 'internal_rating_status', changeType: 'Added', rationale: 'Rating migration status (Upgrade/Downgrade/Stable) derived from internal numeric 1–5 scale' },
  { date: '2026-02-28', layer: 'L3', table: 'facility_summary', field: 'internal_rating_change_steps', changeType: 'Added', rationale: 'Notch change in internal rating between current and previous observation' },

  // ── 2026-02-28: KPI enhancements — new L3 desk_summary fields ──────
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'exception_rate_pct', changeType: 'Added', rationale: 'Derived: exception_count / facility_count × 100 — pricing exception rate at desk level' },
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'avg_capital_adequacy_ratio_pct', changeType: 'Added', rationale: 'Weighted average of facility-level capital adequacy ratios across desk' },
  { date: '2026-02-28', layer: 'L3', table: 'desk_summary', field: 'total_operating_expense_amt', changeType: 'Added', rationale: 'Sum of facility-level operating expenses across desk' },

  // ── 2026-02-28: KPI enhancements — new L3 lob_l2_summary fields ────
  { date: '2026-02-28', layer: 'L3', table: 'lob_l2_summary', field: 'exception_rate_pct', changeType: 'Added', rationale: 'Inherited from desk_summary — pricing exception rate at L2 LOB level' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l2_summary', field: 'avg_capital_adequacy_ratio_pct', changeType: 'Added', rationale: 'Inherited from desk_summary — weighted avg CAR at L2 LOB level' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l2_summary', field: 'total_operating_expense_amt', changeType: 'Added', rationale: 'Inherited from desk_summary — total operating expense at L2 LOB level' },

  // ── 2026-02-28: KPI enhancements — new L3 lob_l1_summary fields ────
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'exception_rate_pct', changeType: 'Added', rationale: 'Derived: exception_count / facility_count × 100 — pricing exception rate at L1 LOB level' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'avg_capital_adequacy_ratio_pct', changeType: 'Added', rationale: 'Weighted average of facility-level capital adequacy ratios across L1 LOB' },
  { date: '2026-02-28', layer: 'L3', table: 'lob_l1_summary', field: 'total_operating_expense_amt', changeType: 'Added', rationale: 'Sum of facility-level operating expenses across L1 LOB' },

  // ── 2026-02-27: Data model enhancements — product tagging, active flag, criticized portfolios, cross-entity exposure ──
  { date: '2026-02-27', layer: 'L2', table: 'position', field: 'product_node_id', changeType: 'Added', rationale: 'Added position-level product tagging (FK to enterprise_product_taxonomy) to capture granular product type (e.g. Revolving Loan, Term Loan). Facility-level product_node_id remains for parent product groups.' },
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
