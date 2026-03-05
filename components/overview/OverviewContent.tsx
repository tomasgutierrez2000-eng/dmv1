'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Database, Layers, BarChart3, FileText, ArrowRight, Play, Eye, Network, MessageCircle, BookOpen, Library, History, Activity, Target, Telescope, Cpu, Columns3 } from 'lucide-react';
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Bank Data Model Overview</h1>
              <p className="text-sm text-slate-400 mt-1">Three-layer architecture for banking and financial services data</p>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {/* Executive Summary — hover/focus dropdown */}
            <div className="relative group">
              <button
                type="button"
                aria-haspopup="true"
                className="bg-[#D04A02] group-hover:bg-[#E87722] group-focus-within:bg-[#E87722] text-white rounded-lg text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 text-center cursor-pointer h-full w-full"
              >
                <Activity className="w-4 h-4" />
                <span className="leading-tight">Executive Summary</span>
              </button>
              {/* Dropdown */}
              <div className="absolute top-full left-0 right-0 pt-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150">
                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  {[
                    { href: '/executive-summary', icon: Activity, label: 'The Pulse', desc: 'Animated pipeline' },
                    { href: '/executive-summary/pick-a-metric', icon: Target, label: 'Pick a Metric', desc: 'Metric journey' },
                    { href: '/executive-summary/telescope', icon: Telescope, label: 'The Telescope', desc: 'Zoom drill-down' },
                    { href: '/executive-summary/blueprint', icon: Cpu, label: 'Living Blueprint', desc: 'Interactive architecture' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-700 transition-colors"
                    >
                      <item.icon className="w-3.5 h-3.5 text-[#E87722] flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Other nav items */}
            {[
              { href: '/architecture', icon: Layers, label: 'Architecture', bg: 'bg-teal-600', hover: 'hover:bg-teal-500' },
              { href: '/metrics/library', icon: Library, label: 'Metrics', bg: 'bg-violet-600', hover: 'hover:bg-violet-500' },
              { href: '/data-elements', icon: Columns3, label: 'Data Elements', bg: 'bg-cyan-600', hover: 'hover:bg-cyan-500' },
              { href: '/agent', icon: MessageCircle, label: 'Ask AI', bg: 'bg-slate-700', hover: 'hover:bg-slate-600' },
              { href: '/guide', icon: BookOpen, label: 'Playbook', bg: 'bg-blue-600', hover: 'hover:bg-blue-500' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${item.bg} ${item.hover} text-white rounded-lg text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 text-center`}
              >
                <item.icon className="w-4 h-4" />
                <span className="leading-tight">{item.label}</span>
              </Link>
            ))}
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
              by dashboards and reports: facility summaries, desk roll-ups, Business Segment aggregations.
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
            <Link
              href="/executive-summary"
              className="bg-slate-900/80 border border-[#D04A02]/30 rounded-xl p-6 cursor-pointer hover:border-[#D04A02]/50 hover:bg-slate-900 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D04A02] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#D04A02]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#D04A02]/25 transition-colors">
                  <Activity className="w-6 h-6 text-[#D04A02]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">The Pulse</h4>
                  <p className="text-sm text-slate-400">Animated executive summary</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Watch data flow from 8 source systems through the canonical model and processing engine to final dashboards. A keynote-style animated presentation.
              </p>
              <div className="flex items-center gap-2 text-[#D04A02] font-medium text-sm group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>Launch The Pulse</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="/executive-summary/pick-a-metric"
              className="bg-slate-900/80 border border-[#E87722]/30 rounded-xl p-6 cursor-pointer hover:border-[#E87722]/50 hover:bg-slate-900 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E87722] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#E87722]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#E87722]/25 transition-colors">
                  <Target className="w-6 h-6 text-[#E87722]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">Pick a Metric</h4>
                  <p className="text-sm text-slate-400">Interactive metric journey</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Choose any metric and follow its complete journey — from raw source data through tables, calculation, aggregation, and onto the executive dashboard.
              </p>
              <div className="flex items-center gap-2 text-[#E87722] font-medium text-sm group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>Explore Metrics</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="/executive-summary/telescope"
              className="bg-slate-900/80 border border-[#a78bfa]/30 rounded-xl p-6 cursor-pointer hover:border-[#a78bfa]/50 hover:bg-slate-900 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#a78bfa]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#a78bfa]/25 transition-colors">
                  <Telescope className="w-6 h-6 text-[#a78bfa]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">The Telescope</h4>
                  <p className="text-sm text-slate-400">Zoom drill-down explorer</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Start from a bird&apos;s-eye view of the full pipeline and progressively zoom into any stage, component, and detail level.
              </p>
              <div className="flex items-center gap-2 text-[#a78bfa] font-medium text-sm group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>Start Exploring</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="/executive-summary/blueprint"
              className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-6 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                  <Cpu className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">The Living Blueprint</h4>
                  <p className="text-sm text-slate-400">Interactive architecture</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                See the complete architecture as a living system with animated data flowing between stages. Expand any component to explore its details.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>View Blueprint</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setActiveWalkthrough('facility-summary')}
              className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-slate-600 hover:bg-slate-900 transition-all group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                <Play className="w-4 h-4" aria-hidden />
                <span>Start Walkthrough</span>
                <ArrowRight className="w-4 h-4" aria-hidden />
              </div>
            </button>

            <Link
              href="/metrics"
              className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-slate-600 hover:bg-slate-900 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                <Play className="w-4 h-4" aria-hidden />
                <span>Open Metrics Engine</span>
                <ArrowRight className="w-4 h-4" aria-hidden />
              </div>
            </Link>

            <Link
              href="/metrics/library"
              className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-slate-600 hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-600 transition-colors">
                  <Library className="w-6 h-6 text-slate-300" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">Metric Library</h4>
                  <p className="text-sm text-slate-400">Browse all metrics &amp; variants</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                The comprehensive catalog of all parent metrics, variants, domains, lineage, governance, and validation rules. Search, filter, and explore the full metric taxonomy.
              </p>
              <div className="flex items-center gap-2 text-slate-400 font-medium text-sm group-hover:text-slate-300 group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>Open Metric Library</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="/data-elements"
              className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-6 cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/25 transition-colors">
                  <Columns3 className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1 text-white">Data Elements Library</h4>
                  <p className="text-sm text-slate-400">Tables, fields &amp; relationships</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Browse all tables and fields across L1, L2, and L3. Search by name, explore FK relationships, view data types, and trace which metrics depend on each table.
              </p>
              <div className="flex items-center gap-2 text-cyan-400 font-medium text-sm group-hover:gap-3 transition-all">
                <Play className="w-4 h-4" />
                <span>Open Data Elements</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-8">
          <h3 className="text-xl font-semibold mb-6 text-center text-white">Quick Actions</h3>
          <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Link
              href="/visualizer"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-6 text-center transition-all hover:border-slate-500 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Network className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <h4 className="font-semibold mb-2 text-white">Interactive Visualizer</h4>
              <p className="text-sm text-slate-400">Explore the full data model with interactive ERD and sample data</p>
            </Link>
            <Link
              href="/metrics/library"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-6 text-center transition-all hover:border-slate-500 group"
            >
              <BarChart3 className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <h4 className="font-semibold mb-2 text-white">Metric Library</h4>
              <p className="text-sm text-slate-400">Browse all metrics with lineage, formulas, and variant governance</p>
            </Link>
            <Link
              href="/data-elements"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-6 text-center transition-all hover:border-slate-500 group"
            >
              <Columns3 className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <h4 className="font-semibold mb-2 text-white">Data Elements</h4>
              <p className="text-sm text-slate-400">Browse all tables, fields, and FK relationships across L1/L2/L3</p>
            </Link>
            <Link
              href="/guide"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-6 text-center transition-all hover:border-slate-500 group"
            >
              <BookOpen className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <h4 className="font-semibold mb-2 text-white">Team Playbook</h4>
              <p className="text-sm text-slate-400">Architecture guide, recipes, and glossary for the team</p>
            </Link>
          </div>
        </div>

        {/* Release Tracker */}
        <div className="mt-8">
          <Link
            href="/release-tracker"
            className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 flex items-center gap-4 hover:border-slate-600 hover:bg-slate-900 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-600 transition-colors">
              <History className="w-6 h-6 text-slate-300" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-lg text-white">Release Tracker</h4>
              <p className="text-sm text-slate-400">View all data model changes — tables and fields added, removed, or moved across L1, L2, and L3</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
