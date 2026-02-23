'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Download, Upload, FileSpreadsheet, Search, BookOpen, ChevronLeft } from 'lucide-react';
import type { MetricDomain } from '@/lib/metric-library/types';
import { TypeBadge } from './badges';
import { DomainIcon } from './domain-icons';
import { LibraryLoading, LibraryError, LibraryEmpty } from './LibraryStates';

interface ParentWithCount {
  metric_id: string;
  metric_name: string;
  definition: string;
  generic_formula: string;
  metric_class: string;
  direction: string;
  risk_appetite_relevant: boolean;
  domain_ids: string[];
  variant_count: number;
}

export default function LibraryMainView() {
  const [domains, setDomains] = useState<MetricDomain[]>([]);
  const [parents, setParents] = useState<ParentWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [migrateError, setMigrateError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    created?: { domains: string[]; parents: string[]; variants: string[] };
    updated?: { domains: string[]; parents: string[]; variants: string[] };
    errors?: { row?: number; sheet?: string; message: string }[];
  } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [searchVariantHits, setSearchVariantHits] = useState<{ variant_id: string; variant_name: string; parent_metric_id: string; parent_metric_name?: string }[]>([]);
  const [searchApiLoading, setSearchApiLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const fetchData = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([
      fetch('/api/metrics/library/domains').then((r) => r.json()),
      fetch('/api/metrics/library/parents').then((r) => r.json()),
    ])
      .then(([d, p]) => {
        setDomains(Array.isArray(d) ? d : []);
        setParents(Array.isArray(p) ? p : []);
      })
      .catch(() => setError('Could not load the metric library.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const downloadTemplate = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics/library/export/template');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metric-library-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open('/api/metrics/library/export/template', '_blank');
    }
  }, []);

  const downloadExport = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics/library/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metric-library-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open('/api/metrics/library/export', '_blank');
    }
  }, []);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setImportResult(null);
      setImporting(true);
      const formData = new FormData();
      formData.set('file', file);
      fetch('/api/metrics/library/import', { method: 'POST', body: formData })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) {
            setImportResult({
              success: false,
              message: data.error ?? `Import failed (${r.status}).`,
              errors: data.errors,
            });
            return;
          }
          const created = data.created ?? {};
          const updated = data.updated ?? {};
          const totalCreated =
            (created.domains?.length ?? 0) +
            (created.parents?.length ?? 0) +
            (created.variants?.length ?? 0);
          const totalUpdated =
            (updated.domains?.length ?? 0) +
            (updated.parents?.length ?? 0) +
            (updated.variants?.length ?? 0);
          const summary: string[] = [];
          if (totalCreated > 0) summary.push(`${totalCreated} added`);
          if (totalUpdated > 0) summary.push(`${totalUpdated} updated`);
          setImportResult({
            success: data.success,
            message: data.success
              ? (summary.length ? `Import complete. ${summary.join(', ')}.` : 'Import complete.')
              : 'Import completed with some errors. Review the list below.',
            created: data.created,
            updated: data.updated,
            errors: data.errors,
          });
          if (data.success) fetchData();
        })
        .catch(() => setImportResult({ success: false, message: 'Import failed. Check your connection and try again.' }))
        .finally(() => setImporting(false));
    },
    [fetchData]
  );

  const runMigration = useCallback(() => {
    setMigrateError(null);
    setMigrating(true);
    fetch('/api/metrics/library/migrate', { method: 'POST' })
      .then((r) => {
        if (!r.ok) return r.json().then((body) => { throw new Error(body?.error ?? 'Migration failed'); });
      })
      .then(() => window.location.reload())
      .catch((err) => {
        setMigrateError(err instanceof Error ? err.message : 'Migration failed.');
      })
      .finally(() => setMigrating(false));
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchVariantHits([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchApiLoading(true);
      fetch(`/api/metrics/library/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          const variants = Array.isArray(data.variants) ? data.variants : [];
          setSearchVariantHits(
            variants.map((v: { variant_id: string; variant_name: string; parent_metric_id: string; parent_metric_name?: string }) => ({
              variant_id: v.variant_id,
              variant_name: v.variant_name,
              parent_metric_id: v.parent_metric_id,
              parent_metric_name: v.parent_metric_name,
            }))
          );
        })
        .catch(() => setSearchVariantHits([]))
        .finally(() => setSearchApiLoading(false));
    }, 220);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const filtered = selectedDomain
    ? parents.filter((p) => p.domain_ids?.includes(selectedDomain))
    : parents;
  const searched = searchQuery.trim()
    ? filtered.filter(
        (p) =>
          p.metric_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.metric_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.definition ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filtered;

  const totalVariants = parents.reduce((s, p) => s + (p.variant_count ?? 0), 0);

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
            <h1 className="text-2xl font-bold text-gray-900">Metric Library</h1>
          </div>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-1">
              {parents.length} Parent Metrics · {totalVariants} Variants
            </p>
          )}
          <p className="mt-4 text-xs text-gray-500">
            Bulk edit: download the template, fill in Excel, then import to add or update domains, parent metrics, and variants.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              title="Get an empty Excel file with the correct sheet and column layout"
            >
              <Download className="w-4 h-4" aria-hidden />
              Download template
            </button>
            <button
              type="button"
              onClick={downloadExport}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              title="Download current library as Excel for editing and re-import"
            >
              <FileSpreadsheet className="w-4 h-4" aria-hidden />
              Export library
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleImportFile}
              className="hidden"
              aria-label="Choose Excel file to import"
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-busy={importing}
              aria-label={importing ? 'Importing…' : 'Import from Excel'}
            >
              <Upload className="w-4 h-4" aria-hidden />
              {importing ? 'Importing…' : 'Import from Excel'}
            </button>
          </div>
          {importResult && (
            <div
              className={`mt-3 px-4 py-3 rounded-lg text-sm ${
                importResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
              role="alert"
              aria-live="polite"
            >
              <p>{importResult.message}</p>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2">
                  <ul className="list-disc list-inside">
                    {(errorsExpanded ? importResult.errors : importResult.errors.slice(0, 8)).map((err, i) => (
                      <li key={i}>
                        {err.sheet != null && `[${err.sheet}] `}
                        {err.row != null && `Row ${err.row}: `}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                  {importResult.errors.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setErrorsExpanded((v) => !v)}
                      className="mt-1.5 text-xs font-medium underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    >
                      {errorsExpanded ? 'Show fewer' : `Show all ${importResult.errors.length} errors`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 relative">
            <label htmlFor="library-search" className="sr-only">
              Search metrics and variants
            </label>
            <input
              id="library-search"
              type="search"
              placeholder="Search by name, ID, or definition…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedDomain(null);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
              aria-describedby={searchQuery.trim() ? 'search-results-count' : undefined}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6 flex-wrap" role="group" aria-label="Filter by domain">
          <button
            type="button"
            onClick={() => {
              setSelectedDomain(null);
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              !selectedDomain && !searchQuery ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
            }`}
            aria-pressed={!selectedDomain && !searchQuery}
          >
            All Metrics
          </button>
          {domains.map((d) => (
            <button
              key={d.domain_id}
              type="button"
              onClick={() => {
                setSelectedDomain(d.domain_id);
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                selectedDomain === d.domain_id ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
              style={selectedDomain === d.domain_id ? { backgroundColor: d.color } : {}}
              aria-pressed={selectedDomain === d.domain_id}
            >
              <DomainIcon iconKey={d.icon} className="w-4 h-4 flex-shrink-0" />
              <span>{d.domain_name}</span>
            </button>
          ))}
        </div>

        {error && (
          <LibraryError message={error} onRetry={fetchData} backHref="/overview" backLabel="Back to Overview" />
        )}

        {!error && loading && <LibraryLoading />}

        {!error && !loading && searched.length === 0 && (
          <LibraryEmpty
            icon={BookOpen}
            title="No metrics found"
            description={
              parents.length === 0
                ? 'Run migration to import your existing metrics into the library.'
                : 'No metrics match your search or filter.'
            }
            action={
              parents.length === 0 ? (
                <div>
                  <button
                    type="button"
                    onClick={runMigration}
                    disabled={migrating}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {migrating ? 'Migrating…' : 'Migrate now'}
                  </button>
                  {migrateError && (
                    <p className="mt-2 text-sm text-red-600" role="alert">
                      {migrateError}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDomain(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  Clear search and filters
                </button>
              )
            }
          />
        )}

        {!error && !loading && searched.length > 0 && (
          <div className="space-y-6">
            <p id="search-results-count" className="text-sm text-gray-500" aria-live="polite">
              {searchQuery.trim() ? (
                <>Showing {searched.length} parent metric{searched.length !== 1 ? 's' : ''}{searchApiLoading ? ' · Searching variants…' : searchVariantHits.length > 0 ? ` · ${searchVariantHits.length} matching variant${searchVariantHits.length !== 1 ? 's' : ''}` : ''}</>
              ) : (
                <>{searched.length} metric{searched.length !== 1 ? 's' : ''}</>
              )}
            </p>
            <div className="grid gap-3">
              {searched.map((m) => (
                <Link
                  key={m.metric_id}
                  href={`/metrics/library/${encodeURIComponent(m.metric_id)}`}
                  className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all duration-200 block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 no-underline"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{m.metric_name}</h2>
                        <TypeBadge type={m.metric_class} />
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            m.direction === 'HIGHER_BETTER'
                              ? 'bg-green-50 text-green-600'
                              : m.direction === 'LOWER_BETTER'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-gray-50 text-gray-500'
                          }`}
                          aria-hidden
                        >
                          {m.direction === 'HIGHER_BETTER' ? '↑ Higher Better' : m.direction === 'LOWER_BETTER' ? '↓ Lower Better' : 'Neutral'}
                        </span>
                        {m.risk_appetite_relevant && (
                          <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                            Risk Appetite
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{m.definition}</p>
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg font-mono truncate max-w-full">
                          {m.generic_formula}
                        </code>
                        <div className="flex gap-1 flex-wrap">
                          {(m.domain_ids ?? []).map((dId) => {
                            const domain = domains.find((d) => d.domain_id === dId);
                            return domain ? (
                              <span key={dId} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                <DomainIcon iconKey={domain.icon} className="w-3 h-3 flex-shrink-0" />
                                {domain.domain_name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
                      <div className="text-2xl font-bold text-gray-900 tabular-nums">{m.variant_count ?? 0}</div>
                      <div className="text-xs text-gray-500">variants</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {searchQuery.trim() && searchVariantHits.length > 0 && (
              <section aria-labelledby="matching-variants-heading" className="pt-2 border-t border-gray-200">
                <h2 id="matching-variants-heading" className="text-sm font-semibold text-gray-700 mb-3">
                  Matching variants
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {searchVariantHits.map((v) => (
                    <li key={v.variant_id}>
                      <Link
                        href={`/metrics/library/${encodeURIComponent(v.parent_metric_id)}/${encodeURIComponent(v.variant_id)}`}
                        className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-blue-200 hover:shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        <span className="font-medium text-gray-900 truncate">{v.variant_name}</span>
                        {v.parent_metric_name && (
                          <span className="text-xs text-gray-500 truncate flex-shrink-0">→ {v.parent_metric_name}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
