'use client';

import { useEffect, useState, useMemo } from 'react';
import { Table2 } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';

type SampleData = {
  columns: string[];
  rows: unknown[][];
  source: string;
} | null;

export default function L3SampleDataStrip() {
  const { model, selectedTable, selectedSampleDataCell, setSelectedSampleDataCell } = useModelStore();
  const [data, setData] = useState<SampleData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const table = selectedTable && model ? model.tables[selectedTable] : null;
  const isL3 = table?.layer === 'L3';

  useEffect(() => {
    if (!selectedTable || !isL3) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/sample-data?tableKey=${encodeURIComponent(selectedTable)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .then((body) => {
        if (body?.columns && Array.isArray(body.rows)) {
          setData({
            columns: body.columns,
            rows: body.rows,
            source: body.source ?? 'file',
          });
        } else {
          setData(null);
        }
      })
      .catch((err) => {
        setData(null);
        setError(err.message || 'Failed to load sample data');
      })
      .finally(() => setLoading(false));
  }, [selectedTable, isL3]);

  const displayColumns = useMemo(() => {
    if (!data?.columns?.length || !table) return data?.columns ?? [];
    const fieldNames = new Set(table.fields.map((f) => f.name));
    const ordered = table.fields.filter((f) => data.columns.includes(f.name)).map((f) => f.name);
    const rest = data.columns.filter((c) => !fieldNames.has(c));
    return ordered.length ? [...ordered, ...rest] : data.columns;
  }, [data?.columns, table]);

  if (!model || !selectedTable || !isL3) return null;

  return (
    <div
      className="flex-shrink-0 border-t border-gray-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      role="region"
      aria-label={`L3 sample data: ${table?.name ?? selectedTable}`}
    >
      <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-100">
        <Table2 className="w-4 h-4 text-violet-500" aria-hidden />
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          L3 sample data
        </span>
        <span className="text-xs text-gray-500 font-normal">— {table?.name}</span>
      </div>
      <div className="px-3 py-2 overflow-x-auto max-h-40 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" aria-hidden />
            Loading…
          </div>
        )}
        {error && !loading && (
          <p className="text-xs text-amber-600 py-2">{error}</p>
        )}
        {!loading && !error && data && data.rows.length > 0 && (
          <table className="w-full text-[11px] border-collapse" role="grid" aria-label={`Sample data for ${table?.name}`}>
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {displayColumns.map((col) => {
                  const isSelected = selectedSampleDataCell?.columnName === col;
                  return (
                    <th
                      key={col}
                      scope="col"
                      className={`text-left px-2 py-1.5 font-semibold border-b border-gray-100 whitespace-nowrap uppercase text-[9px] tracking-wider cursor-pointer transition-colors ${
                        isSelected ? 'bg-violet-100 text-violet-800' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      onClick={() =>
                        setSelectedSampleDataCell(
                          selectedSampleDataCell?.columnName === col ? null : { columnName: col, rowIndex: 0 }
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedSampleDataCell(
                            selectedSampleDataCell?.columnName === col ? null : { columnName: col, rowIndex: 0 }
                          );
                        }
                      }}
                      tabIndex={0}
                    >
                      {col}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-gray-50 hover:bg-violet-50/50">
                  {displayColumns.map((col) => {
                    const colIdx = data.columns.indexOf(col);
                    const value = colIdx >= 0 ? row[colIdx] : undefined;
                    const isSelected =
                      selectedSampleDataCell?.columnName === col && selectedSampleDataCell?.rowIndex === rIdx;
                    const isSelectedCol = selectedSampleDataCell?.columnName === col;
                    return (
                      <td
                        key={col}
                        className={`px-2 py-1.5 whitespace-nowrap max-w-[140px] truncate cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-violet-200 text-violet-900 font-medium'
                            : isSelectedCol
                              ? 'bg-violet-50 text-gray-700'
                              : 'text-gray-600 hover:bg-violet-50/50'
                        }`}
                        title={String(value ?? '')}
                        onClick={() => {
                          const same =
                            selectedSampleDataCell?.columnName === col && selectedSampleDataCell?.rowIndex === rIdx;
                          setSelectedSampleDataCell(same ? null : { columnName: col, rowIndex: rIdx });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const same =
                              selectedSampleDataCell?.columnName === col && selectedSampleDataCell?.rowIndex === rIdx;
                            setSelectedSampleDataCell(same ? null : { columnName: col, rowIndex: rIdx });
                          }
                        }}
                        tabIndex={0}
                      >
                        {value != null ? String(value) : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !error && (!data || data.rows.length === 0) && (
          <p className="text-xs text-gray-400 py-2">No sample data for this table.</p>
        )}
      </div>
      {data && data.rows.length > 0 && (
        <div className="px-3 py-1.5 bg-gray-50 text-[10px] text-gray-400 border-t border-gray-100">
          {data.rows.length} row{data.rows.length !== 1 ? 's' : ''} · Click a cell to see formula &amp; inputs in the detail panel
        </div>
      )}
    </div>
  );
}
