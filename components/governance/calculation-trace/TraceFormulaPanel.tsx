'use client';

interface TraceColumnUsed {
  name: string;
  value: unknown;
  role: 'measure' | 'join_key' | 'filter' | 'reference';
}

interface TraceFormulaPanelProps {
  formula: string;
  formulaSql: string;
  unitType: string;
  steps: Array<{
    columns_used: TraceColumnUsed[];
    alias_in_sql: string;
    table_name: string;
  }>;
  metricValue: number | null;
  formatted: string;
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    if (Number.isInteger(v)) return v.toLocaleString();
    return v.toFixed(4);
  }
  return String(v);
}

export default function TraceFormulaPanel({
  formula,
  formulaSql,
  unitType,
  steps,
  metricValue,
  formatted,
}: TraceFormulaPanelProps) {
  // Collect all measure columns with their values for substitution display
  const measureVars: Array<{ name: string; value: unknown; table: string }> = [];
  for (const step of steps) {
    for (const col of step.columns_used) {
      if (col.role === 'measure') {
        measureVars.push({
          name: col.name,
          value: col.value,
          table: step.table_name,
        });
      }
    }
  }

  return (
    <div className="rounded-lg border border-pwc-gray-light/50 bg-pwc-black/30 p-4 space-y-4">
      {/* Generic formula */}
      <div>
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Formula</span>
        <p className="text-sm text-gray-200 font-medium mt-1">{formula}</p>
      </div>

      {/* Variable substitution */}
      {measureVars.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Input Values</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {measureVars.map((v, i) => (
              <div
                key={`${v.name}-${i}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pwc-orange/10 border border-pwc-orange/20"
              >
                <span className="text-[10px] font-mono text-gray-400">{v.name}</span>
                <span className="text-[10px] text-gray-600">=</span>
                <span className="text-xs font-semibold text-pwc-orange tabular-nums">
                  {formatVal(v.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Computation */}
      {metricValue !== null && (
        <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
          <div className="flex-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Result</span>
            <div className="flex items-center gap-2 mt-1">
              {measureVars.length >= 2 && (
                <span className="text-xs text-gray-400 font-mono">
                  {measureVars.map(v => formatVal(v.value)).join(' → ')}
                </span>
              )}
              <span className="text-xs text-gray-600">=</span>
              <span className="text-lg font-bold text-pwc-orange tabular-nums">{formatted}</span>
            </div>
          </div>
        </div>
      )}

      {/* SQL (collapsible) */}
      <details className="group">
        <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">
          View formula SQL
        </summary>
        <pre className="mt-2 p-3 bg-pwc-black rounded-lg text-[10px] text-gray-500 font-mono overflow-x-auto whitespace-pre-wrap max-h-32">
          {formulaSql}
        </pre>
      </details>
    </div>
  );
}
