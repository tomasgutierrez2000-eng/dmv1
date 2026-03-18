'use client';

interface TraceColumnUsed {
  name: string;
  value: unknown;
  role: 'measure' | 'join_key' | 'filter' | 'reference';
}

interface TraceTablePanelProps {
  rows: Record<string, unknown>[];
  columnsUsed: TraceColumnUsed[];
  rowCount: number;
}

const ROLE_COLORS: Record<string, string> = {
  measure: 'bg-pwc-orange/20 text-pwc-orange',
  join_key: 'bg-blue-500/20 text-blue-400',
  filter: 'bg-cyan-500/20 text-cyan-400',
  reference: '',
};

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  if (typeof val === 'boolean') return val ? 'Y' : 'N';
  const s = String(val);
  return s.length > 40 ? s.substring(0, 37) + '...' : s;
}

export default function TraceTablePanel({ rows, columnsUsed, rowCount }: TraceTablePanelProps) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic py-2 px-3">No rows found for this entity</p>
    );
  }

  // Determine column order: PK/join_key first, then measures, then others
  const colOrder = [...columnsUsed].sort((a, b) => {
    const rank = { join_key: 0, measure: 1, filter: 2, reference: 3 };
    return (rank[a.role] ?? 3) - (rank[b.role] ?? 3);
  });

  // If no columns_used metadata, derive from rows
  const columns = colOrder.length > 0
    ? colOrder
    : Object.keys(rows[0]).map(name => ({
        name,
        value: rows[0][name],
        role: 'reference' as const,
      }));

  const measureCols = new Set(columns.filter(c => c.role === 'measure').map(c => c.name));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-gray-700/50">
            {columns.map(col => (
              <th
                key={col.name}
                className={`text-left px-2 py-1.5 font-medium ${
                  measureCols.has(col.name) ? 'text-pwc-orange' : 'text-gray-400'
                }`}
              >
                <span className="font-mono">{col.name}</span>
                {col.role !== 'reference' && (
                  <span className={`ml-1 text-[8px] px-1 py-0.5 rounded ${ROLE_COLORS[col.role]}`}>
                    {col.role.replace('_', ' ')}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
              {columns.map(col => {
                const val = row[col.name];
                const isNull = val === null || val === undefined;
                const isMeasure = measureCols.has(col.name);
                return (
                  <td
                    key={col.name}
                    className={`px-2 py-1 font-mono ${
                      isMeasure ? 'bg-pwc-orange/5 font-semibold text-pwc-orange' :
                      isNull ? 'text-gray-600 italic' : 'text-gray-300'
                    }`}
                  >
                    {formatCellValue(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rowCount > rows.length && (
        <p className="text-[10px] text-gray-600 px-2 py-1">
          Showing {rows.length} of {rowCount} rows
        </p>
      )}
    </div>
  );
}
