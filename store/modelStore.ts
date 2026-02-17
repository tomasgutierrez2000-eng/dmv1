import { create } from 'zustand';
import type { DataModel, TablePosition } from '../types/model';

interface ModelStore {
  // Data
  model: DataModel | null;
  
  // View state
  zoom: number;
  pan: { x: number; y: number };
  tablePositions: Record<string, TablePosition>;
  
  // Selection
  selectedTable: string | null;
  selectedRelationship: string | null;
  selectedField: { tableKey: string; fieldName: string } | null; // Selected field for relationship highlighting
  focusMode: boolean; // When true, only show selected relationship/table relationships
  expandedTables: Set<string>;
  
  // Filters
  searchQuery: string;
  visibleLayers: { L1: boolean; L2: boolean; L3: boolean };
  filterCategories: Set<string>; // Set of selected category names (empty = all)
  
  // UI
  theme: 'dark' | 'light';
  showMinimap: boolean;
  sidebarOpen: boolean;
  detailPanelOpen: boolean;
  expandedDomains: Set<string>; // For domain view - which domains are expanded
  showRelationships: boolean; // Toggle to show/hide all relationships
  showPrimaryRelationships: boolean; // Show primary relationships
  showSecondaryRelationships: boolean; // Show secondary relationships
  
  // Layout
  layoutMode: 'grid' | 'force' | 'hierarchical' | 'domain' | 'domain-overview';
  viewMode: 'compact' | 'standard' | 'detailed';
  tableSize: 'small' | 'medium' | 'large';
  fieldDisplayMode: 'minimal' | 'standard' | 'full';
  
