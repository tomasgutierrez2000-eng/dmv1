'use client';

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

export default function Toolbar() {
  const {
    zoom,
    setZoom,
    resetView,
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

  const handleExport = async (format: 'png' | 'svg' | 'sql' | 'mermaid' | 'dbml') => {
    // TODO: Implement export functionality
    console.log(`Export as ${format}`);
  };

  return (
    <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        {/* Zoom Controls */}
        <button
          onClick={() => setZoom(zoom * 0.9)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-400 min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom * 1.1)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            // Fit to view - will be handled by canvas
            resetView();
          }}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Fit to View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {/* View Presets - Quick Access with Active State */}
        <div className="flex items-center gap-0.5 bg-gray-700/50 rounded-lg p-0.5">
          <button
            onClick={() => applyViewPreset('overview')}
            className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              viewMode === 'compact' && tableSize === 'small' && fieldDisplayMode === 'minimal'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
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
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
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
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
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
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
            title="Focus - Standard view (Standard + Medium + Standard)"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {/* View Mode */}
        <div className="relative">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm appearance-none pr-8"
            title="View detail level"
          >
            <option value="compact">Compact View</option>
            <option value="standard">Standard View</option>
            <option value="detailed">Detailed View</option>
          </select>
          <Eye className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {/* Table Size */}
        <div className="relative">
          <select
            value={tableSize}
            onChange={(e) => setTableSize(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm appearance-none pr-8"
            title="Table card size"
          >
            <option value="small">Small Tables</option>
            <option value="medium">Medium Tables</option>
            <option value="large">Large Tables</option>
          </select>
          <Grid3x3 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {/* Field Display Mode */}
        <div className="relative">
          <select
            value={fieldDisplayMode}
            onChange={(e) => setFieldDisplayMode(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm appearance-none pr-8"
            title="Field information level"
          >
            <option value="minimal">Minimal Fields</option>
            <option value="standard">Standard Fields</option>
            <option value="full">Full Fields</option>
          </select>
          <List className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {/* Relationship Visibility Controls */}
        <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-0.5">
          <button
            onClick={() => setShowRelationships(!showRelationships)}
            className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              showRelationships
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
            title="Toggle all relationships"
          >
            {showRelationships ? <GitBranch className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Relationships</span>
          </button>
          {showRelationships && (
            <>
              <div className="w-px h-4 bg-gray-600 mx-0.5" />
              <button
                onClick={() => setShowPrimaryRelationships(!showPrimaryRelationships)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                  showPrimaryRelationships
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-600'
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
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-600'
                }`}
                title="Toggle secondary relationships (derived/complex)"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Secondary</span>
              </button>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {/* Export */}
        <div className="relative">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleExport(e.target.value as any);
                e.target.value = '';
              }
            }}
            className="px-3 py-1.5 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm appearance-none pr-8"
            defaultValue=""
          >
            <option value="" disabled>
              Export...
            </option>
            <option value="png">PNG Image</option>
            <option value="svg">SVG Image</option>
            <option value="sql">SQL DDL</option>
            <option value="mermaid">Mermaid</option>
            <option value="dbml">dbdiagram.io</option>
          </select>
          <Download className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Minimap Toggle */}
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={`p-2 rounded transition-colors ${
            showMinimap
              ? 'text-blue-400 bg-blue-900/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title="Toggle Minimap"
        >
          <Map className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
