/**
 * Maps UI table keys (e.g. "L1.facility_master") to database schema.table (e.g. "l1.facility_master").
 * Used by the sample-data API and any future DB-backed features.
 */
export function tableKeyToDbTable(tableKey: string): string | null {
  if (!tableKey || !tableKey.includes('.')) return null;
  const [layer, tableName] = tableKey.split('.');
  if (!layer || !tableName) return null;
  const schema = layer.toLowerCase();
  return `${schema}.${tableName}`;
}
