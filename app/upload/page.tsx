'use client';

import Link from 'next/link';
import { FileUp, LayoutDashboard, Network } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-700/50 border border-slate-600 flex items-center justify-center mx-auto mb-6">
          <FileUp className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Upload Excel</h1>
        <p className="text-slate-400 mb-8">
          This feature is temporarily disabled. It will be re-enabled when you make changes to your current tables.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/overview"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </Link>
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Network className="w-4 h-4" />
            Interactive Visualizer
          </Link>
        </div>
      </div>
    </div>
  );
}
