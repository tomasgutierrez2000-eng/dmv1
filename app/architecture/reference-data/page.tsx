'use client';

import { Database } from 'lucide-react';
import ReferenceDataExplorer from '@/components/reference-data/ReferenceDataExplorer';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default function ReferenceDataPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <Breadcrumb items={[
            { label: 'Home', href: '/' },
            { label: 'Architecture', href: '/architecture' },
            { label: 'Reference Data' },
          ]} className="mb-3" />
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Reference Data Explorer
              </h1>
              <p className="text-xs text-slate-500">
                Bank-customizable dimension, lookup, and master tables
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <ReferenceDataExplorer />
      </main>
    </div>
  );
}
