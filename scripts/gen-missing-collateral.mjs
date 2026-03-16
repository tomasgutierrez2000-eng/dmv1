#!/usr/bin/env node
/**
 * Generate missing collateral_asset_master rows (IDs 151-405)
 * by parsing L2 collateral_snapshot to get the required counterparty_id mapping.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const l2Seed = fs.readFileSync(path.join(__dirname, '..', 'sql/gsib-export/04-l2-seed.sql'), 'utf8');
const l1Seed = fs.readFileSync(path.join(__dirname, '..', 'sql/gsib-export/03-l1-seed.sql'), 'utf8');

// Parse L2 collateral_snapshot to get collateral_asset_id -> counterparty_id mapping
const l2Map = new Map(); // collateral_asset_id -> counterparty_id
const csRegex = /INSERT INTO l2\.collateral_snapshot\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
let match;
let colNames = null;

while ((match = csRegex.exec(l2Seed)) !== null) {
  if (!colNames) {
    colNames = match[1].split(',').map(c => c.trim().replace(/"/g, ''));
  }
  const vals = match[2].split(',').map(v => v.trim().replace(/^'|'$/g, ''));
  const caIdx = colNames.indexOf('collateral_asset_id');
  const cpIdx = colNames.indexOf('counterparty_id');
  if (caIdx >= 0 && cpIdx >= 0) {
    const caId = parseInt(vals[caIdx]);
    const cpId = parseInt(vals[cpIdx]);
    if (caId > 150 && !l2Map.has(caId)) {
      l2Map.set(caId, cpId);
    }
  }
}

console.log(`Found ${l2Map.size} missing collateral_asset_ids in L2 (151-405)`);

// Parse existing L1 collateral_asset_master to understand patterns
const l1Regex = /INSERT INTO l1\.collateral_asset_master\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
let l1Cols = null;
const existingRows = [];
while ((match = l1Regex.exec(l1Seed)) !== null) {
  if (!l1Cols) {
    l1Cols = match[1].split(',').map(c => c.trim().replace(/"/g, ''));
  }
  existingRows.push(match[2].split(',').map(v => v.trim()));
}
console.log(`Existing L1 rows: ${existingRows.length}, columns: ${l1Cols?.join(', ')}`);

// Asset type rotation (matching the cyclic pattern in existing seed)
const assetTypes = [
  'CASH_DEPOSIT', 'UST_BONDS', 'CORP_BOND_IG', 'LISTED_EQUITY', 'COMMERCIAL_RE',
  'TRADE_RECEIVABLES', 'PARENT_GUARANTEE', 'GOLD_BULLION', 'RAW_MATERIALS', 'MANUFACTURING_EQUIP'
];
const chargeTypes = [
  'FIRST_LIEN', 'SECOND_LIEN', 'FIRST_LIEN', 'PLEDGE', 'FIRST_MORTGAGE',
  'FLOATING_CHARGE', 'UNSECURED', 'PLEDGE', 'FLOATING_CHARGE', 'FIRST_MORTGAGE'
];
const countries = ['US','GB','DE','FR','JP','CH','CA','AU','NL','SG','IE','LU','HK','KR','SE','NO','DK','FI','BE','AT'];
const currencies = ['USD','EUR','GBP','CHF','JPY','CAD','AUD','CNY','HKD','SGD','USD','EUR','GBP','CHF','JPY','CAD','AUD','CNY','HKD','SGD'];
const costs = [50000000, 75000000, 30000000, 20000000, 125000000, 15000000, 0, 10000000, 8000000, 45000000,
               60000000, 35000000, 22000000, 18000000, 90000000, 12000000, 0, 7500000, 6000000, 55000000];
const descriptions = [
  'Cash deposit held at custodian bank',
  'US Treasury bonds portfolio',
  'Investment-grade corporate bond basket',
  'Listed equity portfolio - large cap',
  'Commercial real estate - office building',
  'Trade receivables pool',
  'Parent company guarantee',
  'Gold bullion held in vault',
  'Raw materials inventory',
  'Manufacturing equipment and plant'
];

// Generate INSERT statements
const lines = [];
lines.push('-- Missing collateral_asset_master rows (IDs 151-405)');
lines.push('-- Generated to satisfy FK from l2.collateral_snapshot');
lines.push('');

// Get all IDs we need (151-405, based on what L2 references)
const neededIds = [];
for (let id = 151; id <= 405; id++) {
  neededIds.push(id);
}

for (const id of neededIds) {
  const cpId = l2Map.get(id) || ((id % 100) + 1); // fallback if not in L2
  const idx = (id - 1) % 10;
  const countryIdx = (id - 1) % countries.length;
  const currIdx = (id - 1) % currencies.length;
  const costIdx = (id - 1) % costs.length;
  const descIdx = (id - 1) % descriptions.length;
  const collateralTypeId = (idx % 10) + 1;
  const legalEntityId = (id % 10) + 1;
  const lienPriority = (idx % 3) + 1;
  const insuranceFlag = idx < 5 ? 'Y' : 'N';
  const regEligible = idx < 7 ? 'Y' : 'N';
  const status = idx === 8 ? 'PENDING_VALUATION' : 'ACTIVE';
  const revalFreq = ['MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL','QUARTERLY'][idx % 5];
  const cost = costs[costIdx];

  const vals = [
    id,                                    // collateral_asset_id
    collateralTypeId,                      // collateral_type_id
    cpId,                                  // counterparty_id
    `'${countries[countryIdx]}'`,          // country_code
    `'${currencies[currIdx]}'`,            // currency_code
    legalEntityId,                         // legal_entity_id
    `'${chargeTypes[idx]}'`,              // charge_type
    `'${assetTypes[idx]}'`,               // collateral_asset_type
    id,                                    // collateral_id
    `'${status}'`,                         // collateral_status
    `'${descriptions[descIdx]}'`,          // description
    idx < 5 ? `'2026-12-31'` : 'NULL',   // insurance_expiry_date
    `'${insuranceFlag}'`,                  // insurance_flag
    lienPriority,                          // lien_priority
    `'${countries[countryIdx]}'`,          // location_country_code
    `'${descriptions[descIdx]}'`,          // location_description
    `'2027-06-30'`,                        // maturity_date
    `${cost}.00`,                          // original_cost
    `'${regEligible}'`,                    // regulatory_eligible_flag
    `'${revalFreq}'`,                      // revaluation_frequency
    id,                                    // source_record_id
    `CURRENT_TIMESTAMP`,                   // updated_ts
    `'${currencies[currIdx]}'`,            // valuation_currency_code
    `'2023-01-15'`,                        // vintage_date
    `'2024-01-01'`,                        // effective_start_date
    'NULL',                                // effective_end_date
    `'Y'`,                                 // is_current_flag
    `CURRENT_TIMESTAMP`                    // created_ts
  ];

  lines.push(`INSERT INTO l1.collateral_asset_master (collateral_asset_id, collateral_type_id, counterparty_id, country_code, currency_code, legal_entity_id, charge_type, collateral_asset_type, collateral_id, collateral_status, description, insurance_expiry_date, insurance_flag, lien_priority, location_country_code, location_description, maturity_date, original_cost, regulatory_eligible_flag, revaluation_frequency, source_record_id, updated_ts, valuation_currency_code, vintage_date, effective_start_date, effective_end_date, is_current_flag, created_ts) VALUES (${vals.join(', ')});`);
}

// Write output
const outPath = path.join(__dirname, '..', 'sql/gsib-export/03a-l1-collateral-patch.sql');
fs.writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`\nWrote ${neededIds.length} rows to ${outPath}`);
