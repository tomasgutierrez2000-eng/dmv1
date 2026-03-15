/**
 * Schema Prompt Builder — generates dynamic schema context for NL-to-SQL generation.
 *
 * Replaces the hardcoded 6-table schema with a context-aware schema section
 * that includes relevant tables based on the metric being edited.
 */

import { readDataDictionary } from '@/lib/data-dictionary';
import type { DataDictionary, DataDictionaryTable } from '@/lib/data-dictionary';
import type { CatalogueItem } from '@/lib/metric-library/types';
import { getCatalogueItems } from '@/lib/metric-library/store';

/** Cache the data dictionary to avoid re-reading on every prompt build. */
let _ddCache: DataDictionary | null = null;
let _ddCacheTs = 0;
const DD_CACHE_TTL_MS = 120_000;

function getCachedDD(): DataDictionary | null {
  const now = Date.now();
  if (_ddCache && now - _ddCacheTs < DD_CACHE_TTL_MS) return _ddCache;
  _ddCache = readDataDictionary();
  _ddCacheTs = now;
  return _ddCache;
}

/** Get key columns for a table (PK + FK + commonly used columns). */
function getKeyColumns(table: DataDictionaryTable): string[] {
  const cols: string[] = [];
  for (const f of table.fields) {
    if (f.pk_fk?.is_pk) cols.push(f.name);
  }
  for (const f of table.fields) {
    if (f.pk_fk?.fk_target && !cols.includes(f.name)) cols.push(f.name);
  }
  // Add commonly used measure/dimension columns (up to 10 total)
  for (const f of table.fields) {
    if (cols.length >= 10) break;
    if (cols.includes(f.name)) continue;
    if (f.name.endsWith('_amt') || f.name.endsWith('_pct') || f.name.endsWith('_value') ||
        f.name.endsWith('_name') || f.name.endsWith('_code') || f.name === 'as_of_date') {
      cols.push(f.name);
    }
  }
  return cols;
}

/** Format a single table entry for the prompt. */
function formatTableEntry(table: DataDictionaryTable): string {
  const cols = getKeyColumns(table);
  return `- ${table.layer.toLowerCase()}.${table.name} (${cols.join(', ')})`;
}

/**
 * Find tables related to the given ingredient fields.
 * Returns the ingredient tables + their FK-connected dimension tables.
 */
function findRelevantTables(
  dd: DataDictionary,
  ingredientFields?: CatalogueItem['ingredient_fields'],
): Set<string> {
  const relevant = new Set<string>();

  if (!ingredientFields?.length) return relevant;

  // Add tables containing ingredient fields
  for (const field of ingredientFields) {
    if (field.layer && field.table) {
      relevant.add(`${field.layer.toLowerCase()}.${field.table}`);
    }
  }

  // Add FK-connected dimension tables (one hop)
  for (const rel of dd.relationships) {
    const fromKey = `${rel.from_layer.toLowerCase()}.${rel.from_table}`;
    const toKey = `${rel.to_layer.toLowerCase()}.${rel.to_table}`;
    if (relevant.has(fromKey) && !relevant.has(toKey)) {
      relevant.add(toKey);
    }
  }

  return relevant;
}

/**
 * Get 2-3 example formulas from the same domain for few-shot prompting.
 */
function getExampleFormulas(
  itemId: string,
  level: string,
  domainIds?: string[],
): string[] {
  const examples: string[] = [];
  try {
    const allItems = getCatalogueItems();
    const candidates = allItems.filter((item) => {
      if (item.item_id === itemId) return false;
      // Match by domain if available
      if (domainIds?.length) {
        const itemDomains = item.domain_ids ?? [];
        if (!domainIds.some((d) => itemDomains.includes(d))) return false;
      }
      // Must have a formula_sql for this level
      const ld = item.level_definitions?.find((l) => l.level === level);
      return ld?.formula_sql && ld.formula_sql.trim().length > 20;
    });

    for (const candidate of candidates.slice(0, 3)) {
      const ld = candidate.level_definitions?.find((l) => l.level === level);
      if (ld?.formula_sql) {
        examples.push(
          `-- ${candidate.item_name} (${candidate.abbreviation}) at ${level} level:\n${ld.formula_sql.trim()}`
        );
      }
    }
  } catch (err) {
    console.warn('[schema-prompt-builder] Failed to load example formulas:', err instanceof Error ? err.message : err);
  }
  return examples;
}

