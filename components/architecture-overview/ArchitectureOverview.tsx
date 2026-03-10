'use client';

import SectionNav from './SectionNav';
import SpineView from './SpineView';
import BranchGroupsView from './BranchGroupsView';
import L2SnapshotsView from './L2SnapshotsView';
import L3TieredView from './L3TieredView';
import RollupView from './RollupView';

export default function ArchitectureOverview() {
  return (
    <div className="relative">
      {/* Sticky sidebar navigation */}
      <SectionNav />

      {/* Main content — offset for sidebar on large screens */}
      <div className="lg:pl-44 space-y-16">
        <SpineView />
        <BranchGroupsView />
        <L2SnapshotsView />
        <L3TieredView />
        <RollupView />
      </div>
    </div>
  );
}
