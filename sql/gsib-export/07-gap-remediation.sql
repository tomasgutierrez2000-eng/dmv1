-- ═══════════════════════════════════════════════════════════
-- Gap Remediation — Fill missing L2 data for GSIB metrics
-- Generated: 2026-03-10T09:38:53.903Z
-- ═══════════════════════════════════════════════════════════

SET search_path TO l1, l2, public;

-- ── Gap 1: Taxonomy Orphan Fixes ──
UPDATE l2.facility_master SET lob_segment_id = 3 WHERE facility_id = 1;

-- ── Gap 2: Missing facility_lender_allocation ──
INSERT INTO l2.facility_lender_allocation ("lender_allocation_id", "facility_id", "legal_entity_id", "bank_share_pct", "allocation_role", "is_lead_flag", "is_current_flag", "effective_start_date") VALUES (100407, 5712, 1, 1, 'LEAD_ARRANGER', 'Y', 'Y', '2025-01-31');

-- ── Gap 3: Missing facility_counterparty_participation ──
INSERT INTO l2.facility_counterparty_participation ("facility_participation_id", "facility_id", "counterparty_id", "counterparty_role_code", "is_primary_flag", "participation_pct", "effective_start_date", "is_current_flag") VALUES (927, 9487, 3350, 'BORROWER', 'Y', 100, '2025-01-31', 'Y');

-- ── Gap 4: Missing position ──
INSERT INTO l2.position ("position_id", "as_of_date", "facility_id", "instrument_id", "balance_amount", "currency_code", "source_system_id", "counterparty_id", "credit_agreement_id", "credit_status_code", "exposure_type_code", "notional_amount", "trading_banking_book_flag", "product_node_id") VALUES (601002, '2025-01-31', 5712, 12, 234000, 'USD', 2, 1712, 1172, 'CURRENT', 'FUNDED', 360000, 'N', 12);

-- ── Gap 4: Missing position_detail ──
INSERT INTO l2.position_detail ("position_detail_id", "position_id", "as_of_date", "detail_type", "amount", "current_balance", "funded_amount", "unfunded_amount", "total_commitment", "interest_rate", "days_past_due", "delinquency_status", "spread_bps", "product_node_id") VALUES (701002, 601002, '2025-01-31', 'PRINCIPAL', 234000, 234000, 234000, 126000, 360000, 0.068, 0, 'PERFORMING', 150, 12);

-- ── Gap 5: Missing facility_pricing_snapshot ──
INSERT INTO l2.facility_pricing_snapshot ("facility_id", "as_of_date", "spread_bps", "rate_index_id", "all_in_rate_pct", "base_rate_pct", "currency_code", "facility_pricing_id", "fee_rate_pct", "cost_of_funds_pct", "payment_frequency", "prepayment_penalty_flag") VALUES (251, '2025-01-31', 150, 1, 0.068, 0.053, 'USD', 501355, 0.0025, 0.048, 'QUARTERLY', 'N');

-- ── Gap 6: Missing facility_profitability_snapshot ──
INSERT INTO l2.facility_profitability_snapshot ("facility_id", "as_of_date", "interest_income_amt", "interest_expense_amt", "fee_income_amt", "nii_ytd", "fee_income_ytd", "ledger_account_id", "base_currency_code", "profitability_snapshot_id") VALUES (1, '2025-01-31', 7820000, 5520000, 625000, 2300000, 625000, 1, 'USD', 721);
