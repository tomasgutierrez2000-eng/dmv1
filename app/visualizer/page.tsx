'use client';

import { useEffect, useState } from 'react';
import { useModelStore } from '../../store/modelStore';
import { useExcelParser } from '../../hooks/useExcelParser';
import FileUpload from '../../components/visualizer/FileUpload';
import Canvas from '../../components/visualizer/Canvas';
import Sidebar from '../../components/visualizer/Sidebar';
import DetailPanel from '../../components/visualizer/DetailPanel';
import Toolbar from '../../components/visualizer/Toolbar';
import Minimap from '../../components/visualizer/Minimap';
import { Loader, AlertCircle } from 'lucide-react';
import type { DataModel } from '../../types/model';

export default function VisualizerPage() {
  const { model, setModel, setTablePositions, layoutMode, tablePositions, tableSize, visibleLayers } = useModelStore();
  const { parseExcel, loading, result } = useExcelParser();
  const [initialLoad, setInitialLoad] = useState(true);

  // Try to load from data dictionary on mount
  useEffect(() => {
    const loadFromDictionary = async () => {
      try {
        const response = await fetch('/api/data-dictionary');
        if (response.ok) {
          const dataDict = await response.json();
          // Convert data dictionary to DataModel format
          // This is a simplified conversion - you may need to adjust based on your data dictionary structure
          // For now, we'll just try to parse from Excel if dictionary exists
        }
      } catch (error) {
        // No data dictionary found, that's okay
      }
      setInitialLoad(false);
    };
    loadFromDictionary();
  }, []);

  useEffect(() => {
    if (result?.model) {
      setModel(result.model);
      // Apply initial layout only if positions don't exist
      const { calculateLayout } = require('../../utils/layoutEngine');
      const existingPositions = tablePositions;
      const positions = calculateLayout(result.model, layoutMode, existingPositions, undefined, tableSize, visibleLayers);
      Object.entries(positions).forEach(([key, pos]) => {
        if (!existingPositions[key]) {
          setTablePositions(key, pos as any);
        }
      });
    }
  }, [result, setModel, setTablePositions, layoutMode, tablePositions, tableSize, visibleLayers]);

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
      const positions = calculateLayout(model, layoutMode, tablePositions, undefined, tableSize, visibleLayers);
      Object.entries(positions).forEach(([key, pos]) => {
        if (!tablePositions[key]) {
          setTablePositions(key, pos as any);
        }
      });
    } catch (e) {
      console.error('Load L1 demo failed:', e);
      alert(e instanceof Error ? e.message : 'Failed to load L1 demo');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 text-gray-900 overflow-hidden">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Canvas Area */}
        <div className="flex-1 relative">
          {!model && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-2xl w-full">
                <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-md">
                  <p className="text-lg text-gray-700 mb-4">View L1 banking data schema and sample data (no upload required):</p>
                  <button
                    type="button"
                    onClick={loadL1Demo}
                    disabled={demoLoading}
                    className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-base"
                  >
                    {demoLoading ? 'Loading…' : 'Load L1 bank data demo (78 tables)'}
                  </button>
                </div>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  currentFile={null}
                />
                {result?.error && (
                  <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-start space-x-4">
                      <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-800 mb-1 text-base">Parse Error</h3>
                        <p className="text-base text-red-700">{result.error}</p>
                      </div>
                    </div>
                  </div>
                )}
                {result?.statistics && (
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5">
                    <h3 className="font-semibold text-green-800 mb-3 text-base">Parse successful</h3>
                    <div className="grid grid-cols-2 gap-3 text-base text-gray-700">
                      <div><span className="text-gray-500">Tables:</span> <span className="font-bold">{result.statistics.tables}</span></div>
                      <div><span className="text-gray-500">Fields:</span> <span className="font-bold">{result.statistics.fields}</span></div>
                      <div><span className="text-gray-500">Relationships:</span> <span className="font-bold">{result.statistics.relationships}</span></div>
                      <div><span className="text-gray-500">Categories:</span> <span className="font-bold">{result.statistics.categories}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90">
              <div className="text-center">
                <Loader className="w-12 h-12 animate-spin mx-auto mb-5 text-blue-600" />
                <p className="text-lg text-gray-600 font-medium">Parsing Excel file…</p>
              </div>
            </div>
          )}

          {model && <Canvas />}
          <Minimap />
        </div>

        {/* Detail Panel */}
        <DetailPanel />
      </div>
    </div>
  );
}
