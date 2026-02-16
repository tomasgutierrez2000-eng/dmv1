'use client';

import { useEffect, useState } from 'react';
import { X, Key, Link2, Database, FileText, Table2 } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { layerColors } from '../../utils/colors';

type SampleDataState = {
  columns: string[];
  rows: unknown[][];
  source: string;
} | null;

export default function DetailPanel() {
  const {
    model,
    selectedTable,
    selectedRelationship,
    selectedField,
    detailPanelOpen,
    setDetailPanelOpen,
    setSelectedTable,
    setSelectedRelationship,
    setSelectedField,
  } = useModelStore();

  const [sampleData, setSampleData] = useState<SampleDataState>(null);
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataError, setSampleDataError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTable) {
      setSampleData(null);
      setSampleDataError(null);
      return;
    }
    setSampleDataLoading(true);
    setSampleDataError(null);
    fetch(`/api/sample-data?tableKey=${encodeURIComponent(selectedTable)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .then((body) => {
        if (body && body.columns && Array.isArray(body.rows)) {
          setSampleData({
            columns: body.columns,
            rows: body.rows,
            source: body.source ?? 'file',
          });
        } else {
          setSampleData(null);
        }
      })
      .catch((err) => {
        setSampleData(null);
        setSampleDataError(err.message || 'Failed to load sample data');
      })
      .finally(() => setSampleDataLoading(false));
  }, [selectedTable]);

  if (!detailPanelOpen) return null;

  const table = selectedTable && model ? model.tables[selectedTable] : null;
  const relationship = selectedRelationship && model
    ? model.relationships.find((r) => r.id === selectedRelationship)
    : null;
  const fieldTable = selectedField && model ? model.tables[selectedField.tableKey] : null;
  const fieldDef = fieldTable && selectedField
    ? fieldTable.fields.find((f) => f.name === selectedField.fieldName)
    : null;
  const fieldRelationships = selectedField && model
    ? model.relationships.filter(
        (r) =>
          (r.source.tableKey === selectedField.tableKey && r.source.field === selectedField.fieldName) ||
          (r.target.tableKey === selectedField.tableKey && r.target.field === selectedField.fieldName)
      )
    : [];

  return (
    <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Details</h2>
        <button
          onClick={() => {
            setDetailPanelOpen(false);
            setSelectedTable(null);
            setSelectedRelationship(null);
            setSelectedField(null);
          }}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content: show one of relationship / field / table */}
      <div className="flex-1 overflow-y-auto p-4">
        {relationship && model && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Relationship</h3>
              <div className="space-y-3">
                <div className="bg-gray-700/50 rounded p-3 border border-gray-600">
                  <div className="text-sm text-gray-400 mb-1">Source</div>
                  <div className="font-mono text-white">
                    {relationship.source.layer}.{relationship.source.table}.{relationship.source.field}
                  </div>
                </div>
                <div className="text-center text-gray-400">
                  <Link2 className="w-6 h-6 mx-auto" />
                </div>
                <div className="bg-gray-700/50 rounded p-3 border border-gray-600">
                  <div className="text-sm text-gray-400 mb-1">Target</div>
                  <div className="font-mono text-white">
                    {relationship.target.layer}.{relationship.target.table}.{relationship.target.field}
                  </div>
                </div>
                {relationship.isCrossLayer && (
                  <div className="bg-amber-900/30 border border-amber-700 rounded p-2">
                    <p className="text-xs text-amber-400">Cross-layer relationship</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!relationship && selectedField && fieldTable && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-500" />
                Field & relationships
              </h3>
              <div className="bg-gray-700/50 rounded p-3 border border-gray-600 mb-3">
                <div className="text-sm text-gray-400 mb-0.5">Table</div>
                <div className="font-semibold text-white">{fieldTable.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${layerColors[fieldTable.layer].badge}`}>
                    {fieldTable.layer}
                  </span>
                  <span className="text-xs text-gray-400">{fieldTable.category}</span>
                </div>
                <div className="text-sm text-gray-400 mt-2 mb-0.5">Column</div>
                <div className="font-mono text-white flex items-center gap-2">
                  {fieldDef?.isPK && <Key className="w-4 h-4 text-yellow-500" />}
                  {fieldDef?.isFK && <Link2 className="w-4 h-4 text-blue-500" />}
                  {selectedField.fieldName}
                  {fieldDef?.dataType && (
                    <span className="text-xs text-gray-400">({fieldDef.dataType})</span>
                  )}
                </div>
                {fieldDef?.description && (
                  <p className="text-sm text-gray-400 mt-2">{fieldDef.description}</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Relationships ({fieldRelationships.length})
              </h4>
              {fieldRelationships.length === 0 ? (
                <p className="text-sm text-gray-500">No relationships for this field</p>
              ) : (
                <div className="space-y-2">
                  {fieldRelationships.map((rel) => {
                    const isSource = rel.source.tableKey === selectedField.tableKey && rel.source.field === selectedField.fieldName;
                    const other = isSource ? rel.target : rel.source;
                    const otherTable = model?.tables[other.tableKey];
                    return (
                      <button
                        key={rel.id}
                        onClick={() => setSelectedRelationship(rel.id)}
                        className="w-full text-left bg-gray-700/50 hover:bg-gray-700 rounded p-3 border border-gray-600 hover:border-blue-500 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400">
                            {isSource ? 'Source → Target' : 'Target ← Source'}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            rel.relationshipType === 'primary' ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/50 text-amber-300'
                          }`}>
                            {rel.relationshipType}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-white mt-1">
                          {other.layer}.{other.table}.{other.field}
                        </div>
                        {otherTable && (
                          <div className="text-xs text-gray-400 mt-0.5">{otherTable.name} · {otherTable.category}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {!relationship && !selectedField && table && (
          <div className="space-y-4">
            {/* Table Header */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Database className="w-5 h-5 text-white" />
                <h3 className="text-xl font-bold text-white">{table.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${layerColors[table.layer].badge}`}>
                  {table.layer}
                </span>
                <span className="text-sm text-gray-400">{table.category}</span>
              </div>
            </div>

            {/* Fields */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Fields ({table.fields.length})</span>
              </h4>
              <div className="space-y-2">
                {table.fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-700/50 rounded p-3 border border-gray-600"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {field.isPK && <Key className="w-4 h-4 text-yellow-500" />}
                      {field.isFK && <Link2 className="w-4 h-4 text-blue-500" />}
                      <span className="font-mono font-semibold text-white">{field.name}</span>
                      {field.dataType && (
                        <span className="text-xs text-gray-400">({field.dataType})</span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-sm text-gray-400 mt-1">{field.description}</p>
                    )}
                    {field.whyRequired && (
                      <p className="text-xs text-gray-500 mt-1">Why: {field.whyRequired}</p>
                    )}
                    {field.simplificationNote && (
                      <p className="text-xs text-amber-400 mt-1">Note: {field.simplificationNote}</p>
                    )}
                    {field.fkTarget && (
                      <p className="text-xs text-blue-400 mt-1">
                        → {field.fkTarget.layer}.{field.fkTarget.table}.{field.fkTarget.field}
                      </p>
                    )}
                    {field.formula && (
                      <div className="mt-2 p-2 bg-gray-800 rounded">
                        <p className="text-xs text-gray-400 mb-1">Formula:</p>
                        <code className="text-xs text-green-400">{field.formula}</code>
                      </div>
                    )}
                    {field.sourceTables && field.sourceTables.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Source Tables:</p>
                        <div className="flex flex-wrap gap-1">
                          {field.sourceTables.map((src, i) => (
                            <span key={i} className="text-xs bg-gray-800 px-2 py-1 rounded">
                              {src.layer}.{src.table}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {field.dashboardUsage && (
                      <p className="text-xs text-purple-400 mt-1">Used in: {field.dashboardUsage}</p>
                    )}
                    {field.grain && (
                      <p className="text-xs text-gray-500 mt-1">Grain: {field.grain}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sample data (when table is selected) */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Table2 className="w-4 h-4" />
                Sample data
              </h4>
              {sampleDataLoading && (
                <p className="text-sm text-gray-500">Loading…</p>
              )}
              {sampleDataError && !sampleDataLoading && (
                <p className="text-sm text-amber-400">{sampleDataError}</p>
              )}
              {!sampleDataLoading && !sampleDataError && sampleData && sampleData.rows.length > 0 && (
                <div className="rounded border border-gray-600 overflow-hidden">
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-700/80 sticky top-0">
                        <tr>
                          {sampleData.columns.map((col) => (
                            <th key={col} className="text-left px-2 py-1.5 text-gray-300 font-medium border-b border-gray-600 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            {sampleData.columns.map((col, cIdx) => (
                              <td key={col} className="px-2 py-1 text-gray-300 whitespace-nowrap max-w-[120px] truncate" title={String(row[cIdx] ?? '')}>
                                {row[cIdx] != null ? String(row[cIdx]) : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-2 py-1 bg-gray-800/80 text-xs text-gray-500 border-t border-gray-600">
                    {sampleData.rows.length} row{sampleData.rows.length !== 1 ? 's' : ''} · {sampleData.source === 'database' ? 'Live DB' : 'Generated sample'}
                  </div>
                </div>
              )}
              {!sampleDataLoading && !sampleDataError && (!sampleData || sampleData.rows.length === 0) && selectedTable && (
                <p className="text-sm text-gray-500">No sample data for this table. For L1 tables run: npx tsx scripts/l1/generate.ts</p>
              )}
            </div>
          </div>
        )}

        {!table && !relationship && !selectedField && (
          <div className="text-center text-gray-400 mt-8">
            <p>Click a table, then a column to see field details and relationships for banking data</p>
          </div>
        )}
      </div>
    </div>
  );
}
