'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, ArrowRightLeft, Layers } from 'lucide-react';
import type { ReleaseEntry } from '@/lib/release-tracker-data';
import { generateSummaries, type ReleaseSummary, type SummaryBullet } from '@/lib/release-summary';

const CHANGE_DOT: Record<string, string> = {
  Added: 'bg-green-400',
  Removed: 'bg-red-400',
  Moved: 'bg-sky-400',
  Mixed: 'bg-amber-400',
};

const LAYER_BADGE: Record<string, string> = {
  L1: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  L2: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  L3: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

function StatBadge({ icon, label, count, className }: { icon: React.ReactNode; label: string; count: number; className: string }) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
      {icon}
      {count} {label}
    </span>
  );
}

function BulletItem({ bullet }: { bullet: SummaryBullet }) {
  return (
    <li className="flex items-start gap-2 text-xs text-slate-400">
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${CHANGE_DOT[bullet.changeType]}`} />
      <span>
        <span className="text-slate-500 font-medium">{bullet.category}:</span>{' '}
        {bullet.text}
      </span>
    </li>
  );
}

function SummaryCard({ summary, isExpanded, onToggle }: { summary: ReleaseSummary; isExpanded: boolean; onToggle: () => void }) {
  const { date, narrative, bullets, stats } = summary;

  const activeLayers = (['L1', 'L2', 'L3'] as const).filter(l => stats.byLayer[l] > 0);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/80 transition-colors"
      >
        {isExpanded
          ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
        }

        <span className="text-sm font-mono text-slate-200 font-medium">{date}</span>

        <div className="flex items-center gap-1.5 ml-2">
          {activeLayers.map(l => (
            <span key={l} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${LAYER_BADGE[l]}`}>
              {l}
            </span>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatBadge
            icon={<Plus className="w-3 h-3" />}
            label={plural('field', stats.fieldsAdded)}
            count={stats.fieldsAdded}
            className="bg-green-500/10 text-green-400 border-green-500/20"
          />
          <StatBadge
            icon={<Minus className="w-3 h-3" />}
            label={plural('field', stats.fieldsRemoved)}
            count={stats.fieldsRemoved}
            className="bg-red-500/10 text-red-400 border-red-500/20"
          />
          {(stats.tablesAdded > 0 || stats.tablesRemoved > 0) && (
            <StatBadge
              icon={<Layers className="w-3 h-3" />}
              label={plural('table', stats.tablesAdded + stats.tablesRemoved)}
              count={stats.tablesAdded + stats.tablesRemoved}
              className="bg-purple-500/10 text-purple-400 border-purple-500/20"
            />
          )}
          {stats.fieldsMoved > 0 && (
            <StatBadge
              icon={<ArrowRightLeft className="w-3 h-3" />}
              label="moved"
              count={stats.fieldsMoved}
              className="bg-sky-500/10 text-sky-400 border-sky-500/20"
            />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          {/* Narrative */}
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            {narrative}
          </p>

          {/* Bullets */}
          {bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {bullets.map((b, i) => (
                <BulletItem key={i} bullet={b} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function plural(word: string, n: number): string {
  return n === 1 ? word : word + 's';
}

export default function ReleaseSummaryCards({ entries }: { entries: ReleaseEntry[] }) {
  const summaries = useMemo(() => generateSummaries(entries), [entries]);

  // Most recent date expanded by default
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (summaries.length > 0) initial.add(summaries[0].date);
    return initial;
  });

  function toggleDate(date: string) {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  if (summaries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
        Release Summary
      </h3>
      {summaries.map(s => (
        <SummaryCard
          key={s.date}
          summary={s}
          isExpanded={expandedDates.has(s.date)}
          onToggle={() => toggleDate(s.date)}
        />
      ))}
    </div>
  );
}
