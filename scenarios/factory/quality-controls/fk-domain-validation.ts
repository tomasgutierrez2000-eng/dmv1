/**
 * Group 1: L1 FK Domain Validation
 *
 * Validates that every FK value in emitted L2/L3 rows exists in the
 * corresponding L1 dimension table. Checks 18 FK fields.
 */

import type { ReferenceDataRegistry } from '../reference-data-registry';
import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';

export function runFKDomainValidation(
  output: V2GeneratorOutput,
  registry: ReferenceDataRegistry,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const FK_CHECKS: Array<{
    field: string;
    l1Table: string;
    severity: 'error' | 'warning';
  }> = [
    { field: 'currency_code', l1Table: 'currency_dim', severity: 'warning' },
    { field: 'base_currency_code', l1Table: 'currency_dim', severity: 'warning' },
    { field: 'credit_status_code', l1Table: 'credit_status_dim', severity: 'warning' },
    { field: 'collateral_type_id', l1Table: 'collateral_type', severity: 'warning' },
    { field: 'source_system_id', l1Table: 'source_system_registry', severity: 'warning' },
    { field: 'portfolio_id', l1Table: 'portfolio_dim', severity: 'warning' },
    { field: 'rate_index_id', l1Table: 'interest_rate_index_dim', severity: 'warning' },
    { field: 'ledger_account_id', l1Table: 'ledger_account_dim', severity: 'warning' },
    { field: 'exposure_type_id', l1Table: 'exposure_type_dim', severity: 'warning' },
    { field: 'delinquency_bucket_code', l1Table: 'dpd_bucket_dim', severity: 'warning' },
    { field: 'dpd_bucket_code', l1Table: 'dpd_bucket_dim', severity: 'warning' },
    { field: 'amendment_type_code', l1Table: 'amendment_type_dim', severity: 'warning' },
    { field: 'amendment_status_code', l1Table: 'amendment_status_dim', severity: 'warning' },
    { field: 'credit_event_type_code', l1Table: 'credit_event_type_dim', severity: 'warning' },
    { field: 'country_code', l1Table: 'country_dim', severity: 'warning' },
    { field: 'entity_type_code', l1Table: 'entity_type_dim', severity: 'warning' },
    { field: 'region_code', l1Table: 'region_dim', severity: 'warning' },
    { field: 'crm_type_code', l1Table: 'crm_type_dim', severity: 'warning' },
  ];

  for (const td of output.tables) {
    for (const check of FK_CHECKS) {
      const badValues = new Set<string>();
      let checked = 0;

      for (const row of td.rows) {
        if (!(check.field in row)) continue;
        const val = row[check.field];
        if (val === null || val === undefined) continue;

        checked++;
        if (!registry.isValidPK(check.l1Table, val)) {
          badValues.add(String(val));
        }
        if (badValues.size >= 5) break;
      }

      if (badValues.size > 0) {
        const msg = `${td.schema}.${td.table}: ${check.field} has ${badValues.size} invalid L1 value(s): [${[...badValues].join(', ')}] (checked ${checked} rows, L1 table: ${check.l1Table})`;
        if (check.severity === 'error') errors.push(msg);
        else warnings.push(msg);
      }
    }
  }

  return { errors, warnings };
}
