#!/usr/bin/env npx tsx
/**
 * Backfill data dictionary descriptions, governance metadata, synonym annotations,
 * and category fixes. Part of GSIB Audit Remediation Phase 0.
 *
 * Usage: npx tsx scripts/backfill-descriptions.ts [--dry-run]
 */

import fs from 'fs';
import path from 'path';

const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');

interface DDField {
  name: string;
  description?: string;
  category?: string;
  why_required?: string;
  pk_fk?: { is_pk: boolean; is_composite?: boolean; fk_target?: { layer: string; table: string; field: string } };
  data_type?: string;
  formula?: string;
  [key: string]: unknown;
}

interface DDTable {
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: DDField[];
  data_owner?: string;
  data_steward?: string;
  retention_policy?: string;
  update_frequency?: string;
}

interface DD {
  L1: DDTable[];
  L2: DDTable[];
  L3: DDTable[];
  relationships: unknown[];
  derivation_dag: Record<string, string[]>;
}

const dryRun = process.argv.includes('--dry-run');

// ─────────────────────────────────────────────────────────────
// DESCRIPTION GENERATION RULES
// ─────────────────────────────────────────────────────────────

/** Infer description from field name using banking data model conventions */
function inferDescription(fieldName: string, tableName: string, layer: string): string {
  // Common audit fields
  const auditFields: Record<string, string> = {
    created_ts: 'Timestamp when the record was created',
    updated_ts: 'Timestamp of last record modification',
    created_by: 'User or process that created the record',
    record_source: 'Source system or feed that provided this record',
    load_timestamp: 'Timestamp when the record was loaded by ETL',
    record_hash: 'SHA-256 hash of business-critical fields for integrity verification',
    is_active_flag: 'Whether this record is currently active',
  };
  if (auditFields[fieldName]) return auditFields[fieldName];

  // Primary key patterns
  if (fieldName === tableName.replace(/_dim$|_master$/, '') + '_id') {
    return `Primary key identifier for ${tableName.replace(/_/g, ' ')}`;
  }

  // FK patterns - look at the name
  if (fieldName.endsWith('_id') && fieldName !== tableName + '_id') {
    const entity = fieldName.replace(/_id$/, '').replace(/_/g, ' ');
    return `Foreign key linking to ${entity}`;
  }

  // Well-known banking fields
  const knownFields: Record<string, string> = {
    // Risk parameters
    pd_pct: 'Probability of default expressed as a percentage (0.000000-100.000000)',
    lgd_pct: 'Loss given default as a percentage of exposure at default',
    ccf: 'Credit conversion factor for off-balance sheet items (0.0-1.0)',
    ead_amt: 'Exposure at default amount in reporting currency',
    expected_loss_amt: 'Expected loss amount: PD x LGD x EAD',
    rwa_amt: 'Risk-weighted asset amount per Basel III methodology',
    risk_weight_pct: 'Risk weight percentage applied to exposure for RWA calculation',
    internal_risk_rating: 'Internal credit risk rating assigned by the bank',
    risk_rating_status: 'Current status of the internal risk rating',
    risk_rating_change_steps: 'Number of rating notches changed from prior period',

    // Exposure fields
    drawn_amount: 'Outstanding drawn balance in reporting currency',
    drawn_amt: 'Outstanding drawn balance in reporting currency',
    undrawn_amount: 'Undrawn commitment amount available to the borrower',
    undrawn_amt: 'Undrawn commitment amount available to the borrower',
    undrawn_commitment_amt: 'Undrawn commitment amount available to the borrower',
    committed_amt: 'Total committed facility amount',
    committed_amount: 'Total committed facility amount',
    gross_exposure_amt: 'Gross exposure amount before credit risk mitigation deductions',
    gross_exposure_usd: 'Gross exposure amount in USD',
    net_exposure_amt: 'Net exposure after credit risk mitigation and netting',
    net_exposure_usd: 'Net exposure in USD after credit risk mitigation',
    total_exposure_amt: 'Total exposure amount across all facilities',
    utilization_pct: 'Facility utilization rate: drawn_amount / committed_amount x 100',
    coverage_ratio_pct: 'Coverage ratio: collateral value / exposure amount x 100',

    // Financial statement fields
    revenue_amt: 'Total revenue from most recent financial statement',
    ebitda_amt: 'Earnings before interest, taxes, depreciation, and amortization',
    total_assets_amt: 'Total assets from balance sheet',
    total_liabilities_amt: 'Total liabilities from balance sheet',
    shareholders_equity_amt: 'Total shareholders equity from balance sheet',
    noi_amt: 'Net operating income (counterparty financial statements)',
    noi_current_amt: 'Current net operating income for collateral asset (CRE property) — L2 time-series',
    noi_at_origination_amt: 'Net operating income at origination for collateral asset — static L1 reference from underwriting appraisal',
    total_debt_service_amt: 'Total debt service (principal + interest payments)',
    net_income_amt: 'Net income (revenue minus all expenses)',
    interest_expense_amt: 'Total interest expense for the period',
    interest_income_amt: 'Total interest income for the period',
    operating_expense_amt: 'Total operating expenses for the period',

    // Ratios
    dscr_value: 'Debt service coverage ratio: NOI / total debt service',
    dscr: 'Debt service coverage ratio: NOI / total debt service',
    ltv_pct: 'Loan-to-value ratio: loan balance / collateral value x 100',
    interest_coverage_ratio: 'Interest coverage ratio: EBITDA / interest expense',
    debt_yield_pct: 'Debt yield: NOI / loan balance x 100',
    leverage_ratio: 'Leverage ratio: total debt / equity',
    current_ratio: 'Current ratio: current assets / current liabilities',

    // Capital fields
    capital_req_amt: 'Regulatory capital requirement amount',
    cet1_ratio_pct: 'Common Equity Tier 1 capital ratio',
    tier1_ratio_pct: 'Tier 1 capital ratio',
    total_capital_ratio_pct: 'Total capital adequacy ratio',
    allocated_equity_amt: 'Equity capital allocated to this facility/unit',
    capital_charge_amt: 'Capital charge amount for this exposure',

    // Date fields
    as_of_date: 'Reporting date for the snapshot or observation',
    snapshot_date: 'Date of the data snapshot',
    maturity_date: 'Contractual maturity date of the facility',
    effective_start_date: 'Date from which the record becomes effective',
    effective_end_date: 'Date at which the record ceases to be effective',
    origination_date: 'Date the facility was originated',
    rating_date: 'Date of the rating observation',
    entry_date: 'Date the record was entered into the system',
    exit_date: 'Date the record was exited from the system',
    approval_date: 'Date of approval',
    next_review_date: 'Date of the next scheduled review',

    // Identifiers and codes
    currency_code: 'ISO 4217 currency code (e.g., USD, EUR, GBP)',
    country_code: 'ISO 3166-1 country code',
    entity_type_code: 'Entity type classification code',
    facility_type_code: 'Facility type classification code',
    collateral_type_code: 'Collateral type classification code',
    industry_code: 'Industry classification code (NAICS/SIC)',
    rating_value: 'Credit rating value (e.g., AAA, AA+, Baa1)',
    rating_agency: 'Name of the rating agency',
    outlook_code: 'Rating outlook code (Stable/Positive/Negative/Watch)',

    // Status and classification
    status_code: 'Current status code',
    dpd_bucket_code: 'Days past due bucket classification (e.g., 0-30, 31-60, 61-90+)',
    days_past_due: 'Number of days the payment is past due',
    number_of_loans: 'Count of individual loans within the facility',
    number_of_facilities: 'Count of facilities',
    days_until_maturity: 'Number of days from as_of_date until maturity_date',

    // Naming
    legal_name: 'Legal entity name of the counterparty',
    short_name: 'Short display name',
    facility_name: 'Name or description of the facility',
    description: 'Descriptive text',

    // Amounts
    loss_amount_usd: 'Loss amount in USD',
    recovery_amount_usd: 'Recovery amount in USD',
    payment_amount: 'Payment amount',
    valuation_amount: 'Current valuation amount',
    notional_amount: 'Notional or face value amount',

    // Scores and weights
    overall_score: 'Composite score aggregated from component scores',
    completeness_pct: 'Data completeness percentage',
    validity_pct: 'Data validity percentage',
    overall_dq_score_pct: 'Overall data quality score percentage',
    completeness_score_pct: 'Completeness component of data quality score',
    accuracy_score_pct: 'Accuracy component of data quality score',
    timeliness_score_pct: 'Timeliness component of data quality score',

    // Stress testing
    stressed_exposure_amt: 'Exposure amount under stress scenario conditions',
    stressed_expected_loss: 'Expected loss under stress scenario conditions',
    capital_impact_pct: 'Impact on capital ratios under stress scenario',
    scenario_name: 'Name or identifier of the stress scenario',

    // Amendment fields
    amendment_status_code: 'Amendment lifecycle status code (FK to amendment status dim)',
    amendment_type_code: 'Amendment type classification code (FK to amendment type dim)',
    amendment_status: 'DEPRECATED: Free-text amendment status. Use amendment_status_code for filtering and joins.',
    amendment_type: 'DEPRECATED: Free-text amendment type. Use amendment_type_code for filtering and joins.',

    // Pipeline
    expected_coverage_ratio: 'Expected coverage ratio for pipeline deal (derived: expected_exposure / expected_committed)',

    // Interdependence
    interdependence_strength_score: 'Computed score measuring economic interdependence strength between counterparties',
  };

  if (knownFields[fieldName]) return knownFields[fieldName];

  // Suffix-based inference
  if (fieldName.endsWith('_amt') || fieldName.endsWith('_amount')) {
    const concept = fieldName.replace(/_(amt|amount)$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} amount in reporting currency`;
  }
  if (fieldName.endsWith('_pct')) {
    const concept = fieldName.replace(/_pct$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} expressed as a percentage`;
  }
  if (fieldName.endsWith('_value')) {
    const concept = fieldName.replace(/_value$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} value`;
  }
  if (fieldName.endsWith('_date')) {
    const concept = fieldName.replace(/_date$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} date`;
  }
  if (fieldName.endsWith('_flag')) {
    const concept = fieldName.replace(/^is_|_flag$/g, '').replace(/_/g, ' ');
    return `Boolean indicator for ${concept}`;
  }
  if (fieldName.endsWith('_code')) {
    const concept = fieldName.replace(/_code$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} classification code`;
  }
  if (fieldName.endsWith('_name')) {
    const concept = fieldName.replace(/_name$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} name`;
  }
  if (fieldName.endsWith('_desc') || fieldName.endsWith('_text') || fieldName.endsWith('_description')) {
    const concept = fieldName.replace(/_(desc|text|description)$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} descriptive text`;
  }
  if (fieldName.endsWith('_count')) {
    const concept = fieldName.replace(/_count$/, '').replace(/_/g, ' ');
    return `Count of ${concept.replace(/_/g, ' ')}`;
  }
  if (fieldName.endsWith('_bps')) {
    const concept = fieldName.replace(/_bps$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} in basis points`;
  }
  if (fieldName.endsWith('_ts')) {
    const concept = fieldName.replace(/_ts$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} timestamp`;
  }
  if (fieldName.endsWith('_type')) {
    const concept = fieldName.replace(/_type$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} type classification`;
  }
  if (fieldName.endsWith('_status')) {
    const concept = fieldName.replace(/_status$/, '').replace(/_/g, ' ');
    return `Current ${concept.replace(/_/g, ' ')} status`;
  }
  if (fieldName.endsWith('_ratio')) {
    const concept = fieldName.replace(/_ratio$/, '').replace(/_/g, ' ');
    return `${capitalize(concept)} ratio`;
  }

  // Fallback: humanize the field name
  return capitalize(fieldName.replace(/_/g, ' '));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────
// DEPRECATED FIELD ANNOTATIONS
// ─────────────────────────────────────────────────────────────

const DEPRECATED_FIELDS: Record<string, Record<string, string>> = {
  'facility_exposure_snapshot': {
    'rwa_amt': 'DEPRECATED in L2: Derived field (RWA = EAD x Risk Weight). Canonical source: l3.facility_exposure_calc.rwa_amt',
    'coverage_ratio_pct': 'DEPRECATED in L2: Derived ratio (collateral / exposure). Canonical source: l3.facility_exposure_calc.coverage_ratio_pct',
    'number_of_loans': 'DEPRECATED in L2: Count metric. Canonical source: l3.facility_exposure_calc.number_of_loans',
    'number_of_facilities': 'DEPRECATED in L2: Count metric. Canonical source: l3.facility_exposure_calc.number_of_facilities',
    'days_until_maturity': 'DEPRECATED in L2: Derived (maturity_date - as_of_date). Canonical source: l3.facility_exposure_calc.days_until_maturity',
    'undrawn_amount': 'DEPRECATED: Use undrawn_commitment_amt. Original undrawn balance field retained for backward compatibility.',
  },
  'facility_risk_snapshot': {
    'rwa_amt': 'DEPRECATED in L2: Derived (EAD x risk_weight). Canonical source: l3.facility_risk_calc.rwa_amt',
    'expected_loss_amt': 'DEPRECATED in L2: Derived (PD x LGD x EAD). Canonical source: l3.facility_risk_calc.expected_loss_amt',
  },
  'facility_financial_snapshot': {
    'dscr_value': 'DEPRECATED in L2: Derived ratio (NOI / total debt service). Canonical source: l3.facility_financial_calc.dscr_value',
    'ltv_pct': 'DEPRECATED in L2: Derived ratio (loan / collateral value). Canonical source: l3.facility_financial_calc.ltv_pct',
    'net_income_amt': 'DEPRECATED in L2: Derived (revenue - expenses). Canonical source: l3.facility_financial_calc.net_income_amt',
  },
};

// ─────────────────────────────────────────────────────────────
// GOVERNANCE METADATA RULES
// ─────────────────────────────────────────────────────────────

function assignGovernance(table: DDTable): void {
  const cat = (table.category || '').toLowerCase();
  const name = table.name;

  if (table.layer === 'L1') {
    if (name.endsWith('_dim') || name.endsWith('_type') || name.endsWith('_lookup')) {
      table.data_owner = 'Data Architecture';
      table.data_steward = 'Data Governance';
    } else if (cat.includes('config') || cat.includes('rule') || cat.includes('threshold')) {
      table.data_owner = 'Risk Management';
      table.data_steward = 'Model Risk';
    } else {
      table.data_owner = 'Data Architecture';
      table.data_steward = 'Data Governance';
    }
    table.retention_policy = 'Indefinite';
    table.update_frequency = 'As needed';
  } else if (table.layer === 'L2') {
    if (name.includes('financial') || name.includes('profitability') || name.includes('gl_')) {
      table.data_owner = 'Finance Operations';
      table.data_steward = 'Financial Reporting';
    } else if (name.includes('event') || name.includes('amendment')) {
      table.data_owner = 'Credit Risk Operations';
      table.data_steward = 'Data Operations';
    } else if (name.includes('master')) {
      table.data_owner = 'Credit Risk Operations';
      table.data_steward = 'Data Governance';
    } else {
      table.data_owner = 'Credit Risk Operations';
      table.data_steward = 'Data Operations';
    }
    if (name.includes('snapshot') || name.includes('observation')) {
      table.retention_policy = '7 years';
      table.update_frequency = 'Daily';
    } else if (name.includes('event')) {
      table.retention_policy = '7 years';
      table.update_frequency = 'Event-driven';
    } else {
      table.retention_policy = '7 years';
      table.update_frequency = 'Daily';
    }
  } else if (table.layer === 'L3') {
    if (cat.includes('regulatory') || cat.includes('capital') || name.includes('capital')) {
      table.data_owner = 'Regulatory Reporting';
      table.data_steward = 'Compliance';
    } else {
      table.data_owner = 'Analytics Engineering';
      table.data_steward = 'Credit Risk Analytics';
    }
    table.retention_policy = '7 years';
    table.update_frequency = 'Daily (batch)';
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

function main(): void {
  console.log(`Reading data dictionary from ${DD_PATH}...`);
  const raw = fs.readFileSync(DD_PATH, 'utf-8');
  const dd: DD = JSON.parse(raw);

  let descriptionsAdded = 0;
  let categoriesFixed = 0;
  let governanceAssigned = 0;
  let deprecatedAnnotated = 0;

  for (const layer of ['L1', 'L2', 'L3'] as const) {
    for (const table of dd[layer]) {
      // Assign governance metadata
      if (!table.data_owner) {
        assignGovernance(table);
        governanceAssigned++;
      }

      // Fix category for counterparty_financial_snapshot
      if (table.name === 'counterparty_financial_snapshot') {
        for (const field of table.fields) {
          if (!field.category || field.category === 'Uncategorized') {
            field.category = 'Financial Metrics';
            categoriesFixed++;
          }
        }
      }

      for (const field of table.fields) {
        // Check for deprecated field annotations
        const deprecatedDesc = DEPRECATED_FIELDS[table.name]?.[field.name];
        if (deprecatedDesc) {
          field.description = deprecatedDesc;
          deprecatedAnnotated++;
          continue;
        }

        // Skip fields that already have a meaningful description
        if (field.description && field.description.length > 5 && !isTautological(field.name, field.description)) {
          continue;
        }

        // Generate description
        const desc = inferDescription(field.name, table.name, layer);
        if (desc) {
          field.description = desc;
          descriptionsAdded++;
        }

        // Set category if missing
        if (!field.category || field.category === 'Uncategorized') {
          field.category = table.category || 'General';
        }
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  Descriptions added/updated: ${descriptionsAdded}`);
  console.log(`  Categories fixed: ${categoriesFixed}`);
  console.log(`  Governance metadata assigned: ${governanceAssigned}`);
  console.log(`  Deprecated field annotations: ${deprecatedAnnotated}`);

  if (dryRun) {
    console.log('\n[DRY RUN] No changes written.');
  } else {
    fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf-8');
    console.log(`\nData dictionary updated at ${DD_PATH}`);
  }
}

/** Check if a description is tautological (just repeats the field name) */
function isTautological(fieldName: string, description: string): boolean {
  const normalized = description.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fieldNorm = fieldName.replace(/_/g, '').toLowerCase();
  // "Updated timestamp" for "updated_ts" is tautological
  return normalized === fieldNorm || normalized === fieldNorm.replace(/ts$/, 'timestamp') ||
    normalized === fieldNorm.replace(/pct$/, 'percentage') ||
    normalized === fieldNorm.replace(/amt$/, 'amount');
}

main();
