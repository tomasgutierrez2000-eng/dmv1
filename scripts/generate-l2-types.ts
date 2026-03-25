#!/usr/bin/env npx tsx
/**
 * generate-l2-types.ts — Auto-generates scenarios/factory/l2-types.ts from the data dictionary.
 *
 * Reads: facility-summary-mvp/output/data-dictionary/data-dictionary.json
 * Writes: scenarios/factory/l2-types.ts
 *
 * Usage: npx tsx scripts/generate-l2-types.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const DD_PATH = path.join(ROOT, 'facility-summary-mvp/output/data-dictionary/data-dictionary.json');
const OUTPUT_PATH = path.join(ROOT, 'scenarios/factory/l2-types.ts');

/* ── DD type → TypeScript type mapping ── */

function tsType(ddType: string, isFlag: boolean, fieldName: string): string {
  const upper = ddType.toUpperCase();
  if (upper === 'BOOLEAN' || isFlag) return 'string'; // flags use 'Y'/'N'
  // ID fields are strings throughout the factory pipeline (IDRegistry returns string[])
  if (fieldName.endsWith('_id') && (upper === 'BIGINT' || upper === 'INTEGER' || upper === 'BIGSERIAL')) return 'string';
  if (upper === 'BIGINT' || upper === 'INTEGER' || upper === 'BIGSERIAL') return 'number';
  if (upper.startsWith('NUMERIC') || upper.startsWith('DECIMAL') || upper === 'REAL' || upper === 'DOUBLE PRECISION') return 'number';
  if (upper === 'DATE') return 'string';
  if (upper.startsWith('TIMESTAMP')) return 'string';
  if (upper.startsWith('VARCHAR') || upper === 'TEXT' || upper.startsWith('CHAR')) return 'string';
  // Fallback
  return 'string';
}

/* ── Table name → Interface name mapping ── */

// Maps DD table names to the existing interface names in l2-types.ts.
// New tables without an existing mapping get a PascalCase name derived from the table name + "Row".
const EXISTING_INTERFACE_NAMES: Record<string, string> = {
  facility_exposure_snapshot: 'ExposureRow',
  counterparty_rating_observation: 'RatingObservationRow',
  credit_event: 'CreditEventRow',
  credit_event_facility_link: 'EventFacilityLinkRow',
  risk_flag: 'RiskFlagRow',
  amendment_event: 'AmendmentEventRow',
  collateral_snapshot: 'CollateralSnapshotRow',
  stress_test_result: 'StressTestResultRow',
  stress_test_breach: 'StressTestBreachRow',
  facility_delinquency_snapshot: 'DelinquencyRow',
  limit_contribution_snapshot: 'LimitContributionRow',
  limit_utilization_event: 'LimitUtilizationRow',
  deal_pipeline_fact: 'DealPipelineRow',
  data_quality_score_snapshot: 'DataQualityRow',
  exposure_counterparty_attribution: 'ExposureAttributionRow',
  facility_pricing_snapshot: 'FacilityPricingRow',
  facility_risk_snapshot: 'FacilityRiskRow',
  facility_financial_snapshot: 'FacilityFinancialRow',
  position: 'PositionRow',
  position_detail: 'PositionDetailRow',
  cash_flow: 'CashFlowRow',
  facility_lob_attribution: 'FacilityLobAttributionRow',
  counterparty_financial_snapshot: 'CounterpartyFinancialRow',
  facility_profitability_snapshot: 'FacilityProfitabilityRow',
  amendment_change_detail: 'AmendmentChangeDetailRow',
  exception_event: 'ExceptionEventRow',
  facility_credit_approval: 'FacilityCreditApprovalRow',
  financial_metric_observation: 'FinancialMetricObservationRow',
  netting_set_exposure_snapshot: 'NettingSetExposureRow',
  metric_threshold: 'MetricThresholdL2Row',

  // L2 master/entity tables
  counterparty: 'CounterpartyRow',
  facility_master: 'FacilityMasterRow',
  credit_agreement_master: 'CreditAgreementMasterRow',
  collateral_asset_master: 'CollateralAssetMasterRow',
  counterparty_hierarchy: 'CounterpartyHierarchyRow',
  control_relationship: 'ControlRelationshipRow',
  instrument_master: 'InstrumentMasterRow',
  contract_master: 'ContractMasterRow',
  legal_entity: 'LegalEntityRow',
  legal_entity_hierarchy: 'LegalEntityHierarchyRow',
  facility_lender_allocation: 'FacilityLenderAllocationRow',
  facility_counterparty_participation: 'FacilityCounterpartyParticipationRow',
  credit_agreement_counterparty_participation: 'CreditAgreementCounterpartyParticipationRow',
  fx_rate: 'FxRateRow',
  risk_mitigant_master: 'RiskMitigantMasterRow',
  risk_mitigant_link: 'RiskMitigantLinkRow',
  collateral_link: 'CollateralLinkRow',
  ecl_staging_snapshot: 'EclStagingSnapshotRow',
  forbearance_event: 'ForbearanceEventRow',
  watchlist_entry: 'WatchlistEntryRow',
  netting_agreement: 'NettingAgreementRow',
  netting_set: 'NettingSetRow',
  netting_set_link: 'NettingSetLinkRow',
  margin_agreement: 'MarginAgreementRow',
  csa_master: 'CsaMasterRow',
  crm_protection_master: 'CrmProtectionMasterRow',
  protection_link: 'ProtectionLinkRow',
  payment_ledger: 'PaymentLedgerRow',
  duns_entity_observation: 'DunsEntityObservationRow',
  economic_interdependence_relationship: 'EconomicInterdependenceRelationshipRow',
  capital_position_snapshot: 'CapitalPositionSnapshotRow',
  limit_assignment_snapshot: 'LimitAssignmentSnapshotRow',
  gl_account_balance_snapshot: 'GlAccountBalanceSnapshotRow',
  gl_journal_entry: 'GlJournalEntryRow',
};

