'use client';

import { useState } from 'react';
import { Building2, Briefcase, Users, Database as DbIcon, FileText } from 'lucide-react';

const ROLLUP_LEVELS = [
  {
    level: 'Business Segment',
    table: 'enterprise_business_taxonomy',
    layer: 'L1',
    color: '#ec4899',
    bg: 'bg-pink-950/40',
    border: 'border-pink-500/30',
    icon: Building2,
    description: 'Highest level: lines of business (Commercial Banking, Markets, etc.)',
    width: 100,
  },
  {
    level: 'Portfolio',
    table: 'portfolio_dim',
    layer: 'L1',
    color: '#10b981',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/30',
    icon: Briefcase,
    description: 'Groups of facilities managed together',
    width: 85,
  },
  {
    level: 'Desk',
    table: 'org_unit_dim → L3 aggregation',
    layer: 'L3',
    color: '#f59e0b',
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/30',
    icon: Users,
    description: 'Trading desk or team-level grouping',
    width: 70,
  },
  {
    level: 'Counterparty',
    table: 'counterparty',
    layer: 'L1',
    color: '#a855f7',
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/30',
    icon: Users,
    description: 'The borrower or issuer entity',
    width: 55,
  },
  {
    level: 'Facility',
    table: 'facility_master',
    layer: 'L1',
    color: '#3b82f6',
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/30',
    icon: DbIcon,
    description: 'Individual loan, line of credit, or commitment',
    width: 40,
  },
  {
    level: 'Position / Snapshot',
    table: 'facility_exposure_snapshot',
    layer: 'L2',
    color: '#06b6d4',
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/30',
    icon: FileText,
    description: 'Most granular: daily exposure readings per facility',
    width: 25,
  },
];

export default function RollupView() {
  const [hoveredLevel, setHoveredLevel] = useState(null as number | null);

  return (
    <section id="rollup" className="scroll-mt-20">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">The Rollup</h2>
        <p className="text-sm text-slate-400">
          Metrics aggregate upward through the hierarchy. Each level adds together
          the values from the level below it.
        </p>
      </div>

      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-8">
        {/* Pyramid */}
        <div className="flex flex-col items-center gap-2 max-w-3xl mx-auto">
          {ROLLUP_LEVELS.map((level, i) => {
            const Icon = level.icon;
            const isDimmed = hoveredLevel !== null && hoveredLevel !== i;
            const isHighlighted = hoveredLevel === i;

            return (
              <div
                key={level.level}
                className="flex flex-col items-center w-full"
              >
                {/* Aggregation arrow */}
                {i > 0 && (
                  <div className="py-1">
                    <svg width="16" height="12" viewBox="0 0 16 12">
                      <polygon points="8,0 16,12 0,12" fill="#334155" />
                    </svg>
                  </div>
                )}

                {/* Level bar */}
                <div
                  className={`
                    ${level.bg} ${level.border} border rounded-lg px-4 py-3
                    flex items-center gap-3 cursor-pointer
                    transition-all duration-200
                    ${isDimmed ? 'opacity-30' : 'opacity-100'}
                    ${isHighlighted ? 'ring-1 ring-white/20 scale-[1.02]' : ''}
                  `}
                  style={{ width: `${level.width}%` }}
                  onMouseEnter={() => setHoveredLevel(i)}
                  onMouseLeave={() => setHoveredLevel(null)}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: level.color }} />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200 whitespace-nowrap">{level.level}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-500 whitespace-nowrap">
                        {level.layer}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{level.table}</p>
                    {level.width >= 55 && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5 hidden sm:block">
                        {level.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 italic">
            Metrics at the Facility level aggregate up to Counterparty, then Desk,
            Portfolio, and finally Business Segment.
          </p>
        </div>
      </div>
    </section>
  );
}
