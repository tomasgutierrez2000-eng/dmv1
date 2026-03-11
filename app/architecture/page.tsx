'use client';

import Link from 'next/link';
import { ArrowLeft, Layers } from 'lucide-react';
import ArchitectureFlow from '@/components/architecture/ArchitectureFlow';

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Overview
              </Link>
              <div className="w-px h-6 bg-slate-700" />
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-400" />
                <div>
                  <h1 className="text-lg font-semibold text-white tracking-tight">
                    Data Architecture
                  </h1>
                  <p className="text-xs text-slate-500">
                    End-to-end pipeline from source systems to consumption
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <ArchitectureFlow />
      </main>
    </div>
  );
}