/**
 * Build the schema section of the NL-to-SQL system prompt.
 * Dynamically generated from the data dictionary, focused on tables
 * relevant to the metric being edited.
 */
export function buildSchemaPromptSection(context?: {
  itemId?: string;
  level?: string;
  ingredientFields?: CatalogueItem['ingredient_fields'];
  domainIds?: string[];
}): string {
  const dd = getCachedDD();
  if (!dd) {
    return 'AVAILABLE TABLES: Data dictionary not available. Use l1. and l2. schema prefixes.';
  }

  const allTables = [...dd.L1, ...dd.L2, ...dd.L3];
  const relevantTableKeys = context?.ingredientFields
    ? findRelevantTables(dd, context.ingredientFields)
    : new Set<string>();

  // Build two sections: relevant tables (detailed) and other tables (names only)
  const sections: string[] = [];

  if (relevantTableKeys.size > 0) {
    sections.push('PRIMARY TABLES (used by this metric):');
    for (const table of allTables) {
      const key = `${table.layer.toLowerCase()}.${table.name}`;
      if (relevantTableKeys.has(key)) {
        // Show all columns for primary tables
        const allCols = table.fields.map((f) => f.name);
        sections.push(`- ${key} (${allCols.join(', ')})`);
      }
    }
  }

  // Add other commonly used tables (not already included)
  const commonL2 = ['facility_master', 'facility_exposure_snapshot', 'collateral_snapshot',
    'facility_risk_snapshot', 'facility_financial_snapshot', 'credit_event'];
  const commonL1 = ['counterparty', 'enterprise_business_taxonomy', 'enterprise_product_taxonomy',
    'portfolio_dim', 'currency_dim', 'collateral_type'];

  sections.push('\nOTHER AVAILABLE TABLES:');
  for (const table of allTables) {
    const key = `${table.layer.toLowerCase()}.${table.name}`;
    if (relevantTableKeys.has(key)) continue;
    const isCommon = (table.layer === 'L2' && commonL2.includes(table.name)) ||
                     (table.layer === 'L1' && commonL1.includes(table.name));
    if (isCommon) {
      sections.push(formatTableEntry(table));
    }
  }

  // List remaining table names without columns (for awareness)
  const remaining: string[] = [];
  for (const table of allTables) {
    const key = `${table.layer.toLowerCase()}.${table.name}`;
    if (relevantTableKeys.has(key)) continue;
    const isCommon = (table.layer === 'L2' && commonL2.includes(table.name)) ||
                     (table.layer === 'L1' && commonL1.includes(table.name));
    if (!isCommon && table.layer !== 'L3') {
      remaining.push(`${table.layer.toLowerCase()}.${table.name}`);
    }
  }
  if (remaining.length > 0) {
    sections.push(`\nADDITIONAL TABLES (available but less commonly used):\n${remaining.join(', ')}`);
  }

  // Add examples if available
  if (context?.itemId && context?.level) {
    const examples = getExampleFormulas(context.itemId, context.level, context.domainIds);
    if (examples.length > 0) {
      sections.push('\nWORKING FORMULA EXAMPLES:');
      sections.push(examples.join('\n\n'));
    }
  }

  return sections.join('\n');
}

/**
 * Build the complete system prompt for NL-to-SQL generation.
 */
export function buildNlToSqlSystemPrompt(context?: {
  itemId?: string;
  level?: string;
  ingredientFields?: CatalogueItem['ingredient_fields'];
  domainIds?: string[];
}): string {
  const schemaSection = buildSchemaPromptSection(context);

  return `You are a SQL formula generator for a GSIB banking data model.
You generate PostgreSQL SELECT queries for metric calculations.

IMPORTANT RULES:
- Only generate SELECT statements (no DML, no DDL)
- Use :as_of_date bind parameter for date filtering
- Always alias the grouping column as "dimension_key"
- Always alias the metric value as "metric_value"
- Use NULLIF to prevent division by zero
- Use explicit schema prefixes (l1., l2., l3.)

${schemaSection}

ROLLUP PATTERN (sum-ratio):
For ratio metrics like LTV, the rollup pattern is:
1. Compute numerator and denominator per facility
2. SUM both components at the target level
3. Divide: SUM(numerator) / SUM(denominator) * 100

Return ONLY the SQL query, no explanation. The SQL must be valid PostgreSQL.`;
}
