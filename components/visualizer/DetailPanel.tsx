'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { X, Key, Link2, Database, FileText, Table2, ChevronRight, MousePointerClick, Calculator, XCircle } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { layerColors } from '../../utils/colors';
import type { Field } from '../../types/model';

type SampleDataState = {
  columns: string[];
  rows: unknown[][];
  source: string;
} | null;

/** Format a number for display in calculated examples (commas, reasonable decimals) */
function formatExampleValue(val: unknown): string {
  if (val == null) return '—';
  if (typeof val === 'number') {
    if (Number.isInteger(val) && Math.abs(val) >= 1000) return val.toLocaleString('en-US');
    if (!Number.isInteger(val)) return String(Number((val as number).toFixed(4)));
    return String(val);
  }
  return String(val);
}

/**
 * Build a "calculated example" string from a formula and sample row values.
 * Replaces same-table field names in the formula with values from the row; appends result.
 * Returns null if formula references other layers (e.g. L2.) or we can't substitute meaningfully.
 */
function buildCalculatedExample(
  formula: string,
  tableFieldNames: string[],
  rowValueByColumn: Record<string, unknown>,
  resultValue: unknown
): string | null {
  const trimmed = formula.trim();
  if (!trimmed) return null;
  // If formula clearly references other tables/layers, we still show a simple "with sample data" line
  if (/\bL[12]\./i.test(trimmed)) {
    return `Result in this sample row: ${formatExampleValue(resultValue)} (inputs from L1/L2)`;
  }
  // Find which table fields appear in the formula (sort by length desc to replace longest first)
  const namesInFormula = tableFieldNames.filter((name) => trimmed.includes(name)).sort((a, b) => b.length - a.length);
  if (namesInFormula.length === 0) return null;
  const missing = namesInFormula.some((name) => rowValueByColumn[name] === undefined || rowValueByColumn[name] === null);
  if (missing) return null;
  let displayExpr = trimmed;
  for (const name of namesInFormula) {
    const val = rowValueByColumn[name];
    const replacement = formatExampleValue(val);
    // Replace whole-word occurrences only (avoid "limit_amt" matching inside another name)
    displayExpr = displayExpr.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), replacement);
  }
  // Display operators nicely
  displayExpr = displayExpr.replace(/\s*\*\s*/g, ' × ').replace(/\s*\/\s*/g, ' ÷ ');
  return `${displayExpr} = ${formatExampleValue(resultValue)}`;
}

