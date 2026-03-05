'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, ChevronLeft, Database, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { DataDictionary, DataDictionaryTable } from '@/lib/data-dictionary';
import { flattenTables, getDistinctCategories, tableMatchesSearch, countPKs, countFKs } from '@/lib/data-elements/utils';
import StatsBar from './StatsBar';
import TableCard from './TableCard';
import QuickJumpModal from './QuickJumpModal';
import { DataElementsLoading, DataElementsError, DataElementsEmpty } from './DataElementsStates';

type SortField = 'name' | 'fields' | 'category' | 'fkCount';
type SortDir = 'asc' | 'desc';
const ITEMS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 250;

export default function DataElementsMainView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dd, setDd] = useState<DataDictionary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search: URL is source of truth for filtering; transient state for responsive input
  const searchQuery = searchParams.get('q') ?? '';
  const [inputValue, setInputValue] = useState(searchQuery);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputValueRef = useRef(inputValue);
  const lastPushedQRef = useRef<string | null>(null);
  inputValueRef.current = inputValue;

  // Other filters from URL (state so we can update URL on change)
  const [selectedLayer, setSelectedLayer] = useState<string | null>(searchParams.get('layer'));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [showOnlyPK, setShowOnlyPK] = useState(searchParams.get('pk') === '1');
  const [showOnlyFK, setShowOnlyFK] = useState(searchParams.get('fk') === '1');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);

  // Sync input from URL only when the URL change came from outside (e.g. back/forward), not from our own debounce
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    if (q !== lastPushedQRef.current) {
      lastPushedQRef.current = null;
      setInputValue(q);
    }
  }, [searchParams]);

  // Build URL from current params and optional q override; preserve other params
  const replaceUrl = useCallback(
    (q: string | null, layer: string | null, category: string | null, pk: boolean, fk: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q?.trim()) params.set('q', q.trim());
      else params.delete('q');
      if (layer) params.set('layer', layer);
      else params.delete('layer');
      if (category) params.set('category', category);
      else params.delete('category');
      if (pk) params.set('pk', '1');
      else params.delete('pk');
      if (fk) params.set('fk', '1');
      else params.delete('fk');
      const qs = params.toString();
      const newUrl = qs ? `${pathname}?${qs}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // Debounced URL update for search
  const scheduleSearchUrlUpdate = useCallback(
    (value: string) => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        searchDebounceRef.current = null;
        const q = (value ?? '').trim() || null;
        lastPushedQRef.current = q ?? '';
        replaceUrl(q, selectedLayer, selectedCategory, showOnlyPK, showOnlyFK);
      }, SEARCH_DEBOUNCE_MS);
    },
    [replaceUrl, selectedLayer, selectedCategory, showOnlyPK, showOnlyFK]
  );

  // Flush search to URL immediately (blur / Enter)
  const flushSearchToUrl = useCallback(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    const q = (inputValue ?? '').trim() || null;
    lastPushedQRef.current = q ?? '';
    replaceUrl(q, selectedLayer, selectedCategory, showOnlyPK, showOnlyFK);
  }, [inputValue, replaceUrl, selectedLayer, selectedCategory, showOnlyPK, showOnlyFK]);

  // Sync layer/category/pk/fk to URL when they change; flush current input first so in-progress typing is not lost
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    const q = (inputValueRef.current ?? '').trim() || null;
    lastPushedQRef.current = q ?? '';
    replaceUrl(q, selectedLayer, selectedCategory, showOnlyPK, showOnlyFK);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when filter toggles change; read latest input via ref
  }, [selectedLayer, selectedCategory, showOnlyPK, showOnlyFK]);

  // Cleanup debounce on unmount to avoid replaceUrl after unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const fetchData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch('/api/data-dictionary')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load data dictionary');
        return r.json();
      })
      .then((data: DataDictionary) => setDd(data))
      .catch(() => setError('Could not load the data dictionary.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickJumpOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const allTables = useMemo(() => (dd ? flattenTables(dd) : []), [dd]);

  // Categories scoped to the currently selected layer
  const availableCategories = useMemo(() => {
    const scoped = selectedLayer ? allTables.filter((t) => t.layer === selectedLayer) : allTables;
    return getDistinctCategories(scoped);
  }, [allTables, selectedLayer]);

  // Reset category if it's no longer available when layer changes
  useEffect(() => {
    if (selectedCategory && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [availableCategories, selectedCategory]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = allTables;
    if (selectedLayer) result = result.filter((t) => t.layer === selectedLayer);
    if (selectedCategory) result = result.filter((t) => t.category === selectedCategory);
    if (showOnlyPK) result = result.filter((t) => countPKs(t) > 0);
    if (showOnlyFK) result = result.filter((t) => countFKs(t) > 0);
    if (searchQuery.trim()) result = result.filter((t) => tableMatchesSearch(t, searchQuery.trim()));

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'fields':
          cmp = a.fields.length - b.fields.length;
          break;
        case 'category':
          cmp = (a.category ?? '').localeCompare(b.category ?? '');
          break;
        case 'fkCount':
          cmp = countFKs(a) - countFKs(b);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allTables, selectedLayer, selectedCategory, showOnlyPK, showOnlyFK, searchQuery, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLayer, selectedCategory, showOnlyPK, showOnlyFK, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  }

  const MAX_VISIBLE_CATEGORIES = 8;
  const visibleCategories = showAllCategories ? availableCategories : availableCategories.slice(0, MAX_VISIBLE_CATEGORIES);

  function clearFilters() {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    lastPushedQRef.current = '';
    setInputValue('');
    setSelectedLayer(null);
    setSelectedCategory(null);
    setShowOnlyPK(false);
    setShowOnlyFK(false);
    replaceUrl('', null, null, false, false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" aria-hidden />
              Overview
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Data Elements Library</h1>
          </div>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-1">
              Browse all tables, fields, and relationships across the data model
            </p>
          )}

          {/* Search: input uses transient state; filtering uses URL (searchQuery) */}
          <div className="mt-4 relative">
            <label htmlFor="data-elements-search" className="sr-only">
              Search tables and fields
            </label>
            <input
              id="data-elements-search"
              type="search"
              autoComplete="off"
              placeholder="Search by table name, category, field name, or description..."
              value={inputValue}
              onChange={(e) => {
                const v = e.target.value;
                setInputValue(v);
                scheduleSearchUrlUpdate(v);
              }}
              onBlur={flushSearchToUrl}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  flushSearchToUrl();
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {error && <DataElementsError message={error} onRetry={fetchData} backHref="/overview" backLabel="Back to Overview" />}
        {!error && loading && <DataElementsLoading />}

        {!error && !loading && dd && (
          <>
            <StatsBar
              tables={allTables}
              relationshipCount={dd.relationships.length}
              selectedLayer={selectedLayer}
              onSelectLayer={(l) => setSelectedLayer(l)}
            />

            {/* Category filter */}
            <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label="Filter by category">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  !selectedCategory ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                aria-pressed={!selectedCategory}
              >
                All Categories
              </button>
              {visibleCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    selectedCategory === cat ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-pressed={selectedCategory === cat}
                >
                  {cat}
                </button>
              ))}
              {availableCategories.length > MAX_VISIBLE_CATEGORIES && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((v) => !v)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 inline-flex items-center gap-1"
                >
                  {showAllCategories ? 'Less' : `+${availableCategories.length - MAX_VISIBLE_CATEGORIES} more`}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllCategories ? 'rotate-180' : ''}`} aria-hidden />
                </button>
              )}
            </div>

            {/* Field-level toggles */}
            <div className="flex gap-2 mb-6 flex-wrap items-center">
              <button
                type="button"
                onClick={() => setShowOnlyPK((v) => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  showOnlyPK ? 'bg-yellow-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                aria-pressed={showOnlyPK}
              >
                Has PKs
              </button>
              <button
                type="button"
                onClick={() => setShowOnlyFK((v) => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  showOnlyFK ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                aria-pressed={showOnlyFK}
              >
                Has FKs
              </button>

              {/* Sort controls */}
              <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
                <span>Sort:</span>
                {(['name', 'fields', 'category', 'fkCount'] as SortField[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleSort(f)}
                    className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      sortField === f ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {f === 'fkCount' ? 'FKs' : f.charAt(0).toUpperCase() + f.slice(1)}
                    <SortIcon field={f} />
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {filtered.length === 0 ? (
              <DataElementsEmpty
                icon={Database}
                title="No tables found"
                description={
                  allTables.length === 0
                    ? 'No tables have been defined in the data dictionary yet.'
                    : 'No tables match your search or filter criteria.'
                }
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4" aria-live="polite" aria-atomic="true">
                  Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} table{filtered.length !== 1 ? 's' : ''}
                  {searchQuery.trim() ? (
                    <span> for &ldquo;{searchQuery.trim()}&rdquo;</span>
                  ) : null}
                </p>
                <div className="grid gap-3">
                  {paged.map((table) => (
                    <TableCard key={`${table.layer}.${table.name}`} table={table} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="flex items-center justify-center gap-4 mt-6" aria-label="Table list pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      aria-label="Previous page"
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-500" aria-live="polite">
                      Page {safePage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      aria-label="Next page"
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      Next
                    </button>
                  </nav>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <QuickJumpModal
        tables={allTables}
        isOpen={quickJumpOpen}
        onClose={() => setQuickJumpOpen(false)}
      />
    </div>
  );
}
