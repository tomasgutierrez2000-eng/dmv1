'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Key, Link2, Database, FileText, Table2, ChevronRight, MousePointerClick } from 'lucide-react';
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
    uploadedSampleData,
  } = useModelStore();

  const [sampleData, setSampleData] = useState<SampleDataState>(null);
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataError, setSampleDataError] = useState<string | null>(null);
  const fieldRelationshipsRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedField && fieldRelationshipsRef.current) {
      fieldRelationshipsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedField]);

  // When panel opens, move focus to close button so keyboard users can dismiss with Escape or Tab
  useEffect(() => {
    if (detailPanelOpen && (selectedTable || selectedRelationship || selectedField)) {
      closeButtonRef.current?.focus({ preventScroll: true });
    }
  }, [detailPanelOpen, selectedTable, selectedRelationship, selectedField]);

  useEffect(() => {
    if (!selectedTable) {
      setSampleData(null);
      setSampleDataError(null);
      return;
    }
    const uploaded = uploadedSampleData[selectedTable];
    if (uploaded?.columns && Array.isArray(uploaded.rows)) {
      setSampleDataLoading(false);
      setSampleDataError(null);
      setSampleData({
        columns: uploaded.columns,
        rows: uploaded.rows,
        source: 'uploaded',
      });
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
  }, [selectedTable, uploadedSampleData]);

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
    <div
      className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-sm"
      role="complementary"
      aria-label="Detail panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Details</h2>
        <button
          ref={closeButtonRef}
          onClick={() => {
            setDetailPanelOpen(false);
            setSelectedTable(null);
            setSelectedRelationship(null);
            setSelectedField(null);
          }}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label="Close detail panel (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Relationship view */}
        {relationship && model && (
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Relationship</h3>
              </div>
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Source</div>
                  <div className="font-mono text-sm text-gray-900">
                    {relationship.source.layer}.{relationship.source.table}.{relationship.source.field}
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Target</div>
                  <div className="font-mono text-sm text-gray-900">
                    {relationship.target.layer}.{relationship.target.table}.{relationship.target.field}
                  </div>
                </div>
                {relationship.isCrossLayer && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <p className="text-xs text-amber-700 font-medium">Cross-layer relationship</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Field view */}
        {!relationship && selectedField && fieldTable && (
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">Field details</h3>
              </div>

              {/* Table context */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3">
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Table</div>
                <div className="font-semibold text-sm text-gray-900">{fieldTable.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${layerColors[fieldTable.layer as keyof typeof layerColors]?.badge ?? 'bg-gray-100 text-gray-800'}`}>
                    {fieldTable.layer}
                  </span>
                  <span className="text-[10px] text-gray-400">{fieldTable.category}</span>
                </div>
              </div>

              {/* Field info */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Column</div>
                <div className="font-mono text-sm text-gray-900 flex items-center gap-2">
                  {fieldDef?.isPK && <Key className="w-3.5 h-3.5 text-amber-500" />}
                  {fieldDef?.isFK && <Link2 className="w-3.5 h-3.5 text-blue-600" />}
                  {selectedField.fieldName}
                  {fieldDef?.dataType && (
                    <span className="text-[10px] text-gray-400 font-sans px-1.5 py-0.5 bg-gray-200/60 rounded">
                      {fieldDef.dataType}
                    </span>
                  )}
                </div>
                {fieldDef?.description && (
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">{fieldDef.description}</p>
                )}
              </div>
            </div>

            {/* Field relationships */}
            <div ref={fieldRelationshipsRef}>
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-3.5 h-3.5 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Relationships ({fieldRelationships.length})
                </h4>
              </div>
              {fieldRelationships.length === 0 ? (
                <p className="text-xs text-gray-400 px-1">No relationships for this field</p>
              ) : (
                <div className="space-y-1.5">
                  {fieldRelationships.map((rel) => {
                    const isSource = rel.source.tableKey === selectedField.tableKey && rel.source.field === selectedField.fieldName;
                    const other = isSource ? rel.target : rel.source;
                    const otherTable = model?.tables[other.tableKey];
                    return (
                      <button
                        key={rel.id}
                        onClick={() => setSelectedRelationship(rel.id)}
                        className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-3 border border-gray-100 hover:border-gray-200 transition-all duration-150"
                        aria-label={`Relationship to ${other.table}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] text-gray-400">
                            {isSource ? 'Source → Target' : 'Target ← Source'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            rel.relationshipType === 'primary' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {rel.relationshipType}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-gray-900">
                          {other.layer}.{other.table}.{other.field}
                        </div>
                        {otherTable && (
                          <div className="text-[10px] text-gray-400 mt-0.5">{otherTable.name} · {otherTable.category}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table view */}
        {!relationship && !selectedField && table && (
          <div className="p-4 space-y-4">
            {/* Table Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-gray-500" />
                <h3 className="text-base font-bold text-gray-900 truncate">{table.name}</h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${layerColors[table.layer as keyof typeof layerColors]?.badge ?? 'bg-gray-100 text-gray-800'}`}>
                  {table.layer}
                </span>
                <span className="text-xs text-gray-400">{table.category}</span>
              </div>
            </div>

            {/* Fields */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fields ({table.fields.length})
                </h4>
              </div>
              <div className="space-y-1">
                {table.fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {field.isPK && <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                      {field.isFK && <Link2 className="w-3 h-3 text-blue-600 flex-shrink-0" />}
                      <span className="font-mono font-semibold text-xs text-gray-900 truncate">{field.name}</span>
                      {field.dataType && (
                        <span className="text-[9px] text-gray-400 ml-auto flex-shrink-0 px-1 py-0.5 bg-gray-200/60 rounded font-medium">{field.dataType}</span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{field.description}</p>
                    )}
                    {field.whyRequired && (
                      <p className="text-[10px] text-gray-400 mt-1 italic">Why: {field.whyRequired}</p>
                    )}
                    {field.simplificationNote && (
                      <p className="text-[10px] text-amber-600 mt-1">Note: {field.simplificationNote}</p>
                    )}
                    {field.fkTarget && (
                      <p className="text-[10px] text-blue-600 mt-1 font-medium">
                        → {field.fkTarget.layer}.{field.fkTarget.table}.{field.fkTarget.field}
                      </p>
                    )}
                    {field.formula && (
                      <div className="mt-1.5 p-1.5 bg-gray-100 rounded">
                        <code className="text-[10px] text-emerald-700">{field.formula}</code>
                      </div>
                    )}
                    {field.sourceFields && (
                      <p className="text-[10px] text-blue-600 mt-1 font-medium">
                        Source: <code className="font-mono">{field.sourceFields}</code>
                      </p>
                    )}
                    {field.sourceTables && field.sourceTables.length > 0 && (
                      <div className="mt-1.5">
                        <div className="flex flex-wrap gap-0.5">
                          {field.sourceTables.map((src, i) => (
                            <span key={i} className="text-[9px] bg-gray-200/80 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                              {src.layer}.{src.table}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {field.derivationLogic && (
                      <p className="text-[10px] text-gray-500 mt-1 italic">{field.derivationLogic}</p>
                    )}
                    {field.dashboardUsage && (
                      <p className="text-[10px] text-violet-600 mt-1">Used in: {field.dashboardUsage}</p>
                    )}
                    {field.grain && (
                      <p className="text-[10px] text-gray-400 mt-1">Grain: {field.grain}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sample data */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Table2 className="w-3.5 h-3.5 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sample data</h4>
              </div>
              {sampleDataLoading && (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                  Loading…
                </div>
              )}
              {sampleDataError && !sampleDataLoading && (
                <p className="text-xs text-amber-600 py-1">{sampleDataError}</p>
              )}
              {!sampleDataLoading && !sampleDataError && sampleData && sampleData.rows.length > 0 && (
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-48 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-[11px] border-collapse" aria-label={`Sample data for ${table.name}`}>
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {sampleData.columns.map((col) => (
                            <th key={col} className="text-left px-2 py-1.5 text-gray-500 font-semibold border-b border-gray-100 whitespace-nowrap uppercase text-[9px] tracking-wider">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                            {sampleData.columns.map((col, cIdx) => (
                              <td key={col} className="px-2 py-1.5 text-gray-600 whitespace-nowrap max-w-[120px] truncate" title={String(row[cIdx] ?? '')}>
                                {row[cIdx] != null ? String(row[cIdx]) : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-2 py-1.5 bg-gray-50 text-[10px] text-gray-400 border-t border-gray-100 font-medium">
                    {sampleData.rows.length} row{sampleData.rows.length !== 1 ? 's' : ''} · {sampleData.source === 'uploaded' ? 'Uploaded' : sampleData.source === 'database' ? 'Live DB' : 'Generated'}
                  </div>
                </div>
              )}
              {!sampleDataLoading && !sampleDataError && (!sampleData || sampleData.rows.length === 0) && selectedTable && (
                <p className="text-[11px] text-gray-400 py-1 leading-relaxed">
                  No sample data available. Use the toolbar Import button to upload Excel data.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty state - nothing selected */}
        {!table && !relationship && !selectedField && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-12 h-12 mb-3 bg-gray-100 rounded-xl flex items-center justify-center">
              <MousePointerClick className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">Nothing selected</p>
            <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">Click a table on the canvas, then click a field to see its details and relationships.</p>
          </div>
        )}
      </div>
    </div>
  );
}
