/**
 * Parses the pipe-delimited lineageNarrative string from level definitions
 * into structured steps tagged as SOURCING, CALCULATION, or HYBRID.
 */

import type { SourceField } from '@/data/l3-metrics';

export type StepType = 'SOURCING' | 'CALCULATION' | 'HYBRID';
export type StepTag = 'SOURCE' | 'TRANSFORM' | 'OUTPUT';

export interface LineageStep {
  type: StepType;
  tag: StepTag;
  layer?: 'L1' | 'L2';
  table?: string;
  field?: string;
  label: string;
  description?: string;
  formula?: string;
  joinConditions?: string[];
  grouping?: string;
  sampleValue?: string;
  nullGuard?: string;
}

const ARROW_RE = /\s*(?:→|->|—>|=>)\s*/;
const TAG_RE = /^\[(\w+)]\s*/;

/** Tables with known sub-select aggregation in formulaSQL patterns. */
function findHybridTables(formulaSQL?: string): Set<string> {
  const hybrid = new Set<string>();
  if (!formulaSQL) return hybrid;
  // Match sub-select aggregation patterns: (SELECT ..., SUM(x) ... FROM schema.table ...)
  const subSelectRe = /\(\s*SELECT\s+[^)]*\bSUM\b[^)]*FROM\s+\w+\.(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = subSelectRe.exec(formulaSQL)) !== null) {
    hybrid.add(m[1].toLowerCase());
  }
  return hybrid;
}

function parseLayerTableField(text: string): { layer?: 'L1' | 'L2'; table?: string; field?: string; rest: string } {
  const ltfRe = /^(L[12])\.(\w+)\.(\w+)\s*(.*)/;
  const match = text.match(ltfRe);
  if (match) {
    return {
      layer: match[1] as 'L1' | 'L2',
      table: match[2],
      field: match[3],
      rest: match[4],
    };
  }
  return { rest: text };
}

function extractJoinConditions(text: string): string[] | undefined {
  const joinRe = /Join:\s*(.+)/i;
  const m = text.match(joinRe);
  if (!m) return undefined;
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

function extractFormula(text: string): string | undefined {
  const formulaRe = /Formula:\s*(.+)/i;
  const m = text.match(formulaRe);
  return m ? m[1].trim() : undefined;
}

function extractGrouping(text: string): string | undefined {
  const groupRe = /Grouping:\s*(.+?)(?:\s*→|$)/i;
  const m = text.match(groupRe);
  return m ? m[1].trim() : undefined;
}

function extractNullGuard(text: string): string | undefined {
  const guardRe = /(?:Null guard|Zero guard|IF\s):\s*(.+?)(?:\s*\||$)/i;
  const m = text.match(guardRe);
  return m ? m[1].trim() : undefined;
}

function lookupSampleValue(
  layer: string | undefined,
  table: string | undefined,
  field: string | undefined,
  sourceFields?: SourceField[]
): string | undefined {
  if (!layer || !table || !field || !sourceFields) return undefined;
  const match = sourceFields.find(
    (sf) => sf.layer === layer && sf.table === table && sf.field === field
  );
  return match?.sampleValue;
}

function lookupDescription(
  layer: string | undefined,
  table: string | undefined,
  field: string | undefined,
  sourceFields?: SourceField[]
): string | undefined {
  if (!layer || !table || !field || !sourceFields) return undefined;
  const match = sourceFields.find(
    (sf) => sf.layer === layer && sf.table === table && sf.field === field
  );
  return match?.description;
}

/**
 * Parse a lineageNarrative string into structured LineageStep[].
 *
 * The narrative format is:
 * [SOURCE] L2.table.field → Description → Join: field1, field2 | [TRANSFORM] Label → Formula: expr → Grouping: field | [OUTPUT] Label
 */
export function parseLineageNarrative(
  narrative: string,
  sourceFields?: SourceField[],
  formulaSQL?: string
): LineageStep[] {
  if (!narrative) return [];

  const hybridTables = findHybridTables(formulaSQL);
  const segments = narrative.split('|').map((s) => s.trim()).filter(Boolean);
  const steps: LineageStep[] = [];

  for (const segment of segments) {
    const tagMatch = segment.match(TAG_RE);
    if (!tagMatch) continue;

    const rawTag = tagMatch[1].toUpperCase();
    const content = segment.slice(tagMatch[0].length).trim();
    const parts = content.split(ARROW_RE).map((s) => s.trim()).filter(Boolean);

    if (rawTag === 'SOURCE') {
      const { layer, table, field, rest } = parseLayerTableField(parts[0] || '');

      // Gather descriptions/joins from remaining parts
      let description = rest || undefined;
      let joinConditions: string[] | undefined;
      for (let i = 1; i < parts.length; i++) {
        const jc = extractJoinConditions(parts[i]);
        if (jc) {
          joinConditions = jc;
        } else if (!description) {
          description = parts[i];
        } else {
          description += ' — ' + parts[i];
        }
      }

      // Check enrichment from sourceFields
      const sfDescription = lookupDescription(layer, table, field, sourceFields);
      const sampleValue = lookupSampleValue(layer, table, field, sourceFields);

      const isHybrid = table ? hybridTables.has(table.toLowerCase()) : false;

      steps.push({
        type: isHybrid ? 'HYBRID' : 'SOURCING',
        tag: 'SOURCE',
        layer,
        table,
        field,
        label: table && field ? `${layer}.${table}.${field}` : content,
        description: sfDescription || description,
        joinConditions,
        sampleValue,
      });
    } else if (rawTag === 'TRANSFORM') {
      let label = parts[0] || 'Transform';
      let formula: string | undefined;
      let grouping: string | undefined;
      let nullGuard: string | undefined;

      for (const part of parts) {
        const f = extractFormula(part);
        if (f) formula = f;
        const g = extractGrouping(part);
        if (g) grouping = g;
        const n = extractNullGuard(part);
        if (n) nullGuard = n;
      }

      steps.push({
        type: 'CALCULATION',
        tag: 'TRANSFORM',
        label,
        formula,
        grouping,
        nullGuard,
      });
    } else if (rawTag === 'OUTPUT') {
      steps.push({
        type: 'CALCULATION',
        tag: 'OUTPUT',
        label: parts[0] || 'Output',
        description: parts.slice(1).join(' — ') || undefined,
      });
    }
  }

  return steps;
}

/**
 * Extract unique source tables from sourceFields array, grouped by layer+table.
 */
export function extractSourceTables(
  sourceFields?: SourceField[]
): { layer: string; table: string; fields: string[] }[] {
  if (!sourceFields?.length) return [];
  const map = new Map<string, { layer: string; table: string; fields: string[] }>();
  for (const sf of sourceFields) {
    const key = `${sf.layer}.${sf.table}`;
    const existing = map.get(key);
    if (existing) {
      if (!existing.fields.includes(sf.field)) {
        existing.fields.push(sf.field);
      }
    } else {
      map.set(key, { layer: sf.layer, table: sf.table, fields: [sf.field] });
    }
  }
  return Array.from(map.values());
}
