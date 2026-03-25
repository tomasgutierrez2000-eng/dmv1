'use client';

import React from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';

/** Simple regex-based SQL syntax highlighting. */
function highlightSQL(sql: string): React.ReactNode[] {
  if (!sql) return [<span key="empty" className="text-slate-500 italic">Drag fields to compose a formula...</span>];

  const parts: React.ReactNode[] = [];
  const keywords = /\b(SELECT|FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|AS|AND|OR|NOT|IN|IS|NULL|CASE|WHEN|THEN|ELSE|END|DISTINCT)\b/gi;
  const functions = /\b(SUM|AVG|COUNT|MIN|MAX|COALESCE|NULLIF)\b/gi;
  const tables = /\b(l[123])\.([\w]+)/gi;

  let lastIndex = 0;
  // Simple approach: split and classify
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
    // Reset lastIndex for global regexes
    keywords.lastIndex = 0;
    functions.lastIndex = 0;
    tables.lastIndex = 0;
  }
  return parts;
}

export function FormulaBar() {
  const formulaSQL = useStudioStore(s => s.formulaSQL);
  const formulaValid = useStudioStore(s => s.formulaValid);
  const formulaError = useStudioStore(s => s.formulaError);

  return (
    <div className={`border-b px-3 py-1.5 flex items-center gap-2 text-xs font-mono ${formulaValid ? 'border-slate-800 bg-[#111118]' : 'border-red-500/30 bg-red-950/20'}`}>
      <span className="text-slate-500 text-[10px] uppercase tracking-wider flex-shrink-0">fx</span>
      <div className="flex-1 overflow-x-auto whitespace-nowrap text-[#D04A02] scrollbar-thin scrollbar-thumb-slate-700">
        {formulaError ? (
          <span className="text-red-400">{formulaError}</span>
        ) : (
          highlightSQL(formulaSQL)
        )}
      </div>
    </div>
  );
}
