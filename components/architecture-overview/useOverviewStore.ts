import { create } from 'zustand';
import type { SectionId } from './types';

interface OverviewState {
  activeSection: SectionId;
  setActiveSection: (section: SectionId) => void;

  expandedGroups: Set<string>;
  toggleGroup: (id: string) => void;
  collapseAllGroups: () => void;

  hoveredSpineTable: string | null;
  setHoveredSpineTable: (name: string | null) => void;

  hoveredGroup: string | null;
  setHoveredGroup: (id: string | null) => void;

  selectedTable: string | null;
  setSelectedTable: (name: string | null) => void;

  l3ViewMode: 'tier' | 'domain';
  setL3ViewMode: (mode: 'tier' | 'domain') => void;
}

export const useOverviewStore = create<OverviewState>((set) => ({
  activeSection: 'spine',
  setActiveSection: (section) => set({ activeSection: section }),

  expandedGroups: new Set<string>(),
  toggleGroup: (id) =>
    set((s) => {
      const next = new Set(s.expandedGroups);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedGroups: next };
    }),
  collapseAllGroups: () => set({ expandedGroups: new Set() }),

  hoveredSpineTable: null,
  setHoveredSpineTable: (name) => set({ hoveredSpineTable: name }),

  hoveredGroup: null,
  setHoveredGroup: (id) => set({ hoveredGroup: id }),

  selectedTable: null,
  setSelectedTable: (name) => set({ selectedTable: name }),

  l3ViewMode: 'domain',
  setL3ViewMode: (mode) => set({ l3ViewMode: mode }),
}));
