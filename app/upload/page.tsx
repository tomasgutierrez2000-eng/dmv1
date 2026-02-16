'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader, Database, Link2 } from 'lucide-react';
import Link from 'next/link';

interface UploadResult {
  success: boolean;
  message: string;
  details?: {
    statistics?: {
      L1_tables: number;
      L2_tables: number;
      L3_tables: number;
      total_relationships: number;
      derivation_dependencies: number;
      L1_fields: number;
      L2_fields: number;
      L3_fields: number;
    };
    tables?: {
      L1: Array<{ name: string; fields: number; category: string }>;
      L2: Array<{ name: string; fields: number; category: string }>;
      L3: Array<{ name: string; fields: number; category: string }>;
    };
    relationships?: number;
    derivation_dag?: Record<string, string[]>;
    errors?: string[];
    warnings?: string[];
  };
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
      } else {
        setResult({
          success: false,
          message: 'Please upload an Excel file (.xlsx or .xls)',
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb', color: '#111827' }}>
      <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>Data Dictionary Parser</h1>
              <p className="mt-2 text-sm" style={{ color: '#4b5563' }}>
                Upload Excel workbook with L1, L2, L3 sheets to parse data model schema
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href="/data-model"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-2"
              >
                <Database className="w-4 h-4" />
                <span>View Data Model</span>
              </Link>
              <Link
                href="/visualizer"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center space-x-2"
              >
                <Link2 className="w-4 h-4" />
                <span>Interactive Visualizer</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            {file ? (
              <div>
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="text-lg font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  Drag and drop your Excel workbook here
                </p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                  <Upload className="w-5 h-5 inline mr-2" />
                  Choose File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-4">
                  Supports .xlsx and .xls formats
                </p>
              </div>
            )}
          </div>

          {/* Upload Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Excel Workbook Format Requirements</span>
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Required Sheets:</strong> L1, L2 (exact names). <strong>L3 is optional.</strong></li>
              <li><strong>L1 Sheet:</strong> Columns A-F (uni, Table Name, Data Element, Description, Why Required, PK/FK Mapping)</li>
              <li><strong>L2 Sheet:</strong> Columns A-G (Table Category, Table Name, Data Element, Description, Why Required, PK/FK Mapping, Simplification Note)</li>
              <li><strong>L3 Sheet:</strong> Columns A-K (Derived Category, Derived Table/View, Derived Field, Data Type, Formula, Source Tables, Source Fields, Derivation Logic, Dashboard Usage, Grain, Notes)</li>
              <li>First row must contain column headers</li>
              <li>Parser extracts table definitions, fields, PK/FK relationships, and derivation formulas</li>
            </ul>
          </div>

          {/* Upload Button */}
          {file && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Parse Data Dictionary</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div
              className={`mt-6 rounded-lg p-6 border-2 ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-2 ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {result.success ? 'Parsing Successful!' : 'Parsing Failed'}
                  </h3>
                  <p
                    className={`text-sm mb-4 ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {result.message}
                  </p>

                  {result.details && (
                    <div className="mt-4 space-y-4">
                      {/* Statistics */}
                      {result.details.statistics && (
                        <div className="bg-white rounded border border-gray-300 p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center space-x-2">
                            <Database className="w-4 h-4" />
                            <span>Parsing Statistics</span>
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">L1 Tables</div>
                              <div className="font-bold text-blue-600">{result.details.statistics.L1_tables}</div>
                              <div className="text-xs text-gray-500">{result.details.statistics.L1_fields} fields</div>
                            </div>
                            <div>
                              <div className="text-gray-600">L2 Tables</div>
                              <div className="font-bold text-green-600">{result.details.statistics.L2_tables}</div>
                              <div className="text-xs text-gray-500">{result.details.statistics.L2_fields} fields</div>
                            </div>
                            <div>
                              <div className="text-gray-600">L3 Tables</div>
                              <div className="font-bold text-purple-600">{result.details.statistics.L3_tables}</div>
                              <div className="text-xs text-gray-500">{result.details.statistics.L3_fields} fields</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Relationships</div>
                              <div className="font-bold text-gray-700">{result.details.statistics.total_relationships}</div>
                              <div className="text-xs text-gray-500">{result.details.statistics.derivation_dependencies} derivations</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tables by Layer */}
                      {result.details.tables && (
                        <div className="space-y-4">
                          {(['L1', 'L2', 'L3'] as const).map((layer) => {
                            const tables = result.details!.tables![layer];
                            if (tables.length === 0) return null;

                            const colors = {
                              L1: 'bg-blue-50 border-blue-200 text-blue-900',
                              L2: 'bg-green-50 border-green-200 text-green-900',
                              L3: 'bg-purple-50 border-purple-200 text-purple-900',
                            };

                            return (
                              <div key={layer} className={`rounded border p-4 ${colors[layer]}`}>
                                <h4 className="font-semibold mb-3">{layer} Tables ({tables.length})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                  {tables.map((table) => (
                                    <div key={table.name} className="bg-white rounded p-2 text-xs">
                                      <div className="font-mono font-semibold">{table.name}</div>
                                      <div className="text-gray-600">{table.fields} fields</div>
                                      <div className="text-gray-500 italic">{table.category}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Derivation DAG */}
                      {result.details.derivation_dag && Object.keys(result.details.derivation_dag).length > 0 && (
                        <div className="bg-white rounded border border-gray-300 p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center space-x-2">
                            <Link2 className="w-4 h-4" />
                            <span>Derivation Dependencies (L3)</span>
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {Object.entries(result.details.derivation_dag).map(([table, deps]) => (
                              <div key={table} className="text-sm">
                                <span className="font-mono font-semibold">{table}</span>
                                <span className="text-gray-500"> depends on: </span>
                                <span className="text-gray-700">{deps.join(', ')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Errors */}
                      {result.details.errors && result.details.errors.length > 0 && (
                        <div className="bg-red-50 rounded border border-red-300 p-4">
                          <h4 className="font-semibold text-sm mb-2 text-red-900">Errors:</h4>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {result.details.errors.map((error, idx) => (
                              <div key={idx} className="text-sm text-red-800">
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {result.details.warnings && result.details.warnings.length > 0 && (
                        <div className="bg-yellow-50 rounded border border-yellow-300 p-4">
                          <h4 className="font-semibold text-sm mb-2 text-yellow-900">Warnings:</h4>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {result.details.warnings.map((warning, idx) => (
                              <div key={idx} className="text-sm text-yellow-800">
                                {warning}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Output Location */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Output Location</h3>
            <p className="text-sm text-gray-700">
              Parsed data dictionary is saved to:
            </p>
            <code className="block mt-2 p-2 bg-white rounded border border-gray-300 text-xs">
              facility-summary-mvp/output/data-dictionary/data-dictionary.json
            </code>
            <p className="text-xs text-gray-600 mt-2">
              This file contains the complete data model schema, relationships, and derivation dependencies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
