'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';

// ---------- SQL humanization (plain English mode) ----------

/** Convert SQL formula to plain English description */
function humanizeFormula(sql: string): string {
  if (!sql) return 'No formula yet';

  let text = sql;

  // Remove COALESCE wrappers
  text = text.replace(/COALESCE\s*\(\s*([^,]+),\s*[^)]+\)/gi, '$1');
  // Remove NULLIF wrappers
  text = text.replace(/NULLIF\s*\(\s*([^,]+),\s*\d+\)/gi, '$1');
  // Humanize aggregations
  text = text.replace(/\bSUM\s*\(\s*/gi, 'Sum of (');
  text = text.replace(/\bAVG\s*\(\s*/gi, 'Average of (');
  text = text.replace(/\bCOUNT\s*\(\s*DISTINCT\s+/gi, 'Count of distinct ');
  text = text.replace(/\bCOUNT\s*\(\s*\*\s*\)/gi, 'Count');
  text = text.replace(/\bMIN\s*\(\s*/gi, 'Earliest (');
  text = text.replace(/\bMAX\s*\(\s*/gi, 'Latest (');
  // Remove alias prefixes (e.g., frs.pd_pct -> pd_pct)
  text = text.replace(/\b[a-z]{1,4}\.\s*/g, '');
  // Convert field names from snake_case to Title Case
  text = text.replace(/[a-z_]+(?:_[a-z]+)+/g, (match) =>
    match.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
  // Replace * with x
  text = text.replace(/\s*\*\s*/g, ' x ');
  // Replace / with divided by
  text = text.replace(/\s*\/\s*/g, ' / ');
  // Remove AS aliases
  text = text.replace(/\bAS\s+\w+/gi, '');

  // Try to extract the core SELECT expression
  const selectMatch = text.match(/SELECT\s+([\s\S]*?)\s*FROM/i);
  if (selectMatch) {
    const selectPart = selectMatch[1];
    // Split on commas to find dimension_key and metric_value
    const parts = selectPart.split(',').map((p) => p.trim());
    const metricPart = parts.find((p) => /metric/i.test(p) || /Sum of|Average of|Count/i.test(p));
    const dimPart = parts.find((p) => /dimension/i.test(p) || /key/i.test(p));

    if (metricPart) {
      let result = metricPart.replace(/\b(dimension|metric|value|key)\b/gi, '').trim();
      if (dimPart) {
        const dimField = dimPart.replace(/\b(dimension|key)\b/gi, '').trim();
        if (dimField) result += `, grouped by ${dimField}`;
      }
      return result || text;
    }
  }

  // Fallback: remove SQL boilerplate
  text = text.replace(/\bSELECT\b/gi, '').replace(/\bFROM\b[\s\S]*/gi, '').trim();
  return text || 'Complex formula';
}

// ---------- SQL syntax highlighting ----------

function highlightSQL(sql: string): React.ReactNode[] {
  if (!sql) return [<span key="empty" className="text-slate-500 italic">Drag fields or ask the AI to compose a formula...</span>];

  const parts: React.ReactNode[] = [];
  const keywords = /\b(SELECT|FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|AS|AND|OR|NOT|IN|IS|NULL|CASE|WHEN|THEN|ELSE|END|DISTINCT)\b/gi;
  const functions = /\b(SUM|AVG|COUNT|MIN|MAX|COALESCE|NULLIF)\b/gi;
  const tables = /\b(l[123])\.([\w]+)/gi;

  const tokens = sql.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (keywords.test(token)) {
      parts.push(<span key={i} className="text-violet-400">{token}</span>);
    } else if (functions.test(token)) {
      parts.push(<span key={i} className="text-rose-400">{token}</span>);
    } else if (tables.test(token)) {
      parts.push(<span key={i} className="text-teal-400">{token}</span>);
    } else {
      parts.push(<span key={i}>{token}</span>);
    }
    keywords.lastIndex = 0;
    functions.lastIndex = 0;
    tables.lastIndex = 0;
  }
  return parts;
}

// ---------- FormulaBar component ----------

export function FormulaBar() {
  const [mode, setMode] = useState<'sql' | 'english'>('sql');
  const formulaSQL = useStudioStore((s) => s.formulaSQL);
  const formulaValid = useStudioStore((s) => s.formulaValid);
  const formulaError = useStudioStore((s) => s.formulaError);

  return (
    <div className={`border-b px-3 py-1.5 flex items-center gap-2 text-xs font-mono shrink-0 ${formulaValid ? 'border-slate-800 bg-[#111118]' : 'border-red-500/30 bg-red-950/20'}`}>
      <span className="text-slate-500 text-[10px] uppercase tracking-wider flex-shrink-0">fx</span>

      {/* Mode toggle */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => setMode('sql')}
          className={`px-1.5 py-0.5 text-[9px] rounded-l border ${
            mode === 'sql'
              ? 'border-[#D04A02]/40 text-[#D04A02] bg-[#D04A02]/10'
              : 'border-slate-700 text-slate-600 hover:text-slate-400'
          }`}
        >
          SQL
        </button>
        <button
          onClick={() => setMode('english')}
          className={`px-1.5 py-0.5 text-[9px] rounded-r border border-l-0 ${
            mode === 'english'
              ? 'border-[#D04A02]/40 text-[#D04A02] bg-[#D04A02]/10'
              : 'border-slate-700 text-slate-600 hover:text-slate-400'
          }`}
        >
          EN
        </button>
      </div>

      {/* Formula display */}
      <div className="flex-1 overflow-x-auto whitespace-nowrap text-[#D04A02] scrollbar-thin scrollbar-thumb-slate-700">
        {formulaError ? (
          <span className="text-red-400">{formulaError}</span>
        ) : mode === 'english' ? (
          <span className="text-slate-300 font-sans text-[11px]">{humanizeFormula(formulaSQL)}</span>
        ) : (
          highlightSQL(formulaSQL)
        )}
      </div>
    </div>
  );
}