export default function DetailPanel() {
  const {
    model,
    selectedTable,
    selectedRelationship,
    selectedField,
    selectedSampleDataCell,
    detailPanelOpen,
    setDetailPanelOpen,
    setSelectedTable,
    setSelectedRelationship,
    setSelectedField,
    setSelectedSampleDataCell,
    clearSelection,
    uploadedSampleData,
  } = useModelStore();

  const [sampleData, setSampleData] = useState<SampleDataState>(null);
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataError, setSampleDataError] = useState<string | null>(null);
  const fieldRelationshipsRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const derivationPanelRef = useRef<HTMLDivElement>(null);
  const sampleDataFetchRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedField && fieldRelationshipsRef.current) {
      fieldRelationshipsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedField]);

  // When user selects a sample data cell (L3), scroll derivation panel into view so it's visible
  useEffect(() => {
    if (!selectedSampleDataCell || !selectedTable || !model) return;
    const t = model.tables[selectedTable];
    if (t?.layer === 'L3' && derivationPanelRef.current) {
      derivationPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedSampleDataCell, selectedTable, model]);

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
    const ac = new AbortController();
    const key = selectedTable;
    sampleDataFetchRef.current = key;
    setSampleDataLoading(true);
    setSampleDataError(null);
    fetch(`/api/sample-data?tableKey=${encodeURIComponent(selectedTable)}`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('No sample data for this table.');
          throw new Error(res.status === 400 ? 'Invalid table' : res.statusText);
        }
        return res.json();
      })
      .then((body) => {
        if (sampleDataFetchRef.current !== key) return;
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
        if (err.name === 'AbortError') return;
        if (sampleDataFetchRef.current !== key) return;
        setSampleData(null);
        setSampleDataError(err.message || 'Failed to load sample data');
      })
      .finally(() => {
        if (sampleDataFetchRef.current === key) setSampleDataLoading(false);
      });
    return () => {
      sampleDataFetchRef.current = null;
      ac.abort();
    };
  }, [selectedTable, uploadedSampleData]);

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

  // For L3 tables: order sample data columns by model field order so they align with the data model
  const displayColumns = useMemo(() => {
    if (!sampleData?.columns?.length) return sampleData?.columns ?? [];
    if (!table || table.layer !== 'L3' || !model?.tables[selectedTable!]) return sampleData.columns;
    const fieldNames = new Set(table.fields.map((f) => f.name));
    const ordered = table.fields.filter((f) => sampleData.columns.includes(f.name)).map((f) => f.name);
    const rest = sampleData.columns.filter((c) => !fieldNames.has(c));
    return ordered.length ? [...ordered, ...rest] : sampleData.columns;
  }, [sampleData?.columns, table, selectedTable, model]);

  // Selected L3 column's field definition (for derivation panel)
  const selectedCellField: Field | null =
    selectedTable && table?.layer === 'L3' && selectedSampleDataCell && table
      ? table.fields.find((f) => f.name === selectedSampleDataCell.columnName) ?? null
      : null;

  const isDerivedField = (f: Field) =>
    !!(f.formula || f.sourceFields || (f.sourceTables && f.sourceTables.length) || f.derivationLogic || f.fkTarget);

  // L3 field inputs from model relationships (source → this field)
  const inputsFromRelationships =
    selectedTable && selectedSampleDataCell && model
      ? model.relationships.filter(
          (r) => r.target.tableKey === selectedTable && r.target.field === selectedSampleDataCell!.columnName
        )
      : [];

  // Build row value map and calculated example for the selected L3 cell (for "Example with sample data")
  const calculatedExample = useMemo(() => {
    if (!selectedCellField?.formula || !table || !sampleData?.rows?.length || selectedSampleDataCell == null) return null;
    const rowIndex = selectedSampleDataCell.rowIndex;
    if (rowIndex < 0 || rowIndex >= sampleData.rows.length) return null;
    const row = sampleData.rows[rowIndex] as unknown[];
    const rowValueByColumn: Record<string, unknown> = {};
    sampleData.columns.forEach((col, i) => {
      rowValueByColumn[col] = row[i];
    });
    const colIdx = sampleData.columns.indexOf(selectedSampleDataCell.columnName);
    const resultValue = colIdx >= 0 ? row[colIdx] : undefined;
    return buildCalculatedExample(
      selectedCellField.formula,
      table.fields.map((f) => f.name),
      rowValueByColumn,
      resultValue
    );
  }, [selectedCellField?.formula, table, sampleData, selectedSampleDataCell]);

  if (!detailPanelOpen) return null;

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
          onClick={() => clearSelection()}
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
                  <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-1">Source</div>
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
                  <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-1">Target</div>
                  <div className="font-mono text-sm text-gray-900">
                    {relationship.target.layer}.{relationship.target.table}.{relationship.target.field}
                  </div>
                </div>
                {relationship.isCrossLayer && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <p className="text-sm text-amber-700 font-medium">Cross-layer relationship</p>
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

              {/* Table context — clickable to navigate back to table view */}
              <button
                type="button"
                onClick={() => setSelectedTable(selectedField.tableKey)}
                className="w-full text-left bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3 hover:bg-gray-100 hover:border-gray-200 transition-colors group"
                aria-label={`Back to table ${fieldTable.name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-1">Table</div>
                  <span className="text-[11px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">View table</span>
                </div>
                <div className="font-semibold text-sm text-gray-900">{fieldTable.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[12px] font-bold ${layerColors[fieldTable.layer as keyof typeof layerColors]?.badge ?? 'bg-gray-100 text-gray-800'}`}>
                    {fieldTable.layer}
                  </span>
                  <span className="text-[12px] text-gray-400">{fieldTable.category}</span>
                </div>
              </button>

              {/* Field info */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-1">Column</div>
                <div className="font-mono text-sm text-gray-900 flex items-center gap-2">
                  {fieldDef?.isPK && <Key className="w-3.5 h-3.5 text-amber-500" />}
                  {fieldDef?.isFK && <Link2 className="w-3.5 h-3.5 text-blue-600" />}
                  {selectedField.fieldName}
                  {fieldDef?.dataType && (
                    <span className="text-[12px] text-gray-400 font-sans px-1.5 py-0.5 bg-gray-200/60 rounded">
                      {fieldDef.dataType}
                    </span>
                  )}
                </div>
                {fieldDef?.description && (
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{fieldDef.description}</p>
                )}
              </div>
            </div>

            {/* Field relationships */}
            <div ref={fieldRelationshipsRef}>
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-3.5 h-3.5 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Relationships ({fieldRelationships.length})
                </h4>
              </div>
              {fieldRelationships.length === 0 ? (
                <p className="text-sm text-gray-400 px-1">No relationships for this field</p>
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
                          <span className="text-[12px] text-gray-400">
                            {isSource ? 'Source → Target' : 'Target ← Source'}
                          </span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                            rel.relationshipType === 'primary' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {rel.relationshipType}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-gray-900">
                          {other.layer}.{other.table}.{other.field}
                        </div>
                        {otherTable && (
                          <div className="text-[12px] text-gray-400 mt-0.5">{otherTable.name} · {otherTable.category}</div>
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
                <span className={`px-1.5 py-0.5 rounded text-[12px] font-bold ${layerColors[table.layer as keyof typeof layerColors]?.badge ?? 'bg-gray-100 text-gray-800'}`}>
                  {table.layer}
                </span>
                <span className="text-sm text-gray-400">{table.category}</span>
              </div>
            </div>

            {/* L3: Formulas with worked examples (using first sample row) */}
            {table.layer === 'L3' && table.fields.some((f) => f.formula) && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/60 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-200/80 bg-violet-100/60">
                  <Calculator className="w-3.5 h-3.5 text-violet-700" aria-hidden />
                  <h4 className="text-sm font-semibold text-violet-800 uppercase tracking-wider">
                    Formulas & examples
                  </h4>
                </div>
                <div className="p-3 space-y-3 max-h-56 overflow-y-auto">
                  {table.fields
                    .filter((f) => f.formula)
                    .map((field) => {
                      const rowValueByColumn: Record<string, unknown> = {};
                      if (sampleData?.rows?.[0] && sampleData.columns) {
                        sampleData.columns.forEach((col, i) => {
                          rowValueByColumn[col] = (sampleData.rows[0] as unknown[])[i];
                        });
                      }
                      const colIdx = sampleData?.columns?.indexOf(field.name) ?? -1;
                      const resultValue = sampleData?.rows?.[0] && colIdx >= 0 ? (sampleData.rows[0] as unknown[])[colIdx] : undefined;
                      const example = buildCalculatedExample(
                        field.formula!,
                        table.fields.map((f) => f.name),
                        rowValueByColumn,
                        resultValue
                      );
                      return (
                        <div key={field.name} className="bg-white/80 rounded p-2.5 border border-violet-100">
                          <div className="font-mono text-[12px] font-semibold text-violet-900 mb-1">{field.name}</div>
                          <pre className="text-[12px] font-mono text-gray-700 whitespace-pre-wrap break-all mb-1.5">
                            {field.formula}
                          </pre>
                          {example && (
                            <p className="text-[12px] font-mono text-emerald-700 bg-emerald-50/80 rounded px-1.5 py-1 border border-emerald-100">
                              Example: {example}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Fields */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
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
                      <span className="font-mono font-semibold text-sm text-gray-900 truncate">{field.name}</span>
                      {field.dataType && (
                        <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0 px-1 py-0.5 bg-gray-200/60 rounded font-medium">{field.dataType}</span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{field.description}</p>
                    )}
                    {field.whyRequired && (
                      <p className="text-[12px] text-gray-400 mt-1 italic">Why: {field.whyRequired}</p>
                    )}
                    {field.simplificationNote && (
                      <p className="text-[12px] text-amber-600 mt-1">Note: {field.simplificationNote}</p>
                    )}
                    {field.fkTarget && (
                      <p className="text-[12px] text-blue-600 mt-1 font-medium">
                        → {field.fkTarget.layer}.{field.fkTarget.table}.{field.fkTarget.field}
                      </p>
                    )}
                    {field.formula && (
                      <div className="mt-1.5 p-1.5 bg-gray-100 rounded">
                        <code className="text-[12px] text-emerald-700">{field.formula}</code>
                      </div>
                    )}
                    {field.sourceFields && (
                      <p className="text-[12px] text-blue-600 mt-1 font-medium">
                        Source: <code className="font-mono">{field.sourceFields}</code>
                      </p>
                    )}
                    {field.sourceTables && field.sourceTables.length > 0 && (
                      <div className="mt-1.5">
                        <div className="flex flex-wrap gap-0.5">
                          {field.sourceTables.map((src, i) => (
                            <span key={i} className="text-[11px] bg-gray-200/80 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                              {src.layer}.{src.table}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {field.derivationLogic && (
                      <p className="text-[12px] text-gray-500 mt-1 italic">{field.derivationLogic}</p>
                    )}
                    {field.dashboardUsage && (
                      <p className="text-[12px] text-violet-600 mt-1">Used in: {field.dashboardUsage}</p>
                    )}
                    {field.grain && (
                      <p className="text-[12px] text-gray-400 mt-1">Grain: {field.grain}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* L3: Derivation panel when user clicks a column value */}
            {table.layer === 'L3' && selectedSampleDataCell && (
              <div
                ref={derivationPanelRef}
                className="rounded-lg border border-emerald-200 bg-emerald-50/80 overflow-hidden"
                role="region"
                aria-label={`Derivation for ${selectedSampleDataCell.columnName}`}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-emerald-200/80 bg-emerald-100/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calculator className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" aria-hidden />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider truncate">
                        Derivation: {selectedSampleDataCell.columnName}
                      </h4>
                      {sampleData?.rows?.[selectedSampleDataCell.rowIndex] != null && (() => {
                        const colIdx = sampleData.columns.indexOf(selectedSampleDataCell.columnName);
                        const val = colIdx >= 0 ? sampleData.rows[selectedSampleDataCell.rowIndex][colIdx] : undefined;
                        return val != null ? (
                          <p className="text-[12px] text-emerald-700 mt-0.5 truncate" title={String(val)}>
                            Sample value: <span className="font-mono font-medium">{String(val)}</span>
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSampleDataCell(null)}
                    className="flex-shrink-0 p-1.5 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-colors"
                    aria-label="Clear selection"
                    title="Clear selection"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
                  {!selectedCellField ? (
                    <p className="text-[12px] text-gray-500 italic">No field metadata for this column in the model.</p>
                  ) : isDerivedField(selectedCellField) ? (
                    <>
                      {selectedCellField.formula && (
                        <div>
                          <div className="text-[12px] font-medium text-emerald-700 uppercase tracking-wider mb-1">Formula</div>
                          <pre className="text-[12px] font-mono text-gray-800 bg-white/80 rounded p-2 border border-emerald-100 overflow-x-auto overflow-y-auto max-h-32 whitespace-pre-wrap break-all">
                            {selectedCellField.formula}
                          </pre>
                        </div>
                      )}
                      {calculatedExample && (
                        <div>
                          <div className="text-[12px] font-medium text-emerald-700 uppercase tracking-wider mb-1">Example with sample data</div>
                          <p className="text-[12px] font-mono text-gray-800 bg-white/80 rounded p-2 border border-emerald-100 break-all">
                            {calculatedExample}
                          </p>
                        </div>
                      )}
                      {(selectedCellField.sourceFields || selectedCellField.sourceTables?.length) ? (
                        <div>
                          <div className="text-[12px] font-medium text-emerald-700 uppercase tracking-wider mb-1">Inputs from L1 / L2</div>
                          <ul className="space-y-1 text-[12px]">
                            {selectedCellField.sourceFields && (
                              <li className="text-gray-700">
                                <span className="text-gray-500">Fields: </span>
                                <code className="font-mono bg-white/80 px-1 rounded">{selectedCellField.sourceFields}</code>
                              </li>
                            )}
                            {selectedCellField.sourceTables && selectedCellField.sourceTables.length > 0 && (
                              <li className="flex flex-wrap gap-1 items-center">
                                <span className="text-gray-500">Tables: </span>
                                {selectedCellField.sourceTables.map((src, i) => (
                                  <span
                                    key={i}
                                    className="text-[12px] bg-white/80 text-gray-700 px-1.5 py-0.5 rounded border border-emerald-100 font-medium"
                                  >
                                    {src.layer}.{src.table}
                                  </span>
                                ))}
                              </li>
                            )}
                            {selectedCellField.fkTarget && (
                              <li className="text-gray-700">
                                <span className="text-gray-500">FK → </span>
                                <code className="font-mono bg-white/80 px-1 rounded">
                                  {selectedCellField.fkTarget.layer}.{selectedCellField.fkTarget.table}.{selectedCellField.fkTarget.field}
                                </code>
                              </li>
                            )}
                            {inputsFromRelationships.length > 0 && (
                              <li className="flex flex-wrap gap-1 items-center pt-1 border-t border-emerald-200/60">
                                <span className="text-gray-500 w-full text-[12px] mb-0.5">Lineage: </span>
                                {inputsFromRelationships.map((rel) => (
                                  <span
                                    key={rel.id}
                                    className="text-[12px] bg-white/80 text-gray-700 px-1.5 py-0.5 rounded border border-emerald-100 font-mono"
                                  >
                                    {rel.source.layer}.{rel.source.table}.{rel.source.field} → {selectedSampleDataCell.columnName}
                                  </span>
                                ))}
                              </li>
                            )}
                          </ul>
                        </div>
                      ) : (selectedCellField.fkTarget || inputsFromRelationships.length > 0) && !selectedCellField.sourceFields && !selectedCellField.sourceTables?.length && (
                        <div>
                          <div className="text-[12px] font-medium text-emerald-700 uppercase tracking-wider mb-1">Inputs from L1 / L2</div>
                          <ul className="space-y-1 text-[12px]">
                            {selectedCellField.fkTarget && (
                              <li>
                                <code className="font-mono bg-white/80 px-1 rounded">
                                  {selectedCellField.fkTarget.layer}.{selectedCellField.fkTarget.table}.{selectedCellField.fkTarget.field}
                                </code>
                              </li>
                            )}
                            {inputsFromRelationships.map((rel) => (
                              <li key={rel.id} className="font-mono text-gray-700">
                                {rel.source.layer}.{rel.source.table}.{rel.source.field}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedCellField.derivationLogic && (
                        <p className="text-[12px] text-gray-600 italic border-t border-emerald-200/80 pt-2">
                          {selectedCellField.derivationLogic}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[12px] text-gray-500 italic">This column is not a derived field. Select a column with a formula or source inputs.</p>
                  )}
                </div>
              </div>
            )}

            {/* Sample data */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Table2 className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sample data</h4>
              </div>
              {table.layer === 'L3' && (
                <p className="text-[12px] text-gray-500 mb-2">
                  Click a column header or cell to see formula and inputs from L1/L2.
                </p>
              )}
              {sampleDataLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" aria-hidden />
                  Loading…
                </div>
              )}
              {sampleDataError && !sampleDataLoading && (
                <p className="text-sm text-amber-600 py-1">{sampleDataError}</p>
              )}
              {!sampleDataLoading && !sampleDataError && sampleData && sampleData.rows.length > 0 && (
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-48 overflow-y-auto scrollbar-thin">
                    <table
                      className="w-full text-[12px] border-collapse"
                      role="grid"
                      aria-label={`Sample data for ${table.name}. Click a cell to see derivation for L3 columns.`}
                    >
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {displayColumns.map((col) => {
                            const isSelected = selectedSampleDataCell?.columnName === col;
                            return (
                              <th
                                key={col}
                                scope="col"
                                className={`text-left px-2 py-1.5 font-semibold border-b border-gray-100 whitespace-nowrap uppercase text-[11px] tracking-wider cursor-pointer transition-colors ${
                                  isSelected ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                                onClick={() => {
                                  setSelectedSampleDataCell(
                                    selectedSampleDataCell?.columnName === col ? null : { columnName: col, rowIndex: 0 }
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedSampleDataCell(
                                      selectedSampleDataCell?.columnName === col ? null : { columnName: col, rowIndex: 0 }
                                    );
                                  }
                                }}
                                tabIndex={0}
                                role="columnheader"
                                aria-selected={isSelected}
                                aria-label={`Column ${col}${isSelected ? ', selected' : ''}`}
                              >
                                {col}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                            {displayColumns.map((col) => {
                              const colIdx = sampleData.columns.indexOf(col);
                              const value = colIdx >= 0 ? row[colIdx] : undefined;
                              const isSelected =
                                selectedSampleDataCell?.columnName === col && selectedSampleDataCell?.rowIndex === rIdx;
                              const isSelectedCol = selectedSampleDataCell?.columnName === col;
                              return (
                                <td
                                  key={col}
                                  className={`px-2 py-1.5 whitespace-nowrap max-w-[120px] truncate cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-200 text-emerald-900 font-medium ring-1 ring-emerald-300'
                                      : isSelectedCol
                                        ? 'bg-emerald-50/80 text-gray-700'
                                        : 'text-gray-600 hover:bg-blue-50/50'
                                  }`}
                                  title={String(value ?? '')}
                                  onClick={() => {
                                    const same = selectedSampleDataCell?.columnName === col && selectedSampleDataCell?.rowIndex === rIdx;
                                    setSelectedSampleDataCell(same ? null : { columnName: col, rowIndex: rIdx });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      const same = selectedSampleDataCell?.columnName === col && selectedSampleDataCell?.rowIndex === rIdx;
                                      setSelectedSampleDataCell(same ? null : { columnName: col, rowIndex: rIdx });
                                    }
                                  }}
                                  tabIndex={0}
                                  role="gridcell"
                                  aria-selected={isSelected}
                                  aria-label={`${col}: ${value != null ? String(value) : 'empty'}`}
                                >
                                  {value != null ? String(value) : <span className="text-gray-300">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-2 py-1.5 bg-gray-50 text-[12px] text-gray-400 border-t border-gray-100 font-medium">
                    {sampleData.rows.length} row{sampleData.rows.length !== 1 ? 's' : ''} · {sampleData.source === 'uploaded' ? 'Uploaded' : sampleData.source === 'database' ? 'Live DB' : 'Generated'}
                  </div>
                </div>
              )}
              {!sampleDataLoading && !sampleDataError && (!sampleData || sampleData.rows.length === 0) && selectedTable && (
                <p className="text-[12px] text-gray-400 py-1 leading-relaxed">
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
            <p className="text-base text-gray-500 font-medium mb-1">Nothing selected</p>
            <p className="text-sm text-gray-400 max-w-[200px] leading-relaxed">Click a table on the canvas, then click a field to see its details and relationships.</p>
          </div>
        )}
      </div>
    </div>
  );
}
