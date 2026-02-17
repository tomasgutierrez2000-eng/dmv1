'use client';

import Link from 'next/link';
import { Database, Layers, BarChart3, ArrowRight, Network } from 'lucide-react';

export default function ModelDeepDive() {
  return (
    <>
      {/* Deep dive intro */}
      <section id="deep-dive" className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-pwc-white mb-6 font-space-mono uppercase tracking-tight">
          Deep dive: the model
        </h2>
        <p className="text-lg text-pwc-white/80 leading-relaxed max-w-3xl mx-auto">
          The bank data model is built in three layers. L1 holds reference and master data—counterparties, facilities,
          credit agreements, and hierarchies. L2 adds time-series snapshots and events (exposure, collateral, amendments).
          L3 derives the metrics and roll-ups that feed reporting and dashboards. Together they turn raw financial data
          into regulatory and business-ready insights.
        </p>
      </section>

      <div className="w-full border-t border-[0.5px] border-pwc-gray-light/10" />

      {/* L1 / L2 / L3 overview */}
      <section id="l1-l2-l3" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-pwc-white mb-4 font-space-mono uppercase tracking-tight text-center">
          Three-layer architecture
        </h2>
        <p className="text-pwc-white/70 text-center max-w-2xl mx-auto mb-12">
          Reference data → snapshots & events → derived metrics
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* L1 */}
          <div className="bg-white/5 border border-[0.5px] border-pwc-orange/40 rounded-xl p-8 hover:border-pwc-orange transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-lg bg-pwc-orange/20 flex items-center justify-center">
                <Database className="w-7 h-7 text-pwc-orange" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-pwc-orange font-space-mono">L1</h3>
                <p className="text-sm text-pwc-white/60">Reference & master</p>
              </div>
            </div>
            <p className="text-pwc-white/80 mb-4 leading-relaxed text-sm">
              Master reference tables: facilities, counterparties, credit agreements, netting, collateral, and dimensional
              hierarchies. Source of truth for terms, identities, and taxonomy.
            </p>
            <ul className="space-y-2 text-sm text-pwc-white/60">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange" />
                Master reference tables
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange" />
                Source of truth
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange" />
                Dimensional hierarchies
              </li>
            </ul>
          </div>

          {/* L2 */}
          <div className="bg-white/5 border border-[0.5px] border-pwc-orange-light/40 rounded-xl p-8 hover:border-pwc-orange-light transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-lg bg-pwc-orange-light/20 flex items-center justify-center">
                <Layers className="w-7 h-7 text-pwc-orange-light" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-pwc-orange-light font-space-mono">L2</h3>
                <p className="text-sm text-pwc-white/60">Snapshots & events</p>
              </div>
            </div>
            <p className="text-pwc-white/80 mb-4 leading-relaxed text-sm">
              Time-series snapshots (exposure, collateral, pricing) and event records (amendments, rating changes).
              Captures the changing state of facilities over time, simplified from source systems.
            </p>
            <ul className="space-y-2 text-sm text-pwc-white/60">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange-light" />
                Monthly snapshots
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange-light" />
                Event tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange-light" />
                Simplified from source
              </li>
            </ul>
          </div>

          {/* L3 */}
          <div className="bg-white/5 border border-[0.5px] border-pwc-orange/30 rounded-xl p-8 hover:border-pwc-orange transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-pwc-orange" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-pwc-orange font-space-mono">L3</h3>
                <p className="text-sm text-pwc-white/60">Derived & aggregated</p>
              </div>
            </div>
            <p className="text-pwc-white/80 mb-4 leading-relaxed text-sm">
              Calculated metrics, roll-ups, and enriched views from L1 and L2. Final outputs for dashboards and
              reports: facility summaries, desk roll-ups, LoB aggregations.
            </p>
            <ul className="space-y-2 text-sm text-pwc-white/60">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange" />
                Calculated metrics
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange" />
                Roll-up aggregations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pwc-orange" />
                Dashboard-ready
              </li>
            </ul>
          </div>
        </div>

        {/* Data flow */}
        <div className="bg-white/5 border border-[0.5px] border-pwc-gray-light/20 rounded-xl p-8 mb-16">
          <h3 className="text-xl font-bold text-pwc-white mb-6 text-center font-space-mono uppercase tracking-tight">
            Data flow: L1 → L2 → L3
          </h3>
          <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-pwc-orange/20 border border-pwc-orange/40 flex items-center justify-center mb-3 mx-auto">
                <Database className="w-10 h-10 text-pwc-orange" />
              </div>
              <p className="font-semibold text-pwc-orange text-sm">L1 Reference</p>
              <p className="text-xs text-pwc-white/50 mt-1">Master data</p>
            </div>
            <ArrowRight className="w-6 h-6 text-pwc-white/40 flex-shrink-0" />
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-pwc-orange-light/20 border border-green-500/40 flex items-center justify-center mb-3 mx-auto">
                <Layers className="w-10 h-10 text-pwc-orange-light" />
              </div>
              <p className="font-semibold text-pwc-orange-light text-sm">L2 Snapshots</p>
              <p className="text-xs text-pwc-white/50 mt-1">Time-series</p>
            </div>
            <ArrowRight className="w-6 h-6 text-pwc-white/40 flex-shrink-0" />
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mb-3 mx-auto">
                <BarChart3 className="w-10 h-10 text-pwc-orange" />
              </div>
              <p className="font-semibold text-pwc-orange text-sm">L3 Derived</p>
              <p className="text-xs text-pwc-white/50 mt-1">Business metrics</p>
            </div>
          </div>
          <p className="text-center text-pwc-white/60 mt-8 text-sm max-w-xl mx-auto">
            Reference data flows through time-series snapshots, then into calculations and aggregations
            that drive reporting and business decisions.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link
            href="/visualizer"
            className="bg-white/5 border border-[0.5px] border-pwc-gray-light/20 rounded-xl p-6 text-center transition-all hover:border-pwc-orange hover:bg-white/10 group"
          >
            <Network className="w-8 h-8 mx-auto mb-3 text-pwc-orange" />
            <h4 className="font-semibold text-pwc-white mb-2 font-space-mono text-sm uppercase">Interactive visualizer</h4>
            <p className="text-xs text-pwc-white/60">Explore the full model and L1 sample data</p>
          </Link>
          <Link
            href="/overview"
            className="bg-white/5 border border-[0.5px] border-pwc-gray-light/20 rounded-xl p-6 text-center transition-all hover:border-pwc-orange hover:bg-white/10 group"
          >
            <Layers className="w-8 h-8 mx-auto mb-3 text-pwc-orange" />
            <h4 className="font-semibold text-pwc-white mb-2 font-space-mono text-sm uppercase">Full overview</h4>
            <p className="text-xs text-pwc-white/60">Walkthroughs and interactive Facility Summary</p>
          </Link>
        </div>
      </section>
    </>
  );
}
