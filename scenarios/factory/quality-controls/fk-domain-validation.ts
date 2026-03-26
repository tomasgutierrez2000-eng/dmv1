/**
 * Group 1: L1 FK Domain Validation
 *
 * Declarative FK validation registry defining all 39 L1->L2 FK relationships.
 * A single generic `validateFKs()` function iterates the registry instead of
 * individual per-field checks.
 *
 * Each FKCheck specifies:
 *  - The L1 dimension table and its PK column
 *  - All L2 fields that reference it ("table.field" format)
 *  - Severity: 'error' for critical Basel III / rollup-breaking FKs,
 *              'warning' for operational / reporting FKs
 *  - Description for human-readable diagnostics
 */

import type { ReferenceDataRegistry } from '../reference-data-registry';
import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';

/* ────────────────── FK Check Interface ────────────────── */

export interface FKCheck {
  /** L1 dimension table name (as stored in ReferenceDataRegistry). */
  l1Table: string;
  /** PK column in the L1 table (for documentation; registry resolves from KNOWN_PKS). */
  l1Pk: string;
  /** L2 fields referencing this L1 PK, in "table.field" format. */
  l2Fields: string[];
  /** error = blocks pipeline; warning = informational. */
  severity: 'error' | 'warning';
  /** Human-readable description of the FK relationship. */
  description: string;
}

/* ────────────────── FK Registry ────────────────── */

/**
 * Complete registry of all 39 L1 dimension tables and their L2 FK references.
 * Ordered by severity (error first), then alphabetically.
 */
