'use client';

import type { Relationship } from '../../types/model';
import type { TablePosition } from '../../types/model';
import { useModelStore } from '../../store/modelStore';
import { getOverviewTableDimensions, getCompactOverviewTableDimensions, OVERVIEW_CARD } from '../../utils/layoutEngine';

interface RelationshipLineProps {
  relationship: Relationship;
  sourcePos: TablePosition;
  targetPos: TablePosition;
  sourceFieldIndex?: number; // Index of the source field in the table
  targetFieldIndex?: number; // Index of the target field in the table
  sourceTableFields?: number; // Total number of fields in source table (for position calculation)
  targetTableFields?: number; // Total number of fields in target table (for position calculation)
  isSelected: boolean;
  isHovered: boolean;
  involvesSelectedField?: boolean; // True if this relationship involves the selected field
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

// Base dimensions - must match TableNode geometry
const BASE_TABLE_WIDTH = 560;
const BASE_TABLE_HEIGHT = 320;
const SIZE_MULTIPLIERS = {
  small: { width: 0.8, height: 0.9 },
  medium: { width: 1.0, height: 1.0 },
  large: { width: 1.35, height: 1.25 },
};

export default function RelationshipLine({
  relationship,
  sourcePos,
  targetPos,
  sourceFieldIndex,
  targetFieldIndex,
  sourceTableFields = 0,
  targetTableFields = 0,
  isSelected,
  isHovered,
  involvesSelectedField = false,
  onSelect,
  onHover,
}: RelationshipLineProps) {
  const { tableSize, viewMode, zoom, model, expandedTables, layoutMode } = useModelStore();
  const isOverviewMode = layoutMode === 'domain-overview' || layoutMode === 'snowflake';
  const overviewDims = isOverviewMode
    ? (viewMode === 'compact' ? getCompactOverviewTableDimensions() : getOverviewTableDimensions(tableSize))
    : null;

  // CRITICAL: Use EXACT same calculations as TableNode (and overview dimensions when in domain-overview)
  const sizeMultiplier = SIZE_MULTIPLIERS[tableSize];
  const BASE_COLLAPSED_HEIGHT = 320;
  const BASE_EXPANDED_HEIGHT = 600;
  const BASE_HEADER_HEIGHT = 56;
  const BASE_FOOTER_HEIGHT = 48;
  const baseWidth = BASE_TABLE_WIDTH * sizeMultiplier.width;
  const baseCollapsedHeight = BASE_COLLAPSED_HEIGHT * sizeMultiplier.height;
  const baseExpandedHeight = BASE_EXPANDED_HEIGHT * sizeMultiplier.height;
  const baseHeaderHeight = BASE_HEADER_HEIGHT * sizeMultiplier.height;

  const TABLE_WIDTH = isOverviewMode && overviewDims
    ? overviewDims.width
    : Math.max(200, Math.round(baseWidth));
  const COLLAPSED_HEIGHT = isOverviewMode && overviewDims
    ? overviewDims.height
    : Math.max(120, Math.round(baseCollapsedHeight));
  const EXPANDED_HEIGHT = isOverviewMode && overviewDims
    ? overviewDims.height
    : Math.max(200, Math.round(baseExpandedHeight));
  // Overview mode uses fixed geometry matching the pure-SVG cards
  const HEADER_HEIGHT = isOverviewMode
    ? OVERVIEW_CARD.HEADER_H
    : Math.max(32, Math.round(baseHeaderHeight));
  const FOOTER_HEIGHT = isOverviewMode
    ? OVERVIEW_CARD.FOOTER_H
    : Math.max(24, Math.round(BASE_FOOTER_HEIGHT * sizeMultiplier.height));

  const sourceTable = model?.tables[relationship.source.tableKey];
  const targetTable = model?.tables[relationship.target.tableKey];
  const sourceIsExpanded = sourceTable && !isOverviewMode ? expandedTables.has(sourceTable.key) : false;
  const targetIsExpanded = targetTable && !isOverviewMode ? expandedTables.has(targetTable.key) : false;
  const compactTableHeight = isOverviewMode && viewMode === 'compact'
    ? getCompactOverviewTableDimensions().height
    : isOverviewMode
    ? Math.max(56, OVERVIEW_CARD.HEADER_H + OVERVIEW_CARD.FOOTER_H + 6)
    : Math.max(84, HEADER_HEIGHT + FOOTER_HEIGHT);
  const sourceTableHeight = viewMode === 'compact'
    ? compactTableHeight
    : (sourceIsExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
  const targetTableHeight = viewMode === 'compact'
    ? compactTableHeight
    : (targetIsExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);

  const ZOOM_THRESHOLDS = { VERY_LOW: 0.25, LOW: 0.4, MEDIUM: 0.6, HIGH: 1.0 };
  const zoomLevel = zoom;
  const isCompact = isOverviewMode || viewMode === 'compact' || zoomLevel < ZOOM_THRESHOLDS.MEDIUM;
  const isDetailed = !isOverviewMode && viewMode === 'detailed' && zoomLevel >= ZOOM_THRESHOLDS.HIGH;

  // Overview mode: match the pure-SVG card field layout exactly
  const contentPaddingTop = isOverviewMode ? OVERVIEW_CARD.PAD_Y : isCompact ? 4 : isDetailed ? 12 : 8;
  const fieldSpacing = isOverviewMode ? 0 : isCompact ? 2 : isDetailed ? 6 : 4;
  const fieldPaddingY = isOverviewMode ? 0 : isCompact ? 4 : isDetailed ? 8 : 6;
  const textLineHeight = isOverviewMode ? OVERVIEW_CARD.LINE_H : isCompact ? 14 : isDetailed ? 16 : 14;
  const fieldHeight = isOverviewMode ? OVERVIEW_CARD.LINE_H : fieldPaddingY + textLineHeight + fieldPaddingY;
  
  // Calculate Y position for specific field - PRECISE calculation
  const getFieldY = (
    fieldIndex: number | undefined, 
    tableY: number, 
    tableHeight: number,
    isExpanded: boolean
  ) => {
    if (fieldIndex === undefined || fieldIndex < 0) {
      // Fallback to center of table
      return tableY + tableHeight / 2;
    }
    
    // Formula: tableY + HEADER_HEIGHT + contentPaddingTop + (fieldIndex * (fieldHeight + fieldSpacing)) + (fieldHeight / 2)
    // This gives us the center Y of the field
    const fieldCenterY = HEADER_HEIGHT + contentPaddingTop + (fieldIndex * (fieldHeight + fieldSpacing)) + (fieldHeight / 2);
    
    // Clamp to visible area (account for footer)
    const maxVisibleY = tableHeight - FOOTER_HEIGHT;
    const clampedY = Math.min(fieldCenterY, maxVisibleY - 10); // 10px margin from bottom
    
    return tableY + clampedY;
  };
  
  // Calculate connection points - PRECISE positioning
  // Source: right edge of source table, at field Y position
  const sourceX = sourcePos.x + TABLE_WIDTH;
  const sourceY = getFieldY(sourceFieldIndex, sourcePos.y, sourceTableHeight, sourceIsExpanded);
  
  // Target: left edge of target table, at field Y position  
  const targetX = targetPos.x;
  const targetY = getFieldY(targetFieldIndex, targetPos.y, targetTableHeight, targetIsExpanded);
  
  // Debug: Log positions when field indices are available (remove in production)
  // if (sourceFieldIndex !== undefined && targetFieldIndex !== undefined) {
  //   console.log('Relationship:', relationship.id, {
  //     source: { x: sourceX, y: sourceY, fieldIndex: sourceFieldIndex, tableY: sourcePos.y, tableHeight: sourceTableHeight },
  //     target: { x: targetX, y: targetY, fieldIndex: targetFieldIndex, tableY: targetPos.y, tableHeight: targetTableHeight },
  //     headerHeight: HEADER_HEIGHT,
  //     contentPadding: contentPaddingTop,
  //     fieldHeight,
  //     fieldSpacing,
  //   });
  // }

  // Calculate control points for smooth bezier curve
  // Optimized for horizontal flow - prefer horizontal lines
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // More horizontal curvature for better readability
  const horizontalCurvature = Math.min(Math.abs(dx) * 0.4, 120);
  const verticalCurvature = Math.min(Math.abs(dy) * 0.2, 60);
  
  const cp1x = sourceX + horizontalCurvature;
  const cp1y = sourceY + (dy > 0 ? verticalCurvature : -verticalCurvature);
  const cp2x = targetX - horizontalCurvature;
  const cp2y = targetY - (dy > 0 ? verticalCurvature : -verticalCurvature);

  const path = `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;

  // Enhanced colors and styling based on relationship type
  // Primary relationships: solid blue/green
  // Secondary relationships: dashed purple/orange
  // Selected field relationships: highlighted with amber/yellow
  const isPrimary = relationship.relationshipType === 'primary';
  const strokeColor = involvesSelectedField
    ? '#f59e0b' // Amber for selected field relationships
    : isSelected 
    ? '#fbbf24' 
    : isHovered 
    ? '#60a5fa' 
    : isPrimary
    ? (relationship.isCrossLayer ? '#10b981' : '#3b82f6') // Primary: blue (same-layer) or green (cross-layer)
    : (relationship.isCrossLayer ? '#8b5cf6' : '#f97316'); // Secondary: purple (cross-layer) or orange (same-layer)
  const strokeWidth = involvesSelectedField ? 4 : isSelected ? 3.5 : isHovered ? 3 : isPrimary ? 2.5 : 2;
  const strokeDash = involvesSelectedField ? '0' : isPrimary ? '0' : '6,3'; // Selected field: solid, Primary: solid, Secondary: dashed
  const opacity = involvesSelectedField ? 1 : isSelected ? 1 : isHovered ? 0.9 : isPrimary ? 0.8 : 0.6; // Selected field: fully visible

  return (
    <g>
      <defs>
        <marker
          id={`arrow-${relationship.id}`}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon 
            points="0 0, 12 4, 0 8" 
            fill={strokeColor}
            stroke={strokeColor}
            strokeWidth="0.5"
            opacity={opacity}
          />
        </marker>
        {/* Glow filter for selected/hovered relationships and selected field relationships */}
        {(isSelected || involvesSelectedField) && (
          <filter id={`glow-${relationship.id}`}>
            <feGaussianBlur stdDeviation={involvesSelectedField ? "4" : "3"} result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        )}
      </defs>
      
      {/* Shadow/glow path for selected relationships and selected field relationships */}
      {(isSelected || involvesSelectedField) && (
        <path
          d={path}
          stroke={strokeColor}
          strokeWidth={strokeWidth + (involvesSelectedField ? 3 : 2)}
          strokeDasharray={strokeDash}
          fill="none"
          opacity={involvesSelectedField ? "0.4" : "0.3"}
          filter={`url(#glow-${relationship.id})`}
        />
      )}
      
      {/* Main relationship line */}
      <path
        d={path}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        fill="none"
        markerEnd={`url(#arrow-${relationship.id})`}
        className="cursor-pointer transition-all duration-200"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        opacity={opacity}
        style={{
          filter: involvesSelectedField
            ? `drop-shadow(0 0 8px ${strokeColor}) drop-shadow(0 0 4px ${strokeColor})`
            : isSelected 
            ? `drop-shadow(0 0 6px ${strokeColor})` 
            : isHovered 
            ? `drop-shadow(0 0 4px ${strokeColor})` 
            : 'none',
        }}
      />
      
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth="25"
        fill="none"
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      />
      
      {/* Label when selected: show linked fields (source.field → target.field) */}
      {(isSelected || involvesSelectedField) && (
        <g transform={`translate(${(sourceX + 3 * cp1x + 3 * cp2x + targetX) / 8}, ${(sourceY + 3 * cp1y + 3 * cp2y + targetY) / 8})`}>
          <rect x="-60" y="-10" width="120" height="20" rx="4" fill="rgba(15,23,42,0.95)" stroke={strokeColor} strokeWidth="1.5" className="pointer-events-none" />
          <text textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-mono fill-white pointer-events-none" style={{ pointerEvents: 'none' }}>
            {relationship.source.field} → {relationship.target.field}
          </text>
        </g>
      )}

      {/* Connection point indicators - dots at the exact field positions the arrow links to */}
      {(sourceFieldIndex !== undefined && sourceFieldIndex >= 0) && (
        <circle
          cx={sourceX}
          cy={sourceY}
          r={involvesSelectedField ? 5 : isSelected ? 4 : 3}
          fill={strokeColor}
          opacity={opacity}
          className="pointer-events-none"
        />
      )}
      {(targetFieldIndex !== undefined && targetFieldIndex >= 0) && (
        <circle
          cx={targetX}
          cy={targetY}
          r={involvesSelectedField ? 5 : isSelected ? 4 : 3}
          fill={strokeColor}
          opacity={opacity}
          className="pointer-events-none"
        />
      )}
    </g>
  );
}
