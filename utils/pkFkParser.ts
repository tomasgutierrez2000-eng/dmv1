import type { Field } from '../types/model';

/**
 * Parse PK/FK mapping column value
 */
export function parsePKFK(pkFkValue: string | null | undefined): {
  isPK: boolean;
  isComposite: boolean;
  fkTarget?: { layer: string; table: string; field: string };
} | null {
  if (!pkFkValue || typeof pkFkValue !== 'string') return null;

  const value = pkFkValue.trim();
  if (!value) return null;

  // Pattern: "PK" or "PK (part)" or "FK → L1.table.field" or "PK & FK → L1.table.field"
  const isPK = value.toUpperCase().includes('PK');
  const isComposite = value.includes('PK (part)') || value.includes('PK(part)');
  
  // Extract FK target: "FK → L1.table.field" or "PK & FK → L1.table.field"
  // Support arrow variants: → (U+2192 Unicode arrow), ->, =>, ->
  // Note: hyphen must be at end of character class to avoid range interpretation
  // Try multiple patterns to catch all arrow variants
  const fkMatch = 
    // Pattern 1: Cross-layer with explicit layer prefix: "FK → L1.table.field" or "FK -> L1.table.field"
    value.match(/FK\s*[→=>\-]\s*(L[123])\.(\w+)\.(\w+)/i) ||
    // Pattern 2: Cross-layer with spaces: "FK → L1. table. field"
    value.match(/FK\s*[→=>\-]\s*(L[123])\s*\.\s*(\w+)\s*\.\s*(\w+)/i) ||
    // Pattern 3: Same-layer FK: "FK → table.field" (no layer prefix)
    value.match(/FK\s*[→=>\-]\s*(\w+)\s*\.\s*(\w+)/i);
  
  let fkTarget: { layer: string; table: string; field: string } | undefined;
  
  if (fkMatch) {
    if (fkMatch[1]?.startsWith('L')) {
      // Cross-layer FK: L1.table.field or L2.table.field
      fkTarget = {
        layer: fkMatch[1],
        table: fkMatch[2],
        field: fkMatch[3],
      };
    } else {
      // Same-layer FK: table.field (assume same layer as source)
      fkTarget = {
        layer: '', // Will be set by caller
        table: fkMatch[1],
        field: fkMatch[2],
      };
    }
  }

  if (isPK || fkTarget) {
    return {
      isPK,
      isComposite,
      fkTarget,
    };
  }

  return null;
}

/**
 * Parse source table references from L3
 */
export function parseSourceTables(sourceTablesValue: string | null | undefined): Array<{ layer: string; table: string }> {
  if (!sourceTablesValue || typeof sourceTablesValue !== 'string') return [];

  // Example: "L2.position, L1.fx_rate" or "L3.facility_profitability_derived, L2.facility_profitability_snapshot"
  return sourceTablesValue
    .split(',')
    .map((ref) => ref.trim())
    .filter((ref) => ref)
    .map((ref) => {
      const parts = ref.split('.');
      if (parts.length === 2) {
        return {
          layer: parts[0].trim(),
          table: parts[1].trim(),
        };
      }
      return null;
    })
    .filter((ref): ref is { layer: string; table: string } => ref !== null);
}
