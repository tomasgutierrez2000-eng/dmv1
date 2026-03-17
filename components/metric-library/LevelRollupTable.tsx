'use client';

import type { LevelDefinition } from '@/lib/metric-library/types';
import { ROLLUP_LEVEL_LABELS, type RollupLevelKey } from '@/lib/metric-library/types';
import { SourcingBadge } from './badges';

/* ------------------------------------------------------------------ */
/*  Parse SQL-like level_logic into human-readable pseudo-code steps   */
/* ------------------------------------------------------------------ */

interface PseudoStep {
  num: number;
  verb: string;          // "Read", "Link", "Look up", "Group by", "Calculate"
  description: string;   // human-readable rest of the step
  kind: 'source' | 'join' | 'optional' | 'group' | 'compute' | 'note';
  formula?: string;      // only for compute steps
}

/** Convert snake_case table name to Title Case, stripping schema prefix */
function humanizeTable(raw: string): string {
  // strip schema prefix: l1.table_name → table_name
  const name = raw.replace(/^l[123]\./, '');
  return name
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Convert alias.field_name into readable form */
function humanizeField(raw: string): string {
  // strip table alias: fm.field_name → field_name
  const field = raw.replace(/^\w+\./, '').trim();
  return field
    .split('_')
    .filter(w => w !== 'id' && w !== 'flag')
    .map(w => {
      if (w === 'amt') return 'Amount';
      if (w === 'pct') return '%';
      if (w === 'bps') return '(bps)';
      if (w === 'ts') return '';
      if (w === 'desc') return 'Description';
      if (w === 'num') return 'Number';
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .filter(Boolean)
    .join(' ')
    .replace(/ %/g, ' %')
    .trim();
}

/** Humanize a comma-separated list of fields (for GROUP BY) */
function humanizeFieldList(raw: string): string {
  return raw
    .split(',')
    .map(part => humanizeField(part.trim()))
    .filter(Boolean)
    .join(', ');
}

/** Make a COMPUTE formula human-readable */
function humanizeFormula(raw: string): string {
  let f = raw.trim();

  // Remove AS alias clauses (e.g. "AS category_value")
  f = f.replace(/\bAS\s+\w+/gi, '');

  // COUNT(*) → Count
  f = f.replace(/COUNT\(\s*\*\s*\)/gi, 'Count');

  // COALESCE(x, default) → x (or default) — do before alias replacement
  f = f.replace(/COALESCE\(([^,]+),\s*([^)]+)\)/gi, (_, val, def) => {
    const defVal = def.trim();
    if (defVal === '100.0') return `${val.trim()} (or 100%)`;
    if (defVal === '1.0') return `${val.trim()} (or 1)`;
    if (defVal === '0' || defVal === '0.0') return `${val.trim()} (or 0)`;
    return `${val.trim()} (or ${defVal})`;
  });

  // Replace alias.field references with readable names
  f = f.replace(/\b\w+\.(\w+)/g, (_, field) => humanizeField(field));

  // SUM(x) → Sum of x
  f = f.replace(/SUM\(([^)]+)\)/gi, (_, inner) => `Sum of (${inner.trim()})`);
  // MAX(x) → Latest x
  f = f.replace(/MAX\(([^)]+)\)/gi, (_, inner) => `Latest (${inner.trim()})`);
  // COUNT(field) → Count of field
  f = f.replace(/COUNT\(([^)]+)\)/gi, (_, inner) => `Count of (${inner.trim()})`);
  // AVG(x) → Average of x
  f = f.replace(/AVG\(([^)]+)\)/gi, (_, inner) => `Average of (${inner.trim()})`);
  // COUNT DISTINCT(x) → Count distinct x
  f = f.replace(/COUNT\s+DISTINCT\(([^)]+)\)/gi, (_, inner) => `Count distinct (${inner.trim()})`);

  // NULLIF(x, 0) → x (skip if zero)
  f = f.replace(/NULLIF\(([^,]+),\s*0\)/gi, (_, inner) => inner.trim());

  // EXTRACT(EPOCH FROM x)::BIGINT → timestamp of x
  f = f.replace(/EXTRACT\(EPOCH FROM ([^)]+)\)::BIGINT/gi, (_, inner) => `Timestamp of ${inner.trim()}`);

  // Replace * with × for multiplication (but not standalone *)
  f = f.replace(/\s\*\s/g, ' × ');

  // Clean up / 100.0 → ÷ 100
  f = f.replace(/\/ 100\.0/g, '÷ 100');

  // Clean up spacing artifacts
  f = f.replace(/\s+,/g, ',');           // " ," → ","
  f = f.replace(/,\s*$/g, '');           // trailing comma
  f = f.replace(/^\s*,\s*/g, '');        // leading comma
  f = f.replace(/,\s*,/g, ',');          // double commas
  f = f.replace(/\s{2,}/g, ' ');         // double spaces

  return f.trim();
}

/** Parse WHERE condition into readable text */
function humanizeWhere(raw: string): string {
  let c = raw.trim();
  // alias.is_active_flag = 'Y' → active records only
  if (/is_active_flag\s*=\s*'Y'/i.test(c)) return 'active records only';
  // alias.as_of_date = :as_of_date → as of reporting date
  if (/as_of_date\s*=\s*:as_of_date/i.test(c)) return 'as of reporting date';
  // fallback: humanize field refs
  c = c.replace(/\b\w+\.(\w+)/g, (_, field) => humanizeField(field));
  return c;
}

