import type {
  DataDictionary,
  DataDictionaryTable,
  DataDictionaryField,
  DataDictionaryRelationship,
} from '@/lib/data-dictionary';
import type { CatalogueItem } from '@/lib/metric-library/types';

/** Merge all L1/L2/L3 tables into a flat array. */
export function flattenTables(dd: DataDictionary): DataDictionaryTable[] {
  return [...dd.L1, ...dd.L2, ...dd.L3];
}

/** Count fields matching a predicate across all fields in a table. */
function countFields(
  table: DataDictionaryTable,
  predicate: (f: DataDictionaryField) => boolean
): number {
  return table.fields.filter(predicate).length;
}

/** Count primary key fields in a table. */
export function countPKs(table: DataDictionaryTable): number {
  return countFields(table, (f) => !!f.pk_fk?.is_pk);
}

/** Count foreign key fields in a table. */
export function countFKs(table: DataDictionaryTable): number {
  return countFields(table, (f) => !!f.pk_fk?.fk_target);
}

/** Count fields with formulas. */
export function countFormulas(table: DataDictionaryTable): number {
  return countFields(table, (f) => !!f.formula);
}

/** Get relationships where this table is the FK target (other tables point here). */
export function buildIncomingReferences(
  dd: DataDictionary,
  layer: string,
  tableName: string
): DataDictionaryRelationship[] {
  return dd.relationships.filter(
    (r) => r.to_table === tableName && r.to_layer === layer
  );
}

/** Get relationships where this table has outgoing FKs. */
export function buildOutgoingReferences(
  dd: DataDictionary,
  layer: string,
  tableName: string
): DataDictionaryRelationship[] {
  return dd.relationships.filter(
    (r) => r.from_table === tableName && r.from_layer === layer
  );
}

/** Cross-reference: which catalogue items use fields from this table? */
export function buildMetricUsage(
  tableName: string,
  layer: string,
  catalogue: CatalogueItem[]
): { item: CatalogueItem; fields: string[] }[] {
  const results: { item: CatalogueItem; fields: string[] }[] = [];
  for (const cat of catalogue) {
    const matchingFields = cat.ingredient_fields
      .filter(
        (f) =>
          f.table.toLowerCase() === tableName.toLowerCase() &&
          f.layer.toUpperCase() === layer.toUpperCase()
      )
      .map((f) => f.field);
    if (matchingFields.length > 0) {
      results.push({ item: cat, fields: matchingFields });
    }
  }
  return results;
}

/** Extract distinct categories from a list of tables, sorted alphabetically. */
export function getDistinctCategories(tables: DataDictionaryTable[]): string[] {
  const cats = new Set<string>();
  for (const t of tables) {
    if (t.category) cats.add(t.category);
  }
  return Array.from(cats).sort();
}

/** Extract distinct data types from all fields across tables. */
export function getDistinctDataTypes(tables: DataDictionaryTable[]): string[] {
  const types = new Set<string>();
  for (const t of tables) {
    for (const f of t.fields) {
      if (f.data_type) types.add(f.data_type);
    }
  }
  return Array.from(types).sort();
}

/** Total field count across all tables. */
export function totalFieldCount(tables: DataDictionaryTable[]): number {
  return tables.reduce((sum, t) => sum + t.fields.length, 0);
}

/** Check if a table matches a search query (searches table name, category, field names, field descriptions). */
export function tableMatchesSearch(
  table: DataDictionaryTable,
  query: string
): boolean {
  const q = query.toLowerCase();
  if (table.name.toLowerCase().includes(q)) return true;
  if (table.category?.toLowerCase().includes(q)) return true;
  return table.fields.some(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q)
  );
}