export const FK_REGISTRY: FKCheck[] = [
  // ─── CRITICAL (ERROR severity) ───────────────────────────────────
  // Invalid codes here silently break Basel III risk weight lookups,
  // entity-type rollups, and capital calculations.

  {
    l1Table: 'entity_type_dim',
    l1Pk: 'entity_type_code',
    l2Fields: ['counterparty.entity_type_code'],
    severity: 'error',
    description: 'Basel III exposure class — invalid codes drop CPs from risk weight lookups',
  },
  {
    l1Table: 'industry_dim',
    l1Pk: 'industry_id',
    l2Fields: ['counterparty.industry_id'],
    severity: 'error',
    description: 'NAICS industry code — invalid IDs break industry concentration rollups',
  },

  // ─── HIGH PRIORITY (WARNING severity, critical for rollups) ──────

  {
    l1Table: 'amendment_status_dim',
    l1Pk: 'amendment_status_code',
    l2Fields: ['amendment_event.amendment_status_code'],
    severity: 'warning',
    description: 'Amendment status lifecycle tracking',
  },
  {
    l1Table: 'amendment_type_dim',
    l1Pk: 'amendment_type_code',
    l2Fields: ['amendment_event.amendment_type_code'],
    severity: 'warning',
    description: 'Amendment type classification',
  },
  {
    l1Table: 'basel_exposure_type_dim',
    l1Pk: 'basel_exposure_type_id',
    l2Fields: ['facility_risk_snapshot.basel_exposure_type_id'],
    severity: 'warning',
    description: 'Basel III exposure class for RWA calculation',
  },
  {
    l1Table: 'collateral_type',
    l1Pk: 'collateral_type_id',
    l2Fields: ['collateral_asset_master.collateral_type_id'],
    severity: 'warning',
    description: 'Collateral type classification for LGD',
  },
  {
    l1Table: 'context_dim',
    l1Pk: 'context_id',
    l2Fields: ['financial_metric_observation.context_id'],
    severity: 'warning',
    description: 'Financial metric observation context',
  },
  {
    l1Table: 'counterparty_role_dim',
    l1Pk: 'counterparty_role_code',
    l2Fields: [
      'credit_agreement_counterparty_participation.counterparty_role_code',
      'exposure_counterparty_attribution.counterparty_role_code',
      'facility_counterparty_participation.counterparty_role_code',
    ],
    severity: 'warning',
    description: 'Counterparty role in syndicated deals (BORROWER, PARTICIPANT, etc.)',
  },
  {
    l1Table: 'country_dim',
    l1Pk: 'country_code',
    l2Fields: [
      'collateral_asset_master.country_code',
      'counterparty.country_code',
      'instrument_master.country_code',
      'legal_entity.country_code',
    ],
    severity: 'warning',
    description: 'ISO 3166-1 alpha-2 country code for geographic risk',
  },
  {
    l1Table: 'credit_event_type_dim',
    l1Pk: 'credit_event_type_code',
    l2Fields: ['credit_event.credit_event_type_code'],
    severity: 'warning',
    description: 'Credit event classification (default trigger mapping)',
  },
  {
    l1Table: 'credit_status_dim',
    l1Pk: 'credit_status_code',
    l2Fields: [
      'facility_delinquency_snapshot.credit_status_code',
      'position.credit_status_code',
    ],
    severity: 'warning',
    description: 'Credit status lifecycle (PASS/WATCH/DEFAULT)',
  },
  {
    l1Table: 'crm_type_dim',
    l1Pk: 'crm_type_code',
    l2Fields: [
      'collateral_snapshot.crm_type_code',
      'crm_protection_master.crm_type_code',
    ],
    severity: 'warning',
    description: 'Credit risk mitigation type (Basel III CRM framework)',
  },
  {
    l1Table: 'currency_dim',
    l1Pk: 'currency_code',
    l2Fields: [
      'counterparty.reporting_currency_code',
      'facility_master.currency_code',
      'facility_exposure_snapshot.currency_code',
      'facility_pricing_snapshot.currency_code',
      'facility_profitability_snapshot.currency_code',
      'collateral_asset_master.currency_code',
      'collateral_snapshot.currency_code',
      'credit_agreement_master.currency_code',
      'instrument_master.currency_code',
      'position.currency_code',
      'cash_flow.currency_code',
      'fx_rate.from_currency_code',
      'fx_rate.to_currency_code',
      'limit_assignment_snapshot.currency_code',
      'limit_utilization_event.currency_code',
      'deal_pipeline_fact.currency_code',
    ],
    severity: 'warning',
    description: 'ISO 4217 currency code (FX conversion, exposure aggregation)',
  },
  {
    l1Table: 'default_definition_dim',
    l1Pk: 'default_definition_id',
    l2Fields: ['credit_event.default_definition_id'],
    severity: 'warning',
    description: 'Regulatory default definition (Basel III Art. 178)',
  },
  {
    l1Table: 'dpd_bucket_dim',
    l1Pk: 'dpd_bucket_code',
    l2Fields: [
      'facility_delinquency_snapshot.dpd_bucket_code',
      'facility_delinquency_snapshot.delinquency_bucket_code',
    ],
    severity: 'warning',
    description: 'FFIEC days-past-due bucket (CURRENT, 1-29, 30-59, 60-89, 90+)',
  },
  {
    l1Table: 'duns_entity_dim',
    l1Pk: 'duns_number',
    l2Fields: [
      'counterparty.duns_number',
      'duns_entity_observation.duns_number',
    ],
    severity: 'warning',
    description: 'D&B DUNS entity identifier',
  },
  {
    l1Table: 'ecl_stage_dim',
    l1Pk: 'ecl_stage_code',
    l2Fields: ['ecl_staging_snapshot.ecl_stage_code'],
    severity: 'warning',
    description: 'IFRS 9 / CECL ECL staging classification',
  },
  {
    l1Table: 'enterprise_business_taxonomy',
    l1Pk: 'managed_segment_id',
    l2Fields: [
      'facility_master.lob_segment_id',
      'facility_exposure_snapshot.lob_segment_id',
      'facility_lob_attribution.lob_segment_id',
      'deal_pipeline_fact.lob_segment_id',
      'exception_event.lob_segment_id',
      'stress_test_breach.lob_segment_id',
    ],
    severity: 'warning',
    description: 'EBT LOB segment (rollup critical — facility->desk->portfolio->segment)',
  },
  {
    l1Table: 'enterprise_product_taxonomy',
    l1Pk: 'product_node_id',
    l2Fields: [
      'facility_master.product_node_id',
      'facility_exposure_snapshot.product_node_id',
      'position.product_node_id',
    ],
    severity: 'warning',
    description: 'Product taxonomy node for product-level rollup',
  },
  {
    l1Table: 'exposure_type_dim',
    l1Pk: 'exposure_type_id',
    l2Fields: [
      'exposure_counterparty_attribution.exposure_type_id',
      'facility_exposure_snapshot.exposure_type_id',
      'position.exposure_type_code',
    ],
    severity: 'warning',
    description: 'Exposure type classification (on/off balance sheet, CCF)',
  },
  {
    l1Table: 'facility_type_dim',
    l1Pk: 'facility_type_id',
    l2Fields: ['facility_master.facility_type_id'],
    severity: 'warning',
    description: 'Facility type (term loan, revolver, LC, etc.)',
  },
  {
    l1Table: 'forbearance_type_dim',
    l1Pk: 'forbearance_type_code',
    l2Fields: ['forbearance_event.forbearance_type_code'],
    severity: 'warning',
    description: 'Forbearance/restructuring type classification',
  },
  {
    l1Table: 'fr2590_category_dim',
    l1Pk: 'fr2590_category_code',
    l2Fields: ['facility_exposure_snapshot.fr2590_category_code'],
    severity: 'warning',
    description: 'FR 2590 regulatory reporting category',
  },
  {
    l1Table: 'impairment_model_dim',
    l1Pk: 'model_code',
    l2Fields: ['ecl_staging_snapshot.model_code'],
    severity: 'warning',
    description: 'Impairment model (CECL/IFRS9/local GAAP)',
  },
  {
    l1Table: 'interest_rate_index_dim',
    l1Pk: 'rate_index_id',
    l2Fields: [
      'facility_master.rate_index_id',
      'facility_pricing_snapshot.rate_index_id',
    ],
    severity: 'warning',
    description: 'Interest rate benchmark (SOFR, EURIBOR, etc.)',
  },
  {
    l1Table: 'internal_risk_rating_bucket_dim',
    l1Pk: 'internal_risk_rating_bucket_code',
    l2Fields: ['facility_exposure_snapshot.internal_risk_rating_bucket_code'],
    severity: 'warning',
    description: 'Internal risk rating bucket for exposure stratification',
  },
  {
    l1Table: 'ledger_account_dim',
    l1Pk: 'ledger_account_id',
    l2Fields: [
      'facility_master.ledger_account_id',
      'facility_profitability_snapshot.ledger_account_id',
    ],
    severity: 'warning',
    description: 'GL ledger account for P&L attribution',
  },
  {
    l1Table: 'limit_rule',
    l1Pk: 'limit_rule_id',
    l2Fields: [
      'exception_event.limit_rule_id',
      'limit_assignment_snapshot.limit_rule_id',
      'limit_contribution_snapshot.limit_rule_id',
      'limit_utilization_event.limit_rule_id',
      'stress_test_breach.limit_rule_id',
    ],
    severity: 'warning',
    description: 'Limit rule definition for concentration/threshold monitoring',
  },
  {
    l1Table: 'metric_definition_dim',
    l1Pk: 'metric_definition_id',
    l2Fields: ['financial_metric_observation.metric_definition_id'],
    severity: 'warning',
    description: 'Metric definition for financial metric observations',
  },
  {
    l1Table: 'portfolio_dim',
    l1Pk: 'portfolio_id',
    l2Fields: ['facility_master.portfolio_id'],
    severity: 'warning',
    description: 'Portfolio assignment for portfolio-level rollup',
  },
  {
    l1Table: 'pricing_tier_dim',
    l1Pk: 'pricing_tier_code',
    l2Fields: ['counterparty.pricing_tier_code'],
    severity: 'warning',
    description: 'Pricing tier for spread/fee determination',
  },
  {
    l1Table: 'product_subtype_dim',
    l1Pk: 'product_subtype_id',
    l2Fields: ['position.product_subtype_id'],
    severity: 'warning',
    description: 'Product subtype for position classification',
  },
  {
    l1Table: 'rating_grade_dim',
    l1Pk: 'rating_grade_id',
    l2Fields: ['counterparty_rating_observation.rating_grade_id'],
    severity: 'warning',
    description: 'Internal rating grade (PD/LGD mapping)',
  },
  {
    l1Table: 'rating_scale_dim',
    l1Pk: 'rating_scale_id',
    l2Fields: ['counterparty_rating_observation.rating_scale_id'],
    severity: 'warning',
    description: 'Rating scale definition (internal, Moody\'s, S&P, Fitch)',
  },
  {
    l1Table: 'rating_source',
    l1Pk: 'rating_source_id',
    l2Fields: ['counterparty_rating_observation.rating_source_id'],
    severity: 'warning',
    description: 'Rating source/agency identifier',
  },
  {
    l1Table: 'region_dim',
    l1Pk: 'region_code',
    l2Fields: ['country_dim.region_code'],
    severity: 'warning',
    description: 'Geographic region (AMER, EMEA, APAC)',
  },
  {
    l1Table: 'risk_mitigant_type_dim',
    l1Pk: 'risk_mitigant_subtype_code',
    l2Fields: ['risk_mitigant_master.risk_mitigant_subtype_code'],
    severity: 'warning',
    description: 'Risk mitigant subtype (collateral, guarantee, netting, etc.)',
  },
  {
    l1Table: 'scenario_dim',
    l1Pk: 'scenario_id',
    l2Fields: ['stress_test_breach.scenario_id'],
    severity: 'warning',
    description: 'Stress test scenario definition',
  },
  {
    l1Table: 'source_system_registry',
    l1Pk: 'source_system_id',
    l2Fields: [
      'counterparty.source_system_id',
      'facility_master.source_system_id',
      'credit_agreement_master.source_system_id',
      'facility_exposure_snapshot.source_system_id',
      'collateral_asset_master.source_system_id',
      'position.source_system_id',
      'credit_event.source_system_id',
    ],
    severity: 'warning',
    description: 'Source system lineage tracking',
  },
  {
    l1Table: 'watchlist_category_dim',
    l1Pk: 'watchlist_category_code',
    l2Fields: ['watchlist_entry.watchlist_category_code'],
    severity: 'warning',
    description: 'Watchlist category classification',
  },
];

