'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, AlertCircle, Database, Loader2, ChevronsUpDown } from 'lucide-react';
import type { DataDictionary } from '@/lib/data-dictionary';
import {
  REFERENCE_DATA_TABLES,
  CATEGORIES,
  SCD_TYPES,
  groupByCategory,
  type ReferenceDataTableDef,
} from './referenceDataTables';
import ReferenceDataCard from './ReferenceDataCard';

export default function ReferenceDataExplorer() {
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});
  const [dd, setDd] = useState<DataDictionary | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [noDatabase, setNoDatabase] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedScd, setSelectedScd] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  // Fetch counts + data dictionary on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/reference-data/counts').then(async (r) => {
        if (!r.ok) {
          const json = await r.json();
          if (json.code === 'NO_DATABASE') {
            setNoDatabase(true);
            return {};
          }
          throw new Error(json.error || 'Failed to fetch counts');
        }
        return r.json();
      }),
      fetch('/api/data-dictionary')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([counts, ddData]) => {
        setRowCounts(counts);
        setDd(ddData);
      })
      .catch((e) => setCountsError(e.message))
      .finally(() => setCountsLoading(false));
  }, []);

  // Field counts from data dictionary
  const fieldCountMap = useMemo(() => {
    if (!dd?.L1) return {};
    return Object.fromEntries(dd.L1.map((t) => [t.name, t.fields.length]));
  }, [dd]);

  // Filter tables
  const filteredTables = useMemo(() => {
    let tables = REFERENCE_DATA_TABLES;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      tables = tables.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      tables = tables.filter((t) => t.category === selectedCategory);
    }
    if (selectedScd) {
      tables = tables.filter((t) => t.scd === selectedScd);
    }
    return tables;
  }, [searchQuery, selectedCategory, selectedScd]);

  // Group by category
  const grouped = useMemo(() => groupByCategory(filteredTables), [filteredTables]);

  // Category order (keep original order, filtered)
  const categoryOrder = useMemo(
    () => CATEGORIES.filter((c) => grouped[c]),
    [grouped]
  );

  const toggleExpand = useCallback((tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => setExpandedTables(new Set()), []);

  // Stats
  const totalRows = Object.values(rowCounts).reduce((s, c) => s + (c > 0 ? c : 0), 0);
  const tablesInDb = Object.values(rowCounts).filter((c) => c >= 0).length;

  return (
    <div className="space-y-6">
      {/* No database banner */}
      {noDatabase && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-300 font-medium">Database not configured</p>
            <p className="text-xs text-amber-400/60 mt-0.5">
              Set DATABASE_URL to browse live reference data. Table metadata is still shown below.
            </p>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {!countsLoading && !noDatabase && (
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            {filteredTables.length} tables
          </span>
          <span>{tablesInDb} in database</span>
          <span>{totalRows.toLocaleString()} total rows</span>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm bg-slate-900/60 border border-slate-700/60 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>
          {expandedTables.size > 0 && (
            <button
              onClick={collapseAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 border border-slate-700/50 rounded-lg transition-colors"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              Collapse all
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              selectedCategory === null
                ? 'bg-slate-700 text-white border-slate-600'
                : 'text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
            }`}
          >
            All categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* SCD type pills */}
        <div className="flex gap-1.5">
          <span className="text-xs text-slate-600 py-1 mr-1">SCD:</span>
          {SCD_TYPES.map((scd) => (
            <button
              key={scd}
              onClick={() => setSelectedScd(selectedScd === scd ? null : scd)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                selectedScd === scd
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
              }`}
            >
              {scd}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {countsLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading reference data...</span>
        </div>
      )}

      {/* Error */}
      {countsError && (
        <div className="flex items-center gap-2 py-6 px-4 text-sm text-red-400 bg-red-500/5 rounded-lg border border-red-500/10">
          <AlertCircle className="w-4 h-4" />
          {countsError}
        </div>
      )}

      {/* Table groups */}
      {!countsLoading && (
        <div className="space-y-8">
          {categoryOrder.map((category) => (
            <CategoryGroup
              key={category}
              category={category}
              tables={grouped[category]}
              rowCounts={rowCounts}
              fieldCountMap={fieldCountMap}
              expandedTables={expandedTables}
              onToggle={toggleExpand}
              dbAvailable={!noDatabase}
            />
          ))}
          {filteredTables.length === 0 && (
            <p className="text-center text-slate-600 py-12 text-sm">
              No tables match your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  category,
  tables,
  rowCounts,
  fieldCountMap,
  expandedTables,
  onToggle,
  dbAvailable,
}: {
  category: string;
  tables: ReferenceDataTableDef[];
  rowCounts: Record<string, number>;
  fieldCountMap: Record<string, number>;
  expandedTables: Set<string>;
  onToggle: (name: string) => void;
  dbAvailable: boolean;
}) {
  const totalRows = tables.reduce((s, t) => s + (rowCounts[t.name] > 0 ? rowCounts[t.name] : 0), 0);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">{category}</h3>
        <span className="text-xs text-slate-600">
          {tables.length} table{tables.length !== 1 ? 's' : ''}
          {totalRows > 0 && ` \u00b7 ${totalRows.toLocaleString()} rows`}
        </span>
      </div>
      <div className="space-y-1.5">
        {tables.map((table) => (
          <ReferenceDataCard
            key={table.name}
            table={table}
            rowCount={rowCounts[table.name]}
            fieldCount={fieldCountMap[table.name]}
            isExpanded={expandedTables.has(table.name)}
            onToggle={() => onToggle(table.name)}
            dbAvailable={dbAvailable}
          />
        ))}
      </div>
    </section>
  );
}
