'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useModelStore } from '../../store/modelStore';
import TableNode from './TableNode';
import RelationshipLine from './RelationshipLine';
import DomainContainer from './DomainContainer';
import { calculateLayout, getOverviewTableDimensions, getCompactOverviewTableDimensions, OVERVIEW_CARD } from '../../utils/layoutEngine';
import type { TablePosition } from '../../types/model';

export default function Canvas() {
  const canvasRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDraggingTable, setIsDraggingTable] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredRelationship, setHoveredRelationship] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD_PX = 6;
  const MARQUEE_MIN_SIZE_PX = 10;
  const DOUBLE_CLICK_ZOOM_IN_DELAY_MS = 300;
  // Triple-click now uses fit-to-view (handled in handleCanvasClick)
  const pendingDragRef = useRef<{ tableKey: string; startX: number; startY: number } | null>(null);
  const tableDragOccurredRef = useRef(false);
  const isInteractingRef = useRef(false);
  const doubleClickZoomInTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending double-click zoom on unmount to avoid setState after unmount
  useEffect(() => {
    return () => {
      if (doubleClickZoomInTimeoutRef.current) {
        clearTimeout(doubleClickZoomInTimeoutRef.current);
        doubleClickZoomInTimeoutRef.current = null;
      }
    };
  }, []);

  // Focus-compact: when a field is selected, we bring related tables closer together.
  // These refs persist across renders without causing dependency cascades.
  const savedPositionsRef = useRef<Record<string, TablePosition> | null>(null);
  const savedCameraRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const focusFieldKeyRef = useRef<string | null>(null);
  const savedSearchPositionsRef = useRef<Record<string, TablePosition> | null>(null);

  const {
    model,
    zoom,
    pan,
    tablePositions,
    selectedTable,
    selectedRelationship,
    selectedField,
    selectedSampleDataCell,
    focusMode,
    expandedTables,
    expandedDomains,
    searchQuery,
    visibleLayers,
    filterCategories,
    l3CategoryExcluded,
    layoutMode,
    tableSize,
    viewMode,
    showRelationships,
    showPrimaryRelationships,
    showSecondaryRelationships,
    toggleExpandedDomain,
    setExpandedDomains,
    setZoom,
    setPan,
    setTablePosition,
    setTablePositionsBulk,
    setTablePositionsReplace,
    setRequestFitToView,
    setRequestFitToDomain,
    setSelectedTable,
    setSelectedRelationship,
    setSelectedField,
    setSelectedSampleDataCell,
    setFocusMode,
    clearSelection,
    toggleExpandedTable,
    resetView,
    requestFitToView,
  } = useModelStore();

  // Visible tables for fit-to-view (same filter as below)
  const visibleTables = useMemo(() => {
    if (!model) return [];
    return Object.values(model.tables).filter((table) => {
      if (!visibleLayers[table.layer]) return false;
      if (table.layer === 'L3' && l3CategoryExcluded.has(table.category)) return false;
      if (filterCategories.size > 0 && !filterCategories.has(table.category)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = table.name.toLowerCase().includes(query);
        const matchesField = table.fields.some((f) => f.name.toLowerCase().includes(query));
        if (!matchesName && !matchesField) return false;
      }
      return true;
    });
  }, [model, visibleLayers, filterCategories, l3CategoryExcluded, searchQuery]);

  // When model loads, reset domain collapse state so all categories start expanded
  const prevModelRef = useRef<typeof model>(null);
  useEffect(() => {
    if (!model) return;
    if (prevModelRef.current !== model) {
      prevModelRef.current = model;
      setExpandedDomains(new Set());
    }
  }, [model, setExpandedDomains]);

  // In domain-overview: empty expandedDomains means "all expanded"; otherwise use user's toggles
  const effectiveExpandedDomains = useMemo(() => {
    if (expandedDomains.size === 0 && visibleTables.length > 0) {
      return new Set(visibleTables.map((t) => t.category));
    }
    return expandedDomains;
  }, [expandedDomains, visibleTables]);

  // Domain container elements for domain-overview (computed in useMemo to avoid IIFE parse issues)
  const domainContainerElements = useMemo(() => {
    if (layoutMode !== 'domain-overview' || !model) return null;
    const domains = new Set(visibleTables.map((t) => t.category));
    const domainPositions = new Map<string, { x: number; y: number; width: number; height: number }>();
    const BASE_TABLE_WIDTH = 560;
    const BASE_TABLE_HEIGHT = 320;
    let tableWidth: number;
    let tableHeight: number;
    if (viewMode === 'compact') {
      const compactDims = getCompactOverviewTableDimensions();
      tableWidth = compactDims.width;
      tableHeight = compactDims.height;
    } else {
      const dims = getOverviewTableDimensions(tableSize);
      tableWidth = dims.width;
      tableHeight = dims.height;
    }
    let domainPadding: number;
    let headerOffset: number;
    let footerOffset: number;
    if (viewMode === 'compact') {
      domainPadding = 8;
      headerOffset = 28;
      footerOffset = 8;
    } else {
      domainPadding = 12;
      headerOffset = 45;
      footerOffset = 10;
    }
    const collapsedHeaderHeight = viewMode === 'compact' ? 36 : 45;
    Array.from(domains).forEach((domain) => {
      const domainTables = visibleTables.filter((t) => t.category === domain);
      if (domainTables.length === 0) return;
      const positions = domainTables
        .map((t) => tablePositions[t.key])
        .filter((p): p is TablePosition => !!p && Number.isFinite(p.x) && Number.isFinite(p.y));
      if (positions.length === 0) return;
      const minX = Math.min(...positions.map((p) => p.x));
      const maxX = Math.max(...positions.map((p) => p.x + tableWidth));
      const minY = Math.min(...positions.map((p) => p.y));
      const maxY = Math.max(...positions.map((p) => p.y + tableHeight));
      const width = maxX - minX + domainPadding * 2;
      const expandedHeight = maxY - minY + headerOffset + footerOffset;
      const isDomainExpanded = effectiveExpandedDomains.has(domain);
      const height = isDomainExpanded ? expandedHeight : collapsedHeaderHeight;
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      domainPositions.set(domain, {
        x: minX - domainPadding,
        y: minY - headerOffset,
        width: Math.max(1, width),
        height: Math.max(1, height),
      });
    });
    return Array.from(domainPositions.entries()).map(([domain, pos]) => (
      <g key={domain}>
        <DomainContainer
          domain={domain}
          tables={visibleTables.filter((t) => t.category === domain)}
          position={pos}
          width={pos.width}
          height={pos.height}
          isExpanded={effectiveExpandedDomains.has(domain)}
          onToggle={() => {
            toggleExpandedDomain(domain);
            setRequestFitToDomain(domain);
          }}
          compactFrame={viewMode === 'compact'}
        />
      </g>
    ));
  }, [layoutMode, model, visibleTables, tablePositions, tableSize, viewMode, effectiveExpandedDomains, toggleExpandedDomain, setRequestFitToDomain]);

  // True when user has applied filters that narrow the visible set (category, layer, or L3 exclusion).
  const filtersNarrowing = useMemo(
    () =>
      filterCategories.size > 0 ||
      !visibleLayers.L1 ||
      !visibleLayers.L2 ||
      !visibleLayers.L3 ||
      l3CategoryExcluded.size > 0,
    [filterCategories, visibleLayers, l3CategoryExcluded]
  );

  // Compute zoom/pan to fit a set of positions (same math as runFitToView). Returns null if invalid.
  const computeFitView = useCallback(
    (positionsToFit: Array<{ x: number; y: number }>, visibleCount: number): { zoom: number; pan: { x: number; y: number }; centerX: number; centerY: number } | null => {
      if (positionsToFit.length === 0) return null;
      const BASE_TABLE_WIDTH = 560;
      const BASE_TABLE_HEIGHT = 320;
      const SIZE_MULTIPLIERS = {
        small: { width: 0.8, height: 0.9 },
        medium: { width: 1.0, height: 1.0 },
        large: { width: 1.35, height: 1.25 },
      };
      const overviewDims = getOverviewTableDimensions(tableSize);
      const compactDims = getCompactOverviewTableDimensions();
      const useOverviewDims = layoutMode === 'domain-overview' || layoutMode === 'snowflake';
      const tableWidth = useOverviewDims
        ? (viewMode === 'compact' ? compactDims.width : overviewDims.width)
        : BASE_TABLE_WIDTH * SIZE_MULTIPLIERS[tableSize].width;
      const tableHeight = useOverviewDims
        ? (viewMode === 'compact' ? compactDims.height : overviewDims.height)
        : (viewMode === 'compact' ? 84 : BASE_TABLE_HEIGHT * SIZE_MULTIPLIERS[tableSize].height);

      const minX = Math.min(...positionsToFit.map((p) => p.x));
      const maxX = Math.max(...positionsToFit.map((p) => p.x + tableWidth));
      const minY = Math.min(...positionsToFit.map((p) => p.y));
      const maxY = Math.max(...positionsToFit.map((p) => p.y + tableHeight));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = maxX - minX;
      const height = maxY - minY;
      if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) return null;

      const viewportWidth = containerRef.current?.clientWidth || 1200;
      const viewportHeight = containerRef.current?.clientHeight || 800;
      const padding = 80;
      const zoomX = (viewportWidth - padding * 2) / width;
      const zoomY = (viewportHeight - padding * 2) / height;

      let newZoom: number;
      newZoom = Math.min(zoomX, zoomY);
      const isOverview = layoutMode === 'domain-overview' || layoutMode === 'snowflake';
      const cap = isOverview ? (visibleCount <= 1 ? 1.25 : 0.78) : 1.05;
      newZoom = Math.min(newZoom, cap);
      if (visibleCount <= 1) {
        newZoom = Math.max(1, Math.min(newZoom, 1.25));
      } else if (visibleCount <= 6) {
        newZoom = Math.max(0.9, Math.min(newZoom, 1.35));
      } else if (visibleCount <= 15) {
        newZoom = Math.max(0.8, Math.min(newZoom, 1.15));
      } else if (visibleCount <= 30) {
        newZoom = Math.max(0.7, newZoom);
      }

      const safeZoom = Number.isFinite(newZoom) ? Math.max(0.05, Math.min(4, newZoom)) : 1;
      const panX = -(centerX * safeZoom - viewportWidth / 2);
      const panY = -(centerY * safeZoom - viewportHeight / 2);
      const minPanX = -(minX * safeZoom - padding);
      const minPanY = -(minY * safeZoom - padding);
      const finalPanX = Math.max(panX, minPanX);
      const finalPanY = Math.max(panY, minPanY);
      return {
        zoom: safeZoom,
        pan: { x: Number.isFinite(finalPanX) ? finalPanX : 0, y: Number.isFinite(finalPanY) ? finalPanY : 0 },
        centerX,
        centerY,
      };
    },
    [layoutMode, tableSize, viewMode]
  );

  // Fit view to a set of positions; when visible count is low, zoom in so boxes fill the screen
  const runFitToView = useCallback(
    (positionsToFit: Array<{ x: number; y: number }>, visibleCount: number) => {
      const result = computeFitView(positionsToFit, visibleCount);
      if (!result) return;
      setPan(result.pan);
      setZoom(result.zoom);
    },
    [computeFitView, setPan, setZoom]
  );

  // Single helper: fit camera to a set of tables (reads latest positions from store).
  // Used by both full-view and search/filter fit effects for consistent behavior and no duplication.
  const fitToTablesNow = useCallback(
    (tables: typeof visibleTables) => {
      if (tables.length === 0) return;
      const positions = tables
        .map((t) => useModelStore.getState().tablePositions[t.key])
        .filter((p): p is TablePosition => !!p);
      if (positions.length === 0) return;
      setIsAnimating(true);
      runFitToView(positions, tables.length);
      setTimeout(() => setIsAnimating(false), 350);
    },
    [runFitToView]
  );

  // Apply layout when model, layout mode, table size, visible layers, or compact view change.
  // Use bulk set to avoid N re-renders and lag; defer fit so it runs after positions commit.
  useEffect(() => {
    if (!model) return;
    const compactOverview = (layoutMode === 'domain-overview' || layoutMode === 'snowflake') && viewMode === 'compact';
    const newPositions = calculateLayout(model, layoutMode, {}, zoom, tableSize, visibleLayers, compactOverview);
    const isOverviewLayout = layoutMode === 'domain-overview' || layoutMode === 'snowflake';
    if (isOverviewLayout) {
      setTablePositionsReplace(newPositions);
    } else {
      setTablePositionsBulk(newPositions);
    }
    // Fit camera to the new layout so content is always visible after layout changes.
    // Deferred to next frame so positions are committed before fit reads them.
    const id = requestAnimationFrame(() => setRequestFitToView());
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- zoom intentionally excluded
  }, [model, layoutMode, tableSize, visibleLayers, viewMode, setTablePosition, setTablePositionsBulk, setTablePositionsReplace, setRequestFitToView]);

  // Fit to visible tables when layout or full-view state change. Skipped when focus-compact
  // or when search/filter is active (delayed effect below handles those for one consistent fit).
  // Skip for snowflake/domain-overview: layout effect will request fit on next frame with committed positions.
  useEffect(() => {
    if (!model || visibleTables.length === 0 || savedPositionsRef.current) return;
    if (searchQuery.trim() || filtersNarrowing) return;
    if (layoutMode === 'snowflake' || layoutMode === 'domain-overview') return;
    fitToTablesNow(visibleTables);
  }, [model, visibleTables, layoutMode, tableSize, searchQuery, filtersNarrowing, fitToTablesNow]);

  // When user searches or applies filters: fit view to the narrowed set (closer view, no scroll).
  // Debounced (300ms) so typing doesn’t trigger repeated fits; single filter change still fits once.
  useEffect(() => {
    const searchOrFilterActive = !!searchQuery.trim() || filtersNarrowing;
    if (!searchOrFilterActive || !model || visibleTables.length === 0 || savedPositionsRef.current) return;
    const tablesToFit = visibleTables;
    const id = setTimeout(() => fitToTablesNow(tablesToFit), 300);
    return () => clearTimeout(id);
  }, [searchQuery, filtersNarrowing, model, visibleTables, layoutMode, tableSize, fitToTablesNow]);

  // Search compact mode: temporarily cluster matched tables for a denser, easier-to-read view.
  // Restores original positions once search is cleared.
  useEffect(() => {
    const activeSearch = searchQuery.trim();
    if (!model) return;

    // Restore original positions when search is cleared.
    if (!activeSearch) {
      if (savedSearchPositionsRef.current) {
        const saved = savedSearchPositionsRef.current;
        savedSearchPositionsRef.current = null;
        Object.entries(saved).forEach(([key, pos]) => {
          if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            setTablePosition(key, pos);
          }
        });
      }
      return;
    }

    // Avoid conflicting with field focus compact mode.
    if (savedPositionsRef.current || visibleTables.length === 0) return;

    if (!savedSearchPositionsRef.current) {
      savedSearchPositionsRef.current = { ...useModelStore.getState().tablePositions };
    }

    const overviewDims = getOverviewTableDimensions(tableSize);
    const BASE_TW = 560;
    const BASE_TH = 320;
    const SM: Record<string, { w: number; h: number }> = {
      small: { w: 0.8, h: 0.9 },
      medium: { w: 1.0, h: 1.0 },
      large: { w: 1.35, h: 1.25 },
    };
    const isOverview = layoutMode === 'domain-overview' || layoutMode === 'snowflake';
    const tw = isOverview ? overviewDims.width : BASE_TW * SM[tableSize].w;
    const th = isOverview ? overviewDims.height : BASE_TH * SM[tableSize].h;
    const hGap = Math.round(tw * (isOverview ? 0.24 : 0.16));
    const vGap = Math.round(th * (isOverview ? 0.24 : 0.18));

    const n = visibleTables.length;
    const cols = n <= 4 ? n : Math.max(2, Math.ceil(Math.sqrt(n)));
    const rows = Math.max(1, Math.ceil(n / cols));
    const stepX = tw + hGap;
    const stepY = th + vGap;
    const gridW = cols * stepX - hGap;
    const gridH = rows * stepY - vGap;
    const startX = -gridW / 2;
    const startY = -gridH / 2;

    const compactPositions = visibleTables
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((table, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
          key: table.key,
          x: startX + col * stepX,
          y: startY + row * stepY,
        };
      });

    compactPositions.forEach(({ key, x, y }) => setTablePosition(key, { x, y }));

    setIsAnimating(true);
    runFitToView(
      compactPositions.map((p) => ({ x: p.x, y: p.y })),
      compactPositions.length
    );
    setTimeout(() => setIsAnimating(false), 320);
  }, [searchQuery, model, visibleTables, layoutMode, tableSize, runFitToView, setTablePosition]);

  // Filter relationships to only show between visible tables with valid positions.
  // Memoized so downstream consumers (focusVisibleTableKeys, JSX) don't recompute every render.
  const visibleRelationships = useMemo(() => {
    if (!model) return [];
    return model.relationships.filter((rel) => {
      // Focus mode OVERRIDES the global showRelationships toggle — when the user
      // clicks a field/table to focus, we always show the relevant relationships
      // even if the toolbar toggle is off. Outside focus mode, respect the toggle.
      if (!focusMode && !showRelationships) return false;

      // Focus mode: only show selected relationship or relationships connected to selected field/table.
      // IMPORTANT: selectedField is checked BEFORE selectedTable because clicking a
      // field also sets selectedTable (from mouseDown on the card), and we want
      // field-level filtering to take priority.
      if (focusMode) {
        if (selectedRelationship) {
          if (rel.id !== selectedRelationship) return false;
        } else if (selectedField) {
          if (
            !(rel.source.tableKey === selectedField.tableKey && rel.source.field === selectedField.fieldName) &&
            !(rel.target.tableKey === selectedField.tableKey && rel.target.field === selectedField.fieldName)
          ) return false;
        } else if (selectedTable) {
          if (rel.source.tableKey !== selectedTable && rel.target.tableKey !== selectedTable) return false;
        } else {
          return false;
        }
      }

      // In compact view, only show primary (FK→PK) relationships; hide secondary/derived
      if (viewMode === 'compact' && rel.relationshipType !== 'primary') return false;

      // Respect relationship type filters (primary/secondary)
      if (rel.relationshipType === 'primary' && !showPrimaryRelationships) return false;
      if (rel.relationshipType === 'secondary' && !showSecondaryRelationships) return false;

      // Both tables must be visible on screen with valid positions
      const sourceVisible = visibleTables.some((t) => t.key === rel.source.tableKey);
      const targetVisible = visibleTables.some((t) => t.key === rel.target.tableKey);
      const sourceHasPos = !!tablePositions[rel.source.tableKey];
      const targetHasPos = !!tablePositions[rel.target.tableKey];
      return sourceVisible && targetVisible && sourceHasPos && targetHasPos;
    });
  }, [
    model, focusMode, viewMode, showRelationships, showPrimaryRelationships, showSecondaryRelationships,
    selectedRelationship, selectedField, selectedTable, visibleTables, tablePositions,
  ]);

  // When a field (or table) is selected in focus mode, determine which tables are relevant
  // so we can dim/hide everything else to make the relationships stand out.
  const focusVisibleTableKeys = useMemo(() => {
    if (!focusMode || !model) return null; // null = show all tables normally
    const keys = new Set<string>();
    if (selectedField) {
      keys.add(selectedField.tableKey);
      for (const rel of visibleRelationships) {
        keys.add(rel.source.tableKey);
        keys.add(rel.target.tableKey);
      }
    } else if (selectedTable) {
      keys.add(selectedTable);
      for (const rel of visibleRelationships) {
        keys.add(rel.source.tableKey);
        keys.add(rel.target.tableKey);
      }
    } else if (selectedRelationship) {
      for (const rel of visibleRelationships) {
        keys.add(rel.source.tableKey);
        keys.add(rel.target.tableKey);
      }
    }
    return keys.size > 0 ? keys : null;
  }, [focusMode, model, selectedField, selectedTable, selectedRelationship, visibleRelationships]);

  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Fit to view when user clicks toolbar "Fit to View" or empty space.
  // Full diagram: apply "base" view = 30% more zoomed in than fit-all (user can zoom out from there).
  // Focus mode: fit the focused tables as before.
  useEffect(() => {
    if (!model || !requestFitToView) return;
    const isFocusFit = Boolean(savedPositionsRef.current && focusVisibleTableKeys);
    let positionsForFit: TablePosition[];
    let count: number;
    if (isFocusFit) {
      positionsForFit = Array.from(focusVisibleTableKeys!)
        .map((k) => tablePositions[k])
        .filter((p): p is TablePosition => !!p);
      count = positionsForFit.length;
    } else {
      positionsForFit = visibleTables
        .map((t) => tablePositions[t.key])
        .filter((p): p is TablePosition => !!p);
      count = visibleTables.length;
    }
    if (positionsForFit.length === 0) return;
    setIsAnimating(true);
    if (isFocusFit) {
      runFitToView(positionsForFit, count);
    } else {
      // Full diagram: base view = 30% more zoomed in than fit-all (revert-to view on empty click)
      const result = computeFitView(positionsForFit, count);
      if (result) {
        const viewportWidth = containerRef.current?.clientWidth || 1200;
        const viewportHeight = containerRef.current?.clientHeight || 800;
        const baseZoom = Math.min(4, Math.max(0.05, result.zoom * 1.3));
        const basePan = {
          x: -(result.centerX * baseZoom - viewportWidth / 2),
          y: -(result.centerY * baseZoom - viewportHeight / 2),
        };
        setPan(basePan);
        setZoom(baseZoom);
      } else {
        runFitToView(positionsForFit, count);
      }
    }
    setTimeout(() => setIsAnimating(false), 350);
  }, [requestFitToView, model, visibleTables, tablePositions, runFitToView, computeFitView, focusVisibleTableKeys, setPan, setZoom]);

  // Fit to category when user clicks a category header: zoom in to show whole category (from any zoom level)
  const requestFitToDomain = useModelStore((s) => s.requestFitToDomain);
  useEffect(() => {
    if (!requestFitToDomain || !model) return;
    setShowHint(false);
    const domainTables = visibleTables.filter((t) => t.category === requestFitToDomain);
    const positions = domainTables
      .map((t) => tablePositions[t.key])
      .filter((p): p is TablePosition => !!p && Number.isFinite(p.x) && Number.isFinite(p.y));
    if (positions.length === 0) return; // wait for positions (effect re-runs when tablePositions updates)
    setRequestFitToDomain(null);
    setIsAnimating(true);
    runFitToView(positions, domainTables.length);
    const duration = prefersReducedMotion ? 0 : 320;
    const t = setTimeout(() => setIsAnimating(false), duration);
    return () => clearTimeout(t);
  }, [requestFitToDomain, model, visibleTables, tablePositions, runFitToView, setRequestFitToDomain, prefersReducedMotion]);

  // When user selects a table we no longer zoom the camera to it — that was causing other tables
  // to appear to "hide" (go off-screen). Selection just opens the detail panel; view stays as-is.
  // Fit-to-table is still used when focus-compact runs (field selected).

  // ── Focus-compact: bring related tables closer when a field is selected ──
  // IMPORTANT: This effect intentionally does NOT depend on visibleRelationships or
  // focusVisibleTableKeys because those change as part of the same selection flow
  // (selectedField → focusMode → visibleRelationships), causing cascading re-runs.
  // Instead we compute field-level relationships directly from model.relationships.
  useEffect(() => {
    const shouldCompact = focusMode && !!selectedField;

    // ─ EXIT focus-compact: restore original positions AND camera ─
    if (!shouldCompact) {
      if (savedPositionsRef.current) {
        const saved = savedPositionsRef.current;
        const savedCamera = savedCameraRef.current;
        savedPositionsRef.current = null;
        savedCameraRef.current = null;
        focusFieldKeyRef.current = null;
        // Enable transitions first, then apply position/camera changes on next
        // frame so CSS transitions animate from current → restored positions.
        setIsAnimating(true);
        requestAnimationFrame(() => {
          Object.entries(saved).forEach(([key, pos]) => {
            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
              setTablePosition(key, pos);
            }
          });
          if (savedCamera) {
            setZoom(savedCamera.zoom);
            setPan(savedCamera.pan);
          }
          setTimeout(() => setIsAnimating(false), 400);
        });
      }
      return;
    }

    // ─ SAME field already compacted — skip ─
    const fieldKey = `${selectedField.tableKey}:${selectedField.fieldName}`;
    if (fieldKey === focusFieldKeyRef.current) return;

    // ─ ENTER / UPDATE focus-compact ─
    if (!savedPositionsRef.current) {
      savedPositionsRef.current = { ...useModelStore.getState().tablePositions };
      const state = useModelStore.getState();
      savedCameraRef.current = { zoom: state.zoom, pan: { ...state.pan } };
    }
    focusFieldKeyRef.current = fieldKey;

    // Compute relationships for this specific field directly from the model
    // (avoids depending on the visibleRelationships memo which changes with selection state)
    const fieldRels = model?.relationships.filter(
      (rel) =>
        (rel.source.tableKey === selectedField.tableKey && rel.source.field === selectedField.fieldName) ||
        (rel.target.tableKey === selectedField.tableKey && rel.target.field === selectedField.fieldName)
    ) ?? [];

    if (fieldRels.length === 0) return;

    const overviewDims = getOverviewTableDimensions(tableSize);
    const BASE_TW = 560;
    const BASE_TH = 320;
    const SM: Record<string, { w: number; h: number }> = {
      small: { w: 0.8, h: 0.9 },
      medium: { w: 1.0, h: 1.0 },
      large: { w: 1.35, h: 1.25 },
    };
    const isOverview = layoutMode === 'domain-overview' || layoutMode === 'snowflake';
    const tw = isOverview ? overviewDims.width : BASE_TW * SM[tableSize].w;
    const th = isOverview ? overviewDims.height : BASE_TH * SM[tableSize].h;

    const anchorKey = selectedField.tableKey;
    const currentPositions = useModelStore.getState().tablePositions;
    const anchorPos = currentPositions[anchorKey];
    if (!anchorPos) return;

    // Keep the selected table in place — use its current position as the center
    const cx = anchorPos.x;
    const cy = anchorPos.y;

    const leftKeys: string[] = [];
    const rightKeys: string[] = [];
    for (const rel of fieldRels) {
      if (rel.source.tableKey === anchorKey && rel.target.tableKey !== anchorKey) {
        if (!rightKeys.includes(rel.target.tableKey)) rightKeys.push(rel.target.tableKey);
      }
      if (rel.target.tableKey === anchorKey && rel.source.tableKey !== anchorKey) {
        if (!leftKeys.includes(rel.source.tableKey)) leftKeys.push(rel.source.tableKey);
      }
    }

    const hGap = isOverview ? tw * 0.7 : tw * 0.5;
    const vGap = th * 0.25;
    const stackY = (count: number, idx: number) => {
      const totalH = count * th + (count - 1) * vGap;
      return cy + (th - totalH) / 2 + idx * (th + vGap);
    };

    // Only reposition the RELATED tables — anchor stays put
    const compact: { key: string; x: number; y: number }[] = [];
    compact.push({ key: anchorKey, x: cx, y: cy });
    leftKeys.forEach((key, i) =>
      compact.push({ key, x: cx - tw - hGap, y: stackY(leftKeys.length, i) })
    );
    rightKeys.forEach((key, i) =>
      compact.push({ key, x: cx + tw + hGap, y: stackY(rightKeys.length, i) })
    );

    // Enable transitions first, then apply position changes on next frame
    // so CSS transitions animate from current → compacted positions.
    setIsAnimating(true);
    requestAnimationFrame(() => {
      for (const { key, x, y } of compact) {
        if (key !== anchorKey) {
          setTablePosition(key, { x, y });
        }
      }
      runFitToView(
        compact.map((p) => ({ x: p.x, y: p.y })),
        compact.length
      );
      setTimeout(() => setIsAnimating(false), 400);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- visibleRelationships/focusVisibleTableKeys intentionally excluded to prevent cascade
  }, [
    focusMode, selectedField, model,
    visibleTables, layoutMode, tableSize, setTablePosition, runFitToView, setZoom, setPan,
  ]);

  // Clear focus-compact state when layout fundamentals change (prevents stale saved positions)
  useEffect(() => {
    savedPositionsRef.current = null;
    savedCameraRef.current = null;
    focusFieldKeyRef.current = null;
    savedSearchPositionsRef.current = null;
  }, [model, layoutMode, tableSize, visibleLayers]);

  // Canvas panning (left-click on empty area or middle-click anywhere). Shift+drag = marquee zoom.
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setShowHint(false);
      isInteractingRef.current = true;
      tableDragOccurredRef.current = false;
      // Shift + left-drag: marquee zoom to region (over canvas or content)
      if (e.button === 0 && e.shiftKey) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setMarqueeStart({ x, y });
          setMarqueeCurrent({ x, y });
        }
        e.preventDefault();
        return;
      }
      // Middle mouse button: always pan
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }
      // Only start panning on left-click on truly empty canvas (SVG element or its root <g>).
      // Do NOT clear selections here — that is handled by handleCanvasClick on mouseUp
      // so we avoid double-set when the user clicks a table (mouseDown fires on container
      // before the table's stopPropagation can prevent it).
      const target = e.target as Element;
      const canvas = canvasRef.current;
      const hitEmptyCanvas =
        target === canvas ||
        (canvas?.firstElementChild != null && target === canvas.firstElementChild);
      if (e.button === 0 && hitEmptyCanvas) {
        setShowHint(false);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (marqueeStart !== null) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setMarqueeCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
        return;
      }
      const pending = pendingDragRef.current;
      if (pending) {
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
          tableDragOccurredRef.current = true;
          setIsDraggingTable(pending.tableKey);
          setDragStart({ x: e.clientX, y: e.clientY });
          pendingDragRef.current = null;
        }
      }
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      } else if (isDraggingTable) {
        const deltaX = (e.clientX - dragStart.x) / zoom;
        const deltaY = (e.clientY - dragStart.y) / zoom;
        const currentPos = tablePositions[isDraggingTable];
        if (currentPos) {
          setTablePosition(isDraggingTable, {
            x: currentPos.x + deltaX,
            y: currentPos.y + deltaY,
          });
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
    },
    [marqueeStart, isPanning, isDraggingTable, panStart, dragStart, zoom, tablePositions, setPan, setTablePosition]
  );

  const handleMouseLeave = useCallback(() => {
    if (marqueeStart !== null) {
      setMarqueeStart(null);
      setMarqueeCurrent(null);
    }
    setIsPanning(false);
    setIsDraggingTable(null);
    pendingDragRef.current = null;
    isInteractingRef.current = false;
  }, [marqueeStart]);

  const handleMouseUp = useCallback(() => {
    if (marqueeStart !== null && marqueeCurrent !== null) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const sx0 = Math.min(marqueeStart.x, marqueeCurrent.x);
        const sy0 = Math.min(marqueeStart.y, marqueeCurrent.y);
        const sx1 = Math.max(marqueeStart.x, marqueeCurrent.x);
        const sy1 = Math.max(marqueeStart.y, marqueeCurrent.y);
        const w = sx1 - sx0;
        const h = sy1 - sy0;
        const diagonal = Math.sqrt(w * w + h * h);
        if (diagonal >= MARQUEE_MIN_SIZE_PX) {
          const { zoom: z, pan: p } = useModelStore.getState();
          const worldLeft = (sx0 - p.x) / z;
          const worldTop = (sy0 - p.y) / z;
          const worldRight = (sx1 - p.x) / z;
          const worldBottom = (sy1 - p.y) / z;
          const worldWidth = worldRight - worldLeft;
          const worldHeight = worldBottom - worldTop;
          if (worldWidth > 0 && worldHeight > 0) {
            const PAD = 40;
            const vpW = rect.width;
            const vpH = rect.height;
            const zoomX = (vpW - 2 * PAD) / worldWidth;
            const zoomY = (vpH - 2 * PAD) / worldHeight;
            const newZoom = Math.max(0.05, Math.min(4, Math.min(zoomX, zoomY)));
            const worldCx = (worldLeft + worldRight) / 2;
            const worldCy = (worldTop + worldBottom) / 2;
            const newPan = {
              x: -worldCx * newZoom + vpW / 2,
              y: -worldCy * newZoom + vpH / 2,
            };
            setIsAnimating(true);
            setZoom(newZoom);
            setPan(newPan);
            setTimeout(() => setIsAnimating(false), prefersReducedMotion ? 0 : 300);
          }
        }
      }
      setMarqueeStart(null);
      setMarqueeCurrent(null);
    }
    setIsPanning(false);
    setIsDraggingTable(null);
    pendingDragRef.current = null;
    isInteractingRef.current = false;
  }, [marqueeStart, marqueeCurrent, setZoom, setPan, prefersReducedMotion]);

  // Smooth zoom toward cursor. Use native listener with { passive: false } so preventDefault works
  // (React's onWheel is passive by default, which causes "Unable to preventDefault" console errors).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Let wheel scroll table card field lists instead of zooming (native listener runs before React)
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-scrollable-table-fields]')) {
        return; // don't preventDefault so the card content can scroll
      }
      e.preventDefault();
      e.stopPropagation();
      isInteractingRef.current = true;
      setShowHint(false);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { zoom: z, pan: p } = useModelStore.getState();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const absDelta = Math.abs(e.deltaY);
      const speed = e.ctrlKey ? 0.01 : absDelta > 50 ? 0.08 : 0.04;
      const direction = e.deltaY > 0 ? -1 : 1;
      const factor = 1 + direction * speed;
      const newZoom = Math.max(0.05, Math.min(4, z * factor));
      const zoomChange = newZoom / z;
      setPan({
        x: mouseX - (mouseX - p.x) * zoomChange,
        y: mouseY - (mouseY - p.y) * zoomChange,
      });
      setZoom(newZoom);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom, setPan]);

  // Double-click: zoom in toward the click point (keeps that point under the cursor).
  // If user clicks again within DOUBLE_CLICK_ZOOM_IN_DELAY_MS (triple-click), fit-to-view all content (handled in handleCanvasClick).
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!model || visibleTables.length === 0) return;
      if (savedPositionsRef.current) return; // focus-compact handles its own camera
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { zoom: z, pan: p } = useModelStore.getState();
      const newZoom = Math.min(4, z * 1.5);
      const worldX = (sx - p.x) / z;
      const worldY = (sy - p.y) / z;
      const newPan = {
        x: sx - worldX * newZoom,
        y: sy - worldY * newZoom,
      };
      const runZoomIn = () => {
        doubleClickZoomInTimeoutRef.current = null;
        setIsAnimating(true);
        setPan(newPan);
        setZoom(newZoom);
        setTimeout(() => setIsAnimating(false), 280);
      };
      if (doubleClickZoomInTimeoutRef.current) clearTimeout(doubleClickZoomInTimeoutRef.current);
      doubleClickZoomInTimeoutRef.current = setTimeout(runZoomIn, DOUBLE_CLICK_ZOOM_IN_DELAY_MS);
    },
    [model, visibleTables.length, setPan, setZoom]
  );

  // Single click on empty canvas: clear selections and exit focus mode. If a double-click zoom-in was pending, treat as triple-click and fit-to-view all content.
  // IMPORTANT: Only fire when the click target is genuinely the SVG canvas or its root <g>,
  // NOT the outer container div — table click events bubble to the container div and would
  // incorrectly clear selection otherwise.
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const canvas = canvasRef.current;
      // Strictly check for SVG background clicks only — exclude the container div
      const hitCanvas =
        target === canvas ||
        (canvas?.firstElementChild != null && target === canvas.firstElementChild);
      if (hitCanvas) {
        setShowHint(false);
        if (doubleClickZoomInTimeoutRef.current) {
          clearTimeout(doubleClickZoomInTimeoutRef.current);
          doubleClickZoomInTimeoutRef.current = null;
          // Triple-click: full reset — restore positions, zoom out, clear everything.
          // Must restore focus-compact positions BEFORE fit-to-view so zoom is
          // calculated from the correct (original) layout, not compacted positions.
          if (savedPositionsRef.current) {
            const saved = savedPositionsRef.current;
            savedPositionsRef.current = null;
            savedCameraRef.current = null;
            focusFieldKeyRef.current = null;
            Object.entries(saved).forEach(([key, pos]) => {
              if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
                setTablePosition(key, pos);
              }
            });
          }
          setIsAnimating(true);
          // Wait one frame so restored positions are committed before fit-to-view
          requestAnimationFrame(() => {
            const allPositions = visibleTables
              .map((t) => useModelStore.getState().tablePositions[t.key])
              .filter((p): p is TablePosition => !!p);
            if (allPositions.length > 0) {
              runFitToView(allPositions, visibleTables.length);
            }
            setTimeout(() => setIsAnimating(false), 280);
          });
        }
        // Clear all selections in a single batched Zustand update
        clearSelection();
      }
    },
    [visibleTables, runFitToView, clearSelection, setTablePosition]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setIsAnimating(true);
        setZoom(Math.min(4, zoom * 1.15));
        setTimeout(() => setIsAnimating(false), 200);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setIsAnimating(true);
        setZoom(Math.max(0.05, zoom * 0.85));
        setTimeout(() => setIsAnimating(false), 200);
      } else if (e.key === '0') {
        e.preventDefault();
        setIsAnimating(true);
        if (model && visibleTables.length > 0) {
          const positions = visibleTables.map((t) => tablePositions[t.key]).filter(Boolean) as TablePosition[];
          runFitToView(positions, visibleTables.length);
        }
        setTimeout(() => setIsAnimating(false), 350);
      } else if (e.key === 'Escape') {
        if (marqueeStart !== null) {
          setMarqueeStart(null);
          setMarqueeCurrent(null);
          e.preventDefault();
          return;
        }
        // Progressive Escape: sample data cell → field → table → clear all
        if (selectedSampleDataCell) {
          setSelectedSampleDataCell(null);
          e.preventDefault();
        } else if (selectedField) {
          setSelectedTable(selectedField.tableKey);
          e.preventDefault();
        } else {
          clearSelection();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoom, setZoom, model, visibleTables, tablePositions, runFitToView, clearSelection, setSelectedSampleDataCell, selectedSampleDataCell, selectedField, setSelectedTable, marqueeStart]);

  // Auto-hide navigation hint after first interaction or 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!model) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Upload a data dictionary (Excel) or load the bank data demo to visualize the model</p>
      </div>
    );
  }

  const cursorStyle = marqueeStart !== null
    ? 'crosshair'
    : isPanning
      ? 'grabbing'
      : isDraggingTable
        ? 'move'
        : 'grab';
  const hasActiveSearch = searchQuery.trim().length > 0;
  const hasNarrowedView = hasActiveSearch || filtersNarrowing;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-100 select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onClick={handleCanvasClick}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: cursorStyle }}
    >
      {/* Navigation hint – auto-fades with better visual (Google Maps style) */}
      {showHint && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 bg-gray-900/80 text-white text-sm font-medium rounded-xl backdrop-blur-md pointer-events-none shadow-lg transition-opacity duration-700"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span>Scroll to zoom</span>
            <span className="w-px h-3 bg-white/30" />
            <span>Drag to pan</span>
            <span className="w-px h-3 bg-white/30" />
            <span>Shift+drag to zoom to region</span>
            <span className="w-px h-3 bg-white/30" />
            <span>Press <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-[11px] font-bold">?</kbd> for shortcuts</span>
          </div>
        </div>
      )}
      {/* Marquee zoom overlay (Option A: div in screen space) */}
      {marqueeStart !== null && marqueeCurrent !== null && (() => {
        const left = Math.min(marqueeStart.x, marqueeCurrent.x);
        const top = Math.min(marqueeStart.y, marqueeCurrent.y);
        const width = Math.abs(marqueeCurrent.x - marqueeStart.x);
        const height = Math.abs(marqueeCurrent.y - marqueeStart.y);
        if (width < 1 && height < 1) return null;
        return (
          <div
            className="absolute pointer-events-none z-30 rounded-md border-2 border-blue-500 bg-blue-500/15"
            style={{
              left,
              top,
              width,
              height,
            }}
            aria-hidden="true"
          />
        );
      })()}
      <svg
        ref={canvasRef}
        width="100%"
        height="100%"
        className="absolute inset-0"
        role="img"
        aria-label="Data model visualization canvas. Use scroll to zoom, drag to pan."
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: `${25 * zoom}px ${25 * zoom}px`,
          backgroundPosition: `${pan.x % (25 * zoom)}px ${pan.y % (25 * zoom)}px`,
        }}
      >
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={
            isAnimating
              ? prefersReducedMotion
                ? undefined
                : { transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)', willChange: 'transform' }
              : undefined
          }
        >
          {/* Domain Containers - In domain and domain-overview layout modes.
              Hidden during focus-compact because tables are repositioned outside their domains. */}
          {layoutMode === 'domain-overview' && model && !savedPositionsRef.current && domainContainerElements}

          {/* Relationship Lines - Render behind tables */}
          {visibleRelationships.map((rel) => {
            // In domain-overview, hide lines for tables in collapsed categories
            if (layoutMode === 'domain-overview') {
              const sourceTable = model?.tables[rel.source.tableKey];
              const targetTable = model?.tables[rel.target.tableKey];
              if (
                (sourceTable && !effectiveExpandedDomains.has(sourceTable.category)) ||
                (targetTable && !effectiveExpandedDomains.has(targetTable.category))
              ) {
                return null;
              }
            }
            const sourcePos = tablePositions[rel.source.tableKey];
            const targetPos = tablePositions[rel.target.tableKey];
            
            // Only render if both tables have positions
            if (!sourcePos || !targetPos) {
              return null;
            }
            
            // Find field indices for connection points
            const sourceTable = model.tables[rel.source.tableKey];
            const targetTable = model.tables[rel.target.tableKey];
            const sourceFieldIndex = viewMode === 'compact'
              ? undefined
              : sourceTable?.fields.findIndex(f => f.name === rel.source.field);
            const targetFieldIndex = viewMode === 'compact'
              ? undefined
              : targetTable?.fields.findIndex(f => f.name === rel.target.field);
            
            // Check if this relationship involves the selected field
            const involvesSelectedField = selectedField && (
              (rel.source.tableKey === selectedField.tableKey && rel.source.field === selectedField.fieldName) ||
              (rel.target.tableKey === selectedField.tableKey && rel.target.field === selectedField.fieldName)
            );
            
            return (
              <RelationshipLine
                key={rel.id}
                relationship={rel}
                sourcePos={sourcePos}
                targetPos={targetPos}
                sourceFieldIndex={sourceFieldIndex !== undefined && sourceFieldIndex >= 0 ? sourceFieldIndex : undefined}
                targetFieldIndex={targetFieldIndex !== undefined && targetFieldIndex >= 0 ? targetFieldIndex : undefined}
                sourceTableFields={sourceTable?.fields.length || 0}
                targetTableFields={targetTable?.fields.length || 0}
                isSelected={selectedRelationship === rel.id || !!involvesSelectedField}
                isHovered={hoveredRelationship === rel.id}
                involvesSelectedField={!!involvesSelectedField}
                onSelect={() => setSelectedRelationship(rel.id)}
                onHover={(hovered) => setHoveredRelationship(hovered ? rel.id : null)}
              />
            );
          })}

          {/* Table Nodes - in domain-overview hide tables whose category is collapsed.
              Render in stable order (no sorting) to avoid foreignObject re-creation bugs. */}
          {visibleTables.map((table) => {
            if (layoutMode === 'domain-overview' && !effectiveExpandedDomains.has(table.category)) {
              return null;
            }
            const position = tablePositions[table.key] || { x: 0, y: 0 };
            const relationshipCounts = model ? {
              incoming: model.relationships.filter(r => r.target.tableKey === table.key).length,
              outgoing: model.relationships.filter(r => r.source.tableKey === table.key).length,
            } : { incoming: 0, outgoing: 0 };

            const beingDragged = isDraggingTable === table.key;
            const isThisSelected = selectedTable === table.key;
            const isFocusRelevant = !focusVisibleTableKeys || focusVisibleTableKeys.has(table.key);
            const focusDimmed = focusVisibleTableKeys != null && !isFocusRelevant;

            let tableOpacity = 1;
            if (beingDragged) tableOpacity = 0.85;
            else if (focusDimmed) tableOpacity = 0.12;

            return (
              <g
                key={table.key}
                style={{
                  opacity: tableOpacity,
                  filter: beingDragged ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' : undefined,
                  transition: beingDragged ? 'none' : 'opacity 0.28s ease',
                }}
              >
                <TableNode
                  table={table}
                  position={position}
                  isSelected={isThisSelected}
                  isExpanded={layoutMode === 'domain-overview' ? false : expandedTables.has(table.key)}
                  onSelect={() => {
                    if (!tableDragOccurredRef.current) {
                      setSelectedTable(table.key);
                    }
                  }}
                  onToggleExpand={() => {
                    if (layoutMode !== 'domain-overview') {
                      toggleExpandedTable(table.key);
                    }
                  }}
                  onMouseDown={(e) => {
                    pendingDragRef.current = { tableKey: table.key, startX: e.clientX, startY: e.clientY };
                  }}
                  searchQuery={searchQuery}
                  relationshipCounts={relationshipCounts}
                  selectedField={selectedField}
                  onFieldSelect={(tableKey, fieldName) => setSelectedField({ tableKey, fieldName })}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
