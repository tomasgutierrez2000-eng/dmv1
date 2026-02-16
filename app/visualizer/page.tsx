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
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Canvas Area */}
        <div className="flex-1 relative">
          {!model && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-md w-full p-8">
                <div className="mb-6 p-4 bg-gray-800/80 border border-gray-600 rounded-lg">
                  <p className="text-sm text-gray-300 mb-3">View L1 schema and sample data (no upload required):</p>
                  <button
                    type="button"
                    onClick={loadL1Demo}
                    disabled={demoLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm"
                  >
                    {demoLoading ? 'Loading…' : 'Load L1 demo (78 tables)'}
                  </button>
                </div>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  currentFile={null}
                />
                {result?.error && (
                  <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-400 mb-1">Parse Error</h3>
                        <p className="text-sm text-red-300">{result.error}</p>
                      </div>
                    </div>
                  </div>
                )}
                {result?.statistics && (
                  <div className="mt-4 bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <h3 className="font-semibold text-green-400 mb-2">Parse Successful!</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Tables:</span>{' '}
                        <span className="text-white font-bold">{result.statistics.tables}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Fields:</span>{' '}
                        <span className="text-white font-bold">{result.statistics.fields}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Relationships:</span>{' '}
                        <span className="text-white font-bold">{result.statistics.relationships}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Categories:</span>{' '}
                        <span className="text-white font-bold">{result.statistics.categories}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-gray-400">Parsing Excel file...</p>
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
