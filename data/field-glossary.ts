/**
 * Canonical Field Glossary
 *
 * Maps semantic synonyms to their canonical field names in the GSIB data model.
 * Use this glossary when:
 *   - Onboarding new source systems that use different column names
 *   - Validating that new fields follow naming conventions
 *   - Resolving ambiguity during data mapping reviews
 *
 * This file is consumed by validate-data-model.ts (Group 9)
 * and by the data mapping review tooling.
 */

export interface FieldSynonym {
  canonical: string;
  synonyms: string[];
  description: string;
}

export const fieldGlossary: FieldSynonym[] = [
  {
    canonical: 'drawn_amt',
    synonyms: ['drawn_amount', 'outstanding_balance_amt', 'balance_amount', 'current_balance_amt'],
    description: 'Outstanding drawn balance on a facility',
  },
  {
    canonical: 'committed_amt',
    synonyms: ['committed_facility_amt', 'total_commitment', 'expected_committed_amt', 'committed_amount'],
    description: 'Total committed amount on a credit facility',
  },
  {
    canonical: 'undrawn_amt',
    synonyms: ['undrawn_amount', 'undrawn_commitment_amt', 'available_amount'],
    description: 'Undrawn portion of committed facility amount',
  },
  {
    canonical: 'exposure_amt',
    synonyms: ['exposure_amount', 'total_exposure', 'gross_exposure_usd', 'net_exposure_usd'],
    description: 'Credit exposure amount (gross or net depending on context)',
  },
  {
    canonical: 'counterparty_id',
    synonyms: ['borrower_id', 'obligor_id', 'customer_id', 'client_id'],
    description: 'Counterparty/obligor identifier (FK to l2.counterparty)',
  },
  {
    canonical: 'facility_id',
    synonyms: ['loan_id', 'account_id', 'deal_id', 'exposure_id'],
    description: 'Credit facility identifier (FK to l2.facility_master)',
  },
  {
    canonical: 'as_of_date',
    synonyms: ['snapshot_date', 'reporting_date', 'valuation_date', 'effective_date'],
    description: 'Snapshot or measurement date (typically month-end)',
  },
  {
    canonical: 'pd_estimate',
    synonyms: ['probability_of_default', 'pd_pit', 'pd_ttc', 'default_probability'],
    description: 'Probability of default estimate from credit risk model',
  },
  {
    canonical: 'lgd_estimate',
    synonyms: ['loss_given_default', 'lgd_downturn', 'lgd_pit', 'recovery_rate'],
    description: 'Loss given default estimate from credit risk model',
  },
  {
    canonical: 'ead_amt',
    synonyms: ['exposure_at_default', 'ead', 'default_exposure'],
    description: 'Exposure at default (IRB output)',
  },
  {
    canonical: 'rwa_amt',
    synonyms: ['risk_weighted_assets', 'rwa', 'rw_amount'],
    description: 'Risk-weighted asset amount (Basel III/IV)',
  },
  {
    canonical: 'currency_code',
    synonyms: ['ccy', 'currency', 'iso_currency_code', 'transaction_currency'],
    description: 'ISO 4217 currency code',
  },
];

export const canonicalFieldNames = new Set(fieldGlossary.map((f) => f.canonical));
