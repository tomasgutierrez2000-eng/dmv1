/**
 * Metric Diff Engine — computes field-level diffs between two CatalogueItem snapshots.
 *
 * Handles three types of changes:
 * 1. Top-level scalar fields (name, definition, status, etc.)
 * 2. Level definitions (matched by `level` key)
 * 3. Ingredient fields (matched by `table + field` composite key)
 */

import type { CatalogueItem, LevelDefinition, IngredientField } from '@/lib/metric-library/types';

/* ── Types ──────────────────────────────────────────────────────── */

export interface FieldChange {
  field: string;
  old_value: unknown;
  new_value: unknown;
}

export interface LevelChange {
  level: string;
  changes: FieldChange[];
  added: boolean;
  removed: boolean;
}

export interface IngredientChange {
  key: string; // "table.field"
  changes: FieldChange[];
  added: boolean;
  removed: boolean;
}

export interface MetricDiff {
  has_changes: boolean;
  field_changes: FieldChange[];
  level_changes: LevelChange[];
  ingredient_changes: IngredientChange[];
  summary: string;
}

/* ── Scalar comparison ──────────────────────────────────────────── */

/** Fields to compare at the top level of CatalogueItem. */
const SCALAR_FIELDS: (keyof CatalogueItem)[] = [
  'item_name', 'abbreviation', 'kind', 'definition', 'generic_formula',
  'data_type', 'unit_type', 'direction', 'metric_class', 'insight',
  'status', 'number_of_instances', 'directly_displayed',
  'executable_metric_id', 'normalized_de_name', 'data_element_in_dm',
  'spec_definition',
];

/** Fields to skip in diff (too large or not meaningful for display). */
const SKIP_FIELDS = new Set(['demo_data', 'item_id', '_version']);

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k =>
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
  }
  return false;
}

/* ── Level Definition Diff ──────────────────────────────────────── */

const LEVEL_FIELDS: (keyof LevelDefinition)[] = [
  'dashboard_display_name', 'in_record', 'sourcing_type', 'level_logic',
];

function diffLevelDefinitions(
  before: LevelDefinition[],
  after: LevelDefinition[],
): LevelChange[] {
  const changes: LevelChange[] = [];
  const beforeMap = new Map(before.map(l => [l.level, l]));
  const afterMap = new Map(after.map(l => [l.level, l]));

  // Check for modified and removed levels
  for (const [level, beforeLevel] of beforeMap) {
    const afterLevel = afterMap.get(level);
    if (!afterLevel) {
      changes.push({ level, changes: [], added: false, removed: true });
      continue;
    }
    const fieldChanges: FieldChange[] = [];
    for (const field of LEVEL_FIELDS) {
      const oldVal = beforeLevel[field];
      const newVal = afterLevel[field];
      if (!deepEqual(oldVal, newVal)) {
        fieldChanges.push({ field: `${level}.${field}`, old_value: oldVal, new_value: newVal });
      }
    }
    // Check source_references separately
    if (!deepEqual(beforeLevel.source_references, afterLevel.source_references)) {
      fieldChanges.push({
        field: `${level}.source_references`,
        old_value: `${beforeLevel.source_references?.length ?? 0} refs`,
        new_value: `${afterLevel.source_references?.length ?? 0} refs`,
      });
    }
    if (fieldChanges.length > 0) {
      changes.push({ level, changes: fieldChanges, added: false, removed: false });
    }
  }

  // Check for added levels
  for (const [level] of afterMap) {
    if (!beforeMap.has(level)) {
      changes.push({ level, changes: [], added: true, removed: false });
    }
  }

  return changes;
}

/* ── Ingredient Field Diff ──────────────────────────────────────── */

function ingredientKey(f: IngredientField): string {
  return `${f.layer}.${f.table}.${f.field}`;
}

function diffIngredientFields(
  before: IngredientField[],
  after: IngredientField[],
): IngredientChange[] {
  const changes: IngredientChange[] = [];
  const beforeMap = new Map(before.map(f => [ingredientKey(f), f]));
  const afterMap = new Map(after.map(f => [ingredientKey(f), f]));

  // Modified and removed
  for (const [key, beforeField] of beforeMap) {
    const afterField = afterMap.get(key);
    if (!afterField) {
      changes.push({ key, changes: [], added: false, removed: true });
      continue;
    }
    const fieldChanges: FieldChange[] = [];
    if (beforeField.description !== afterField.description) {
      fieldChanges.push({ field: 'description', old_value: beforeField.description, new_value: afterField.description });
    }
    if (beforeField.data_type !== afterField.data_type) {
      fieldChanges.push({ field: 'data_type', old_value: beforeField.data_type, new_value: afterField.data_type });
    }
    if (fieldChanges.length > 0) {
      changes.push({ key, changes: fieldChanges, added: false, removed: false });
    }
  }

  // Added
  for (const [key] of afterMap) {
    if (!beforeMap.has(key)) {
      changes.push({ key, changes: [], added: true, removed: false });
    }
  }

  return changes;
}

