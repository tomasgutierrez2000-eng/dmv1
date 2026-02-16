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
  } = useModelStore();

  // Apply layout when model, layout mode, or table size changes
  useEffect(() => {
    if (!model) return;
    
    // Recalculate layout - force recalculation to spread tables horizontally
    const newPositions = calculateLayout(model, layoutMode, {}, zoom, tableSize, visibleLayers);
    
    // Update all positions to ensure proper horizontal spread
    // This ensures tables are spread across the page when layout mode changes
    Object.entries(newPositions).forEach(([key, pos]) => {
      setTablePosition(key, pos);
    });
    
    // Auto-focus: Calculate center of all tables and pan/zoom to show them
    const positions = Object.values(newPositions);
    if (positions.length > 0) {
      // Get dynamic table dimensions based on tableSize
      const BASE_TABLE_WIDTH = 480;
      const BASE_TABLE_HEIGHT = 280;
      const SIZE_MULTIPLIERS = {
        small: { width: 0.75, height: 0.85 },
        medium: { width: 1.0, height: 1.0 },
        large: { width: 1.3, height: 1.2 },
      };
      const overviewDims = getOverviewTableDimensions(tableSize);
      const tableWidth = layoutMode === 'domain-overview' ? overviewDims.width : BASE_TABLE_WIDTH * SIZE_MULTIPLIERS[tableSize].width;
      const tableHeight = layoutMode === 'domain-overview' ? overviewDims.height : BASE_TABLE_HEIGHT * SIZE_MULTIPLIERS[tableSize].height;
      
      const minX = Math.min(...positions.map(p => p.x));
      const maxX = Math.max(...positions.map(p => p.x + tableWidth));
      const minY = Math.min(...positions.map(p => p.y));
      const maxY = Math.max(...positions.map(p => p.y + tableHeight));
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = maxX - minX;
      const height = maxY - minY;
      
      // Calculate zoom to fit all tables with padding
      // Prioritize horizontal fit for better UX with horizontal layouts
      const viewportWidth = containerRef.current?.clientWidth || 1200;
      const viewportHeight = containerRef.current?.clientHeight || 800;
      const padding = 80; // Reduced padding for better horizontal utilization
      const zoomX = (viewportWidth - padding * 2) / width;
      const zoomY = (viewportHeight - padding * 2) / height;
      
      // For horizontal layouts (especially domain view), prioritize horizontal visibility
      const aspectRatio = width / height;
      const viewportAspectRatio = viewportWidth / viewportHeight;
      
      let newZoom: number;
      if (layoutMode === 'domain-overview') {
        // Domain overview - zoom out significantly to see all domains at once
        newZoom = Math.min(zoomX * 0.7, 0.5); // Zoom out to see overview
      } else if (layoutMode === 'domain') {
        // Domain view - prioritize showing maximum horizontal content
        // Zoom out more to see all domains horizontally
        newZoom = Math.min(zoomX * 0.85, 0.75); // Zoom out to see more horizontally
      } else if (aspectRatio > viewportAspectRatio * 1.2) {
        // Very horizontal layout - prioritize width fit
        newZoom = Math.min(zoomX, 0.9);
      } else {
        // More balanced layout - use standard fit
        newZoom = Math.min(zoomX, zoomY, 1.0);
      }
      
      // Pan to center, ensuring we show the left edge for horizontal layouts
      const panX = -(centerX * newZoom - viewportWidth / 2);
      const panY = -(centerY * newZoom - viewportHeight / 2);
      
      // For domain view, ensure we show from the left edge
      if (layoutMode === 'domain') {
        const minPanX = -(minX * newZoom - padding);
        const finalPanX = Math.max(panX, minPanX);
        setPan({
          x: finalPanX,
          y: panY,
        });
      } else {
        // Ensure we don't pan too far left (show start of horizontal layout)
        const minPanX = -(minX * newZoom - padding);
        const finalPanX = Math.max(panX, minPanX);
        setPan({
          x: finalPanX,
          y: panY,
        });
      }
      
      setZoom(newZoom);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- zoom intentionally excluded to avoid layout thrash
  }, [model, layoutMode, tableSize, visibleLayers, setTablePosition, setPan, setZoom]);

  // Filter tables based on search, layer visibility, and categories
  const visibleTables = useMemo(() => {
    if (!model) return [];
    return Object.values(model.tables).filter((table) => {
      if (!visibleLayers[table.layer]) return false;
      if (filterCategories.size > 0 && !filterCategories.has(table.category)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = table.name.toLowerCase().includes(query);
        const matchesField = table.fields.some((f) => f.name.toLowerCase().includes(query));
        if (!matchesName && !matchesField) return false;
      }
      return true;
    });
  }, [model, visibleLayers, filterCategories, searchQuery]);

  // Filter relationships to only show between visible tables with valid positions
  // Also filter by relationship visibility settings and focus mode
  const visibleRelationships = model
    ? model.relationships.filter((rel) => {
        // Overview mode: hide relationships unless user clicked a field or relationship (then show those arrows)
        if (layoutMode === 'domain-overview') {
          if (!selectedField && !selectedRelationship) return false;
          // When a field or relationship is selected, show only the relevant relationship(s)
          if (selectedRelationship && rel.id !== selectedRelationship) return false;
          if (selectedField && !(rel.source.tableKey === selectedField.tableKey && rel.source.field === selectedField.fieldName) && !(rel.target.tableKey === selectedField.tableKey && rel.target.field === selectedField.fieldName)) return false;
        }
        
        // Check if relationships are enabled
        if (!showRelationships) return false;
        
        // Focus mode: only show selected relationship or relationships connected to selected table/field
        if (focusMode) {
          if (selectedRelationship) {
            // Show only the selected relationship
            if (rel.id !== selectedRelationship) return false;
          } else if (selectedTable) {
            // Show only relationships connected to the selected table
            if (rel.source.tableKey !== selectedTable && rel.target.tableKey !== selectedTable) return false;
          } else if (selectedField) {
            // Show only relationships involving the selected field
            if (
              !(rel.source.tableKey === selectedField.tableKey && rel.source.field === selectedField.fieldName) &&
              !(rel.target.tableKey === selectedField.tableKey && rel.target.field === selectedField.fieldName)
            ) return false;
          } else {
            // Focus mode but nothing selected - show nothing
            return false;
          }
        }
        
        // Check relationship type visibility
        if (rel.relationshipType === 'primary' && !showPrimaryRelationships) return false;
        if (rel.relationshipType === 'secondary' && !showSecondaryRelationships) return false;
        
        // Check table visibility
        const sourceVisible = visibleTables.some((t) => t.key === rel.source.tableKey);
        const targetVisible = visibleTables.some((t) => t.key === rel.target.tableKey);
        const sourceHasPos = !!tablePositions[rel.source.tableKey];
        const targetHasPos = !!tablePositions[rel.target.tableKey];
        return sourceVisible && targetVisible && sourceHasPos && targetHasPos;
      })
    : [];

  // Handle canvas panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && e.target === canvasRef.current) {
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
          const newPos = {
            x: currentPos.x + deltaX,
            y: currentPos.y + deltaY,
          };
          setTablePosition(isDraggingTable, newPos);
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
    },
    [isPanning, isDraggingTable, panStart, dragStart, zoom, tablePositions, setPan, setTablePosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDraggingTable(null);
  }, []);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Get mouse position relative to canvas
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate zoom delta
      const zoomSpeed = 0.1;
      const delta = e.deltaY > 0 ? 1 - zoomSpeed : 1 + zoomSpeed;
      const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
      
      // Zoom towards mouse position
      const zoomChange = newZoom / zoom;
      const newPan = {
        x: mouseX - (mouseX - pan.x) * zoomChange,
        y: mouseY - (mouseY - pan.y) * zoomChange,
      };
      
      setZoom(newZoom);
      setPan(newPan);
    },
    [zoom, pan, setZoom, setPan]
  );

  // Handle double-click to fit view
  const handleDoubleClick = useCallback(() => {
    if (!model || visibleTables.length === 0) return;
    resetView();
    // Calculate bounding box and fit
    const positions = visibleTables.map((t) => tablePositions[t.key] || { x: 0, y: 0 });
    if (positions.length === 0) return;
    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x + 280));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y + 400));
    const width = maxX - minX;
    const height = maxY - minY;
    const containerWidth = containerRef.current?.clientWidth || 1200;
    const containerHeight = containerRef.current?.clientHeight || 800;
    const scale = Math.min(containerWidth / width, containerHeight / height, 1) * 0.9;
    setZoom(scale);
    setPan({
      x: (containerWidth - (minX + maxX) * scale) / 2,
      y: (containerHeight - (minY + maxY) * scale) / 2,
    });
  }, [model, visibleTables, tablePositions, resetView, setZoom, setPan]);

  // Handle canvas click to clear selections and exit focus mode
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only clear if clicking directly on canvas (not on a table or relationship)
    if (e.target === canvasRef.current || e.target === containerRef.current) {
      setSelectedField(null);
      setSelectedTable(null);
      setSelectedRelationship(null);
      setFocusMode(false); // Exit focus mode to show all relationships
    }
  }, [setSelectedField, setSelectedTable, setSelectedRelationship, setFocusMode]);

  if (!model) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Upload an Excel file to visualize the data model</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onClick={handleCanvasClick}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      <svg
        ref={canvasRef}
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: `${25 * zoom}px ${25 * zoom}px`,
          backgroundPosition: `${pan.x % (25 * zoom)}px ${pan.y % (25 * zoom)}px`,
        }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Domain Containers - In domain and domain-overview layout modes */}
          {(layoutMode === 'domain' || layoutMode === 'domain-overview') && model && (() => {
            const domains = new Set(visibleTables.map(t => t.category));
            const domainPositions = new Map<string, { x: number; y: number; width: number; height: number }>();
            
            // Get dynamic table dimensions based on tableSize and layout mode
            const BASE_TABLE_WIDTH = 480;
            const BASE_TABLE_HEIGHT = 280;
            const SIZE_MULTIPLIERS = {
              small: { width: 0.75, height: 0.85 },
              medium: { width: 1.0, height: 1.0 },
              large: { width: 1.3, height: 1.2 },
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
              DOMAINS_PER_ROW: 4,
            };

            if (layoutMode === 'domain-overview') {
              const viewportW = typeof window !== 'undefined' ? window.innerWidth : 2400;
              const availableWidth = viewportW - 12;
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
              // Domain (non-overview): position/size from table bounds
              let domainPadding: number;
              let headerOffset: number;
              let footerOffset: number;
              domainPadding = 25;
              headerOffset = 105;
              footerOffset = 25;

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
            
            return Array.from(domainPositions.entries()).map(([domain, pos]) => (
              <DomainContainer
                key={domain}
                domain={domain}
                tables={visibleTables.filter(t => t.category === domain)}
                position={pos}
                width={pos.width}
                height={pos.height}
                isExpanded={expandedDomains.has(domain)}
                onToggle={() => toggleExpandedDomain(domain)}
              />
            ));
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
            
            return (
              <TableNode
                key={table.key}
                table={table}
                position={position}
                isSelected={selectedTable === table.key}
                isExpanded={layoutMode === 'domain-overview' ? false : expandedTables.has(table.key)}
                onSelect={() => setSelectedTable(table.key)}
                onToggleExpand={() => {
                  // Prevent expansion in overview mode
                  if (layoutMode !== 'domain-overview') {
                    toggleExpandedTable(table.key);
                  }
                }}
                onMouseDown={(e) => {
                  setIsDraggingTable(table.key);
                  setDragStart({ x: e.clientX, y: e.clientY });
                }}
                searchQuery={searchQuery}
                relationshipCounts={relationshipCounts}
                selectedField={selectedField}
                onFieldSelect={(tableKey, fieldName) => setSelectedField({ tableKey, fieldName })}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
