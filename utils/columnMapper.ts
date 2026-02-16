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
    console.log(`🔍 [DEBUG] Mapping ${layer} columns...`);
    result.category = findColumnIndex(headers, mapping.category);
    console.log(`🔍 [DEBUG] category column index:`, result.category, 'tried:', mapping.category);
    
    result.tableName = findColumnIndex(headers, mapping.tableName, true);
    console.log(`🔍 [DEBUG] tableName column index:`, result.tableName, 'tried:', mapping.tableName);
    
    result.dataElement = findColumnIndex(headers, mapping.dataElement, true);
    console.log(`🔍 [DEBUG] dataElement column index:`, result.dataElement, 'tried:', mapping.dataElement);
    
    result.description = findColumnIndex(headers, mapping.description);
    console.log(`🔍 [DEBUG] description column index:`, result.description, 'tried:', mapping.description);
    
    result.whyRequired = findColumnIndex(headers, mapping.whyRequired);
    console.log(`🔍 [DEBUG] whyRequired column index:`, result.whyRequired, 'tried:', mapping.whyRequired);
    
    result.pkFk = findColumnIndex(headers, mapping.pkFk);
    console.log(`🔍 [DEBUG] pkFk column index:`, result.pkFk, 'tried:', mapping.pkFk);
    
    if (layer === 'L2') {
      result.simplificationNote = findColumnIndex(headers, mapping.simplificationNote);
      console.log(`🔍 [DEBUG] simplificationNote column index:`, result.simplificationNote, 'tried:', mapping.simplificationNote);
    }
  } else if (layer === 'L3') {
    console.log(`🔍 [DEBUG] Mapping L3 columns...`);
    result.category = findColumnIndex(headers, mapping.category);
    result.tableName = findColumnIndex(headers, mapping.tableName, true);
    result.field = findColumnIndex(headers, mapping.field, true);
    result.dataType = findColumnIndex(headers, mapping.dataType);
    result.formula = findColumnIndex(headers, mapping.formula);
    result.sourceTables = findColumnIndex(headers, mapping.sourceTables);
    result.sourceFields = findColumnIndex(headers, mapping.sourceFields);
    result.derivationLogic = findColumnIndex(headers, mapping.derivationLogic);
    result.dashboardUsage = findColumnIndex(headers, mapping.dashboardUsage);
    result.grain = findColumnIndex(headers, mapping.grain);
    result.notes = findColumnIndex(headers, mapping.notes);
    console.log(`🔍 [DEBUG] L3 column mapping result:`, result);
  }
  
  console.log(`🔍 [DEBUG] Final mapping result for ${layer}:`, result);
  return result;
}
