import type { SourceField, DimensionUsage, DimensionInteraction } from '@/data/l3-metrics';
import { TOGGLES } from '@/data/l3-metrics';

/** Common dimension column names used in L3 metrics (GROUP_BY / FILTER). */
const COMMON_DIMENSIONS = [
  'as_of_date',
  'counterparty_id',
  'facility_id',
  'lob_segment_id',
  'product_node_id',
  'industry_code',
  'metric_id',
  'limit_definition_id',
  'fr2590_category_code',
  'internal_risk_rating',
  'external_risk_rating',
  'region_code',
  'legal_entity_id',
] as const;

interface TableDef {
  key: string;
  name: string;
  layer: 'L1' | 'L2';
  fields: { name: string }[];
}

interface DataModel {
  tables: Record<string, TableDef>;
}

/**
 * Derive dimension usages from the tables used in source fields.
 * Returns dimensions that exist in those tables (from schema) or fallback to common dimensions.
 */
export function deriveDimensionsFromSourceFields(
  sourceFields: SourceField[],
  schema: DataModel | null,
  defaultInteraction: DimensionInteraction = 'GROUP_BY'
): DimensionUsage[] {
  const tablesUsed = new Set(sourceFields.map((sf) => sf.table).filter(Boolean));
  if (tablesUsed.size === 0) {
    return COMMON_DIMENSIONS.slice(0, 4).map((dimension) => ({
      dimension,
      interaction: defaultInteraction,
    }));
  }

  const dimensionSet = new Set<string>();
  if (schema?.tables) {
    for (const t of Object.values(schema.tables)) {
      if (!tablesUsed.has(t.name)) continue;
      for (const f of t.fields || []) {
        if (COMMON_DIMENSIONS.includes(f.name as (typeof COMMON_DIMENSIONS)[number])) {
          dimensionSet.add(f.name);
        }
      }
    }
  }
  if (dimensionSet.size === 0) {
    return COMMON_DIMENSIONS.slice(0, 4).map((dimension) => ({
      dimension,
      interaction: defaultInteraction,
    }));
  }

  const ordered = COMMON_DIMENSIONS.filter((d) => dimensionSet.has(d));
  return ordered.map((dimension) => ({ dimension, interaction: defaultInteraction }));
}

/**
 * Suggest toggle IDs based on source fields (e.g. exposure fields -> exposure_calc).
 */
export function suggestTogglesFromSourceFields(
  sourceFields: SourceField[],
  page: string
): string[] {
  const fieldNames = sourceFields.map((sf) => sf.field).join(' ').toLowerCase();
  const tableNames = sourceFields.map((sf) => sf.table).join(' ').toLowerCase();
  const combined = `${fieldNames} ${tableNames}`;
  const suggested: string[] = [];

  for (const t of TOGGLES) {
    if (t.pages.includes(page as 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7')) {
      if (
        t.id === 'exposure_calc' &&
        (combined.includes('exposure') || combined.includes('gross') || combined.includes('net'))
      ) {
        suggested.push(t.id);
      }
      if (
        t.id === 'product_grouping' &&
        (combined.includes('product_node') || combined.includes('fr2590_category'))
      ) {
        suggested.push(t.id);
      }
      if (
        t.id === 'risk_rating' &&
        (combined.includes('risk_rating') || combined.includes('internal_risk') || combined.includes('external_risk'))
      ) {
        suggested.push(t.id);
      }
    }
  }

  return [...new Set(suggested)];
}
