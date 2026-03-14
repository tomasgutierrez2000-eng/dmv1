/**
 * Metric governance status report.
 *
 * Summarises catalogue item statuses, formula_sql coverage,
 * ingredient_fields completeness, and promotion readiness.
 *
 * Run:  npx tsx scripts/metric-status-report.ts
 */

import { getCatalogueItems } from '../lib/metric-library/store';

const C = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

function main() {
  const catalogue = getCatalogueItems();

  console.log(`\n${C.bold}Metric Governance Status Report${C.reset}`);
  console.log(`${'─'.repeat(60)}`);

  // 1. Status distribution
  const statusCounts = new Map<string, number>();
  for (const item of catalogue) {
    const s = item.status || 'UNKNOWN';
    statusCounts.set(s, (statusCounts.get(s) || 0) + 1);
  }
  console.log(`\n${C.bold}1. Status Distribution${C.reset} (${catalogue.length} items)`);
  for (const [status, count] of [...statusCounts.entries()].sort((a, b) => b[1] - a[1])) {
    const pct = Math.round((count / catalogue.length) * 100);
    const color = status === 'ACTIVE' ? C.green : status === 'DRAFT' ? C.yellow : C.dim;
    console.log(`   ${color}${status.padEnd(20)}${C.reset} ${String(count).padStart(4)} (${pct}%)`);
  }

  // 2. formula_sql coverage
  let totalNonRaw = 0;
  let withFormula = 0;
  const missingByType = new Map<string, number>();
  for (const item of catalogue) {
    for (const ld of item.level_definitions || []) {
      if (ld.sourcing_type === 'Raw') continue;
      totalNonRaw++;
      if (ld.formula_sql) {
        withFormula++;
      } else {
        missingByType.set(ld.sourcing_type, (missingByType.get(ld.sourcing_type) || 0) + 1);
      }
    }
  }
  console.log(`\n${C.bold}2. formula_sql Coverage${C.reset} (non-Raw level definitions)`);
  console.log(`   Total non-Raw:     ${totalNonRaw}`);
  console.log(`   With formula_sql:  ${C.green}${withFormula}${C.reset}`);
  console.log(`   Missing:           ${C.red}${totalNonRaw - withFormula}${C.reset}`);
  if (missingByType.size > 0) {
    console.log(`   Missing by type:`);
    for (const [type, count] of missingByType) {
      console.log(`     ${type.padEnd(10)} ${count}`);
    }
  }

  // 3. ingredient_fields completeness
  const emptyIngredients: string[] = [];
  for (const item of catalogue) {
    if (!item.ingredient_fields || item.ingredient_fields.length === 0) {
      emptyIngredients.push(`${item.item_id} (${item.item_name})`);
    }
  }
  console.log(`\n${C.bold}3. Ingredient Fields${C.reset}`);
  console.log(`   Complete:  ${C.green}${catalogue.length - emptyIngredients.length}${C.reset}`);
  console.log(`   Empty:     ${emptyIngredients.length > 0 ? C.red : C.green}${emptyIngredients.length}${C.reset}`);
  for (const name of emptyIngredients) {
    console.log(`     ${C.dim}${name}${C.reset}`);
  }

  // 4. Promotion readiness (items that could be promoted from DRAFT)
  const promotable: string[] = [];
  for (const item of catalogue) {
    if (item.status !== 'DRAFT') continue;
    const hasIngredients = item.ingredient_fields && item.ingredient_fields.length > 0;
    const hasLevelDefs = item.level_definitions && item.level_definitions.length > 0;
    if (hasIngredients && hasLevelDefs) {
      promotable.push(item.item_id);
    }
  }
  console.log(`\n${C.bold}4. Promotion Readiness${C.reset}`);
  console.log(`   DRAFT items with complete ingredients + level defs: ${promotable.length}`);
  console.log(`   (These could be promoted to PENDING_REVIEW)\n`);
}

main();
