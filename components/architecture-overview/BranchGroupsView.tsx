'use client';

import { useOverviewStore } from './useOverviewStore';
import { BRANCH_GROUPS, SPINE_TABLES, SPINE_COLORS } from './data';
import BranchCluster from './BranchCluster';

export default function BranchGroupsView() {
  const hoveredSpineTable = useOverviewStore((s) => s.hoveredSpineTable);
  const hoveredGroup = useOverviewStore((s) => s.hoveredGroup);

  // Determine which groups connect to the hovered spine table
  const groupsForHoveredSpine = hoveredSpineTable
    ? BRANCH_GROUPS.filter((g) => g.spineAttachment === hoveredSpineTable).map((g) => g.id)
    : [];

  const anyHighlight = hoveredSpineTable !== null || hoveredGroup !== null;

  // Group branches by spine attachment for visual organization
  const spineGroups = SPINE_TABLES.map((st) => ({
    spine: st,
    branches: BRANCH_GROUPS.filter((g) => g.spineAttachment === st.tableName),
  })).filter((sg) => sg.branches.length > 0);

  return (
    <section id="branches" className="scroll-mt-20">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">Supporting Dimensions</h2>
        <p className="text-sm text-slate-400">
          82 reference tables organized into 11 groups. Each group enriches a core spine table with
          lookup data, classifications, and hierarchies.
        </p>
      </div>

      {/* Grouped by spine attachment */}
      <div className="space-y-6">
        {spineGroups.map(({ spine, branches }) => (
          <div key={spine.tableName}>
            {/* Spine label */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: SPINE_COLORS[spine.tableName] }}
              />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Connects to {spine.label}
              </span>
              <div className="flex-1 border-t border-slate-800" />
            </div>

            {/* Branch clusters grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {branches.map((group) => {
                const isHighlighted =
                  groupsForHoveredSpine.includes(group.id) ||
                  hoveredGroup === group.id;
                const isDimmed = anyHighlight && !isHighlighted;

                return (
                  <BranchCluster
                    key={group.id}
                    id={group.id}
                    label={group.label}
                    icon={group.icon}
                    color={group.color}
                    tables={group.tables}
                    spineAttachment={group.spineAttachment}
                    isHighlighted={isHighlighted}
                    isDimmed={isDimmed}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