function parseLevelLogic(logic: string): PseudoStep[] | null {
  if (!logic || !logic.trim()) return null;

  // Plain-text notes (e.g. "Not applicable — ...")
  if (!logic.match(/^\d+\.\s+(LOAD|JOIN|LEFT JOIN|GROUP BY|COMPUTE)/m)) {
    return [{ num: 0, verb: '', description: logic.trim(), kind: 'note' }];
  }

  const steps: PseudoStep[] = [];
  // Split into numbered steps: each starts with "N. " at start of line
  const stepBlocks = logic.split(/(?=^\d+\.\s)/m).filter(s => s.trim());

  for (const block of stepBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0];

    // Match numbered step header
    const headerMatch = firstLine.match(/^(\d+)\.\s+(LOAD|LEFT JOIN|JOIN|GROUP BY|COMPUTE)\s*(.*)/);
    if (!headerMatch) continue;

    const num = parseInt(headerMatch[1]);
    const action = headerMatch[2];
    const rest = headerMatch[3].trim();

    if (action === 'LOAD') {
      const tableMatch = rest.match(/^(l[123]\.\w+)/);
      const tableName = tableMatch ? humanizeTable(tableMatch[1]) : rest;
      // Check for WHERE in subsequent lines
      const whereLine = lines.find(l => l.startsWith('WHERE'));
      const whereText = whereLine
        ? ` — ${humanizeWhere(whereLine.replace(/^WHERE\s+/, ''))}`
        : '';
      steps.push({ num, verb: 'Read', description: `${tableName}${whereText}`, kind: 'source' });

    } else if (action === 'LEFT JOIN') {
      const tableMatch = rest.match(/^(l[123]\.\w+)/);
      const tableName = tableMatch ? humanizeTable(tableMatch[1]) : rest;
      steps.push({ num, verb: 'Look up', description: `${tableName} (if available)`, kind: 'optional' });

    } else if (action === 'JOIN') {
      const tableMatch = rest.match(/^(l[123]\.\w+)/);
      const tableName = tableMatch ? humanizeTable(tableMatch[1]) : rest;
      steps.push({ num, verb: 'Link to', description: tableName, kind: 'join' });

    } else if (action === 'GROUP BY') {
      const field = humanizeFieldList(rest);
      steps.push({ num, verb: 'Group by', description: field, kind: 'group' });

    } else if (action === 'COMPUTE') {
      // Formula is on subsequent lines
      const formulaLines = lines.slice(1).join(' ');
      const eqMatch = formulaLines.match(/metric_value\s*=\s*(.*)/);
      const formula = eqMatch ? humanizeFormula(eqMatch[1]) : humanizeFormula(formulaLines);
      steps.push({ num, verb: 'Calculate', description: '', kind: 'compute', formula });
    }
  }

  return steps.length > 0 ? steps : null;
}

/* ------------------------------------------------------------------ */
/*  Render                                                             */
/* ------------------------------------------------------------------ */

const kindStyles: Record<PseudoStep['kind'], string> = {
  source:   'text-blue-400',
  join:     'text-cyan-400',
  optional: 'text-slate-400',
  group:    'text-amber-400',
  compute:  'text-emerald-400',
  note:     'text-gray-400 italic',
};

function PseudoCodeDisplay({ logic }: { logic: string }) {
  const steps = parseLevelLogic(logic);

  if (!steps) {
    return (
      <code className="text-xs font-mono text-gray-300 bg-black/20 px-2 py-1 rounded block whitespace-pre-wrap leading-relaxed">
        {logic}
      </code>
    );
  }

  // Note-only (plain text like "Not applicable...")
  if (steps.length === 1 && steps[0].kind === 'note') {
    return (
      <p className="text-xs text-gray-400 italic leading-relaxed">
        {steps[0].description}
      </p>
    );
  }

  return (
    <div className="space-y-1 text-xs leading-relaxed">
      {steps.map((step) => (
        <div key={step.num} className="flex gap-1.5">
          <span className="text-gray-500 w-4 shrink-0 text-right tabular-nums">{step.num}.</span>
          <div>
            <span className={`font-medium ${kindStyles[step.kind]}`}>{step.verb}</span>
            {step.description && (
              <span className="text-gray-300"> {step.description}</span>
            )}
            {step.formula && (
              <span className="block ml-2 mt-0.5 font-mono text-emerald-300/90 bg-emerald-950/30 px-1.5 py-0.5 rounded">
                {step.formula}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LevelRollupTable({ levels }: { levels: LevelDefinition[] }) {
  if (levels.length === 0) {
    return <p className="text-sm text-gray-400 italic">No level definitions.</p>;
  }

  return (
    <div className="overflow-x-auto" role="region" aria-label="Level rollup definitions">
      <table className="w-full text-sm">
        <caption className="sr-only">How this metric is computed at each rollup level</caption>
        <thead>
          <tr className="border-b border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Level</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Display Name</th>
            <th scope="col" className="py-2 pr-4 text-center whitespace-nowrap">In Record</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Sourcing</th>
            <th scope="col" className="py-2 whitespace-nowrap">Level Logic</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((ld) => (
            <tr key={ld.level} className="border-b border-gray-800 hover:bg-white/5 align-top">
              <td className="py-3 pr-4">
                <span className="text-xs font-semibold text-gray-200">
                  {ROLLUP_LEVEL_LABELS[ld.level as RollupLevelKey] ?? ld.level}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">{ld.dashboard_display_name}</td>
              <td className="py-3 pr-4 text-center">
                {ld.in_record ? (
                  <span className="inline-block w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs leading-5 text-center">Y</span>
                ) : (
                  <span className="inline-block w-5 h-5 rounded-full bg-gray-700 text-gray-500 text-xs leading-5 text-center">N</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <SourcingBadge type={ld.sourcing_type} />
              </td>
              <td className="py-3">
                <PseudoCodeDisplay logic={ld.level_logic} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
