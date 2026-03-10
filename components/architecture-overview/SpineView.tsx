'use client';

import { useOverviewStore } from './useOverviewStore';
import { SPINE_TABLES, BRANCH_GROUPS } from './data';
import OverviewTableCard from './OverviewTableCard';
import ConnectionArrow from './ConnectionArrow';

export default function SpineView() {
  const hoveredSpineTable = useOverviewStore((s) => s.hoveredSpineTable);
  const setHoveredSpineTable = useOverviewStore((s) => s.setHoveredSpineTable);
  const hoveredGroup = useOverviewStore((s) => s.hoveredGroup);

  // Find which spine table is highlighted by a hovered branch group
  const highlightedByGroup = hoveredGroup
    ? BRANCH_GROUPS.find((g) => g.id === hoveredGroup)?.spineAttachment ?? null
    : null;

  const anyHovered = hoveredSpineTable !== null || highlightedByGroup !== null;

  return (
    <section id="spine" className="scroll-mt-20">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">The Spine</h2>
        <p className="text-sm text-slate-400">
          Four core tables form the backbone of the data model. Every other table connects to this chain.
        </p>
      </div>

      {/* The sentence */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 mb-4">
        <p className="text-sm text-slate-300 italic mb-6 text-center">
          &ldquo;A <span className="text-blue-300 font-medium">counterparty</span> signs a{' '}
          <span className="text-blue-300 font-medium">credit agreement</span>, which creates{' '}
          <span className="text-blue-300 font-medium">facilities</span>, which have{' '}
          <span className="text-emerald-300 font-medium">exposure snapshots</span> over time.&rdquo;
        </p>

        {/* Spine chain */}
        <div className="flex items-start justify-center gap-0 overflow-x-auto pb-2 px-4">
          {SPINE_TABLES.map((table, i) => {
            const isHighlighted =
              hoveredSpineTable === table.tableName ||
              highlightedByGroup === table.tableName;
            const isDimmed = anyHovered && !isHighlighted;

            return (
              <div key={table.tableName} className="flex items-start shrink-0">
                <OverviewTableCard
                  tableName={table.tableName}
                  label={table.label}
                  subtitle={table.subtitle}
                  layer={table.layer}
                  fields={table.keyFields}
                  isHighlighted={isHighlighted}
                  isDimmed={isDimmed}
                  onHover={(h) => setHoveredSpineTable(h ? table.tableName : null)}
                />
                {table.fkTo && i < SPINE_TABLES.length - 1 && (
                  <ConnectionArrow label={table.fkLabel} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500/40 border border-blue-500/60" />
          L1 — Reference Data
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/60" />
          L2 — Atomic Data
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500/40 border border-violet-500/60" />
          L3 — Derived Data
        </div>
      </div>
    </section>
  );
}
