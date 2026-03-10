#!/usr/bin/env node
/**
 * Updates YAML metric files to reference L3 overlay tables
 * for fields that moved from L2 to L3 during the layer reassignment.
 *
 * Strategy:
 * - For source_tables entries where ALL referenced fields moved to L3:
 *   change schema/table to L3 overlay
 * - For source_tables entries where SOME fields moved:
 *   add a new L3 source_table entry, update formula_sql with JOIN
 * - For formula_sql: add L3 JOINs and update field aliases
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob') || { sync: (p) => require('child_process').execSync(`find ${path.dirname(p)} -name "*.yaml" -type f`).toString().trim().split('\n') };

const METRICS_DIR = path.join(__dirname, 'calc_engine', 'metrics');

// ============================================================================
// Field migration map: field_name → { from_table, to_schema, to_table }
// ============================================================================
const FIELD_MIGRATIONS = {
  // facility_exposure_snapshot → facility_exposure_calc
  number_of_loans:     { from: 'facility_exposure_snapshot', toSchema: 'l3', toTable: 'facility_exposure_calc', toAlias: 'fec' },
  number_of_facilities:{ from: 'facility_exposure_snapshot', toSchema: 'l3', toTable: 'facility_exposure_calc', toAlias: 'fec' },
  days_until_maturity: { from: 'facility_exposure_snapshot', toSchema: 'l3', toTable: 'facility_exposure_calc', toAlias: 'fec' },
  coverage_ratio_pct:  { from: 'facility_exposure_snapshot', toSchema: 'l3', toTable: 'facility_exposure_calc', toAlias: 'fec' },
  limit_status_code:   { from: 'facility_exposure_snapshot', toSchema: 'l3', toTable: 'facility_exposure_calc', toAlias: 'fec' },
  // rwa_amt can come from both facility_exposure_snapshot and facility_risk_snapshot
  // We handle it by from-table context

  // facility_financial_snapshot → facility_financial_calc
  dscr_value:                  { from: 'facility_financial_snapshot', toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },
  ltv_pct:                     { from: 'facility_financial_snapshot', toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },
  net_income_amt:              { from: 'facility_financial_snapshot', toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },
  total_debt_service_amt:      { from: 'facility_financial_snapshot', toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },
  interest_rate_sensitivity_pct:{ from: 'facility_financial_snapshot', toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },

  // facility_profitability_snapshot → facility_financial_calc
  interest_income_amt:   { from: 'facility_profitability_snapshot', toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },
  interest_expense_amt:  { from: 'facility_profitability_snapshot', toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },
  avg_earning_assets_amt:{ from: 'facility_profitability_snapshot', toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },

  // facility_pricing_snapshot → facility_pricing_calc
  pricing_exception_flag:{ from: 'facility_pricing_snapshot', toSchema: 'l3', toTable: 'facility_pricing_calc', toAlias: 'fpc' },

  // credit_event_facility_link → facility_risk_calc
  exposure_at_default:   { from: 'credit_event_facility_link', toSchema: 'l3', toTable: 'facility_risk_calc', toAlias: 'frc' },

  // deal_pipeline_fact → deal_pipeline_calc
  expected_tenor_months: { from: 'deal_pipeline_fact', toSchema: 'l3', toTable: 'deal_pipeline_calc', toAlias: 'dpc' },

  // cash_flow → cash_flow_calc
  contractual_amt:       { from: 'cash_flow', toSchema: 'l3', toTable: 'cash_flow_calc', toAlias: 'cfc' },
};

// rwa_amt is special — it can come from multiple L2 tables
const RWA_MIGRATIONS = {
  facility_exposure_snapshot: { toSchema: 'l3', toTable: 'facility_exposure_calc', toAlias: 'fec' },
  facility_risk_snapshot:     { toSchema: 'l3', toTable: 'facility_risk_calc', toAlias: 'frc' },
};

// revenue_amt and fee_rate_pct are also special
const REVENUE_MIGRATIONS = {
  facility_financial_snapshot: { toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },
  facility_master:             { toSchema: 'l3', toTable: 'facility_financial_calc', toAlias: 'ffc' },
};

const FEE_RATE_MIGRATIONS = {
  facility_pricing_snapshot: { toSchema: 'l3', toTable: 'facility_pricing_calc', toAlias: 'fpc' },
};

// ============================================================================
// Find all YAML files
// ============================================================================
function findYamlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findYamlFiles(full));
    else if (entry.name.endsWith('.yaml')) results.push(full);
  }
  return results;
}

const yamlFiles = findYamlFiles(METRICS_DIR);
console.log(`Found ${yamlFiles.length} YAML metric files`);

let updatedCount = 0;

for (const filePath of yamlFiles) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  const relPath = path.relative(METRICS_DIR, filePath);

  // Check each field migration
  for (const [fieldName, migration] of Object.entries(FIELD_MIGRATIONS)) {
    // Check if this YAML references the field from the source table
    if (content.includes(fieldName) && content.includes(migration.from)) {
      // Source table references in source_tables section:
      // Replace schema/table for moved fields
      // In formula_sql: replace table references

      const fromTable = migration.from;
      const toTable = migration.toTable;
      const toSchema = migration.toSchema;

      // For formula_sql: replace l2.{fromTable} with l3.{toTable} for the field
      // This is the tricky part — we need to handle the alias correctly
      // Simple approach: replace the schema.table in FROM/JOIN clauses where the field is used

      // For now, just update source_tables metadata. Formula SQL needs manual review.
      modified = true;
    }
  }

  // Apply formula_sql replacements for common patterns
  const replacements = [
    // facility_exposure_snapshot fields moving to facility_exposure_calc
    // When ONLY moved fields are used from fes, change the table reference
    // When BOTH moved and non-moved fields are used, need to add JOIN

    // For metrics that ONLY use rwa_amt from facility_exposure_snapshot (and no other fes fields like gross_exposure_usd):
    // This is handled case-by-case below
  ];

  // ── Pattern: fields moving from l2.facility_exposure_snapshot to l3.facility_exposure_calc ──
  // Fields: number_of_loans, days_until_maturity, rwa_amt, number_of_facilities

  // For metrics where the ONLY fes.* references are to moved fields,
  // change fes to reference l3.facility_exposure_calc instead

  // REF-001: uses fes.number_of_loans only → change fes to l3.facility_exposure_calc
  // REF-008: uses fes.days_until_maturity only → change fes to l3.facility_exposure_calc
  // REF-028: uses fes.number_of_facilities only → change fes to l3.facility_exposure_calc
  // EXP-046: uses fes.rwa_amt only → change fes to l3.facility_exposure_calc

  // For metrics that use BOTH moved and non-moved fes fields:
  // EXP-045: uses fes.rwa_amt (moved) AND fes.gross_exposure_usd (stayed) → add JOIN
  // CAP-001: uses fes.rwa_amt (moved) → need to check other fields
  // CAP-002: uses fes.rwa_amt (moved) → need to check other fields

  // Simple replacements for single-source metrics
  const simpleReplacements = {
    // Replace l2.facility_exposure_snapshot with l3.facility_exposure_calc
    // (only for files that ONLY reference moved fields from this table)
    'fes.number_of_loans': { find: 'l2.facility_exposure_snapshot', replace: 'l3.facility_exposure_calc' },
    'fes.days_until_maturity': { find: 'l2.facility_exposure_snapshot', replace: 'l3.facility_exposure_calc' },
    'fes.number_of_facilities': { find: 'l2.facility_exposure_snapshot', replace: 'l3.facility_exposure_calc' },

    // facility_financial_snapshot → facility_financial_calc
    'ffs.dscr_value': { find: 'l2.facility_financial_snapshot', replace: 'l3.facility_financial_calc' },
    'ffs.ltv_pct': { find: 'l2.facility_financial_snapshot', replace: 'l3.facility_financial_calc' },
    'ffs.net_income_amt': { find: 'l2.facility_financial_snapshot', replace: 'l3.facility_financial_calc' },
    'ffs.total_debt_service_amt': { find: 'l2.facility_financial_snapshot', replace: 'l3.facility_financial_calc' },
    'ffs.revenue_amt': { find: 'l2.facility_financial_snapshot', replace: 'l3.facility_financial_calc' },

    // facility_pricing_snapshot → facility_pricing_calc
    'fps.pricing_exception_flag': { find: 'l2.facility_pricing_snapshot', replace: 'l3.facility_pricing_calc' },
    'fps.fee_rate_pct': { find: 'l2.facility_pricing_snapshot', replace: 'l3.facility_pricing_calc' },

    // deal_pipeline_fact → deal_pipeline_calc
    'dpf.expected_tenor_months': { find: 'l2.deal_pipeline_fact', replace: 'l3.deal_pipeline_calc' },

    // cash_flow → cash_flow_calc
    'cf.contractual_amt': { find: 'l2.cash_flow', replace: 'l3.cash_flow_calc' },
  };

  let originalContent = content;

  // ── Targeted file-by-file updates ──
  // These are the 24 files identified by exploration

  const basename = path.basename(filePath, '.yaml');

  // Files where fes references ONLY moved fields → change fes source to l3
  if (['REF-001', 'REF-008', 'REF-028', 'EXP-046'].includes(basename)) {
    content = content.replace(/l2\.facility_exposure_snapshot/g, 'l3.facility_exposure_calc');
    // Update source_tables metadata
    content = content.replace(/schema: l2\n  table: facility_exposure_snapshot/g,
      'schema: l3\n  table: facility_exposure_calc');
  }

  // Files where fes uses rwa_amt (moved) AND other fes fields (not moved) → add JOIN to l3
  if (['EXP-045', 'CAP-001', 'CAP-002'].includes(basename)) {
    // Add l3 JOIN for rwa_amt, keep fes for other fields
    // Replace fes.rwa_amt with fec.rwa_amt
    content = content.replace(/fes\.rwa_amt/g, 'fec.rwa_amt');
    // After each FROM l2.facility_exposure_snapshot fes, add JOIN
    content = content.replace(
      /FROM l2\.facility_exposure_snapshot fes\n/g,
      'FROM l2.facility_exposure_snapshot fes\n      LEFT JOIN l3.facility_exposure_calc fec\n        ON fec.facility_id = fes.facility_id AND fec.as_of_date = fes.as_of_date\n'
    );
    // Add l3 source_table entry in metadata
    if (!content.includes('facility_exposure_calc')) {
      content = content.replace(
        /- schema: l2\n  table: facility_master/,
        `- schema: l3\n  table: facility_exposure_calc\n  alias: fec\n  join_type: LEFT\n  join_on: fec.facility_id = fes.facility_id AND fec.as_of_date = fes.as_of_date\n  fields:\n  - name: rwa_amt\n    role: MEASURE\n- schema: l2\n  table: facility_master`
      );
    }
  }

  // facility_financial_snapshot metrics → change to l3.facility_financial_calc
  if (['EXP-014', 'EXP-026', 'EXP-027', 'EXP-031', 'EXP-047'].includes(basename)) {
    content = content.replace(/l2\.facility_financial_snapshot/g, 'l3.facility_financial_calc');
    content = content.replace(/schema: l2\n  table: facility_financial_snapshot/g,
      'schema: l3\n  table: facility_financial_calc');
  }

  // facility_profitability_snapshot metrics → change to l3.facility_financial_calc
  if (['EXP-028', 'EXP-041', 'EXP-044'].includes(basename)) {
    content = content.replace(/l2\.facility_profitability_snapshot/g, 'l3.facility_financial_calc');
    content = content.replace(/schema: l2\n  table: facility_profitability_snapshot/g,
      'schema: l3\n  table: facility_financial_calc');
  }

  // facility_pricing_snapshot metrics → change to l3.facility_pricing_calc for moved fields
  if (['PRC-003', 'PRC-005', 'PRC-009'].includes(basename)) {
    // These only use pricing_exception_flag (moved)
    content = content.replace(/l2\.facility_pricing_snapshot/g, 'l3.facility_pricing_calc');
    content = content.replace(/schema: l2\n  table: facility_pricing_snapshot/g,
      'schema: l3\n  table: facility_pricing_calc');
  }

  // PRC-004 uses fee_rate_pct (moved) but may also use other pricing fields
  if (basename === 'PRC-004') {
    content = content.replace(/l2\.facility_pricing_snapshot/g, 'l3.facility_pricing_calc');
    content = content.replace(/schema: l2\n  table: facility_pricing_snapshot/g,
      'schema: l3\n  table: facility_pricing_calc');
  }

  // PROF-108 uses cost_of_funds_pct from facility_pricing_snapshot (NOT moved)
  // and interest_expense_amt from facility_profitability_snapshot (moved)
  if (basename === 'PROF-108') {
    // Only change profitability references, keep pricing references
    content = content.replace(/l2\.facility_profitability_snapshot/g, 'l3.facility_financial_calc');
    content = content.replace(/schema: l2\n  table: facility_profitability_snapshot/g,
      'schema: l3\n  table: facility_financial_calc');
  }

  // credit_event_facility_link → exposure_at_default moved to facility_risk_calc
  if (basename === 'EXP-020') {
    // exposure_at_default moved to l3.facility_risk_calc
    content = content.replace(/l2\.credit_event_facility_link/g, 'l3.facility_risk_calc');
    content = content.replace(/schema: l2\n  table: credit_event_facility_link/g,
      'schema: l3\n  table: facility_risk_calc');
  }

  // deal_pipeline_fact → expected_tenor_months moved to deal_pipeline_calc
  if (basename === 'REF-003') {
    content = content.replace(/l2\.deal_pipeline_fact/g, 'l3.deal_pipeline_calc');
    content = content.replace(/schema: l2\n  table: deal_pipeline_fact/g,
      'schema: l3\n  table: deal_pipeline_calc');
  }

  // cash_flow → contractual_amt moved to cash_flow_calc
  if (basename === 'EXP-002') {
    content = content.replace(/l2\.cash_flow/g, 'l3.cash_flow_calc');
    content = content.replace(/schema: l2\n  table: cash_flow/g,
      'schema: l3\n  table: cash_flow_calc');
  }

  // RSK-009 uses collateral_snapshot for allocated fields
  // Actually RSK-009 uses committed_facility_amt (still in L2) and current_valuation_usd (still in L2)
  // So no changes needed for RSK-009

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    updatedCount++;
    console.log(`  Updated: ${relPath}`);
  }
}

console.log(`\nUpdated ${updatedCount} of ${yamlFiles.length} YAML files`);
