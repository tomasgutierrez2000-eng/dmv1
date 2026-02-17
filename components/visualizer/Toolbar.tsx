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
  FileText,
  Minimize2,
  Maximize,
  GitBranch,
  GitMerge,
  EyeOff,
  Keyboard,
  ChevronDown,
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
import { useToast } from '../ui/Toast';

type ExportFormat = 'png' | 'svg' | 'sql' | 'mermaid' | 'dbml' | 'schema-json' | 'schema-excel' | 'sample-L1' | 'sample-L2';

function ToolbarTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50 shadow-lg">
        {label}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-7 bg-gray-200 mx-1.5 flex-shrink-0" />;
}

function ToolbarIconButton({
  onClick,
  active,
  label,
  children,
  ariaPressed,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
  ariaPressed?: boolean;
}) {
  return (
    <ToolbarTooltip label={label}>
      <button
        onClick={onClick}
        className={`p-2 rounded-lg transition-all duration-150 ${
          active
            ? 'bg-blue-100 text-blue-700 shadow-inner'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
        aria-label={label}
        aria-pressed={ariaPressed}
      >
        {children}
      </button>
    </ToolbarTooltip>
  );
}

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
    layoutMode,
    setLayoutMode,
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

  const { toast } = useToast();
  const schemaFileRef = useRef<HTMLInputElement>(null);
  const sampleFileRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState<{ diff: ReturnType<typeof computeModelDiff>; importedModel: DataModel } | null>(null);
  const [sampleImportLayer, setSampleImportLayer] = useState<'L1' | 'L2'>('L1');
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setExportOpen(false);
    if (format === 'schema-json' || format === 'schema-excel') {
      if (!model) {
        toast({ type: 'warning', title: 'No model loaded', description: 'Load a data model first before exporting.' });
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
        toast({ type: 'success', title: 'Schema exported', description: 'JSON file downloaded.' });
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
        toast({ type: 'success', title: 'Schema exported', description: 'Excel file downloaded.' });
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
          toast({ type: 'warning', title: 'No sample data', description: `No sample data found for ${layer}.` });
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
        toast({ type: 'success', title: `${layer} sample data exported`, description: `${Object.keys(merged).length} tables exported.` });
      } catch (e) {
        console.error(e);
        toast({ type: 'error', title: 'Export failed', description: e instanceof Error ? e.message : 'Ensure sample data exists for this layer.' });
      }
      return;
    }
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
      toast({ type: 'error', title: 'Schema import failed', description: err instanceof Error ? err.message : 'Failed to parse schema file.' });
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
      toast({ type: 'success', title: `${layer} sample data imported`, description: `${Object.keys(bulk).length} table(s) loaded.` });
    } catch (err) {
      toast({ type: 'error', title: 'Import failed', description: err instanceof Error ? err.message : 'Failed to parse Excel file.' });
    }
  };

  const presets = [
    { key: 'overview' as const, label: 'Overview', icon: Eye, match: viewMode === 'compact' && tableSize === 'small' && fieldDisplayMode === 'minimal' },
    { key: 'detailed' as const, label: 'Detailed', icon: FileText, match: viewMode === 'detailed' && tableSize === 'large' && fieldDisplayMode === 'full' },
    { key: 'compact' as const, label: 'Compact', icon: Minimize2, match: viewMode === 'compact' && tableSize === 'small' && fieldDisplayMode === 'minimal' && zoom === 1 },
    { key: 'focus' as const, label: 'Focus', icon: Maximize, match: viewMode === 'standard' && tableSize === 'medium' && fieldDisplayMode === 'standard' },
  ];

  return (
    <>
      <input
        ref={schemaFileRef}
        type="file"
        accept=".json,.xlsx,.xls,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={onSchemaFileChange}
        aria-hidden="true"
      />
      <input
        ref={sampleFileRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={onSampleFileChange}
        aria-hidden="true"
      />
      {importModal && (
        <SchemaImportModal
          diff={importModal.diff}
          onApply={() => {
            setModel(importModal.importedModel);
            setImportModal(null);
            toast({ type: 'success', title: 'Schema applied', description: 'Data model updated from import.' });
          }}
          onClose={() => setImportModal(null)}
        />
      )}
      <div
        className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-3 shadow-sm flex-shrink-0"
        role="toolbar"
        aria-label="Visualizer toolbar"
      >
        {/* Left: Navigation + View controls */}
        <div className="flex items-center gap-1">
          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5" role="group" aria-label="Zoom controls">
            <ToolbarIconButton onClick={() => setZoom(zoom * 0.9)} label="Zoom out (-)">
              <ZoomOut className="w-4 h-4" />
            </ToolbarIconButton>
            <div
              className="text-xs font-medium text-gray-600 min-w-[48px] text-center tabular-nums select-none cursor-default"
              aria-label={`Zoom level: ${Math.round(zoom * 100)}%`}
              aria-live="polite"
            >
              {Math.round(zoom * 100)}%
            </div>
            <ToolbarIconButton onClick={() => setZoom(zoom * 1.1)} label="Zoom in (+)">
              <ZoomIn className="w-4 h-4" />
            </ToolbarIconButton>
            <ToolbarIconButton onClick={resetView} label="Reset zoom">
              <RotateCcw className="w-4 h-4" />
            </ToolbarIconButton>
            <ToolbarIconButton onClick={() => setRequestFitToView()} label="Fit to view (0)">
              <Maximize2 className="w-4 h-4" />
            </ToolbarIconButton>
          </div>

          <ToolbarDivider />

          {/* View Presets - Segmented control (Apple pattern) */}
          <div
            className="flex items-center bg-gray-100 rounded-lg p-0.5"
            role="group"
            aria-label="View presets"
          >
            {presets.map((p) => {
              const Icon = p.icon;
              return (
                <ToolbarTooltip key={p.key} label={`${p.label} preset`}>
                  <button
                    onClick={() => applyViewPreset(p.key)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5 ${
                      p.match
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-label={`${p.label} view preset`}
                    aria-pressed={p.match}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{p.label}</span>
                  </button>
                </ToolbarTooltip>
              );
            })}
          </div>

          <ToolbarDivider />

          {/* Layout mode */}
          <ToolbarTooltip label="Diagram layout">
            <select
              value={layoutMode}
              onChange={(e) => setLayoutMode(e.target.value as typeof layoutMode)}
              className="h-8 pl-2 pr-7 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-xs font-medium appearance-none cursor-pointer hover:bg-gray-100 transition-colors min-w-[8rem]"
              aria-label="Diagram layout"
            >
              <option value="domain-overview">Domain overview</option>
              <option value="snowflake">Snowflake</option>
            </select>
          </ToolbarTooltip>

          {/* Compact dropdowns for view settings */}
          <div className="flex items-center gap-1" role="group" aria-label="Display settings">
            <ToolbarTooltip label="View detail level">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
                className="h-8 px-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-xs font-medium appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
                aria-label="View detail level"
                style={{ paddingRight: '1.75rem' }}
              >
                <option value="compact">Compact</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </ToolbarTooltip>
            <ToolbarTooltip label="Table card size">
              <select
                value={tableSize}
                onChange={(e) => setTableSize(e.target.value as typeof tableSize)}
                className="h-8 px-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-xs font-medium appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
                aria-label="Table card size"
                style={{ paddingRight: '1.75rem' }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </ToolbarTooltip>
            <ToolbarTooltip label="Field display mode">
              <select
                value={fieldDisplayMode}
                onChange={(e) => setFieldDisplayMode(e.target.value as typeof fieldDisplayMode)}
                className="h-8 px-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-xs font-medium appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
                aria-label="Field display mode"
                style={{ paddingRight: '1.75rem' }}
              >
                <option value="minimal">Minimal</option>
                <option value="standard">Standard</option>
                <option value="full">Full</option>
              </select>
            </ToolbarTooltip>
          </div>

          <ToolbarDivider />

          {/* Relationship Controls - Segmented (Apple toggle pattern) */}
          <div
            className="flex items-center bg-gray-100 rounded-lg p-0.5"
            role="group"
            aria-label="Relationship visibility"
          >
            <ToolbarTooltip label={showRelationships ? 'Hide relationships' : 'Show relationships'}>
              <button
                onClick={() => setShowRelationships(!showRelationships)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5 ${
                  showRelationships
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                aria-label="Toggle relationships"
                aria-pressed={showRelationships}
              >
                {showRelationships ? <GitBranch className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden lg:inline">Rels</span>
              </button>
            </ToolbarTooltip>
            {showRelationships && (
              <>
                <div className="w-px h-5 bg-gray-200 mx-0.5" />
                <ToolbarTooltip label="Primary relationships (FK → PK)">
                  <button
                    onClick={() => setShowPrimaryRelationships(!showPrimaryRelationships)}
                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1 ${
                      showPrimaryRelationships
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-label="Toggle primary relationships"
                    aria-pressed={showPrimaryRelationships}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Primary</span>
                  </button>
                </ToolbarTooltip>
                <ToolbarTooltip label="Secondary relationships (derived)">
                  <button
                    onClick={() => setShowSecondaryRelationships(!showSecondaryRelationships)}
                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1 ${
                      showSecondaryRelationships
                        ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-label="Toggle secondary relationships"
                    aria-pressed={showSecondaryRelationships}
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Secondary</span>
                  </button>
                </ToolbarTooltip>
              </>
            )}
          </div>

          <ToolbarDivider />

          {/* Export & Import - Dropdown menus (Google Docs pattern) */}
          <div className="flex items-center gap-1" role="group" aria-label="Export and import">
            {/* Export dropdown */}
            <div className="relative">
              <ToolbarTooltip label="Export data model or sample data">
                <button
                  onClick={() => { setExportOpen(!exportOpen); setImportOpen(false); }}
                  className="h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                  aria-haspopup="true"
                  aria-expanded={exportOpen}
                  aria-label="Export"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </ToolbarTooltip>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden" role="menu">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Schema</div>
                    <button onClick={() => handleExport('schema-json')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">Data model (JSON)</button>
                    <button onClick={() => handleExport('schema-excel')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">Data model (Excel)</button>
                    <div className="h-px bg-gray-100 my-1" />
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sample Data</div>
                    <button onClick={() => handleExport('sample-L1')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">L1 sample data (Excel)</button>
                    <button onClick={() => handleExport('sample-L2')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">L2 sample data (Excel)</button>
                  </div>
                </>
              )}
            </div>

            {/* Import dropdown */}
            <div className="relative">
              <ToolbarTooltip label="Import schema or sample data">
                <button
                  onClick={() => { setImportOpen(!importOpen); setExportOpen(false); }}
                  className="h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                  aria-haspopup="true"
                  aria-expanded={importOpen}
                  aria-label="Import"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Import</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </ToolbarTooltip>
              {importOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setImportOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden" role="menu">
                    <button onClick={() => { setImportOpen(false); schemaFileRef.current?.click(); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">Import schema (JSON/Excel)</button>
                    <div className="h-px bg-gray-100 my-1" />
                    <button onClick={() => { setImportOpen(false); setSampleImportLayer('L1'); sampleFileRef.current?.click(); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">Import L1 sample data</button>
                    <button onClick={() => { setImportOpen(false); setSampleImportLayer('L2'); sampleFileRef.current?.click(); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" role="menuitem">Import L2 sample data</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Utility controls */}
        <div className="flex items-center gap-0.5">
          <ToolbarIconButton onClick={() => setShowMinimap(!showMinimap)} active={showMinimap} label="Toggle minimap" ariaPressed={showMinimap}>
            <Map className="w-4 h-4" />
          </ToolbarIconButton>
          <ToolbarIconButton onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </ToolbarIconButton>
          <ToolbarTooltip label="Keyboard shortcuts (?)">
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Show keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </ToolbarTooltip>
        </div>
      </div>
    </>
  );
}
