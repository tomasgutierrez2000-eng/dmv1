'use client';

import { useState, useMemo, useEffect } from 'react';
import { Database, Key, Link2, ChevronRight, ChevronDown, Layers, Search, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface FieldDefinition {
  name: string;
  description: string;
  category: string;
  pk_fk?: {
    is_pk: boolean;
    is_composite: boolean;
    fk_target?: {
      layer: string;
      table: string;
      field: string;
    };
  };
  why_required?: string;
  simplification_note?: string;
  data_type?: string;
  formula?: string;
  source_tables?: Array<{ layer: string; table: string }>;
  source_fields?: string;
  dashboard_usage?: string;
  grain?: string;
  notes?: string;
}

interface ParsedTableDefinition {
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: FieldDefinition[];
}

interface DataDictionary {
  L1: ParsedTableDefinition[];
  L2: ParsedTableDefinition[];
  L3: ParsedTableDefinition[];
  relationships: Array<{
    from_table: string;
    from_field: string;
    to_table: string;
    to_field: string;
    from_layer: string;
    to_layer: string;
  }>;
  derivation_dag: Record<string, string[]>;
}

interface TableDefinition {
  id: string;
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  fields: string[];
  primaryKey: string;
  foreignKeys: { field: string; references: string; table: string }[];
  description?: string;
  category?: string;
}

const layerColors = {
  L1: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', badge: 'bg-blue-100 text-blue-800' },
  L2: { bg: '#dcfce7', border: '#22c55e', text: '#166534', badge: 'bg-green-100 text-green-800' },
  L3: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8', badge: 'bg-purple-100 text-purple-800' },
};

// Transform parsed data dictionary to visualization format
const transformDataDictionary = (dataDict: DataDictionary): TableDefinition[] => {
  const tables: TableDefinition[] = [];
  const allTables = [...dataDict.L1, ...dataDict.L2, ...dataDict.L3];

  allTables.forEach((table) => {
    // Extract primary key fields
    const pkFields = table.fields
      .filter((f) => f.pk_fk?.is_pk)
      .map((f) => f.name);
    const primaryKey = pkFields.length > 0 ? pkFields.join(', ') : 'N/A';

    // Extract foreign keys from relationships
    const foreignKeys = dataDict.relationships
      .filter((rel) => rel.from_table === table.name)
      .map((rel) => ({
        field: rel.from_field,
        references: rel.to_field,
        table: rel.to_table,
      }));

    // Get all field names
    const fieldNames = table.fields.map((f) => {
      let name = f.name;
      if (f.pk_fk?.is_pk) name += ' (PK)';
      if (f.pk_fk?.fk_target) name += ' (FK)';
      return name;
    });

    // Get description from first field or table category
    const description = table.fields[0]?.description || table.category || '';

    tables.push({
      id: table.name,
      name: table.name,
      layer: table.layer,
      fields: fieldNames,
      primaryKey,
      foreignKeys,
      description,
      category: table.category,
    });
  });

  return tables;
};

export default function DataModelPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Set<'L1' | 'L2' | 'L3'>>(new Set(['L1', 'L2', 'L3']));
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'layers' | 'relationships'>('layers');
  const [tableDefinitions, setTableDefinitions] = useState<TableDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataDictionary, setDataDictionary] = useState<DataDictionary | null>(null);

  useEffect(() => {
    loadDataDictionary();
  }, []);

  const loadDataDictionary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data-dictionary');
      if (!response.ok) {
        if (response.status === 404) {
          setError('No data dictionary found. Please upload and parse an Excel file first.');
        } else {
          setError('Failed to load data dictionary');
        }
        setLoading(false);
        return;
      }

      const data: DataDictionary = await response.json();
      setDataDictionary(data);
      const transformed = transformDataDictionary(data);
      setTableDefinitions(transformed);
      setError(null);
    } catch (err) {
      setError('Error loading data dictionary');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = useMemo(() => {
    if (!searchQuery) return tableDefinitions;
    const query = searchQuery.toLowerCase();
    return tableDefinitions.filter(
      (table) =>
        table.name.toLowerCase().includes(query) ||
        table.description?.toLowerCase().includes(query) ||
        table.fields.some((f) => f.toLowerCase().includes(query))
    );
  }, [searchQuery, tableDefinitions]);

  const tablesByLayer = useMemo(() => {
    const grouped = { L1: [] as TableDefinition[], L2: [] as TableDefinition[], L3: [] as TableDefinition[] };
    filteredTables.forEach((table) => {
      grouped[table.layer].push(table);
    });
    return grouped;
  }, [filteredTables]);

  const toggleLayer = (layer: 'L1' | 'L2' | 'L3') => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const selectedTableData = tableDefinitions.find((t) => t.id === selectedTable);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading data model...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f9fafb', color: '#111827' }}>
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>Data Model</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">No Data Dictionary Found</h3>
                <p className="text-yellow-800 mb-4">{error}</p>
                <Link
                  href="/upload"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Upload Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb', color: '#111827' }}>
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>Data Model</h1>
              <p className="mt-2 text-sm" style={{ color: '#4b5563' }}>
                {tableDefinitions.length} tables from parsed Excel workbook
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadDataDictionary}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm flex items-center space-x-2"
                title="Refresh data model"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <div className="flex items-center space-x-2">
                <Link
                  href="/upload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Upload Excel
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
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tables..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('layers')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'layers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Layers className="w-4 h-4 inline mr-2" />
                Layers
              </button>
              <button
                onClick={() => setViewMode('relationships')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'relationships'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Link2 className="w-4 h-4 inline mr-2" />
                Relationships
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'layers' ? (
          <div className="space-y-6">
            {(['L1', 'L2', 'L3'] as const).map((layer) => {
              const tables = tablesByLayer[layer];
              const isExpanded = expandedLayers.has(layer);
              const colors = layerColors[layer];

              return (
                <div key={layer} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleLayer(layer)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: colors.border }}
                      ></div>
                      <h2 className="text-xl font-bold">
                        {layer} - {layer === 'L1' ? 'Master Data' : layer === 'L2' ? 'Snapshots & Events' : 'Roll-ups'}
                      </h2>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                        {tables.length} tables
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tables.map((table) => {
                          const isTableExpanded = expandedTables.has(table.id);
                          const hasFKs = table.foreignKeys.length > 0;

                          return (
                            <div
                              key={table.id}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                                selectedTable === table.id
                                  ? 'ring-4 ring-yellow-400 border-yellow-500'
                                  : `border-${colors.border}`
                              }`}
                              style={{
                                backgroundColor: colors.bg,
                                borderColor: selectedTable === table.id ? '#fbbf24' : colors.border,
                              }}
                              onClick={() => setSelectedTable(table.id === selectedTable ? null : table.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Database className="w-4 h-4" style={{ color: colors.text }} />
                                  <h3 className="font-bold text-sm" style={{ color: colors.text }}>
                                    {table.name}
                                  </h3>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors.badge}`}>
                                  {table.layer}
                                </span>
                              </div>

                              {table.description && (
                                <p className="text-xs text-gray-600 mb-3">{table.description}</p>
                              )}

                              <div className="space-y-2 text-xs">
                                <div className="flex items-center space-x-1">
                                  <Key className="w-3 h-3 text-gray-500" />
                                  <span className="font-mono text-gray-700">{table.primaryKey}</span>
                                </div>
                                {hasFKs && (
                                  <div className="flex items-center space-x-1">
                                    <Link2 className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-700">
                                      {table.foreignKeys.length} relationship{table.foreignKeys.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTable(table.id);
                                }}
                                className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {isTableExpanded ? 'Hide' : 'Show'} fields ({table.fields.length})
                              </button>

                              {isTableExpanded && (
                                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                                  {table.fields.map((field, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs font-mono bg-white bg-opacity-70 p-1.5 rounded border border-gray-200"
                                    >
                                      {field}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Table Relationships</h2>
            {dataDictionary && dataDictionary.relationships.length > 0 ? (
              <div className="space-y-4">
                {dataDictionary.relationships.map((rel, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Database className="w-5 h-5" style={{ color: layerColors[rel.from_layer as 'L1' | 'L2' | 'L3'].text }} />
                        <span className="font-bold">{rel.from_table}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${layerColors[rel.from_layer as 'L1' | 'L2' | 'L3'].badge}`}>
                          {rel.from_layer}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="font-mono text-sm font-semibold text-blue-600">{rel.from_field}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm">{rel.to_field}</span>
                        <span className="text-gray-500">in</span>
                        <span className="font-semibold text-gray-900">{rel.to_table}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${layerColors[rel.to_layer as 'L1' | 'L2' | 'L3'].badge}`}>
                          {rel.to_layer}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No relationships found in parsed data dictionary.</p>
            )}
          </div>
        )}

        {selectedTableData && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{selectedTableData.name}</h2>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className={`inline-block px-3 py-1 rounded text-sm mb-4 ${layerColors[selectedTableData.layer].badge}`}>
              {selectedTableData.layer}
            </div>

            {selectedTableData.description && (
              <p className="text-gray-600 mb-6">{selectedTableData.description}</p>
            )}

            {selectedTableData.category && (
              <p className="text-sm text-gray-500 mb-4">Category: {selectedTableData.category}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <Key className="w-4 h-4" />
                  <span>Primary Key</span>
                </h3>
                <p className="text-sm font-mono bg-gray-50 p-3 rounded border">{selectedTableData.primaryKey}</p>
              </div>

              {selectedTableData.foreignKeys.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center space-x-2">
                    <Link2 className="w-4 h-4" />
                    <span>Relationships ({selectedTableData.foreignKeys.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {selectedTableData.foreignKeys.map((fk, idx) => (
                      <div
                        key={idx}
                        className="text-sm bg-gray-50 p-3 rounded border border-gray-200 cursor-pointer hover:bg-gray-100"
                        onClick={() => setSelectedTable(fk.table)}
                      >
                        <div className="font-mono font-semibold text-blue-600">{fk.field}</div>
                        <div className="text-gray-600 mt-1">
                          → <span className="font-semibold">{fk.references}</span> in{' '}
                          <span className="font-semibold text-purple-600">{fk.table}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-3 flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>All Fields ({selectedTableData.fields.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {selectedTableData.fields.map((field, idx) => (
                  <div key={idx} className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200">
                    {field}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
