'use client';

import { useEffect, useState, useCallback } from 'react';
import { useModelStore } from '../../store/modelStore';
import { useExcelParser } from '../../hooks/useExcelParser';
import FileUpload from '../../components/visualizer/FileUpload';
import Canvas from '../../components/visualizer/Canvas';
import Sidebar from '../../components/visualizer/Sidebar';
import DetailPanel from '../../components/visualizer/DetailPanel';
import Toolbar from '../../components/visualizer/Toolbar';
import Minimap from '../../components/visualizer/Minimap';
import KeyboardShortcutsPanel from '../../components/visualizer/KeyboardShortcutsPanel';
import L3SampleDataStrip from '../../components/visualizer/L3SampleDataStrip';
import VisualizerTour from '../../components/visualizer/VisualizerTour';
import { getTourCompleted } from '../../components/visualizer/VisualizerTour';
import { Loader, AlertCircle, Database, ArrowRight } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import type { DataModel } from '../../types/model';

export default function VisualizerPage() {
  const { model, setModel, setTablePositionsBulk, setTablePositionsReplace, setSidebarOpen, layoutMode, tableSize, visibleLayers, viewMode } = useModelStore();
  const [, forceUpdate] = useState(0);
  const tourClosed = useCallback(() => forceUpdate((n) => n + 1), []);
  const tourOpenSidebar = useCallback(() => setSidebarOpen(true), [setSidebarOpen]);
  const { parseExcel, loading, result } = useExcelParser();
  const { toast } = useToast();

  useEffect(() => {
    if (result?.model) {
      setModel(result.model);
      const { calculateLayout } = require('../../utils/layoutEngine');
      const compactOverview = (layoutMode === 'domain-overview' || layoutMode === 'snowflake') && viewMode === 'compact';
      const positions = calculateLayout(result.model, layoutMode, {}, undefined, tableSize, visibleLayers, compactOverview);
      const isOverview = layoutMode === 'domain-overview' || layoutMode === 'snowflake';
      if (isOverview) setTablePositionsReplace(positions);
      else setTablePositionsBulk(positions);
    }
  }, [result, setModel, setTablePositionsBulk, setTablePositionsReplace, layoutMode, tableSize, visibleLayers, viewMode]);

  const handleFileSelect = async (file: File | null) => {
    if (file) {
      await parseExcel(file);
    } else {
      setModel(null);
    }
  };

  const [demoLoading, setDemoLoading] = useState(false);
  const loadL1Demo = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/l1-demo-model');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const model = (await res.json()) as DataModel;
      setModel(model);
      const { calculateLayout } = require('../../utils/layoutEngine');
      const compactOverview = (layoutMode === 'domain-overview' || layoutMode === 'snowflake') && viewMode === 'compact';
      const positions = calculateLayout(model, layoutMode, {}, undefined, tableSize, visibleLayers, compactOverview);
      const isOverview = layoutMode === 'domain-overview' || layoutMode === 'snowflake';
      if (isOverview) setTablePositionsReplace(positions);
      else setTablePositionsBulk(positions);
      toast({ type: 'success', title: 'Demo loaded', description: `${Object.keys(model.tables).length} tables loaded.` });
    } catch (e) {
      console.error('Load L1 demo failed:', e);
      toast({ type: 'error', title: 'Failed to load demo', description: e instanceof Error ? e.message : 'Unknown error.' });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Canvas Area: main diagram + L3 sample data strip when an L3 table is selected */}
        <div className="flex-1 flex flex-col relative min-h-0">
          {!model && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
              <div className="max-w-lg w-full">
                {/* Hero empty state - Apple/Google clean design */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
                    <Database className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Get started</h2>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Load a demo dataset to explore the banking data model, or upload your own data dictionary.
                  </p>
                </div>

                {/* Primary CTA - Load demo */}
                <button
                  type="button"
                  onClick={loadL1Demo}
                  disabled={demoLoading}
                  aria-busy={demoLoading}
                  aria-label={demoLoading ? 'Loading demo data' : 'Load L1 bank data demo (78 tables)'}
                  className="w-full mb-4 py-3.5 px-6 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {demoLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Loading demo data…</span>
                    </>
                  ) : (
                    <>
                      <span>Load L1 bank data demo (78 tables)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Secondary: File upload */}
                <div className="relative">
                  <div className="absolute inset-x-0 -top-px h-px bg-gray-200" />
                  <p className="text-center text-xs text-gray-400 my-4 uppercase tracking-wider font-medium">or upload your own</p>
                </div>

                <FileUpload
                  onFileSelect={handleFileSelect}
                  currentFile={null}
                />

                {/* Inline feedback */}
                {result?.error && (
                  <div className="mt-5 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3" role="alert">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800 text-sm">Parse error</p>
                      <p className="text-sm text-red-600 mt-0.5">{result.error}</p>
                    </div>
                  </div>
                )}
                {result?.statistics && (
                  <div className="mt-5 bg-emerald-50 border border-emerald-100 rounded-xl p-4" role="status">
                    <p className="font-medium text-emerald-800 text-sm mb-2">Parsed successfully</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Tables', value: result.statistics.tables },
                        { label: 'Fields', value: result.statistics.fields },
                        { label: 'Relationships', value: result.statistics.relationships },
                        { label: 'Categories', value: result.statistics.categories },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center justify-between text-sm">
                          <span className="text-emerald-600">{s.label}</span>
                          <span className="font-semibold text-emerald-800">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading overlay with skeleton feel */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 backdrop-blur-sm" role="status" aria-live="polite">
              <div className="text-center">
                <Loader className="w-10 h-10 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 font-medium">Parsing Excel file…</p>
                <p className="text-xs text-gray-400 mt-1">This may take a moment for large files</p>
              </div>
            </div>
          )}

          <div className="flex-1 relative min-h-0">
            {model && <Canvas />}
            <Minimap />
          </div>
          {model && <L3SampleDataStrip />}
        </div>

        {/* Detail Panel */}
        <DetailPanel />
      </div>

      {/* Keyboard shortcuts panel - toggled with ? key */}
      <KeyboardShortcutsPanel />

      {/* First-time tour - only when model is loaded and tour not completed */}
      <VisualizerTour
        active={Boolean(model) && !getTourCompleted()}
        onClose={tourClosed}
        onStart={tourOpenSidebar}
      />
    </div>
  );
}
