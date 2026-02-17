'use client';

import { useMemo, useState } from 'react';
import { Database, Search, Filter, ChevronRight, ChevronDown, Layers, AlertTriangle } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { layerColors } from '../../utils/colors';
import { debugRelationships } from '../../utils/relationshipDebug';

export default function Sidebar() {
  const {
    model,
    searchQuery,
    visibleLayers,
    filterCategories,
    setSearchQuery,
    setVisibleLayer,
    toggleFilterCategory,
    setSelectedTable,
    sidebarOpen,
    setSidebarOpen,
  } = useModelStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const statistics = useMemo(() => {
    if (!model) return null;
    const tables = Object.values(model.tables);
    return {
      totalTables: tables.length,
      totalFields: tables.reduce((sum, t) => sum + t.fields.length, 0),
      totalRelationships: model.relationships.length,
      totalCategories: model.categories.length,
      byLayer: {
        L1: tables.filter((t) => t.layer === 'L1').length,
        L2: tables.filter((t) => t.layer === 'L2').length,
        L3: tables.filter((t) => t.layer === 'L3').length,
      },
    };
  }, [model]);

  const filteredTables = useMemo(() => {
    if (!model) return [];
    return Object.values(model.tables).filter((table) => {
      if (!visibleLayers[table.layer]) return false;
      // If categories are selected, table must be in one of them
      if (filterCategories.size > 0 && !filterCategories.has(table.category)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = table.name.toLowerCase().includes(query);
        const matchesField = table.fields.some((f) => f.name.toLowerCase().includes(query));
        if (!matchesName && !matchesField) return false;
      }
      return true;
    });
  }, [model, visibleLayers, filterCategories, searchQuery]);

  const tablesByCategory = useMemo(() => {
    const grouped = new Map<string, typeof filteredTables>();
    filteredTables.forEach((table) => {
      if (!grouped.has(table.category)) {
        grouped.set(table.category, []);
      }
      grouped.get(table.category)!.push(table);
    });
    return grouped;
  }, [filteredTables]);

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute left-0 top-1/2 z-10 p-2 bg-white border border-gray-200 text-gray-700 rounded-r-lg shadow-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Bank Data Model Explorer</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-gray-500 hover:text-gray-900"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 rounded p-2 border border-gray-100">
              <div className="text-gray-500 text-xs">Tables</div>
              <div className="text-gray-900 font-bold">{statistics.totalTables}</div>
            </div>
            <div className="bg-gray-50 rounded p-2 border border-gray-100">
              <div className="text-gray-500 text-xs">Fields</div>
              <div className="text-gray-900 font-bold">{statistics.totalFields}</div>
            </div>
            <div className="bg-gray-50 rounded p-2 border border-gray-100">
              <div className="text-gray-500 text-xs">Relationships</div>
              <div className="text-gray-900 font-bold">{statistics.totalRelationships}</div>
            </div>
            <div className="bg-gray-50 rounded p-2 border border-gray-100">
              <div className="text-gray-500 text-xs">Categories</div>
              <div className="text-gray-900 font-bold">{statistics.totalCategories}</div>
            </div>
          </div>
          {/* Relationship Debug Info */}
          {model && (() => {
            const debug = debugRelationships(model);
            const visibleTableKeys = new Set(filteredTables.map((t) => t.key));
            const visibleRels = model.relationships.filter((rel) => 
              visibleTableKeys.has(rel.source.tableKey) && visibleTableKeys.has(rel.target.tableKey)
            );
            
            if (debug.invalid.length > 0 || debug.missingTables.length > 0 || visibleRels.length < model.relationships.length) {
              return (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800">Relationship Status</span>
                  </div>
                  <div className="text-xs text-amber-700 space-y-1">
                    <div>Total: {model.relationships.length}</div>
                    <div>Valid: {debug.valid.length}</div>
                    <div>Visible: {visibleRels.length}</div>
                    {debug.invalid.length > 0 && (
                      <div className="text-amber-600">Invalid: {debug.invalid.length}</div>
                    )}
                    {debug.missingTables.length > 0 && (
                      <div className="mt-1 text-amber-600 text-xs">
                        Missing: {debug.missingTables.slice(0, 2).join(', ')}
                        {debug.missingTables.length > 2 && ` +${debug.missingTables.length - 2}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded p-2">
                <div className="text-xs text-emerald-700">
                  ✓ {model.relationships.length} relationships mapped
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Layer Toggles */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Layers</span>
        </div>
        <div className="space-y-2">
          {(['L1', 'L2', 'L3'] as const).map((layer) => {
            const colors = layerColors[layer];
            return (
              <button
                key={layer}
                onClick={() => setVisibleLayer(layer, !visibleLayers[layer])}
                className={`w-full px-3 py-2 rounded flex items-center justify-between transition-colors border ${
                  visibleLayers[layer] ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <span className="text-sm text-gray-800">{layer}</span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    visibleLayers[layer] ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-gray-900 rounded border border-gray-200 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Category Filter - Multiple Selection */}
      {model && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Categories</span>
            </div>
            {filterCategories.size > 0 && (
              <button
                onClick={() => toggleFilterCategory('')}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {model.categories.map((cat) => {
              const isSelected = filterCategories.has(cat);
              return (
                <label
                  key={cat}
                  className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border border-blue-300' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFilterCategory(cat)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-800 flex-1">{cat}</span>
                  <span className="text-xs text-gray-500">
                    ({tablesByCategory.get(cat)?.length || 0})
                  </span>
                </label>
              );
            })}
          </div>
          {filterCategories.size === 0 && (
            <div className="mt-2 text-xs text-gray-500 italic">No filters - showing all categories</div>
          )}
        </div>
      )}

      {/* Table Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Tables</span>
        </div>
        <div className="space-y-1">
          {Array.from(tablesByCategory.entries()).map(([category, tables]) => {
            const isExpanded = expandedCategories.has(category);
            return (
              <div key={category}>
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedCategories);
                    if (newExpanded.has(category)) {
                      newExpanded.delete(category);
                    } else {
                      newExpanded.add(category);
                    }
                    setExpandedCategories(newExpanded);
                  }}
                  className="w-full px-2 py-1 text-left text-sm text-gray-800 hover:bg-gray-100 rounded flex items-center space-x-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span className="font-semibold">{category}</span>
                  <span className="text-gray-500 text-xs">({tables.length})</span>
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {tables.map((table) => {
                      const colors = layerColors[table.layer];
                      return (
                        <button
                          key={table.key}
                          onClick={() => setSelectedTable(table.key)}
                          className="w-full px-2 py-1 text-left text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center space-x-2"
                        >
                          <div
                            className="w-2 h-2 rounded"
                            style={{ backgroundColor: colors.primary }}
                          />
                          <span className="font-mono">{table.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${colors.badge}`}>
                            {table.layer}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
