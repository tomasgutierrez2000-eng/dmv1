import { EXCEL_TEMPLATE_COLUMN_MAPPING } from '../EXCEL_TEMPLATE_CONFIG';

/**
 * Find column index by matching against multiple possible names
 */
export function findColumnIndex(
  headers: string[],
  possibleNames: string[],
  required: boolean = false
): number {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  
  console.log(`🔍 [DEBUG] findColumnIndex - Looking for:`, possibleNames, `(required: ${required})`);
  console.log(`🔍 [DEBUG] findColumnIndex - Available headers:`, normalizedHeaders);
  
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    const index = normalizedHeaders.findIndex((h) => h.includes(normalizedName));
    if (index !== -1) {
      console.log(`✅ [DEBUG] findColumnIndex - Found "${name}" at index ${index} (partial match)`);
      return index;
    }
  }
  
  // Try exact match
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    const index = normalizedHeaders.findIndex((h) => h === normalizedName);
    if (index !== -1) {
      console.log(`✅ [DEBUG] findColumnIndex - Found "${name}" at index ${index} (exact match)`);
      return index;
    }
  }
  
  if (required) {
    const errorMsg = `Required column not found. Tried: ${possibleNames.join(', ')}. Found columns: ${headers.join(', ')}`;
    console.error(`❌ [DEBUG] findColumnIndex - ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  console.log(`⚠️ [DEBUG] findColumnIndex - Column not found (optional):`, possibleNames);
  return -1;
}

/**
 * Get all detected columns for diagnostic purposes
 */
export function getDetectedColumns(headers: string[]): string[] {
  return headers.map((h) => h.trim()).filter((h) => h);
}

/**
 * Map columns for a specific layer
 */
export function mapColumnsForLayer(
  headers: string[],
  layer: 'L1' | 'L2' | 'L3'
): Record<string, number> {
  console.log(`🔍 [DEBUG] mapColumnsForLayer called for ${layer}`);
  console.log(`🔍 [DEBUG] Headers received:`, headers);
  
  const mapping = EXCEL_TEMPLATE_COLUMN_MAPPING[layer];
  console.log(`🔍 [DEBUG] Mapping config for ${layer}:`, Object.keys(mapping));
  
  const result: Record<string, number> = {};
  
  if (layer === 'L1' || layer === 'L2') {
    const l1L2Mapping = mapping as { category: string[]; tableName: string[]; dataElement: string[]; description: string[]; whyRequired: string[]; pkFk: string[]; simplificationNote?: string[] };
    console.log(`🔍 [DEBUG] Mapping ${layer} columns...`);
    result.category = findColumnIndex(headers, l1L2Mapping.category);
    console.log(`🔍 [DEBUG] category column index:`, result.category, 'tried:', l1L2Mapping.category);
    
    result.tableName = findColumnIndex(headers, l1L2Mapping.tableName, true);
    console.log(`🔍 [DEBUG] tableName column index:`, result.tableName, 'tried:', l1L2Mapping.tableName);
    
    result.dataElement = findColumnIndex(headers, l1L2Mapping.dataElement, true);
    console.log(`🔍 [DEBUG] dataElement column index:`, result.dataElement, 'tried:', l1L2Mapping.dataElement);
    
    result.description = findColumnIndex(headers, l1L2Mapping.description);
    console.log(`🔍 [DEBUG] description column index:`, result.description, 'tried:', l1L2Mapping.description);
    
    result.whyRequired = findColumnIndex(headers, l1L2Mapping.whyRequired);
    console.log(`🔍 [DEBUG] whyRequired column index:`, result.whyRequired, 'tried:', l1L2Mapping.whyRequired);
    
    result.pkFk = findColumnIndex(headers, l1L2Mapping.pkFk);
    console.log(`🔍 [DEBUG] pkFk column index:`, result.pkFk, 'tried:', l1L2Mapping.pkFk);
    
    if (layer === 'L2' && l1L2Mapping.simplificationNote) {
      result.simplificationNote = findColumnIndex(headers, l1L2Mapping.simplificationNote);
      console.log(`🔍 [DEBUG] simplificationNote column index:`, result.simplificationNote, 'tried:', l1L2Mapping.simplificationNote);
    }
  } else if (layer === 'L3') {
    const l3Mapping = mapping as { category: string[]; tableName: string[]; field: string[]; dataType: string[]; formula: string[]; sourceTables: string[]; sourceFields: string[]; derivationLogic: string[]; dashboardUsage: string[]; grain: string[]; notes: string[] };
    console.log(`🔍 [DEBUG] Mapping L3 columns...`);
    result.category = findColumnIndex(headers, l3Mapping.category);
    result.tableName = findColumnIndex(headers, l3Mapping.tableName, true);
    result.field = findColumnIndex(headers, l3Mapping.field, true);
    result.dataType = findColumnIndex(headers, l3Mapping.dataType);
    result.formula = findColumnIndex(headers, l3Mapping.formula);
    result.sourceTables = findColumnIndex(headers, l3Mapping.sourceTables);
    result.sourceFields = findColumnIndex(headers, l3Mapping.sourceFields);
    result.derivationLogic = findColumnIndex(headers, l3Mapping.derivationLogic);
    result.dashboardUsage = findColumnIndex(headers, l3Mapping.dashboardUsage);
    result.grain = findColumnIndex(headers, l3Mapping.grain);
    result.notes = findColumnIndex(headers, l3Mapping.notes);
    console.log(`🔍 [DEBUG] L3 column mapping result:`, result);
  }
  
  console.log(`🔍 [DEBUG] Final mapping result for ${layer}:`, result);
  return result;
}
