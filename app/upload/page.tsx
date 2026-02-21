'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { FileUp, LayoutDashboard, Network, Loader2, CheckCircle, AlertCircle, Table2 } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [applyDdl, setApplyDdl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    ddlGenerated?: boolean;
    ddlPaths?: string[];
    ddlApplied?: boolean;
    ddlApplyError?: string;
    details?: { statistics?: { L1_tables: number; L2_tables: number; L3_tables: number }; errors?: string[] };
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      if (applyDdl) formData.set('applyDdl', 'true');
      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });
      let data: { success?: boolean; message?: string; error?: string; ddlGenerated?: boolean; ddlPaths?: string[]; ddlApplied?: boolean; ddlApplyError?: string; details?: { errors?: string[] } } = {};
      try {
        data = await res.json();
      } catch {
        setResult({ success: false, message: res.ok ? 'Invalid response from server.' : `Upload failed (${res.status}).` });
        return;
      }
      const message = data.message ?? (data.error ?? (res.ok ? 'Done.' : `Request failed (${res.status}).`));
      setResult({
        success: data.success === true && res.ok,
        message,
        ddlGenerated: data.ddlGenerated,
        ddlPaths: data.ddlPaths,
        ddlApplied: data.ddlApplied,
        ddlApplyError: data.ddlApplyError,
        details: data.details,
      });
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Upload failed',
      });
    } finally {
      setLoading(false);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br bg-pwc-black text-pwc-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="w-16 h-16 rounded-2xl bg-pwc-gray border border-pwc-gray-light flex items-center justify-center mx-auto mb-6">
          <FileUp className="w-8 h-8 text-pwc-gray-light" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">Upload Excel</h1>
        <p className="text-pwc-gray-light mb-6 text-center text-sm">
          Upload an Excel file with L1, L2, and optionally L3 sheets to update the data dictionary. DDL files are generated automatically; you can optionally apply DDL to the database.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="excel-file" className="block text-sm font-medium text-pwc-gray-light mb-2">
              Excel file (L1, L2, L3 sheets)
            </label>
            <input
              ref={inputRef}
              id="excel-file"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-pwc-gray-light file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pwc-orange file:text-white file:font-medium hover:file:bg-pwc-orange-light"
              aria-describedby="file-hint"
            />
            <p id="file-hint" className="mt-1.5 text-xs text-pwc-gray-light/80">
              Required: L1 and L2 sheets. Optional: L3. Column headers must match the data model template.
            </p>
          </div>
          <label htmlFor="apply-ddl" className="flex items-center gap-2 cursor-pointer text-pwc-gray-light hover:text-white transition-colors">
            <input
              id="apply-ddl"
              type="checkbox"
              checked={applyDdl}
              onChange={(e) => setApplyDdl(e.target.checked)}
              className="rounded border-pwc-gray-light text-pwc-orange focus:ring-pwc-orange focus:ring-offset-0"
              aria-describedby="apply-ddl-hint"
            />
            <span id="apply-ddl-hint" className="text-sm">
              Apply DDL to database after upload (requires DATABASE_URL)
            </span>
          </label>
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-pwc-orange hover:bg-pwc-orange-light rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-pwc-orange-light focus-visible:ring-offset-2 focus-visible:ring-offset-pwc-black"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4" />
                Upload &amp; process
              </>
            )}
          </button>
        </form>

        {result && (
          <div
            role="alert"
            aria-live="polite"
            className={`mt-6 p-4 rounded-lg border ${
              result.success ? 'bg-emerald-900/20 border-emerald-600 text-emerald-100' : 'bg-red-900/20 border-red-600 text-red-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm space-y-1">
                <p>{result.message}</p>
                {result.ddlGenerated && result.ddlPaths && result.ddlPaths.length > 0 && (
                  <p className="text-pwc-gray-light">DDL files updated: {result.ddlPaths.length} layer(s).</p>
                )}
                {result.ddlApplied === true && (
                  <p className="text-emerald-300">Database updated successfully.</p>
                )}
                {result.ddlApplyError && (
                  <p className="text-red-300">Database: {result.ddlApplyError}</p>
                )}
                {result.details?.errors && result.details.errors.length > 0 && (
                  <ul className="list-disc list-inside mt-2 text-amber-200">
                    {result.details.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.details.errors.length > 5 && (
                      <li>…and {result.details.errors.length - 5} more</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-pwc-gray-light">
          Use the Data Model page to add or edit tables manually. After upload, open the Visualizer to explore the updated model.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/overview"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-pwc-gray hover:bg-pwc-gray-light rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pwc-orange focus-visible:ring-offset-2 focus-visible:ring-offset-pwc-black"
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden />
            Overview
          </Link>
          <Link
            href="/data-model"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-pwc-gray hover:bg-pwc-gray-light rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pwc-orange focus-visible:ring-offset-2 focus-visible:ring-offset-pwc-black"
          >
            <Table2 className="w-4 h-4" aria-hidden />
            Data Model
          </Link>
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-pwc-orange/80 hover:bg-pwc-orange rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pwc-orange focus-visible:ring-offset-2 focus-visible:ring-offset-pwc-black"
          >
            <Network className="w-4 h-4" aria-hidden />
            Visualizer
          </Link>
        </div>
      </div>
    </div>
  );
}
