'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Hash,
} from 'lucide-react';
import type { DbStatusResult, TableDbStatus, TableStatus } from '@/lib/db-status';
import StatusBadge from './StatusBadge';

type SortField = 'name' | 'layer' | 'category' | 'fields' | 'status' | 'rowCount';
type SortDir = 'asc' | 'desc';

const LAYER_COLORS: Record<string, string> = {
  L1: 'bg-blue-100 text-blue-800 border-blue-200',
  L2: 'bg-amber-100 text-amber-800 border-amber-200',
  L3: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const STATUS_ORDER: Record<TableStatus, number> = {
  has_data: 0,
  empty: 1,
  not_in_db: 2,
  not_in_dd: 3,
};

export default function DbStatusDashboard() {
  const [data, setData] = useState<DbStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exactLoading, setExactLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLayer, setFilterLayer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Sort
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fetchStatus = useCallback(async (exact = false) => {
    const url = exact ? '/api/db-status?exact=true' : '/api/db-status';
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to fetch');
    return json as DbStatusResult;
  }, []);

  // Initial load
  useEffect(() => {
    fetchStatus()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchStatus]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setData(await fetchStatus());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [fetchStatus]);

  const handleExactCounts = useCallback(async () => {
    setExactLoading(true);
    setError(null);
    try {
      setData(await fetchStatus(true));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExactLoading(false);
    }
  }, [fetchStatus]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField]
  );

  // Filter + sort tables
  const { dbTables, loadingStageTables } = useMemo(() => {
    if (!data) return { dbTables: [], loadingStageTables: [] };

    let filtered = data.tables;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.layer.toLowerCase().includes(q)
      );
    }

    // Layer filter
    if (filterLayer !== 'all') {
      filtered = filtered.filter((t) => t.layer === filterLayer);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'layer':
          cmp = a.layer.localeCompare(b.layer);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
        case 'fields':
          cmp = a.fieldCount - b.fieldCount;
          break;
        case 'status':
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case 'rowCount':
          cmp = (a.rowCount ?? -1) - (b.rowCount ?? -1);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    // Separate loading-stage tables for bottom section
    const dbT = sorted.filter((t) => t.status !== 'not_in_db');
    const lsT = sorted.filter((t) => t.status === 'not_in_db');

    return { dbTables: dbT, loadingStageTables: lsT };
  }, [data, searchQuery, filterLayer, filterStatus, sortField, sortDir]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Connecting to database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Status</h1>
            <p className="text-sm text-gray-500 mt-1">
              Table inventory and loading stages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExactCounts}
              disabled={exactLoading || !data?.connected}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Hash className="w-4 h-4" />
              {exactLoading ? 'Counting...' : 'Exact counts'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Connection Banner */}
        <ConnectionBanner data={data} error={error} />

        {/* Summary Cards */}
        {data && <SummaryCards data={data} activeFilter={filterStatus} onFilterStatus={setFilterStatus} />}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 mt-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterLayer}
            onChange={(e) => setFilterLayer(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All layers</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="has_data">Has data</option>
            <option value="empty">Empty</option>
            <option value="not_in_db">Loading stage</option>
            <option value="not_in_dd">Orphan</option>
          </select>
        </div>

        {/* Tables in Database — hide when filtering to loading-stage only, or when no DB tables exist at all */}
        {(filterStatus === 'all' || filterStatus !== 'not_in_db') && (data?.connected || dbTables.length > 0) ? (
          <TableSection
            title="Tables in Database"
            tables={dbTables}
            sortField={sortField}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            showRowCount
          />
        ) : null}

        {/* Loading Stage Tables (bottom) */}
        {(filterStatus === 'all' || filterStatus === 'not_in_db') && loadingStageTables.length > 0 && (
          <div className="mt-8">
            <TableSection
              title={`Loading Stage — Not in Database (${loadingStageTables.length})`}
              tables={loadingStageTables}
              sortField={sortField}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              showRowCount={false}
              dashed
            />
          </div>
        )}

        {/* Timestamp */}
        {data && (
          <p className="text-xs text-gray-400 mt-6 text-right">
            Last checked: {new Date(data.timestamp).toLocaleString()}
            {data.tables.some((t) => t.estimatedRowCount) && ' (estimated counts)'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ConnectionBanner({ data, error }: { data: DbStatusResult | null; error: string | null }) {
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 mb-4">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">Connection error</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!data.databaseUrl) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">No database configured</p>
          <p className="text-xs text-amber-600">
            Set <code className="font-mono bg-amber-100 px-1 rounded">DATABASE_URL</code> to see table status from PostgreSQL.
          </p>
        </div>
      </div>
    );
  }

  if (data.connected) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 mb-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Connected to PostgreSQL</p>
          <p className="text-xs text-emerald-600">
            {data.summary.totalTablesInDb} tables found in database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 mb-4">
      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-red-800">Disconnected</p>
        <p className="text-xs text-red-600">Could not connect to the database. Check DATABASE_URL.</p>
      </div>
    </div>
  );
}

function SummaryCards({
  data,
  activeFilter,
  onFilterStatus,
}: {
  data: DbStatusResult;
  activeFilter: string;
  onFilterStatus: (s: string) => void;
}) {
  const cards = [
    {
      label: 'With data',
      value: data.summary.tablesWithData,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
      activeBg: 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300',
      filter: 'has_data',
    },
    {
      label: 'Empty',
      value: data.summary.tablesEmpty,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
      activeBg: 'bg-amber-100 border-amber-400 ring-2 ring-amber-300',
      filter: 'empty',
    },
    {
      label: 'Loading stage',
      value: data.summary.tablesNotInDb,
      color: 'text-gray-500',
      bg: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
      activeBg: 'bg-gray-100 border-gray-400 ring-2 ring-gray-300',
      filter: 'not_in_db',
    },
    {
      label: 'Orphan',
      value: data.summary.tablesNotInDd,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      activeBg: 'bg-orange-100 border-orange-400 ring-2 ring-orange-300',
      filter: 'not_in_dd',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((c) => {
        const isActive = activeFilter === c.filter;
        return (
          <button
            key={c.filter}
            onClick={() => onFilterStatus(isActive ? 'all' : c.filter)}
            className={`border rounded-lg p-4 text-left transition-all cursor-pointer ${isActive ? c.activeBg : c.bg}`}
          >
            <div className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-600 mt-1">{c.label}</div>
          </button>
        );
      })}
    </div>
  );
}

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onToggle,
  className,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onToggle: (f: SortField) => void;
  className?: string;
}) {
  const active = currentField === field;
  const Icon = active ? (currentDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      onClick={() => onToggle(field)}
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors ${className ?? ''}`}
    >
      {label}
      <Icon className={`w-3 h-3 ${active ? 'text-blue-600' : ''}`} />
    </button>
  );
}

function TableSection({
  title,
  tables,
  sortField,
  sortDir,
  onToggleSort,
  showRowCount,
  dashed,
}: {
  title: string;
  tables: TableDbStatus[];
  sortField: SortField;
  sortDir: SortDir;
  onToggleSort: (f: SortField) => void;
  showRowCount: boolean;
  dashed?: boolean;
}) {
  const gridCols = showRowCount
    ? 'grid-cols-[1fr_60px_140px_70px_120px_100px]'
    : 'grid-cols-[1fr_60px_140px_70px_120px]';

  return (
    <div
      className={`bg-white rounded-lg border ${dashed ? 'border-dashed border-gray-300' : 'border-gray-200'} overflow-hidden`}
    >
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>

      {/* Header row */}
      <div className={`grid ${gridCols} gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/30`}>
        <SortHeader label="Table" field="name" currentField={sortField} currentDir={sortDir} onToggle={onToggleSort} />
        <SortHeader label="Layer" field="layer" currentField={sortField} currentDir={sortDir} onToggle={onToggleSort} />
        <SortHeader label="Category" field="category" currentField={sortField} currentDir={sortDir} onToggle={onToggleSort} />
        <SortHeader label="Fields" field="fields" currentField={sortField} currentDir={sortDir} onToggle={onToggleSort} />
        <SortHeader label="Status" field="status" currentField={sortField} currentDir={sortDir} onToggle={onToggleSort} />
        {showRowCount && (
          <SortHeader
            label="Rows"
            field="rowCount"
            currentField={sortField}
            currentDir={sortDir}
            onToggle={onToggleSort}
            className="justify-end"
          />
        )}
      </div>

      {/* Rows */}
      {tables.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">No tables match filters</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {tables.map((t) => (
            <Link
              key={`${t.layer}.${t.name}`}
              href={`/data-elements/${t.layer}/${encodeURIComponent(t.name)}`}
              className={`grid ${gridCols} gap-2 px-4 py-2.5 hover:bg-blue-50/50 transition-colors items-center no-underline`}
            >
              <span className="text-sm font-mono font-medium text-gray-900 truncate">{t.name}</span>
              <span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${LAYER_COLORS[t.layer] ?? ''}`}
                >
                  {t.layer}
                </span>
              </span>
              <span className="text-xs text-gray-500 truncate">{t.category || '—'}</span>
              <span className="text-xs text-gray-600 tabular-nums">{t.fieldCount || '—'}</span>
              <StatusBadge status={t.status} rowCount={t.rowCount} />
              {showRowCount && (
                <span className="text-xs text-gray-600 tabular-nums text-right">
                  {t.rowCount != null ? t.rowCount.toLocaleString() : '—'}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
