/**
 * Ingredient Discovery — auto-discover field metadata from the data dictionary.
 * Given table.field references, looks up description, data_type, and layer.
 */

import { readDataDictionary, findTable } from '@/lib/data-dictionary';
import type { IngredientField } from './types';

interface FieldQuery {
  table: string;
  field: string;
  layer?: 'L1' | 'L2' | 'L3';
}

/**
 * Look up a single field in the data dictionary.
 * If layer is not provided, searches L1 → L2 → L3 in order.
 */
export function discoverIngredient(query: FieldQuery): IngredientField | null {
  const dd = readDataDictionary();
  if (!dd) return null;

  const layers: Array<'L1' | 'L2' | 'L3'> = query.layer ? [query.layer] : ['L1', 'L2', 'L3'];

  for (const layer of layers) {
    const table = findTable(dd, layer, query.table);
    if (!table) continue;

    const field = table.fields.find((f) => f.name === query.field);
    if (!field) continue;

    return {
      layer,
      table: query.table,
      field: query.field,
      description: field.description || field.why_required || '',
      data_type: field.data_type,
      sample_value: undefined,
    };
  }

  return null;
}

/**
 * Look up multiple fields at once. Returns enriched IngredientField[] in the same order.
 * Fields not found in the data dictionary are returned with minimal info.
 */
export function discoverIngredients(queries: FieldQuery[]): IngredientField[] {
  const dd = readDataDictionary();
  if (!dd) {
    return queries.map((q) => ({
      layer: q.layer || 'L1' as const,
      table: q.table,
      field: q.field,
      description: '',
    }));
  }

  return queries.map((q) => {
    const layers: Array<'L1' | 'L2' | 'L3'> = q.layer ? [q.layer] : ['L1', 'L2', 'L3'];

    for (const layer of layers) {
      const table = findTable(dd, layer, q.table);
      if (!table) continue;

      const field = table.fields.find((f) => f.name === q.field);
      if (!field) continue;

      return {
        layer,
        table: q.table,
        field: q.field,
        description: field.description || field.why_required || '',
        data_type: field.data_type,
        sample_value: undefined,
      };
    }

    // Field not found — return with minimal info
    return {
      layer: q.layer || ('L1' as const),
      table: q.table,
      field: q.field,
      description: '',
    };
  });
}

/**
 * Get all relationships involving a specific table from the data dictionary.
 * Useful for building lineage diagrams showing FK join paths.
 */
export function getTableRelationships(tableName: string) {
  const dd = readDataDictionary();
  if (!dd) return { outgoing: [], incoming: [] };

  const outgoing = dd.relationships.filter((r) => r.from_table === tableName);
  const incoming = dd.relationships.filter((r) => r.to_table === tableName);

  return { outgoing, incoming };
}
