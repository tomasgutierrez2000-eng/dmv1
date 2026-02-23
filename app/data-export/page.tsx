import Link from 'next/link';
import { ArrowLeft, Download, Database, FileSpreadsheet } from 'lucide-react';

export const metadata = {
  title: 'Data Export',
  description: 'Underlying Records, Summarized Details — Data Table Library; optional lineage metadata',
};

/**
 * Page 8 — Data Export.
 * Placeholder: Underlying Records, Summarized Details lists from DTL;
 * Key Fields pills and optional lineage metadata export (Phase 3+).
 */
export default function DataExportPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/overview"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Page 8 — Data Export</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Underlying Records, Summarized Details; optional lineage metadata (Data Table Library)
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2 mb-10">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-8 h-8 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Underlying Records</h2>
            </div>
            <p className="text-slate-400 text-sm">Raw and Conformed/Curated layer tables from Data Table Library.</p>
            <p className="text-slate-500 text-xs mt-2">Catalog tables in <Link href="/data-catalog" className="text-purple-400 hover:underline">Data Catalog</Link>, then underlying records will appear here.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Summarized Details</h2>
            </div>
            <p className="text-slate-400 text-sm">Reporting/Aggregated layer tables from Data Table Library.</p>
            <p className="text-slate-500 text-xs mt-2">Catalog tables in <Link href="/data-catalog" className="text-purple-400 hover:underline">Data Catalog</Link>, then summarized datasets will appear here.</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Download className="w-6 h-6 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Export options</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Export packages can include a companion dataset with lineage metadata (source system, feed, mapping version, last validation) per field.
          </p>
        </div>
        <p className="text-slate-500 text-sm mt-6">
          <Link href="/lineage" className="text-purple-400 hover:underline">L3 Lineage</Link>
          {' · '}
          <Link href="/metrics/library" className="text-purple-400 hover:underline">Metric Library</Link>
        </p>
      </main>
    </div>
  );
}