function toInterfaceName(tableName: string): string {
  if (EXISTING_INTERFACE_NAMES[tableName]) return EXISTING_INTERFACE_NAMES[tableName];
  // PascalCase + "Row"
  return tableName
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('') + 'Row';
}

/* ── Main ── */

interface DDField {
  name: string;
  description?: string;
  data_type: string;
  pk_fk?: {
    is_pk?: boolean;
    is_composite?: boolean;
    fk_target?: { layer: string; table: string; field: string };
  };
}

interface DDTable {
  name: string;
  layer: string;
  category?: string;
  fields: DDField[];
}

function main() {
  const dd = JSON.parse(readFileSync(DD_PATH, 'utf-8')) as { L1: DDTable[]; L2: DDTable[]; L3: DDTable[] };
  const l2Tables = dd.L2;

  console.log(`Read ${l2Tables.length} L2 tables from data dictionary`);

  const lines: string[] = [];

  lines.push(`/** AUTO-GENERATED from data dictionary — do not edit manually.`);
  lines.push(` * Regenerate: npx tsx scripts/generate-l2-types.ts`);
  lines.push(` *`);
  lines.push(` * Source: facility-summary-mvp/output/data-dictionary/data-dictionary.json`);
  lines.push(` * Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push(` * Tables: ${l2Tables.length}`);
  lines.push(` */`);
  lines.push('');

  // Sort tables alphabetically for stable output
  const sorted = [...l2Tables].sort((a, b) => a.name.localeCompare(b.name));

  const interfaceNames: { tableName: string; interfaceName: string }[] = [];

  for (const table of sorted) {
    const ifName = toInterfaceName(table.name);
    interfaceNames.push({ tableName: table.name, interfaceName: ifName });

    lines.push(`export interface ${ifName} {`);

    for (const field of table.fields) {
      const isPk = field.pk_fk?.is_pk === true;
      const isFlag = field.name.endsWith('_flag');
      const ts = tsType(field.data_type, isFlag, field.name);
      // PK fields are always required, everything else is nullable
      const nullable = isPk ? '' : ' | null';
      // Quote field names that aren't valid JS identifiers (e.g. start with digit)
      const fieldName = /^[a-zA-Z_$]/.test(field.name) ? field.name : `'${field.name}'`;
      lines.push(`  ${fieldName}: ${ts}${nullable};`);
    }

    lines.push('}');
    lines.push('');
  }

  // Generate the L2Data aggregate type
  lines.push('export interface L2Data {');
  for (const { tableName, interfaceName } of interfaceNames) {
    lines.push(`  ${tableName}?: ${interfaceName}[];`);
  }
  lines.push('}');
  lines.push('');

  const content = lines.join('\n');
  writeFileSync(OUTPUT_PATH, content);
  console.log(`Wrote ${OUTPUT_PATH} (${interfaceNames.length} interfaces, ${content.length} bytes)`);
}

main();
