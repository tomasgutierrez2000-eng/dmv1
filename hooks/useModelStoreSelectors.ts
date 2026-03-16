/**
 * Granular Zustand selectors for the visualizer model store.
 * Use these so components only re-render when the slice they need changes.
 * Example: useCanvasZoomPan() re-renders only when zoom or pan changes, not on selection.
 */

import { useShallow } from 'zustand/react/shallow';
import { useModelStore } from '@/store/modelStore';

/** Zoom and pan only — for components that only need camera state. */
export function useCanvasZoomPan() {
  return useModelStore(
    useShallow((s) => ({ zoom: s.zoom, pan: s.pan, setZoom: s.setZoom, setPan: s.setPan }))
  );
}

/** Selection state only — for components that only need selection. */
export function useCanvasSelection() {
  return useModelStore(
    useShallow((s) => ({
      selectedTable: s.selectedTable,
      selectedRelationship: s.selectedRelationship,
      selectedField: s.selectedField,
      selectedSampleDataCell: s.selectedSampleDataCell,
      focusMode: s.focusMode,
      setSelectedTable: s.setSelectedTable,
      setSelectedRelationship: s.setSelectedRelationship,
      setSelectedField: s.setSelectedField,
      clearSelection: s.clearSelection,
    }))
  );
}

/** Filters and visible layers — for components that only need filter state. */
export function useCanvasFilters() {
  return useModelStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      visibleLayers: s.visibleLayers,
      filterCategories: s.filterCategories,
      filterRiskStripes: s.filterRiskStripes,
      l3CategoryExcluded: s.l3CategoryExcluded,
      setSearchQuery: s.setSearchQuery,
      setVisibleLayer: s.setVisibleLayer,
    }))
  );
}
