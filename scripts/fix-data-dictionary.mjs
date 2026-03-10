#!/usr/bin/env node
/**
 * Fix data dictionary JSON audit issues.
 *
 * Changes:
 * 1. L1/L2: is_* fields without _flag suffix → rename + set data_type to BOOLEAN
 * 2. L1/L2: _flag fields with CHAR(1) → set data_type to BOOLEAN
 * 3. L1: _code PK columns that are BIGINT → VARCHAR(30)
 * 4. L2: _code FK columns that are BIGINT → VARCHAR(30)
 * 5. L3: _id VARCHAR(64) → BIGINT (except exception IDs)
 * 6. Remove duplicate metric_threshold from L2 (already in L1)
 * 7. Remove duplicate data_quality_score_snapshot from L2 (should be L3)
 * 8. Remove duplicate stress_test_result from L2 (should be L3)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DD_PATH = resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');

// Exception IDs that should stay VARCHAR in L3
const KEEP_VARCHAR_IDS = new Set([
  'metric_id', 'variant_id', 'source_metric_id', 'mdrm_id',
  'mapped_line_id', 'mapped_column_id', 'run_id',
]);

// _code columns that are PKs in L1 and should be VARCHAR(30)
const L1_CODE_PK_COLUMNS = new Set([
  'fr2590_category_code',
  'credit_event_type_code',
  'credit_status_code',
]);

const stats = {
  isRenames: 0,
  flagTypeFixes: 0,
  codePKFixes: 0,
  codeFKFixes: 0,
  l3IdFixes: 0,
  tablesRemoved: [],
};

function fixField(field, layer) {
  // 1. Fix is_* fields without _flag suffix → rename + BOOLEAN
  if (field.name.startsWith('is_') && !field.name.endsWith('_flag')) {
    field.name = field.name + '_flag';
    field.data_type = 'BOOLEAN';
    stats.isRenames++;
    return;
  }

  // 2. Fix _flag fields with wrong type (CHAR(1), VARCHAR) → BOOLEAN
  if (field.name.endsWith('_flag') && field.data_type && field.data_type !== 'BOOLEAN') {
    if (field.data_type.startsWith('CHAR') || field.data_type.startsWith('VARCHAR')) {
      field.data_type = 'BOOLEAN';
      stats.flagTypeFixes++;
      return;
    }
  }

  // 3. L1: Fix _code PK columns BIGINT → VARCHAR(30)
  if (layer === 'L1' && L1_CODE_PK_COLUMNS.has(field.name)) {
    if (field.data_type === 'BIGINT') {
      field.data_type = 'VARCHAR(30)';
      stats.codePKFixes++;
      return;
    }
  }

  // 4. L2: Fix _code FK columns pointing to L1 _code PKs
  if (layer === 'L2' && L1_CODE_PK_COLUMNS.has(field.name)) {
    if (field.data_type === 'BIGINT') {
      field.data_type = 'VARCHAR(30)';
      stats.codeFKFixes++;
      return;
    }
  }

  // 5. Also fix rating_grade_code which should be VARCHAR(30) not BIGINT
  if (field.name === 'rating_grade_code' && field.data_type === 'BIGINT') {
    field.data_type = 'VARCHAR(30)';
    stats.codePKFixes++;
    return;
  }

  // 6. L3: Fix _id VARCHAR(64) → BIGINT (except exceptions)
  if (layer === 'L3' && field.name.endsWith('_id') && !KEEP_VARCHAR_IDS.has(field.name)) {
    if (field.data_type === 'VARCHAR(64)') {
      field.data_type = 'BIGINT';
      stats.l3IdFixes++;
    }
  }
}

function fixDataDictionary() {
  const dd = JSON.parse(readFileSync(DD_PATH, 'utf8'));

  // Process each layer
  for (const layer of ['L1', 'L2', 'L3']) {
    if (!dd[layer]) continue;

    // Remove tables that shouldn't be in L2
    if (layer === 'L2') {
      const originalCount = dd[layer].length;
      dd[layer] = dd[layer].filter(table => {
        // metric_threshold is in both L1 and L2 — remove L2 duplicate
        if (table.name === 'metric_threshold') {
          stats.tablesRemoved.push('L2.metric_threshold');
          return false;
        }
        // data_quality_score_snapshot is derived — belongs in L3
        if (table.name === 'data_quality_score_snapshot') {
          stats.tablesRemoved.push('L2.data_quality_score_snapshot');
          return false;
        }
        // stress_test_result is derived — belongs in L3
        if (table.name === 'stress_test_result') {
          stats.tablesRemoved.push('L2.stress_test_result');
          return false;
        }
        return true;
      });
    }

    // Process fields in each table
    for (const table of dd[layer]) {
      if (!table.fields) continue;
      for (const field of table.fields) {
        fixField(field, layer);
      }
    }
  }

  writeFileSync(DD_PATH, JSON.stringify(dd, null, 2) + '\n');

  console.log('Data Dictionary fixes applied:');
  console.log(`  is_* renamed to is_*_flag + BOOLEAN: ${stats.isRenames}`);
  console.log(`  _flag CHAR(1)/VARCHAR → BOOLEAN:     ${stats.flagTypeFixes}`);
  console.log(`  L1 _code PK BIGINT → VARCHAR(30):    ${stats.codePKFixes}`);
  console.log(`  L2 _code FK BIGINT → VARCHAR(30):    ${stats.codeFKFixes}`);
  console.log(`  L3 _id VARCHAR(64) → BIGINT:         ${stats.l3IdFixes}`);
  console.log(`  Tables removed:                      ${stats.tablesRemoved.join(', ') || 'none'}`);
  console.log(`\nTotal changes: ${stats.isRenames + stats.flagTypeFixes + stats.codePKFixes + stats.codeFKFixes + stats.l3IdFixes + stats.tablesRemoved.length}`);
}

fixDataDictionary();
