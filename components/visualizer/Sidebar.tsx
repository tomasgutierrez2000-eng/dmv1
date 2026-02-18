'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Database, Search, Filter, ChevronRight, ChevronDown, Layers, AlertTriangle, X } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { layerColors } from '../../utils/colors';
import { debugRelationships } from '../../utils/relationshipDebug';
import { getL3Categories } from '@/data/l3-tables';

export default function Sidebar() {
  const {
    model,
    searchQuery,
    visibleLayers,
    filterCategories,
    l3CategoryExcluded,
    setSearchQuery,
    setVisibleLayer,
    toggleFilterCategory,
    toggleL3Category,
    setSelectedTable,
    sidebarOpen,
    setSidebarOpen,
  } = useModelStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-expand categories when searching
  useEffect(() => {
    if (searchQuery && model) {
      setExpandedCategories(new Set(model.categories || []));
    }
  }, [searchQuery, model]);

  const filteredTables = useMemo(() => {
    if (!model) return [];
    return Object.values(model.tables).filter((table) => {
      if (!visibleLayers[table.layer]) return false;
      if (table.layer === 'L3' && l3CategoryExcluded.has(table.category)) return false;
      if (filterCategories.size > 0 && !filterCategories.has(table.category)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = table.name.toLowerCase().includes(query);
        const matchesField = table.fields.some((f) => f.name.toLowerCase().includes(query));
        if (!matchesName && !matchesField) return false;
      }
      return true;
    });
  }, [model, visibleLayers, filterCategories, l3CategoryExcluded, searchQuery]);

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

  const visibleStatistics = useMemo(() => {
    if (!model) return null;
    const visibleKeys = new Set(filteredTables.map((t) => t.key));
    const visibleRels = model.relationships.filter(
      (r) => visibleKeys.has(r.source.tableKey) && visibleKeys.has(r.target.tableKey)
    );
    const visibleCats = new Set(filteredTables.map((t) => t.category));
    return {
      totalTables: filteredTables.length,
      totalFields: filteredTables.reduce((sum, t) => sum + t.fields.length, 0),
      totalRelationships: visibleRels.length,
      totalCategories: visibleCats.size,
      byLayer: {
        L1: filteredTables.filter((t) => t.layer === 'L1').length,
        L2: filteredTables.filter((t) => t.layer === 'L2').length,
        L3: filteredTables.filter((t) => t.layer === 'L3').length,
      },
    };
  }, [model, filteredTables]);

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white border border-gray-200 text-gray-500 rounded-r-lg shadow-md hover:bg-gray-50 hover:text-gray-900 transition-all"
        aria-label="Open sidebar"
        aria-expanded="false"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div
      className="w-96 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm"
      role="navigation"
      aria-label="Data model explorer"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Explorer</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close sidebar"
          aria-expanded="true"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      </div>

      {/* Statistics - compact summary cards */}
      {visibleStatistics && (
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Tables', value: visibleStatistics.totalTables },
              { label: 'Fields', value: visibleStatistics.totalFields },
              { label: 'Rels', value: visibleStatistics.totalRelationships },
              { label: 'Groups', value: visibleStatistics.totalCategories },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-base font-bold text-gray-900 tabular-nums">{s.value}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Relationship debug: compact inline */}
          {model && (() => {
            const debug = debugRelationships(model);
            if (debug.invalid.length > 0 || debug.missingTables.length > 0) {
              return (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{debug.invalid.length} invalid, {debug.missingTables.length} missing refs</span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Layer Toggles - horizontal pill group */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(['L1', 'L2', 'L3'] as const).map((layer) => {
            const colors = layerColors[layer];
            const active = visibleLayers[layer];
            return (
              <button
                key={layer}
                onClick={() => setVisibleLayer(layer, !active)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border ${
                  active
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300'
                }`}
                aria-label={`${active ? 'Hide' : 'Show'} ${layer} layer`}
                aria-pressed={active}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: active ? colors.primary : '#d1d5db' }}
                  />
                  {layer}
                </div>
              </button>
            );
          })}
        </div>
        {/* L3 category toggles - only when L3 layer is visible */}
        {visibleLayers.L3 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">L3 categories</div>
            <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
              {getL3Categories().map((cat) => {
                const excluded = l3CategoryExcluded.has(cat);
                const count = model ? Object.values(model.tables).filter((t) => t.layer === 'L3' && t.category === cat).length : 0;
                return (
                  <label
                    key={cat}
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1.5 -mx-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={!excluded}
                      onChange={() => toggleL3Category(cat)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      aria-label={`${excluded ? 'Show' : 'Hide'} L3 category ${cat}`}
                    />
                    <span className="text-xs text-gray-700 truncate flex-1">{cat}</span>
                    {count > 0 && <span className="text-[10px] text-gray-400 tabular-nums">{count}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search - Apple-style search bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables and fields…"
            className="w-full pl-8 pr-8 py-2 bg-gray-50 text-gray-900 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm placeholder:text-gray-400 transition-all"
            aria-label="Search tables and fields"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-[10px] text-gray-400 mt-1.5 px-0.5">
            {filteredTables.length} result{filteredTables.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
          </p>
        )}
      </div>

      {/* Category Filter */}
      {model && (
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</span>
            </div>
            {filterCategories.size > 0 && (
              <button
                onClick={() => toggleFilterCategory('')}
                className="text-[10px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
                aria-label="Clear all category filters"
              >
                Clear ({filterCategories.size})
              </button>
            )}
          </div>
          <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
            {model.categories.map((cat) => {
              const isSelected = filterCategories.has(cat);
              const count = tablesByCategory.get(cat)?.length || 0;
              return (
                <label
                  key={cat}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFilterCategory(cat)}
                    className="w-3.5 h-3.5 text-blue-600 bg-white border-gray-300 rounded focus:ring-2 focus:ring-blue-200 focus:ring-offset-0 transition-colors"
                    aria-label={`Filter by ${cat}`}
                  />
                  <span className="text-xs text-gray-700 flex-1 truncate">{cat}</span>
                  <span className="text-[10px] text-gray-400 tabular-nums font-medium">{count}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin" role="tree" aria-label="Tables by category">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <Database className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tables</span>
        </div>
        <div className="space-y-0.5">
          {Array.from(tablesByCategory.entries()).map(([category, tables]) => {
            const isExpanded = expandedCategories.has(category);
            return (
              <div key={category} role="treeitem" aria-expanded={isExpanded} aria-selected={false}>
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
                  className="w-full px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 transition-colors group"
                  aria-label={`${category} (${tables.length} tables)`}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                  )}
                  <span className="font-semibold truncate">{category}</span>
                  <span className="text-[10px] text-gray-400 tabular-nums ml-auto flex-shrink-0">{tables.length}</span>
                </button>
                {isExpanded && (
                  <div className="ml-3 mt-0.5 space-y-px border-l border-gray-100 pl-2" role="group">
                    {tables.map((table) => {
                      const colors = layerColors[table.layer];
                      return (
                        <button
                          key={table.key}
                          onClick={() => setSelectedTable(table.key)}
                          className="w-full px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-all duration-150 hover:text-gray-900 group/table"
                          aria-label={`${table.name} (${table.layer})`}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: colors.primary }}
                          />
                          <span className="font-mono truncate text-[11px] group-hover/table:font-medium transition-all">{table.name}</span>
                          <span className={`ml-auto px-1 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${colors.badge}`}>
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

        {/* Empty state */}
        {filteredTables.length === 0 && model && (
          <div className="text-center py-8 px-4">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs text-gray-500 font-medium">No tables match your filters</p>
            <p className="text-[10px] text-gray-400 mt-1 mb-4">Try adjusting layers, categories, or search</p>
            <button
              onClick={() => {
                toggleFilterCategory('');
                setSearchQuery('');
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
              aria-label="Clear all filters"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
