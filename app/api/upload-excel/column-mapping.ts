/**
 * Column Mapping Configuration
 * 
 * Update these mappings if your Excel template column names change.
 * The parser will look for columns matching these patterns (case-insensitive).
 */

export interface ColumnMapping {
  // L1 Sheet columns
  L1: {
    category: string[]; // e.g., ['uni', 'category', 'table category']
    tableName: string[]; // e.g., ['table name', 'table_name']
    dataElement: string[]; // e.g., ['data element', 'data_element', 'field']
    description: string[]; // e.g., ['description', 'data element description']
    whyRequired: string[]; // e.g., ['why required', 'why_required', 'business justification']
    pkFk: string[]; // e.g., ['pk/fk mapping', 'pk_fk', 'key mapping']
  };
  
  // L2 Sheet columns
  L2: {
    category: string[]; // e.g., ['table category', 'category', 'uni']
    tableName: string[]; // e.g., ['table name', 'table_name']
    dataElement: string[]; // e.g., ['data element', 'data_element', 'field']
    description: string[]; // e.g., ['description', 'data element description']
    whyRequired: string[]; // e.g., ['why required', 'why_required', 'business justification']
    pkFk: string[]; // e.g., ['pk/fk mapping', 'pk_fk', 'key mapping']
    simplificationNote: string[]; // e.g., ['simplification note', 'simplification_note', 'notes']
  };
  
  // L3 Sheet columns
  L3: {
    category: string[]; // e.g., ['derived category', 'category']
    tableName: string[]; // e.g., ['derived table / view', 'derived table', 'table name']
    field: string[]; // e.g., ['derived field', 'field', 'data element']
    dataType: string[]; // e.g., ['data type', 'data_type', 'type']
    formula: string[]; // e.g., ['derivation formula', 'formula', 'derivation']
    sourceTables: string[]; // e.g., ['source table(s)', 'source tables', 'source_table']
    sourceFields: string[]; // e.g., ['source field(s)', 'source fields', 'source_field']
    derivationLogic: string[]; // e.g., ['derivation logic (plain english)', 'derivation logic', 'description']
    dashboardUsage: string[]; // e.g., ['dashboard usage', 'usage', 'dashboard_usage']
    grain: string[]; // e.g., ['grain', 'record grain']
    notes: string[]; // e.g., ['notes', 'additional notes']
  };
}

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  L1: {
    category: ['uni', 'category', 'table category'],
    tableName: ['table name', 'table_name', 'table'],
    dataElement: ['data element', 'data_element', 'field', 'column'],
    description: ['description', 'data element description', 'field description'],
    whyRequired: ['why required', 'why_required', 'business justification', 'justification'],
    pkFk: ['pk/fk mapping', 'pk_fk', 'pk_fk mapping', 'key mapping', 'key'],
  },
  L2: {
    category: ['table category', 'category', 'uni'],
    tableName: ['table name', 'table_name', 'table'],
    dataElement: ['data element', 'data_element', 'field', 'column'],
    description: ['description', 'data element description', 'field description'],
    whyRequired: ['why required', 'why_required', 'business justification', 'justification'],
    pkFk: ['pk/fk mapping', 'pk_fk', 'pk_fk mapping', 'key mapping', 'key'],
    simplificationNote: ['simplification note', 'simplification_note', 'notes', 'simplification'],
  },
  L3: {
    category: ['derived category', 'category', 'table category'],
    tableName: ['derived table / view', 'derived table', 'derived view', 'table name', 'table_name'],
    field: ['derived field', 'field', 'data element', 'data_element'],
    dataType: ['data type', 'data_type', 'type', 'sql data type'],
    formula: ['derivation formula', 'formula', 'derivation', 'sql formula'],
    sourceTables: ['source table(s)', 'source tables', 'source_table', 'source_table(s)'],
    sourceFields: ['source field(s)', 'source fields', 'source_field', 'source_field(s)'],
    derivationLogic: ['derivation logic (plain english)', 'derivation logic', 'description', 'plain english'],
    dashboardUsage: ['dashboard usage', 'usage', 'dashboard_usage', 'dashboard page'],
    grain: ['grain', 'record grain', 'grain definition'],
    notes: ['notes', 'additional notes', 'note'],
  },
};

/**
 * Find column index by matching against multiple possible names
 */
export function findColumnIndex(
  headers: string[],
  possibleNames: string[],
  required: boolean = false
): number {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    const index = normalizedHeaders.findIndex((h) => h.includes(normalizedName));
    if (index !== -1) {
      return index;
    }
  }
  
  // Try exact match
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    const index = normalizedHeaders.findIndex((h) => h === normalizedName);
    if (index !== -1) {
      return index;
    }
  }
  
  if (required) {
    throw new Error(`Required column not found. Tried: ${possibleNames.join(', ')}. Found columns: ${headers.join(', ')}`);
  }
  
  return -1;
}

/**
 * Get all detected columns for diagnostic purposes
 */
export function getDetectedColumns(headers: string[]): string[] {
  return headers.map((h) => h.trim()).filter((h) => h);
}
