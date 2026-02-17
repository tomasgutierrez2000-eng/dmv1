'use client';

import { useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Upload,
  Map,
  Moon,
  Sun,
  Eye,
  Grid3x3,
  Layers,
  List,
  FileText,
  Minimize2,
  Maximize,
  GitBranch,
  GitMerge,
  EyeOff,
} from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { modelToSchemaExport } from '../../utils/schemaExport';
import { schemaExportToModel } from '../../utils/schemaExport';
import { schemaToFieldsSheetData, schemaToRelationshipsSheetData } from '../../utils/schemaExportExcel';
import { parseSchemaFromWorkbook } from '../../utils/schemaExportExcel';
import { computeModelDiff } from '../../utils/modelDiff';
import type { DataModel } from '../../types/model';
import type { SchemaExport } from '../../types/schemaExport';
import SchemaImportModal from './SchemaImportModal';

type ExportFormat = 'png' | 'svg' | 'sql' | 'mermaid' | 'dbml' | 'schema-json' | 'schema-excel' | 'sample-L1' | 'sample-L2';

export default function Toolbar() {
  const {
    model,
    setModel,
    uploadedSampleData,
    setUploadedSampleDataBulk,
    zoom,
    setZoom,
    resetView,
    setRequestFitToView,
    viewMode,
    setViewMode,
    tableSize,
    setTableSize,
    fieldDisplayMode,
    setFieldDisplayMode,
    applyViewPreset,
    showMinimap,
    setShowMinimap,
    theme,
    setTheme,
    showRelationships,
    setShowRelationships,
    showPrimaryRelationships,
    setShowPrimaryRelationships,
    showSecondaryRelationships,
    setShowSecondaryRelationships,
  } = useModelStore();

  const schemaFileRef = useRef<HTMLInputElement>(null);
  const sampleFileRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState<{ diff: ReturnType<typeof computeModelDiff>; importedModel: DataModel } | null>(null);
  const [sampleImportLayer, setSampleImportLayer] = useState<'L1' | 'L2'>('L1');

  const handleExport = async (format: ExportFormat) => {
    if (format === 'schema-json' || format === 'schema-excel') {
      if (!model) {
        alert('Load a data model first.');
        return;
      }
      const exported = modelToSchemaExport(model);
      if (format === 'schema-json') {
        const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `data-model-schema-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const fieldsData = schemaToFieldsSheetData(exported);
        const relData = schemaToRelationshipsSheetData(exported);
        const wsFields = XLSX.utils.aoa_to_sheet(fieldsData);
        const wsRels = XLSX.utils.aoa_to_sheet(relData);
        XLSX.utils.book_append_sheet(wb, wsFields, 'Fields');
        XLSX.utils.book_append_sheet(wb, wsRels, 'Relationships');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `data-model-schema-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      return;
    }
    if (format === 'sample-L1' || format === 'sample-L2') {
      const layer = format === 'sample-L1' ? 'L1' : 'L2';
      try {
        const res = await fetch(`/api/sample-data/layer/${layer}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
        const fileData = (await res.json()) as Record<string, { columns: string[]; rows: unknown[][] }>;
        const merged: Record<string, { columns: string[]; rows: unknown[][] }> = { ...fileData };
        const prefix = `${layer}.`;
        for (const [key, data] of Object.entries(uploadedSampleData)) {
          if (key.startsWith(prefix)) merged[key] = data;
        }
        if (Object.keys(merged).length === 0) {
          alert('No sample data for this layer.');
          return;
        }
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        for (const [tableKey, { columns, rows }] of Object.entries(merged)) {
          const sheetName = tableKey.replace(`${layer}.`, '').slice(0, 31);
          const wsData = [columns, ...rows];
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sample-data-${layer}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : 'Export failed. Ensure sample data exists for this layer.');
      }
      return;
    }
    // TODO: png, svg, sql, mermaid, dbml
    console.log(`Export as ${format}`);
  };

  const onSchemaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      let parsed: SchemaExport;
      const name = (file.name || '').toLowerCase();
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buf = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const wb = XLSX.read(buf, { type: 'array' });
        const getSheet = (sheetName: string) => {
          const ws = wb.Sheets[sheetName];
          if (!ws) return null;
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
          return { data };
        };
        parsed = parseSchemaFromWorkbook(getSheet);
      } else {
        const text = await file.text();
        parsed = JSON.parse(text) as SchemaExport;
        if (!parsed.fields || !Array.isArray(parsed.relationships)) {
          throw new Error('Invalid schema file: expected fields and relationships arrays.');
        }
      }
      const importedModel = schemaExportToModel(parsed);
      const diff = computeModelDiff(model, importedModel);
      setImportModal({ diff, importedModel });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to parse schema file.');
    }
  };

  const onSampleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'array' });
      const layer = sampleImportLayer;
      const prefix = `${layer}.`;
      const bulk: Record<string, { columns: string[]; rows: unknown[][] }> = {};
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
        if (json.length < 1) continue;
        const columns = (json[0] as unknown[]).map((c) => String(c ?? '').trim());
        const rows = json.slice(1).map((row) => columns.map((_, i) => (row as unknown[])[i] ?? null));
        const tableKey = `${prefix}${sheetName}`;
        bulk[tableKey] = { columns, rows };
      }
      setUploadedSampleDataBulk({ ...uploadedSampleData, ...bulk });
      alert(`Imported sample data for ${Object.keys(bulk).length} table(s) in ${layer}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to parse Excel file.');
    }
  };

  return (
    <>
      <input
        ref={schemaFileRef}
        type="file"
        accept=".json,.xlsx,.xls,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={onSchemaFileChange}
      />
      <input
        ref={sampleFileRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={onSampleFileChange}
      />
      {importModal && (
        <SchemaImportModal
          diff={importModal.diff}
          onApply={() => {
            setModel(importModal.importedModel);
            setImportModal(null);
          }}
          onClose={() => setImportModal(null)}
        />
      )}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center space-x-2">
        {/* Zoom Controls */}
        <button
          onClick={() => setZoom(zoom * 0.9)}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom * 1.1)}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setRequestFitToView()}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Fit to View (fits visible tables and zooms in when filtered)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* View Presets - Quick Access with Active State */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => applyViewPreset('overview')}
            className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              viewMode === 'compact' && tableSize === 'small' && fieldDisplayMode === 'minimal'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Overview - See everything at once (Compact + Small + Minimal)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </button>
          <button
            onClick={() => applyViewPreset('detailed')}
            className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              viewMode === 'detailed' && tableSize === 'large' && fieldDisplayMode === 'full'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Detailed - Full information (Detailed + Large + Full)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Detailed</span>
          </button>
          <button
            onClick={() => applyViewPreset('compact')}
            className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              viewMode === 'compact' && tableSize === 'small' && fieldDisplayMode === 'minimal' && zoom === 1
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Compact - Minimal view (Compact + Small + Minimal)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compact</span>
          </button>
          <button
            onClick={() => applyViewPreset('focus')}
            className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              viewMode === 'standard' && tableSize === 'medium' && fieldDisplayMode === 'standard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Focus - Standard view (Standard + Medium + Standard)"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* View Mode */}
        <div className="relative">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-1.5 bg-white text-gray-800 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-sm appearance-none pr-8"
            title="View detail level"
          >
            <option value="compact">Compact View</option>
            <option value="standard">Standard View</option>
            <option value="detailed">Detailed View</option>
          </select>
          <Eye className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* Table Size */}
        <div className="relative">
          <select
            value={tableSize}
            onChange={(e) => setTableSize(e.target.value as any)}
            className="px-3 py-1.5 bg-white text-gray-800 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-sm appearance-none pr-8"
            title="Table card size"
          >
            <option value="small">Small Tables</option>
            <option value="medium">Medium Tables</option>
            <option value="large">Large Tables</option>
          </select>
          <Grid3x3 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* Field Display Mode */}
        <div className="relative">
          <select
            value={fieldDisplayMode}
            onChange={(e) => setFieldDisplayMode(e.target.value as any)}
            className="px-3 py-1.5 bg-white text-gray-800 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-sm appearance-none pr-8"
            title="Field information level"
          >
            <option value="minimal">Minimal Fields</option>
            <option value="standard">Standard Fields</option>
            <option value="full">Full Fields</option>
          </select>
          <List className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="w-px h-6 bg-pwc-gray mx-2" />

        {/* Relationship Visibility Controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setShowRelationships(!showRelationships)}
            className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              showRelationships
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Toggle all relationships"
          >
            {showRelationships ? <GitBranch className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Relationships</span>
          </button>
          {showRelationships && (
            <>
              <div className="w-px h-4 bg-gray-200 mx-0.5" />
              <button
                onClick={() => setShowPrimaryRelationships(!showPrimaryRelationships)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                  showPrimaryRelationships
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
                title="Toggle primary relationships (direct FK->PK)"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Primary</span>
              </button>
              <button
                onClick={() => setShowSecondaryRelationships(!showSecondaryRelationships)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                  showSecondaryRelationships
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
                title="Toggle secondary relationships (derived/complex)"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Secondary</span>
              </button>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* Export */}
        <div className="relative">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleExport(e.target.value as ExportFormat);
                e.target.value = '';
              }
            }}
            className="px-3 py-1.5 bg-white text-gray-800 rounded border border-gray-300 focus:border-blue-500 focus:outline-none text-sm appearance-none pr-8"
            defaultValue=""
          >
            <option value="" disabled>
              Export...
            </option>
            <option value="schema-json">Data model (JSON)</option>
            <option value="schema-excel">Data model (Excel)</option>
            <option value="sample-L1">Sample data L1 (Excel)</option>
            <option value="sample-L2">Sample data L2 (Excel)</option>
            <option value="png">PNG Image</option>
            <option value="svg">SVG Image</option>
            <option value="sql">SQL DDL</option>
            <option value="mermaid">Mermaid</option>
            <option value="dbml">dbdiagram.io</option>
          </select>
          <Download className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Import */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => schemaFileRef.current?.click()}
            className="px-2 py-1.5 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            title="Import data model (JSON). See changes for SQL and visualization."
          >
            Import schema
          </button>
          <button
            type="button"
            onClick={() => {
              setSampleImportLayer('L1');
              sampleFileRef.current?.click();
            }}
            className="px-2 py-1.5 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            title="Import sample data Excel for L1 (one sheet per table)"
          >
            Import sample L1
          </button>
          <button
            type="button"
            onClick={() => {
              setSampleImportLayer('L2');
              sampleFileRef.current?.click();
            }}
            className="px-2 py-1.5 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            title="Import sample data Excel for L2 (one sheet per table)"
          >
            Import sample L2
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Minimap Toggle */}
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={`p-2 rounded transition-colors ${
            showMinimap
              ? 'text-blue-600 bg-blue-100'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Toggle Minimap"
        >
          <Map className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
    </>
  );
}