/* ── Domain IDs Diff ────────────────────────────────────────────── */

function diffArrayField(fieldName: string, before: string[] | undefined, after: string[] | undefined): FieldChange | null {
  const b = before ?? [];
  const a = after ?? [];
  if (deepEqual(b, a)) return null;
  const added = a.filter(x => !b.includes(x));
  const removed = b.filter(x => !a.includes(x));
  const parts: string[] = [];
  if (added.length) parts.push(`+${added.join(', ')}`);
  if (removed.length) parts.push(`-${removed.join(', ')}`);
  return { field: fieldName, old_value: b.join(', ') || '(none)', new_value: parts.join('; ') || '(none)' };
}

/* ── Main Diff Function ─────────────────────────────────────────── */

/**
 * Compute a detailed diff between two CatalogueItem snapshots.
 */
export function computeMetricDiff(
  before: CatalogueItem | null,
  after: CatalogueItem,
): MetricDiff {
  // New item — everything is "added"
  if (!before) {
    return {
      has_changes: true,
      field_changes: [{ field: 'item_id', old_value: null, new_value: after.item_id }],
      level_changes: after.level_definitions.map(l => ({ level: l.level, changes: [], added: true, removed: false })),
      ingredient_changes: after.ingredient_fields.map(f => ({ key: ingredientKey(f), changes: [], added: true, removed: false })),
      summary: `New metric created: ${after.item_name}`,
    };
  }

  const fieldChanges: FieldChange[] = [];

  // Scalar fields
  for (const field of SCALAR_FIELDS) {
    if (SKIP_FIELDS.has(field)) continue;
    const oldVal = before[field];
    const newVal = after[field];
    if (!deepEqual(oldVal, newVal)) {
      fieldChanges.push({ field, old_value: oldVal, new_value: newVal });
    }
  }

  // Domain IDs
  const domainDiff = diffArrayField('domain_ids', before.domain_ids, after.domain_ids);
  if (domainDiff) fieldChanges.push(domainDiff);

  // Regulatory references
  const regDiff = diffArrayField('regulatory_references', before.regulatory_references, after.regulatory_references);
  if (regDiff) fieldChanges.push(regDiff);

  // Spec discrepancy notes
  const specDiff = diffArrayField('spec_discrepancy_notes', before.spec_discrepancy_notes, after.spec_discrepancy_notes);
  if (specDiff) fieldChanges.push(specDiff);

  // Level definitions
  const levelChanges = diffLevelDefinitions(
    before.level_definitions ?? [],
    after.level_definitions ?? [],
  );

  // Ingredient fields
  const ingredientChanges = diffIngredientFields(
    before.ingredient_fields ?? [],
    after.ingredient_fields ?? [],
  );

  const totalChanges = fieldChanges.length + levelChanges.length + ingredientChanges.length;
  const hasChanges = totalChanges > 0;

  // Build summary
  const parts: string[] = [];
  if (fieldChanges.length) parts.push(`${fieldChanges.length} field(s)`);
  if (levelChanges.length) parts.push(`${levelChanges.length} level(s)`);
  if (ingredientChanges.length) parts.push(`${ingredientChanges.length} ingredient(s)`);
  const summary = hasChanges ? `Changed: ${parts.join(', ')}` : 'No changes';

  return {
    has_changes: hasChanges,
    field_changes: fieldChanges,
    level_changes: levelChanges,
    ingredient_changes: ingredientChanges,
    summary,
  };
}

/**
 * Convert diff to a compact JSONB-friendly format for storage.
 */
export function diffToJsonSummary(diff: MetricDiff): Record<string, { old: unknown; new: unknown }> {
  const summary: Record<string, { old: unknown; new: unknown }> = {};

  for (const change of diff.field_changes) {
    summary[change.field] = { old: change.old_value, new: change.new_value };
  }

  for (const lc of diff.level_changes) {
    if (lc.added) {
      summary[`level.${lc.level}`] = { old: null, new: 'added' };
    } else if (lc.removed) {
      summary[`level.${lc.level}`] = { old: 'existed', new: null };
    } else {
      for (const fc of lc.changes) {
        summary[fc.field] = { old: fc.old_value, new: fc.new_value };
      }
    }
  }

  for (const ic of diff.ingredient_changes) {
    if (ic.added) {
      summary[`ingredient.${ic.key}`] = { old: null, new: 'added' };
    } else if (ic.removed) {
      summary[`ingredient.${ic.key}`] = { old: 'existed', new: null };
    } else {
      for (const fc of ic.changes) {
        summary[`ingredient.${ic.key}.${fc.field}`] = { old: fc.old_value, new: fc.new_value };
      }
    }
  }

  return summary;
}
