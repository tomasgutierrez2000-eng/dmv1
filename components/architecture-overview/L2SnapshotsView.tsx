'use client';

import { L2_GROUPS } from './data';
import BranchCluster from './BranchCluster';
import ConnectionArrow from './ConnectionArrow';

export default function L2SnapshotsView() {
  return (
    <section id="l2-snapshots" className="scroll-mt-20">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">Snapshots & Events</h2>
        <p className="text-sm text-slate-400">
          L2 tables capture raw, point-in-time observations. Snapshots are taken daily;
          events are recorded as they happen. Nothing here is calculated — that&apos;s L3&apos;s job.
        </p>
      </div>

      {/* Data flow indicator */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500/40 border border-blue-500/60" />
          <span className="text-[11px] text-slate-500">L1 Reference</span>
        </div>
        <ConnectionArrow direction="right" label="enriches" />
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500/60" />
          <span className="text-[11px] text-emerald-400 font-medium">L2 Atomic Data</span>
        </div>
        <ConnectionArrow direction="right" label="feeds" />
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500/40 border border-violet-500/60" />
          <span className="text-[11px] text-slate-500">L3 Derived</span>
        </div>
      </div>

      {/* L2 group clusters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {L2_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="text-[10px] text-slate-500 mb-1.5 px-1">{group.description}</p>
            <BranchCluster
              id={`l2-${group.id}`}
              label={group.label}
              icon={group.icon}
              color={group.color}
              tables={group.tables}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
