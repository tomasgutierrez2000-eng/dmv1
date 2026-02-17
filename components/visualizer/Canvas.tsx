'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useModelStore } from '../../store/modelStore';
import TableNode from './TableNode';
import RelationshipLine from './RelationshipLine';
import DomainContainer from './DomainContainer';
import { calculateLayout, getOverviewTableDimensions } from '../../utils/layoutEngine';
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
  const DRAG_THRESHOLD_PX = 6;
  const pendingDragRef = useRef<{ tableKey: string; startX: number; startY: number } | null>(null);
  const isInteractingRef = useRef(false);

  // Focus-compact: when a field is selected, we bring related tables closer together.
  // These refs persist across renders without causing dependency cascades.
  const savedPositionsRef = useRef<Record<string, TablePosition> | null>(null);
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
    focusMode,
    expandedTables,
    expandedDomains,
    searchQuery,
    visibleLayers,
    filterCategories,
    l3CategoryExcluded,
    layoutMode,
    tableSize,
    showRelationships,
    showPrimaryRelationships,
    showSecondaryRelationships,
    toggleExpandedDomain,
    setZoom,
    setPan,
    setTablePosition,
    setSelectedTable,
    setSelectedRelationship,
    setSelectedField,
    setFocusMode,
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

  // Fit view to a set of positions; when visible count is low, zoom in so boxes fill the screen
  const runFitToView = useCallback(
    (positionsToFit: Array<{ x: number; y: number }>, visibleCount: number) => {
      if (positionsToFit.length === 0) return;
      const BASE_TABLE_WIDTH = 560;
      const BASE_TABLE_HEIGHT = 320;
      const SIZE_MULTIPLIERS = {
        small: { width: 0.8, height: 0.9 },
        medium: { width: 1.0, height: 1.0 },
        large: { width: 1.35, height: 1.25 },
      };
      const overviewDims = getOverviewTableDimensions(tableSize);
      const tableWidth = layoutMode === 'domain-overview' ? overviewDims.width : BASE_TABLE_WIDTH * SIZE_MULTIPLIERS[tableSize].width;
      const tableHeight = layoutMode === 'domain-overview' ? overviewDims.height : BASE_TABLE_HEIGHT * SIZE_MULTIPLIERS[tableSize].height;

      const minX = Math.min(...positionsToFit.map((p) => p.x));
      const maxX = Math.max(...positionsToFit.map((p) => p.x + tableWidth));
      const minY = Math.min(...positionsToFit.map((p) => p.y));
      const maxY = Math.max(...positionsToFit.map((p) => p.y + tableHeight));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = maxX - minX;
      const height = maxY - minY;
      if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) return;

      const viewportWidth = containerRef.current?.clientWidth || 1200;
      const viewportHeight = containerRef.current?.clientHeight || 800;
      const padding = 72;
      const zoomX = (viewportWidth - padding * 2) / width;
      const zoomY = (viewportHeight - padding * 2) / height;
      const aspectRatio = width / height;
      const viewportAspectRatio = viewportWidth / viewportHeight;

      let newZoom: number;
      if (layoutMode === 'domain-overview') {
        newZoom = Math.min(zoomX * 0.85, 0.75);
      } else if (layoutMode === 'domain') {
        newZoom = Math.min(zoomX * 0.88, 0.8);
      } else if (aspectRatio > viewportAspectRatio * 1.2) {
        newZoom = Math.min(zoomX, 0.95);
      } else {
        newZoom = Math.min(zoomX, zoomY, 1.05);
      }
      // When few tables are visible (e.g. after filter), zoom in so boxes take more screen
      if (visibleCount <= 6) {
        newZoom = Math.max(0.95, Math.min(newZoom, 1.4));
      } else if (visibleCount <= 15) {
        newZoom = Math.max(0.88, Math.min(newZoom, 1.2));
      } else if (visibleCount <= 30) {
        newZoom = Math.max(0.75, newZoom);
      }

      const safeZoom = Number.isFinite(newZoom) ? Math.max(0.05, Math.min(4, newZoom)) : 1;
      const panX = -(centerX * safeZoom - viewportWidth / 2);
      const panY = -(centerY * safeZoom - viewportHeight / 2);
      const minPanX = -(minX * safeZoom - padding);
      const finalPanX = Math.max(panX, minPanX);
      setPan({ x: Number.isFinite(finalPanX) ? finalPanX : 0, y: Number.isFinite(panY) ? panY : 0 });
      setZoom(safeZoom);
    },
    [layoutMode, tableSize, setPan, setZoom]
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

  // Apply layout when model, layout mode, table size, or visible layers change
  useEffect(() => {
    if (!model) return;
    const newPositions = calculateLayout(model, layoutMode, {}, zoom, tableSize, visibleLayers);
    Object.entries(newPositions).forEach(([key, pos]) => {
      setTablePosition(key, pos);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- zoom intentionally excluded
  }, [model, layoutMode, tableSize, visibleLayers, setTablePosition]);

  // Fit to visible tables when layout or full-view state change. Skipped when focus-compact
  // or when search/filter is active (delayed effect below handles those for one consistent fit).
  useEffect(() => {
    if (!model || visibleTables.length === 0 || savedPositionsRef.current) return;
    if (searchQuery.trim() || filtersNarrowing) return;
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
    const isOverview = layoutMode === 'domain-overview';
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
    model, focusMode, showRelationships, showPrimaryRelationships, showSecondaryRelationships,
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

  // Fit to view when user clicks toolbar "Fit to View" (animated).
  // During focus-compact, fit only the focused tables instead of all visible tables.
  useEffect(() => {
    if (!model || !requestFitToView) return;
    let positionsForFit: TablePosition[];
    let count: number;
    if (savedPositionsRef.current && focusVisibleTableKeys) {
      positionsForFit = Array.from(focusVisibleTableKeys)
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
    runFitToView(positionsForFit, count);
    setTimeout(() => setIsAnimating(false), 350);
  }, [requestFitToView, model, visibleTables, tablePositions, runFitToView, focusVisibleTableKeys]);

  // ── Focus-compact: bring related tables closer when a field is selected ──
  useEffect(() => {
    const shouldCompact =
      focusMode && !!selectedField && focusVisibleTableKeys != null && focusVisibleTableKeys.size > 0;

    // ─ EXIT focus-compact: restore original positions ─
    if (!shouldCompact) {
      if (savedPositionsRef.current) {
        const saved = savedPositionsRef.current;
        savedPositionsRef.current = null; // Clear immediately to prevent effect from re-running restore (avoids React #185 infinite loop)
        focusFieldKeyRef.current = null;
        // Restore only valid positions so we never call setTablePosition(key, undefined)
        Object.entries(saved).forEach(([key, pos]) => {
          if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            setTablePosition(key, pos);
          }
        });
        // Animate camera back to fit all visible tables
        setIsAnimating(true);
        const allPositions = visibleTables
          .map((t) => saved[t.key])
          .filter((p): p is TablePosition => !!p && typeof p.x === 'number' && typeof p.y === 'number');
        if (allPositions.length > 0) {
          runFitToView(allPositions, visibleTables.length);
        }
        setTimeout(() => setIsAnimating(false), 400);
      }
      return;
    }

    // ─ SAME field already compacted — skip ─
    const fieldKey = `${selectedField.tableKey}:${selectedField.fieldName}`;
    if (fieldKey === focusFieldKeyRef.current) return;

    // ─ ENTER / UPDATE focus-compact ─
    // Save original positions only on first entry (not when switching fields)
    if (!savedPositionsRef.current) {
      savedPositionsRef.current = { ...useModelStore.getState().tablePositions };
    }
    focusFieldKeyRef.current = fieldKey;

    // Compute table dimensions for current layout mode
    const overviewDims = getOverviewTableDimensions(tableSize);
    const BASE_TW = 560;
    const BASE_TH = 320;
    const SM: Record<string, { w: number; h: number }> = {
      small: { w: 0.8, h: 0.9 },
      medium: { w: 1.0, h: 1.0 },
      large: { w: 1.35, h: 1.25 },
    };
    const isOverview = layoutMode === 'domain-overview';
    const tw = isOverview ? overviewDims.width : BASE_TW * SM[tableSize].w;
    const th = isOverview ? overviewDims.height : BASE_TH * SM[tableSize].h;

    // Classify connected tables by relationship direction relative to the anchor
    const anchorKey = selectedField.tableKey;
    const leftKeys: string[] = [];  // incoming: other → anchor
    const rightKeys: string[] = []; // outgoing: anchor → other
    for (const rel of visibleRelationships) {
      if (rel.source.tableKey === anchorKey && rel.target.tableKey !== anchorKey) {
        if (!rightKeys.includes(rel.target.tableKey)) rightKeys.push(rel.target.tableKey);
      }
      if (rel.target.tableKey === anchorKey && rel.source.tableKey !== anchorKey) {
        if (!leftKeys.includes(rel.source.tableKey)) leftKeys.push(rel.source.tableKey);
      }
    }

    // Layout: anchor centred at origin, sources left, targets right
    const hGap = isOverview ? tw * 0.7 : tw * 0.5;
    const vGap = th * 0.25;
    const cx = 0;
    const cy = 0;
    const stackY = (count: number, idx: number) => {
      const totalH = count * th + (count - 1) * vGap;
      return cy + (th - totalH) / 2 + idx * (th + vGap);
    };

    const compact: { key: string; x: number; y: number }[] = [];
    compact.push({ key: anchorKey, x: cx, y: cy });
    leftKeys.forEach((key, i) =>
      compact.push({ key, x: cx - tw - hGap, y: stackY(leftKeys.length, i) })
    );
    rightKeys.forEach((key, i) =>
      compact.push({ key, x: cx + tw + hGap, y: stackY(rightKeys.length, i) })
    );

    // Apply compact positions
    for (const { key, x, y } of compact) {
      setTablePosition(key, { x, y });
    }

    // Fit camera to the compact group
    setIsAnimating(true);
    runFitToView(
      compact.map((p) => ({ x: p.x, y: p.y })),
      compact.length
    );
    setTimeout(() => setIsAnimating(false), 400);
  }, [
    focusMode, selectedField, focusVisibleTableKeys,
    visibleRelationships, visibleTables,
    layoutMode, tableSize, setTablePosition, runFitToView,
  ]);

  // Clear focus-compact state when layout fundamentals change (prevents stale saved positions)
  useEffect(() => {
    savedPositionsRef.current = null;
    focusFieldKeyRef.current = null;
    savedSearchPositionsRef.current = null;
  }, [model, layoutMode, tableSize, visibleLayers]);

  // Canvas panning (left-click on empty area or middle-click anywhere)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setShowHint(false);
      isInteractingRef.current = true;
      // Middle mouse button: always pan
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }
      const canvas = canvasRef.current;
      const hitEmptyCanvas =
        e.target === canvas ||
        (canvas?.firstElementChild != null && e.target === canvas.firstElementChild);
      if (e.button === 0 && hitEmptyCanvas) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        setSelectedTable(null);
        setSelectedRelationship(null);
      }
    },
    [pan, setSelectedTable, setSelectedRelationship]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pending = pendingDragRef.current;
      if (pending) {
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
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
    [isPanning, isDraggingTable, panStart, dragStart, zoom, tablePositions, setPan, setTablePosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDraggingTable(null);
    pendingDragRef.current = null;
    isInteractingRef.current = false;
  }, []);

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

  // Double-click: fit to view with smooth animation.
  // During focus-compact the canvas click will exit focus, so skip the redundant fit here.
  const handleDoubleClick = useCallback(() => {
    if (!model || visibleTables.length === 0) return;
    if (savedPositionsRef.current) return; // focus-compact handles its own camera
    setIsAnimating(true);
    const positions = visibleTables.map((t) => tablePositions[t.key]).filter(Boolean) as TablePosition[];
    if (positions.length === 0) return;
    runFitToView(positions, visibleTables.length);
    setTimeout(() => setIsAnimating(false), 350);
  }, [model, visibleTables, tablePositions, runFitToView]);

  // Click on empty canvas: clear selections and exit focus mode.
  // Clicks on "empty" space often hit the transform <g> (first child of SVG), not the SVG itself.
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as Node | null;
    if (!target) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const hitCanvas =
      target === container ||
      target === canvas ||
      (canvas?.firstElementChild != null && target === canvas.firstElementChild);
    if (hitCanvas) {
      setSelectedField(null);
      setSelectedTable(null);
      setSelectedRelationship(null);
      setFocusMode(false);
    }
  }, [setSelectedField, setSelectedTable, setSelectedRelationship, setFocusMode]);

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
        setSelectedField(null);
        setSelectedTable(null);
        setSelectedRelationship(null);
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoom, setZoom, model, visibleTables, tablePositions, runFitToView, setSelectedField, setSelectedTable, setSelectedRelationship, setFocusMode]);

  // Respect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

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

  const cursorStyle = isPanning
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
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onClick={handleCanvasClick}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: cursorStyle }}
    >
      {/* Navigation hint – auto-fades with better visual (Google Maps style) */}
      {showHint && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 bg-gray-900/80 text-white text-xs font-medium rounded-xl backdrop-blur-md pointer-events-none shadow-lg transition-opacity duration-700"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span>Scroll to zoom</span>
            <span className="w-px h-3 bg-white/30" />
            <span>Drag to pan</span>
            <span className="w-px h-3 bg-white/30" />
            <span>Press <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-[10px] font-bold">?</kbd> for shortcuts</span>
          </div>
        </div>
      )}
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
          style={isAnimating && !prefersReducedMotion ? { transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' } : undefined}
        >
          {/* Domain Containers - In domain and domain-overview layout modes.
              Hidden during focus-compact because tables are repositioned outside their domains. */}
          {(layoutMode === 'domain' || layoutMode === 'domain-overview') && model && !savedPositionsRef.current && (() => {
            const domains = new Set(visibleTables.map(t => t.category));
            const domainPositions = new Map<string, { x: number; y: number; width: number; height: number }>();
            
            // Get dynamic table dimensions based on tableSize and layout mode
            const BASE_TABLE_WIDTH = 560;
            const BASE_TABLE_HEIGHT = 320;
            const SIZE_MULTIPLIERS = {
              small: { width: 0.8, height: 0.9 },
              medium: { width: 1.0, height: 1.0 },
              large: { width: 1.35, height: 1.25 },
            };
            
            let tableWidth: number;
            let tableHeight: number;
            if (layoutMode === 'domain-overview') {
              const dims = getOverviewTableDimensions(tableSize);
              tableWidth = dims.width;
              tableHeight = dims.height;
            } else {
              const multiplier = SIZE_MULTIPLIERS[tableSize];
              tableWidth = BASE_TABLE_WIDTH * multiplier.width;
              tableHeight = BASE_TABLE_HEIGHT * multiplier.height;
            }
            
            // Domain-overview: use same grid as layout engine so all groupings have uniform width
            const DOMAIN_OVERVIEW = {
              startX: 6,
              startY: 8,
              DOMAIN_SPACING: 8,
              DOMAIN_PADDING: 15,
              headerOffset: 55,
              footerOffset: 15,
              DOMAINS_PER_ROW: 5,
            };

            if (layoutMode === 'domain-overview' && !hasNarrowedView) {
              const viewportW = typeof window !== 'undefined' ? window.innerWidth : 2400;
              const availableWidth = Math.max(viewportW - 12, 3200);
              const domainWidth = Math.floor(
                (availableWidth - (DOMAIN_OVERVIEW.DOMAINS_PER_ROW - 1) * DOMAIN_OVERVIEW.DOMAIN_SPACING - DOMAIN_OVERVIEW.startX * 2) / DOMAIN_OVERVIEW.DOMAINS_PER_ROW
              );
              // Use model.categories order so domain boxes align with layout engine (group by category)
              const orderedDomains = model.categories?.length
                ? [
                    ...model.categories.filter((c) => domains.has(c)),
                    ...Array.from(domains).filter((c) => !model.categories!.includes(c)).sort(),
                  ]
                : Array.from(domains).sort(
                    (a, b) => visibleTables.filter(t => t.category === b).length - visibleTables.filter(t => t.category === a).length
                  );
              let cx = DOMAIN_OVERVIEW.startX;
              let cy = DOMAIN_OVERVIEW.startY;
              let maxYInRow = DOMAIN_OVERVIEW.startY;
              let colIndex = 0;

              orderedDomains.forEach((domain) => {
                const domainTables = visibleTables.filter(t => t.category === domain);
                if (domainTables.length === 0) return;
                const positions = domainTables
                  .map(t => tablePositions[t.key])
                  .filter(p => p) as TablePosition[];
                if (positions.length === 0) return;

                if (colIndex > 0 && colIndex % DOMAIN_OVERVIEW.DOMAINS_PER_ROW === 0) {
                  cx = DOMAIN_OVERVIEW.startX;
                  cy = maxYInRow + DOMAIN_OVERVIEW.DOMAIN_SPACING;
                  maxYInRow = cy;
                }
                const minY = Math.min(...positions.map(p => p.y));
                const maxY = Math.max(...positions.map(p => p.y + tableHeight));
                const boxHeight = DOMAIN_OVERVIEW.headerOffset + (maxY - minY) + DOMAIN_OVERVIEW.footerOffset;
                domainPositions.set(domain, {
                  x: cx,
                  y: cy,
                  width: domainWidth,
                  height: boxHeight,
                });
                maxYInRow = Math.max(maxYInRow, cy + boxHeight);
                cx += domainWidth + DOMAIN_OVERVIEW.DOMAIN_SPACING;
                colIndex++;
              });
            } else {
              // Domain bounds from actual visible table positions.
              // In domain-overview we switch to this path while narrowed (search/filter)
              // so frames track temporary compacted/reduced table positions.
              let domainPadding: number;
              let headerOffset: number;
              let footerOffset: number;
              if (layoutMode === 'domain-overview') {
                domainPadding = DOMAIN_OVERVIEW.DOMAIN_PADDING;
                headerOffset = DOMAIN_OVERVIEW.headerOffset;
                footerOffset = DOMAIN_OVERVIEW.footerOffset;
              } else {
                domainPadding = 25;
                headerOffset = 105;
                footerOffset = 25;
              }

              Array.from(domains).forEach((domain) => {
                const domainTables = visibleTables.filter(t => t.category === domain);
                if (domainTables.length === 0) return;
                const positions = domainTables
                  .map(t => tablePositions[t.key])
                  .filter(p => p) as TablePosition[];
                if (positions.length === 0) return;
                const minX = Math.min(...positions.map(p => p.x));
                const maxX = Math.max(...positions.map(p => p.x + tableWidth));
                const minY = Math.min(...positions.map(p => p.y));
                const maxY = Math.max(...positions.map(p => p.y + tableHeight));
                domainPositions.set(domain, {
                  x: minX - domainPadding,
                  y: minY - headerOffset,
                  width: maxX - minX + (domainPadding * 2),
                  height: maxY - minY + headerOffset + footerOffset,
                });
              });
            }
            
            return Array.from(domainPositions.entries()).map(([domain, pos]) => {
              const domainHasFocusTable = !focusVisibleTableKeys ||
                visibleTables.some(t => t.category === domain && focusVisibleTableKeys.has(t.key));
              return (
                <g
                  key={domain}
                  style={{
                    opacity: domainHasFocusTable ? 1 : 0.08,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <DomainContainer
                    domain={domain}
                    tables={visibleTables.filter(t => t.category === domain)}
                    position={pos}
                    width={pos.width}
                    height={pos.height}
                    isExpanded={expandedDomains.has(domain)}
                    onToggle={() => toggleExpandedDomain(domain)}
                  />
                </g>
              );
            });
          })()}
          
          {/* Relationship Lines - Render behind tables */}
          {visibleRelationships.map((rel) => {
            const sourcePos = tablePositions[rel.source.tableKey];
            const targetPos = tablePositions[rel.target.tableKey];
            
            // Only render if both tables have positions
            if (!sourcePos || !targetPos) {
              return null;
            }
            
            // Find field indices for connection points
            const sourceTable = model.tables[rel.source.tableKey];
            const targetTable = model.tables[rel.target.tableKey];
            const sourceFieldIndex = sourceTable?.fields.findIndex(f => f.name === rel.source.field);
            const targetFieldIndex = targetTable?.fields.findIndex(f => f.name === rel.target.field);
            
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

          {/* Table Nodes - Show all in domain-overview, only expanded in domain mode */}
          {visibleTables
            .filter((table) => {
              if (layoutMode === 'domain-overview') return true; // Show all in overview
              if (layoutMode !== 'domain') return true;
              return expandedDomains.has(table.category);
            })
            .map((table) => {
            const position = tablePositions[table.key] || { x: 0, y: 0 };
            // Calculate relationship counts for this table
            const relationshipCounts = model ? {
              incoming: model.relationships.filter(r => r.target.tableKey === table.key).length,
              outgoing: model.relationships.filter(r => r.source.tableKey === table.key).length,
            } : { incoming: 0, outgoing: 0 };
            
            const beingDragged = isDraggingTable === table.key;
            const isFocusRelevant = !focusVisibleTableKeys || focusVisibleTableKeys.has(table.key);
            return (
              <g
                key={table.key}
                style={{
                  opacity: beingDragged ? 0.85 : isFocusRelevant ? 1 : 0.08,
                  filter: beingDragged ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' : undefined,
                  transition: beingDragged ? 'none' : 'opacity 0.2s ease',
                  pointerEvents: isFocusRelevant ? 'auto' : 'none',
                }}
              >
                <TableNode
                  table={table}
                  position={position}
                  isSelected={selectedTable === table.key}
                  isExpanded={layoutMode === 'domain-overview' ? false : expandedTables.has(table.key)}
                  onSelect={() => setSelectedTable(table.key)}
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
