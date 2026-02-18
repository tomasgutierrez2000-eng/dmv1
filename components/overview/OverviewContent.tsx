'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Database, Layers, BarChart3, FileText, ArrowRight, Play, Eye, Network } from 'lucide-react';
import FacilitySummaryWalkthrough from '@/components/walkthroughs/FacilitySummaryWalkthrough';

export default function OverviewContent() {
  const [activeWalkthrough, setActiveWalkthrough] = useState<string | null>(null);

  if (activeWalkthrough === 'facility-summary') {
    return <FacilitySummaryWalkthrough onClose={() => setActiveWalkthrough(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Bank Data Model Overview</h1>
              <p className="text-sm text-slate-400 mt-1">Three-layer architecture for banking and financial services data</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/visualizer"
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Network className="w-4 h-4" />
                Interactive Visualizer
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold mb-4 text-white tracking-tight">
            Three-Layer Bank Data Architecture
          </h2>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            The banking data model is organized into three layers: reference and master data (L1), snapshots and events (L2),
            and derived metrics and reporting (L3)—transforming raw financial data into regulatory and business insights.
          </p>
        </div>

        {/* Layer Overview Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* L1 Layer */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-8 backdrop-blur-sm hover:border-slate-600 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-lg bg-slate-700/80 flex items-center justify-center">
                <Database className="w-7 h-7 text-slate-300" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">L1</h3>
                <p className="text-sm text-slate-400">Reference Data</p>
              </div>
            </div>
            <p className="text-slate-300 mb-4 leading-relaxed text-sm">
              <strong className="text-white">&quot;Here&apos;s reality as-is&quot;</strong> — Master reference tables that define
              the core entities: facilities, counterparties, credit agreements, and dimensional hierarchies.
              These are the source of truth for facility terms, counterparty identities, and business taxonomy.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Master reference tables</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Source of truth</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Dimensional hierarchies</span>
              </div>
            </div>
          </div>

          {/* L2 Layer */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-8 backdrop-blur-sm hover:border-slate-600 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-lg bg-slate-700/80 flex items-center justify-center">
                <Layers className="w-7 h-7 text-slate-300" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">L2</h3>
                <p className="text-sm text-slate-400">Snapshots & Events</p>
              </div>
            </div>
            <p className="text-slate-300 mb-4 leading-relaxed text-sm">
              <strong className="text-white">&quot;Here&apos;s how we simplified it for usability&quot;</strong> — Time-series
              snapshots (monthly exposure readings, collateral valuations) and event records (amendments, rating
              changes). These capture the changing state of facilities over time, simplified from complex source
              systems.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Monthly snapshots</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Event tracking</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Simplified from source</span>
              </div>
            </div>
          </div>

          {/* L3 Layer */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-8 backdrop-blur-sm hover:border-slate-600 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-lg bg-slate-700/80 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-slate-300" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">L3</h3>
                <p className="text-sm text-slate-400">Derived & Aggregated</p>
              </div>
            </div>
            <p className="text-slate-300 mb-4 leading-relaxed text-sm">
              <strong className="text-white">&quot;Here&apos;s what we derived for business decisions&quot;</strong> — Calculated
              metrics, roll-ups, and enriched views assembled from L1 and L2. These are the final outputs used
              by dashboards and reports: facility summaries, desk roll-ups, LoB aggregations.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Calculated metrics</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Roll-up aggregations</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Dashboard-ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Flow Visualization */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-8 mb-16">
          <h3 className="text-xl font-semibold mb-6 text-center text-white">Data Flow: L1 → L2 → L3</h3>
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
            <div className="text-center">
              <div className="w-24 h-24 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center mb-3">
                <Database className="w-12 h-12 text-slate-300" />
              </div>
              <p className="font-semibold text-white text-sm">L1 Reference</p>
              <p className="text-xs text-slate-400 mt-1">Master data</p>
            </div>
            <ArrowRight className="w-8 h-8 text-slate-500 flex-shrink-0" />
            <div className="text-center">
              <div className="w-24 h-24 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center mb-3">
                <Layers className="w-12 h-12 text-slate-300" />
              </div>
              <p className="font-semibold text-white text-sm">L2 Snapshots</p>
              <p className="text-xs text-slate-400 mt-1">Time-series data</p>
            </div>
            <ArrowRight className="w-8 h-8 text-slate-500 flex-shrink-0" />
            <div className="text-center">
              <div className="w-24 h-24 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center mb-3">
                <BarChart3 className="w-12 h-12 text-slate-300" />
              </div>
              <p className="font-semibold text-white text-sm">L3 Derived</p>
              <p className="text-xs text-slate-400 mt-1">Business metrics</p>
            </div>
          </div>
          <p className="text-center text-slate-400 mt-8 text-sm max-w-2xl mx-auto">
            Raw reference data flows through time-series snapshots, then gets enriched with calculations and
            aggregations to produce the final dashboard-ready views that drive business decisions.
          </p>
        </div>

        {/* Walkthroughs Section */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold mb-4 text-center text-white">Interactive Walkthroughs</h3>
          <p className="text-center text-slate-400 mb-8 max-w-2xl mx-auto text-sm">
            Explore how data flows through the layers with these guided walkthroughs. Each demonstrates
            how different parts of the model work together.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              onClick={() => setActiveWalkthrough('facility-summary')}
              className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-slate-600 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-600 transition-colors">
                  <FileText className="w-6 h-6 text-slate-300" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">Facility Summary</h4>
                  <p className="text-sm text-slate-400">How one dashboard row is assembled</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                See how 8 different L1 and L2 sources come together to create a single facility summary row,
                including calculations for EAD, expected loss, and coverage ratios.
              </p>
              <div className="flex items-center gap-2 text-slate-400 font-medium text-sm group-hover:text-slate-300 group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>Start Walkthrough</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <Link
              href="/metrics"
              className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-slate-600 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-600 transition-colors">
                  <Eye className="w-6 h-6 text-slate-300" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">Metrics Engine</h4>
                  <p className="text-sm text-slate-400">View, edit &amp; manage metrics</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                See all metrics, walk through how each is calculated, edit formulas and source fields, create new metrics, and visualize lineage. Export and import via Excel or JSON.
              </p>
              <div className="flex items-center gap-2 text-slate-400 font-medium text-sm group-hover:text-slate-300 group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>Open Metrics Engine</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-6 opacity-60 cursor-default" aria-disabled="true">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                  <Network className="w-6 h-6 text-slate-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-slate-400">Impact Analysis</h4>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded">Coming soon</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Select a table or field and see everything upstream and downstream that depends on it.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-8">
          <h3 className="text-xl font-semibold mb-6 text-center text-white">Quick Actions</h3>
          <div className="grid md:grid-cols-1 gap-4 max-w-md mx-auto">
            <Link
              href="/visualizer"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-6 text-center transition-all hover:border-slate-500 group"
            >
              <Network className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <h4 className="font-semibold mb-2 text-white">Interactive Visualizer</h4>
              <p className="text-sm text-slate-400">Explore the full bank data model with interactive ERD and L1 sample data</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
