import type { DataModel, Relationship } from '../types/model';

/**
 * Debug utility to check relationship mappings
 */
export function debugRelationships(model: DataModel): {
  valid: Relationship[];
  invalid: Array<{ rel: Relationship; reason: string }>;
  missingTables: string[];
} {
  const valid: Relationship[] = [];
  const invalid: Array<{ rel: Relationship; reason: string }> = [];
  const missingTables = new Set<string>();

  model.relationships.forEach((rel) => {
    const sourceExists = !!model.tables[rel.source.tableKey];
    const targetExists = !!model.tables[rel.target.tableKey];

    if (!sourceExists) {
      missingTables.add(rel.source.tableKey);
      invalid.push({
        rel,
        reason: `Source table not found: ${rel.source.tableKey}`,
      });
    } else if (!targetExists) {
      missingTables.add(rel.target.tableKey);
      invalid.push({
        rel,
        reason: `Target table not found: ${rel.target.tableKey}`,
      });
    } else {
      valid.push(rel);
    }
  });

  return {
    valid,
    invalid,
    missingTables: Array.from(missingTables),
  };
}

/**
 * Get all relationships for a specific table
 */
export function getTableRelationships(
  model: DataModel,
  tableKey: string
): {
  outgoing: Relationship[];
  incoming: Relationship[];
} {
  return {
    outgoing: model.relationships.filter((rel) => rel.source.tableKey === tableKey),
    incoming: model.relationships.filter((rel) => rel.target.tableKey === tableKey),
  };
}
