/**
 * 9-Section Decomposition Output Schema + Runtime Validator
 *
 * Defines the TypeScript interface for the structured JSON output that
 * decomposition agents produce, and provides a runtime validator that
 * checks presence and types of required fields.
 *
 * Used by test-decomp-live.ts to validate live agent output.
 */

// ============================================================================
// Schema Interfaces
// ============================================================================

/** 5A. Metric Identity / Definition */
export interface MetricDefinition {
  metric_id_hint: string;
  name: string;
  abbreviation: string;
  description: string;
  domain: string;
  sub_domain: string;
  metric_class: 'SOURCED' | 'CALCULATED' | 'HYBRID';
  direction: 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
  unit_type: string;
  display_format?: string;
  generic_formula?: string;
  symbolic_formula?: string;
  formula_prose?: string;
}

/** 5B. Ingredient (source field) */
export interface Ingredient {
  ingredient_id: string;
  layer: 'L1' | 'L2' | 'L3';
  schema: string;
  table: string;
  field: string;
  data_type?: string;
  role?: string;
  transformation?: string;
  data_quality_tier?: 'GOLD' | 'SILVER' | 'BRONZE';
  nullable?: boolean;
  default_if_null?: string | number | null;
  validated_in_dd?: boolean;
}

/** 5C. Schema Gap */
export interface SchemaGap {
  gap_id: string;
  gap_type: 'MISSING_TABLE' | 'MISSING_FIELD' | 'TYPE_MISMATCH' | 'MISSING_FK' | 'MISSING_INDEX';
  schema: string;
  table: string;
  field?: string;
  expected_type?: string;
  recommendation: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/** 5D. Rollup Architecture */
export interface RollupArchitecture {
  strategy: string;
  hierarchy: string[];
  levels: Array<{
    level_name: string;
    aggregation: string;
    sql_pattern?: string;
    fx_conversion?: boolean;
  }>;
  non_additive?: boolean;
  non_additive_reason?: string;
}

/** 5E. Variant */
export interface MetricVariant {
  variant_id: string;
  variant_name: string;
  variant_type: string;
  formula_delta?: string;
  description?: string;
}

/** 5F. Consumer */
export interface MetricConsumer {
  consumer_id: string;
  consumer_type: 'DASHBOARD' | 'REPORT' | 'API' | 'DOWNSTREAM_METRIC';
  consumer_name: string;
  usage_description?: string;
}

/** 5G. Regulatory Mapping */
export interface RegulatoryMapping {
  framework: string;
  section?: string;
  requirement: string;
  coverage: 'FULL' | 'PARTIAL' | 'INDIRECT';
}

/** 5H. GSIB Considerations */
export interface GsibConsiderations {
  gsib_surcharge_relevance?: string;
  cross_jurisdiction?: boolean;
  systemic_importance_factors?: string[];
  resolution_planning_relevance?: string;
}

/** 5I. Confidence Assessment */
export interface ConfidenceAssessment {
  overall_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  formula_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  data_availability_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  schema_coverage_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  caveats?: string[];
  recommendations?: string[];
}

/** Complete 9-section decomposition output */
export interface DecompositionOutput {
  decomposition_version?: string;
  expert: string;
  timestamp?: string;
  session_id?: string;
  metric_definition: MetricDefinition;
  ingredients: Ingredient[];
  schema_gaps: SchemaGap[];
  rollup_architecture: RollupArchitecture;
  variants: MetricVariant[];
  consumers: MetricConsumer[];
  regulatory_mapping: RegulatoryMapping[];
  gsib_considerations: GsibConsiderations;
  confidence_assessment: ConfidenceAssessment;
}

// ============================================================================
// Runtime Validator
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sectionPresence: Record<string, boolean>;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

/**
 * Validates a parsed JSON object against the 9-section decomposition schema.
 * Does not enforce exact field types — focuses on section presence and key field existence.
 */
export function validateDecompositionOutput(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sectionPresence: Record<string, boolean> = {
    metric_definition: false,
    ingredients: false,
    schema_gaps: false,
    rollup_architecture: false,
    variants: false,
    consumers: false,
    regulatory_mapping: false,
    gsib_considerations: false,
    confidence_assessment: false,
  };

  if (!isObject(data)) {
    return { valid: false, errors: ['Root is not an object'], warnings, sectionPresence };
  }

  // expert field
  if (!data.expert || typeof data.expert !== 'string') {
    warnings.push('Missing or non-string "expert" field');
  }

  // 5A. metric_definition
  if (isObject(data.metric_definition)) {
    sectionPresence.metric_definition = true;
    const md = data.metric_definition;
    const requiredFields = ['name', 'domain'];
    for (const f of requiredFields) {
      if (!md[f]) errors.push(`metric_definition.${f} is missing`);
    }
    if (md.metric_class && !['SOURCED', 'CALCULATED', 'HYBRID'].includes(md.metric_class as string)) {
      warnings.push(`metric_definition.metric_class="${md.metric_class}" is non-standard`);
    }
    if (md.direction && !['HIGHER_BETTER', 'LOWER_BETTER', 'NEUTRAL'].includes(md.direction as string)) {
      warnings.push(`metric_definition.direction="${md.direction}" is non-standard`);
    }
  } else {
    errors.push('Section 5A (metric_definition) is missing or not an object');
  }

  // 5B. ingredients
  if (isArray(data.ingredients)) {
    sectionPresence.ingredients = true;
    if (data.ingredients.length === 0) {
      warnings.push('ingredients[] is empty');
    }
    for (let i = 0; i < Math.min(data.ingredients.length, 3); i++) {
      const ing = data.ingredients[i];
      if (!isObject(ing)) {
        errors.push(`ingredients[${i}] is not an object`);
      } else {
        if (!ing.table && !ing.field) {
          warnings.push(`ingredients[${i}] missing table/field`);
        }
      }
    }
  } else {
    errors.push('Section 5B (ingredients) is missing or not an array');
  }

  // 5C. schema_gaps
  if (isArray(data.schema_gaps)) {
    sectionPresence.schema_gaps = true;
    // Empty array is valid (no gaps found)
  } else {
    errors.push('Section 5C (schema_gaps) is missing or not an array');
  }

  // 5D. rollup_architecture
  if (isObject(data.rollup_architecture)) {
    sectionPresence.rollup_architecture = true;
    if (!data.rollup_architecture.strategy) {
      warnings.push('rollup_architecture.strategy is missing');
    }
  } else {
    errors.push('Section 5D (rollup_architecture) is missing or not an object');
  }

  // 5E. variants
  if (isArray(data.variants)) {
    sectionPresence.variants = true;
  } else {
    errors.push('Section 5E (variants) is missing or not an array');
  }

  // 5F. consumers
  if (isArray(data.consumers)) {
    sectionPresence.consumers = true;
  } else {
    errors.push('Section 5F (consumers) is missing or not an array');
  }

  // 5G. regulatory_mapping
  if (isArray(data.regulatory_mapping)) {
    sectionPresence.regulatory_mapping = true;
  } else {
    errors.push('Section 5G (regulatory_mapping) is missing or not an array');
  }

  // 5H. gsib_considerations
  if (isObject(data.gsib_considerations)) {
    sectionPresence.gsib_considerations = true;
  } else {
    errors.push('Section 5H (gsib_considerations) is missing or not an object');
  }

  // 5I. confidence_assessment
  if (isObject(data.confidence_assessment)) {
    sectionPresence.confidence_assessment = true;
    const ca = data.confidence_assessment;
    if (ca.overall_confidence && !['HIGH', 'MEDIUM', 'LOW'].includes(ca.overall_confidence as string)) {
      warnings.push(`confidence_assessment.overall_confidence="${ca.overall_confidence}" is non-standard`);
    }
  } else {
    errors.push('Section 5I (confidence_assessment) is missing or not an object');
  }

  const sectionsPresent = Object.values(sectionPresence).filter(Boolean).length;
  const totalSections = Object.keys(sectionPresence).length;

  if (sectionsPresent < totalSections) {
    warnings.push(`Only ${sectionsPresent}/${totalSections} sections present`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sectionPresence,
  };
}

/**
 * Attempts to extract a JSON block from agent output text.
 * Looks for ```json ... ``` fenced blocks or bare { ... } blocks.
 */
export function extractJsonFromOutput(output: string): unknown | null {
  // Try fenced JSON block first
  const fencedMatch = output.match(/```json\s*\n?([\s\S]*?)```/);
  if (fencedMatch) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // Fall through
    }
  }

  // Try bare JSON object (find the outermost { ... })
  const firstBrace = output.indexOf('{');
  if (firstBrace === -1) return null;

  let depth = 0;
  let lastBrace = -1;
  for (let i = firstBrace; i < output.length; i++) {
    if (output[i] === '{') depth++;
    else if (output[i] === '}') {
      depth--;
      if (depth === 0) {
        lastBrace = i;
        break;
      }
    }
  }

  if (lastBrace === -1) return null;

  try {
    return JSON.parse(output.substring(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}
