'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';
import { L3_TABLES } from '@/data/l3-tables';
import { useOverviewStore } from './useOverviewStore';
import { LAYER_COLORS } from './data';
import ConnectionArrow from './ConnectionArrow';

const TIER_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Tier 1', description: 'Reads from L1 + L2 only' },
  2: { label: 'Tier 2', description: 'Reads from Tier 1 tables' },
  3: { label: 'Tier 3', description: 'Reads from Tiers 1–2' },
  4: { label: 'Tier 4', description: 'Reads from all tiers' },
};

export default function L3TieredView() {
  const l3ViewMode = useOverviewStore((s) => s.l3ViewMode);
  const setL3ViewMode = useOverviewStore((s) => s.setL3ViewMode);
  const expandedGroups = useOverviewStore((s) => s.expandedGroups);
  const toggleGroup = useOverviewStore((s) => s.toggleGroup);

  const byTier = useMemo(() => {
    const map = new Map<number, typeof L3_TABLES>();
    L3_TABLES.forEach((t) => {
      const arr = map.get(t.tier) ?? [];
      arr.push(t);
      map.set(t.tier, arr);
    });
    return map;
  }, []);

  const byDomain = useMemo(() => {
    const map = new Map<string, typeof L3_TABLES>();
    L3_TABLES.forEach((t) => {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    });
    return map;
  }, []);

  const colors = LAYER_COLORS.L3;

  return (
    <section id="l3-derived" className="scroll-mt-20">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Derived Layer (L3)</h2>
          <p className="text-sm text-slate-400">
            54 tables computed from L1 + L2. Organized in 4 execution tiers —
            each tier can only read from the tiers below it.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setL3ViewMode('tier')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              l3ViewMode === 'tier'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By Tier
          </button>
          <button
            onClick={() => setL3ViewMode('domain')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              l3ViewMode === 'domain'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By Domain
          </button>
        </div>
      </div>

      {/* Tier view */}
      {l3ViewMode === 'tier' && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((tier) => {
            const tables = byTier.get(tier as 1 | 2 | 3 | 4) ?? [];
            const info = TIER_LABELS[tier];
            const groupId = `l3-tier-${tier}`;
            const isExpanded = expandedGroups.has(groupId);

            return (
              <div key={tier}>
                {tier > 1 && (
                  <div className="flex justify-center">
                    <ConnectionArrow direction="down" label={`Tier ${tier - 1} output`} animated={false} />
                  </div>
                )}
                <div className={`rounded-lg border ${colors.border} ${colors.bg}`}>
                  <button
                    onClick={() => toggleGroup(groupId)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/30 transition-colors rounded-lg"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-violet-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-violet-400" />
                    )}
                    <span className="text-sm font-semibold text-violet-300">{info.label}</span>
                    <span className="text-[11px] text-slate-500">{info.description}</span>
                    <span className="ml-auto text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                      {tables.length} tables
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {tables.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800/40 hover:bg-slate-800/70 transition-colors"
                            >
                              <Database className="w-3 h-3 text-violet-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-mono text-slate-300 truncate">{t.name}</p>
                                <p className="text-[9px] text-slate-500 truncate">{t.category}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Domain view */}
      {l3ViewMode === 'domain' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from(byDomain.entries()).map(([domain, tables]) => {
            const groupId = `l3-domain-${domain}`;
            const isExpanded = expandedGroups.has(groupId);

            return (
              <div
                key={domain}
                className={`rounded-lg border ${colors.border} ${colors.bg}`}
              >
                <button
                  onClick={() => toggleGroup(groupId)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/30 transition-colors rounded-lg"
                >
                  <Database className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-200 flex-1 truncate">
                    {domain}
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                    {tables.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-1">
                        {tables.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800/40 hover:bg-slate-800/70 transition-colors"
                          >
                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${colors.badge}`}>
                              T{tier(t.tier)}
                            </span>
                            <p className="text-[10px] font-mono text-slate-300 truncate">{t.name}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function tier(n: number): string {
  return String(n);
}
