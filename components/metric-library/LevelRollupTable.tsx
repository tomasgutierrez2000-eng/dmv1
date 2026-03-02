'use client';

import type { LevelDefinition } from '@/lib/metric-library/types';
import { ROLLUP_LEVEL_LABELS, type RollupLevelKey } from '@/lib/metric-library/types';
import { SourcingBadge } from './badges';

export default function LevelRollupTable({ levels }: { levels: LevelDefinition[] }) {
  if (levels.length === 0) {
    return <p className="text-sm text-gray-400 italic">No level definitions.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <th className="py-2 pr-4">Level</th>
            <th className="py-2 pr-4">Display Name</th>
            <th className="py-2 pr-4 text-center">In Record</th>
            <th className="py-2 pr-4">Sourcing</th>
            <th className="py-2">Level Logic</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((ld) => (
            <tr key={ld.level} className="border-b border-gray-800 hover:bg-white/5 align-top">
              <td className="py-3 pr-4">
                <span className="text-xs font-semibold text-gray-200">
                  {ROLLUP_LEVEL_LABELS[ld.level as RollupLevelKey] ?? ld.level}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-300">{ld.dashboard_display_name}</td>
              <td className="py-3 pr-4 text-center">
                {ld.in_record ? (
                  <span className="inline-block w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs leading-5 text-center">Y</span>
                ) : (
                  <span className="inline-block w-5 h-5 rounded-full bg-gray-700 text-gray-500 text-xs leading-5 text-center">N</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <SourcingBadge type={ld.sourcing_type} />
              </td>
              <td className="py-3">
                <code className="text-xs font-mono text-gray-300 bg-black/20 px-2 py-1 rounded block whitespace-pre-wrap leading-relaxed">
                  {ld.level_logic}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
