'use client';

import { Map } from 'lucide-react';
import ArchitectureOverview from '@/components/architecture-overview/ArchitectureOverview';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default function ArchitectureOverviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <Breadcrumb items={[
            { label: 'Home', href: '/' },
            { label: 'Architecture', href: '/architecture' },
            { label: 'Data Model Overview' },
          ]} className="mb-3" />
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-slate-400" />
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Data Model Overview
              </h1>
              <p className="text-xs text-slate-500">
                Tables, relationships & data flow across L1, L2, L3
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <ArchitectureOverview />
      </main>
    </div>
  );
}
