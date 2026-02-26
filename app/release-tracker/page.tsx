'use client';

import Link from 'next/link';
import { ArrowLeft, History } from 'lucide-react';
import ReleaseTracker from '@/components/overview/ReleaseTracker';

export default function ReleaseTrackerPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <ArrowLeft className="w-4 h-4 text-slate-300" aria-hidden />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Release Tracker</h1>
                <p className="text-sm text-slate-400 mt-1">Data model changes — tables and fields added, removed, or moved</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-8">
        <ReleaseTracker />
      </section>
    </div>
  );
}