/* ────────────────── Generic FK Validator ────────────────── */

/**
 * Run all FK domain validations using the declarative registry.
 *
 * For each FK check:
 * 1. Load valid PK values from the L1 registry
 * 2. For each L2 field reference, find matching table rows in output
 * 3. Check every non-null FK value against the L1 PK set
 * 4. Report first 5 invalid values per field at the specified severity
 *
 * Gracefully skips:
 * - L1 tables not loaded in the registry (logs a warning)
 * - L2 tables not present in the output
 * - NULL FK values (NULLs are not FK violations)
 */
export function runFKDomainValidation(
  output: V2GeneratorOutput,
  registry: ReferenceDataRegistry,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build a lookup from table name -> TableData for O(1) access
  const tableIndex = new Map<string, typeof output.tables[0]>();
  for (const td of output.tables) {
    tableIndex.set(td.table, td);
  }

  for (const check of FK_REGISTRY) {
    // Verify L1 table is loaded in the registry
    const l1PKs = registry.validPKs(check.l1Table);
    if (l1PKs.size === 0) {
      // L1 table not loaded or empty — skip silently (common for tables
      // like context_dim, scenario_dim that may not be in the seed SQL)
      continue;
    }

    for (const l2Ref of check.l2Fields) {
      const dotIdx = l2Ref.indexOf('.');
      if (dotIdx === -1) continue; // malformed ref

      const tableName = l2Ref.substring(0, dotIdx);
      const fieldName = l2Ref.substring(dotIdx + 1);

      // Find the table in output
      const td = tableIndex.get(tableName);
      if (!td) continue; // table not in this output — skip

      const badValues = new Set<string>();
      let checked = 0;

      for (const row of td.rows) {
        if (!(fieldName in row)) continue;
        const val = row[fieldName];
        if (val === null || val === undefined) continue;

        checked++;
        if (!registry.isValidPK(check.l1Table, val)) {
          badValues.add(String(val));
        }
        // Cap at 5 examples to avoid flooding
        if (badValues.size >= 5) break;
      }

      if (badValues.size > 0) {
        const msg =
          `${td.schema}.${tableName}: ${fieldName} has ${badValues.size} invalid ` +
          `${check.l1Table} FK value(s): [${[...badValues].join(', ')}] ` +
          `(checked ${checked} rows — ${check.description})`;

        if (check.severity === 'error') {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }
  }

  return { errors, warnings };
}