  // Actions
  setModel: (model: DataModel | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setTablePosition: (tableKey: string, position: TablePosition) => void;
  setTablePositions: (tableKey: string, position: TablePosition) => void;
  setSelectedTable: (tableKey: string | null) => void;
  setSelectedRelationship: (relId: string | null) => void;
  setSelectedField: (field: { tableKey: string; fieldName: string } | null) => void;
  setFocusMode: (focus: boolean) => void;
  toggleExpandedTable: (tableKey: string) => void;
  setSearchQuery: (query: string) => void;
  setVisibleLayer: (layer: 'L1' | 'L2' | 'L3', visible: boolean) => void;
  setFilterCategories: (categories: Set<string>) => void;
  toggleFilterCategory: (category: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setShowMinimap: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setDetailPanelOpen: (open: boolean) => void;
  toggleExpandedDomain: (domain: string) => void;
  setLayoutMode: (mode: 'grid' | 'force' | 'hierarchical' | 'domain' | 'domain-overview') => void;
  setViewMode: (mode: 'compact' | 'standard' | 'detailed') => void;
  setTableSize: (size: 'small' | 'medium' | 'large') => void;
  setFieldDisplayMode: (mode: 'minimal' | 'standard' | 'full') => void;
  setShowRelationships: (show: boolean) => void;
  setShowPrimaryRelationships: (show: boolean) => void;
  setShowSecondaryRelationships: (show: boolean) => void;
  applyViewPreset: (preset: 'overview' | 'detailed' | 'compact' | 'focus') => void;
  resetView: () => void;
  requestFitToView: number;
  setRequestFitToView: () => void;
}

export const useModelStore = create<ModelStore>((set) => ({
  // Initial state
  model: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  tablePositions: {},
  selectedTable: null,
  selectedRelationship: null,
  selectedField: null,
  focusMode: false,
  expandedTables: new Set(),
  searchQuery: '',
  visibleLayers: { L1: true, L2: true, L3: true },
  filterCategories: new Set<string>(), // Empty set = show all categories
  theme: 'dark',
  showMinimap: true,
  sidebarOpen: true,
  detailPanelOpen: false,
  layoutMode: 'domain-overview',
  expandedDomains: new Set<string>(), // All domains expanded by default
  viewMode: 'standard',
  tableSize: 'large',
  fieldDisplayMode: 'standard',
  requestFitToView: 0,
  showRelationships: true, // Show relationships by default
  showPrimaryRelationships: true, // Show primary relationships by default
  showSecondaryRelationships: true, // Show secondary relationships by default
  
  // Actions
  setModel: (model) => set({ model }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
  setPan: (pan) => set({ pan }),
  setTablePosition: (tableKey, position) =>
    set((state) => ({
      tablePositions: { ...state.tablePositions, [tableKey]: position },
    })),
  setTablePositions: (tableKey, position) =>
    set((state) => ({
      tablePositions: { ...state.tablePositions, [tableKey]: position },
    })),
  setSelectedTable: (tableKey) => set({ 
    selectedTable: tableKey, 
    detailPanelOpen: tableKey !== null, 
    selectedField: null,
    selectedRelationship: null, // Clear relationship selection when table is selected
    focusMode: tableKey !== null, // Enable focus mode when table is selected
  }),
  setSelectedRelationship: (relId) => set({ 
    selectedRelationship: relId, 
    detailPanelOpen: relId !== null,
    selectedTable: null, // Clear table selection when relationship is selected
    selectedField: null, // Clear field selection when relationship is selected
    focusMode: relId !== null, // Enable focus mode when relationship is selected
  }),
  setSelectedField: (field) => set({ 
    selectedField: field, 
    selectedRelationship: null,
    focusMode: field !== null,
    detailPanelOpen: field !== null, // Open detail panel when column/field is selected
  }),
  setFocusMode: (focus) => set({ focusMode: focus }),
  toggleExpandedTable: (tableKey) =>
    set((state) => {
      const newExpanded = new Set(state.expandedTables);
      if (newExpanded.has(tableKey)) {
        newExpanded.delete(tableKey);
      } else {
        newExpanded.add(tableKey);
      }
      return { expandedTables: newExpanded };
    }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setVisibleLayer: (layer, visible) =>
    set((state) => ({
      visibleLayers: { ...state.visibleLayers, [layer]: visible },
    })),
  setFilterCategories: (categories) => set({ filterCategories: categories }),
  toggleFilterCategory: (category) =>
    set((state) => {
      if (category === '') {
        // Clear all categories
        return { filterCategories: new Set<string>() };
      }
      const newCategories = new Set(state.filterCategories);
      if (newCategories.has(category)) {
        newCategories.delete(category);
      } else {
        newCategories.add(category);
      }
      return { filterCategories: newCategories };
    }),
  setTheme: (theme) => set({ theme }),
  setShowMinimap: (show) => set({ showMinimap: show }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
  setLayoutMode: (mode) => {
    set({ layoutMode: mode });
    // Trigger layout recalculation by clearing some positions (optional)
    // The Canvas useEffect will handle recalculation
  },
  toggleExpandedDomain: (domain) =>
    set((state) => {
      const newExpanded = new Set(state.expandedDomains);
      if (newExpanded.has(domain)) {
        newExpanded.delete(domain);
      } else {
        newExpanded.add(domain);
      }
      return { expandedDomains: newExpanded };
    }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setTableSize: (size) => set({ tableSize: size }),
  setFieldDisplayMode: (mode) => set({ fieldDisplayMode: mode }),
  setShowRelationships: (show) => set({ showRelationships: show }),
  setShowPrimaryRelationships: (show) => set({ showPrimaryRelationships: show }),
  setShowSecondaryRelationships: (show) => set({ showSecondaryRelationships: show }),
  applyViewPreset: (preset) => {
    switch (preset) {
      case 'overview':
        set({
          viewMode: 'compact',
          tableSize: 'small',
          fieldDisplayMode: 'minimal',
          zoom: 0.6,
          pan: { x: 0, y: 0 },
          expandedTables: new Set(),
        });
        break;
      case 'detailed':
        set({
          viewMode: 'detailed',
          tableSize: 'large',
          fieldDisplayMode: 'full',
          zoom: 1.1,
          pan: { x: 0, y: 0 },
        });
        break;
      case 'compact':
        set({
          viewMode: 'compact',
          tableSize: 'small',
          fieldDisplayMode: 'minimal',
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          expandedTables: new Set(),
        });
        break;
      case 'focus':
        set({
          viewMode: 'standard',
          tableSize: 'medium',
          fieldDisplayMode: 'standard',
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          expandedTables: new Set(),
        });
        break;
    }
  },
  resetView: () =>
    set({
      zoom: 1,
      pan: { x: 0, y: 0 },
      selectedTable: null,
      selectedRelationship: null,
      selectedField: null,
      focusMode: false,
    }),
  setRequestFitToView: () => set({ requestFitToView: Date.now() }),
}));
