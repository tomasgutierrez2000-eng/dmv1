'use client';

import { Database, Key, Link2, ChevronDown, ChevronRight } from 'lucide-react';
import type { TableDef } from '../../types/model';
import { layerColors } from '../../utils/colors';
import { getCategoryColor } from '../../utils/colors';
import { useModelStore } from '../../store/modelStore';
import { getOverviewTableDimensions } from '../../utils/layoutEngine';

interface TableNodeProps {
  table: TableDef;
  position: { x: number; y: number };
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  searchQuery?: string;
  relationshipCounts?: { incoming: number; outgoing: number };
  selectedField?: { tableKey: string; fieldName: string } | null;
  onFieldSelect?: (tableKey: string, fieldName: string) => void;
}

// Base dimensions - larger defaults so boxes and text use more screen
const BASE_TABLE_WIDTH = 560;
const BASE_COLLAPSED_HEIGHT = 320;
const BASE_EXPANDED_HEIGHT = 600;
const BASE_HEADER_HEIGHT = 56;
const BASE_FOOTER_HEIGHT = 48;

// Size multipliers (large = noticeably bigger for focus/detailed use)
const SIZE_MULTIPLIERS = {
  small: { width: 0.8, height: 0.9 },
  medium: { width: 1.0, height: 1.0 },
  large: { width: 1.35, height: 1.25 },
};

export default function TableNode({
  table,
  position,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onMouseDown: handleMouseDownProp,
  searchQuery = '',
  relationshipCounts,
  selectedField,
  onFieldSelect,
}: TableNodeProps) {
  const { tableSize, viewMode, fieldDisplayMode, model, zoom, layoutMode } = useModelStore();
  const colors = layerColors[table.layer];
  const categoryColor = getCategoryColor(table.category);
  
  // Calculate relationship counts if not provided
  const relCounts = relationshipCounts || (model ? {
    incoming: model.relationships.filter(r => r.target.tableKey === table.key).length,
    outgoing: model.relationships.filter(r => r.source.tableKey === table.key).length,
  } : { incoming: 0, outgoing: 0 });
  
  // OVERVIEW MODE: Use fixed small size for all tables
  const isOverviewMode = layoutMode === 'domain-overview';
  
  // Keep geometry stable; canvas already scales with zoom.
  // Zoom only controls semantic detail levels (what content is shown), not card size.
  
  // Calculate dimensions based on size setting
  let sizeMultiplier = SIZE_MULTIPLIERS[tableSize];
  const overviewDims = isOverviewMode ? getOverviewTableDimensions(tableSize) : null;
  
  const baseWidth = BASE_TABLE_WIDTH * sizeMultiplier.width;
  const baseCollapsedHeight = BASE_COLLAPSED_HEIGHT * sizeMultiplier.height;
  const baseExpandedHeight = BASE_EXPANDED_HEIGHT * sizeMultiplier.height;
  const baseHeaderHeight = BASE_HEADER_HEIGHT * sizeMultiplier.height;
  
  // OVERVIEW MODE: Use small/medium/large dimensions from layout engine
  const TABLE_WIDTH = isOverviewMode && overviewDims
    ? overviewDims.width
    : Math.max(200, Math.round(baseWidth));
  const COLLAPSED_HEIGHT = isOverviewMode && overviewDims
    ? overviewDims.height
    : Math.max(120, Math.round(baseCollapsedHeight));
  const EXPANDED_HEIGHT = isOverviewMode && overviewDims
    ? overviewDims.height
    : Math.max(200, Math.round(baseExpandedHeight));
  const HEADER_HEIGHT = isOverviewMode && overviewDims
    ? Math.max(20, Math.round(overviewDims.height * 0.28))
    : Math.max(32, Math.round(baseHeaderHeight));
  const FOOTER_HEIGHT = isOverviewMode && overviewDims
    ? Math.max(12, Math.round(overviewDims.height * 0.16))
    : Math.max(24, Math.round(BASE_FOOTER_HEIGHT * sizeMultiplier.height));
  const TABLE_HEIGHT = isOverviewMode ? COLLAPSED_HEIGHT : (isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
  const SCROLLABLE_AREA_HEIGHT = EXPANDED_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
  
  // Progressive disclosure based on zoom level
  // Define zoom thresholds for different detail levels
  const ZOOM_THRESHOLDS = {
    VERY_LOW: 0.25,   // Below this: hide fields completely
    LOW: 0.4,         // Below this: show only field names
    MEDIUM: 0.6,      // Below this: show names + data types
    HIGH: 1.0,        // Above this: show all details
  };
  
  // Determine what to show based on zoom level
  const zoomLevel = zoom; // Use actual zoom value from store
  const showFields = zoomLevel >= ZOOM_THRESHOLDS.VERY_LOW; // Show fields if zoom >= 25%
  const showFieldNames = zoomLevel >= ZOOM_THRESHOLDS.VERY_LOW; // Always show names if fields are visible
  const showDataTypes = zoomLevel >= ZOOM_THRESHOLDS.MEDIUM && (fieldDisplayMode !== 'minimal'); // Show types if zoom >= 60%
  const showFieldDescriptions = zoomLevel >= ZOOM_THRESHOLDS.HIGH && (viewMode === 'detailed' || (viewMode === 'standard' && isExpanded)); // Show descriptions if zoom >= 100%
  const showFullInfo = zoomLevel >= ZOOM_THRESHOLDS.HIGH && fieldDisplayMode === 'full'; // Show full info if zoom >= 100%
  
  // Dynamic sizing based on view mode AND zoom level
  // OVERVIEW MODE: Always use compact styling
  const isCompact = isOverviewMode || viewMode === 'compact' || zoomLevel < ZOOM_THRESHOLDS.MEDIUM;
  const isDetailed = !isOverviewMode && viewMode === 'detailed' && zoomLevel >= ZOOM_THRESHOLDS.HIGH;
  
  // Dynamic sizing based on view mode
  const headerPadding = isCompact ? 'px-2.5 py-1.5' : isDetailed ? 'px-4 py-3' : 'px-3.5 py-2.5';
  const headerIconSize = isCompact ? 'w-3 h-3' : isDetailed ? 'w-5 h-5' : 'w-4 h-4';
  const headerTextSize = isCompact ? 'text-xs' : isDetailed ? 'text-lg' : 'text-base';
  const fieldPadding = isCompact ? 'px-1.5 py-1' : isDetailed ? 'px-3 py-2' : 'px-2.5 py-1.5';
  const fieldTextSize = isCompact ? 'text-[10px]' : isDetailed ? 'text-sm' : 'text-xs';
  const fieldIconSize = isCompact ? 'w-2.5 h-2.5' : isDetailed ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const footerPadding = isCompact ? 'px-2 py-1' : isDetailed ? 'px-4 py-2' : 'px-3 py-1.5';
  const footerTextSize = isCompact ? 'text-[9px]' : isDetailed ? 'text-xs' : 'text-[11px]';

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail === 2) {
      onToggleExpand();
      return;
    }
    onSelect();
    handleMouseDownProp(e);
  };

  const pkFields = table.fields.filter((f) => f.isPK);
  const fkFields = table.fields.filter((f) => f.isFK);
  const regularFields = table.fields.filter((f) => !f.isPK && !f.isFK);
  const previewFields = table.fields.slice(0, 2);

  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-300 text-yellow-900 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // All fields are now always visible and scrollable

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onMouseDown={handleMouseDown}
      style={{ cursor: 'grab' }}
    >
      <foreignObject 
        width={TABLE_WIDTH} 
        height={TABLE_HEIGHT}
        x="0" 
        y="0"
      >
        <div
          className={`rounded-xl shadow-2xl transition-all duration-200 overflow-hidden ${
            isSelected ? 'ring-4 ring-amber-400 ring-opacity-60 shadow-amber-400/20' : 'shadow-gray-300/50'
          }`}
          style={{
            backgroundColor: '#ffffff',
            border: `2px solid ${isSelected ? '#fbbf24' : colors.border}`,
            height: TABLE_HEIGHT,
            minHeight: TABLE_HEIGHT,
            maxHeight: TABLE_HEIGHT,
            overflow: 'hidden',
          }}
        >
          {/* Header - Dynamic sizing based on view mode */}
          <div
            className={`${headerPadding} rounded-t-xl flex items-center justify-between shadow-sm`}
            style={{ 
              background: `linear-gradient(135deg, ${colors.border} 0%, ${colors.primary} 100%)`,
              color: 'white'
            }}
          >
            <div className={`flex items-center ${isCompact ? 'space-x-1.5' : 'space-x-2.5'} flex-1 min-w-0`}>
              <Database className={`${headerIconSize} flex-shrink-0`} />
              <h3 className={`font-bold ${headerTextSize} truncate tracking-tight`}>{highlightMatch(table.name)}</h3>
              {!isCompact && (
                <span className={`${isDetailed ? 'text-xs' : 'text-[10px]'} opacity-90`}>({table.fields.length})</span>
              )}
            </div>
            <div className={`flex items-center ${isCompact ? 'space-x-1' : 'space-x-2'} flex-shrink-0`}>
              <div
                className={`${isCompact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full shadow-sm`}
                style={{ backgroundColor: categoryColor.color }}
                title={table.category}
              />
              <span className={`${isCompact ? 'px-1 py-0.5 text-[9px]' : isDetailed ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'} rounded font-bold bg-white/25 backdrop-blur-sm`}>
                {table.layer}
              </span>
              {/* Relationship indicators */}
              {(relCounts.incoming > 0 || relCounts.outgoing > 0) && !isCompact && (
                <div className={`flex items-center ${isCompact ? 'gap-0.5' : 'gap-1'} ml-1`} title={`${relCounts.incoming} incoming, ${relCounts.outgoing} outgoing relationships`}>
                  {relCounts.incoming > 0 && (
                    <span className={`${isDetailed ? 'text-[10px]' : 'text-[9px]'} text-amber-200 font-semibold`} title={`${relCounts.incoming} incoming`}>
                      ←{relCounts.incoming}
                    </span>
                  )}
                  {relCounts.outgoing > 0 && (
                    <span className={`${isDetailed ? 'text-[10px]' : 'text-[9px]'} text-emerald-200 font-semibold`} title={`${relCounts.outgoing} outgoing`}>
                      →{relCounts.outgoing}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-hidden" style={{ height: TABLE_HEIGHT - HEADER_HEIGHT }}>
            {isOverviewMode ? (
              <div className="flex-1 px-2 py-1 overflow-hidden">
                <div className="space-y-1">
                  {previewFields.length > 0 ? (
                    previewFields.map((field, idx) => (
                      <div
                        key={idx}
                        className={`text-[10px] rounded border px-1.5 py-0.5 truncate ${
                          field.isPK
                            ? 'bg-yellow-50 border-yellow-300 text-yellow-900'
                            : field.isFK
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-gray-50 border-gray-300 text-gray-700'
                        }`}
                        title={field.name}
                      >
                        {field.name}
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-gray-400 italic px-1">No fields</div>
                  )}
                  {table.fields.length > previewFields.length && (
                    <div className="text-[9px] text-gray-500 px-1">
                      +{table.fields.length - previewFields.length} more
                    </div>
                  )}
                </div>
              </div>
            ) : showFields ? (
              <div 
                className={`flex-1 overflow-y-auto ${isCompact ? 'px-2 py-1' : isDetailed ? 'px-4 py-3' : 'px-3 py-2'} scrollbar-thin`}
                style={{ 
                  maxHeight: isOverviewMode ? COLLAPSED_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT : (isExpanded ? SCROLLABLE_AREA_HEIGHT : COLLAPSED_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT),
                }}
                onWheel={(e) => {
                  e.stopPropagation(); // prevent canvas zoom; do NOT preventDefault so this div can scroll
                }}
              >
                {/* Compact table-like display for better horizontal scanning */}
                <div className={isCompact ? 'space-y-0.5' : isDetailed ? 'space-y-1.5' : 'space-y-1'}>
                  {table.fields.map((field, idx) => {
                  const isPK = field.isPK;
                  const isFK = field.isFK;
                  
                  return (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent table selection
                        if (onFieldSelect) {
                          onFieldSelect(table.key, field.name);
                        }
                      }}
                      className={`group ${fieldTextSize} ${fieldPadding} rounded border transition-all hover:shadow-sm hover:scale-[1.02] cursor-pointer ${
                        selectedField?.tableKey === table.key && selectedField?.fieldName === field.name
                          ? isPK
                            ? 'bg-gradient-to-r from-yellow-200 to-yellow-100 border-yellow-500 shadow-md ring-2 ring-yellow-400 ring-opacity-50'
                            : isFK
                            ? 'bg-gradient-to-r from-blue-200 to-blue-100 border-blue-500 shadow-md ring-2 ring-blue-400 ring-opacity-50'
                            : 'bg-gradient-to-r from-gray-200 to-gray-100 border-gray-500 shadow-md ring-2 ring-gray-400 ring-opacity-50'
                          : isPK 
                          ? 'bg-gradient-to-r from-yellow-50/90 to-yellow-50/70 border-yellow-300/70 hover:bg-gradient-to-r hover:from-yellow-100 hover:to-yellow-50 hover:border-yellow-400' 
                          : isFK
                          ? 'bg-gradient-to-r from-blue-50 to-blue-50/80 border-blue-300/70 hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-50 hover:border-blue-400'
                          : 'bg-gradient-to-r from-gray-50/70 to-gray-50/50 border-gray-300/50 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 hover:border-gray-400'
                      }`}
                    >
                      <div className={`flex items-center ${isCompact ? 'gap-1' : 'gap-2'}`}>
                        {/* Icons - Dynamic size with better visual hierarchy */}
                        <div className={`flex items-center ${isCompact ? 'gap-0.5' : 'gap-0.5'} flex-shrink-0`}>
                          {isPK && (
                            <div className="relative" title="Primary Key">
                              <Key className={`${fieldIconSize} text-yellow-600`} />
                              {!isCompact && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-500 rounded-full border border-white" />}
                            </div>
                          )}
                          {isFK && (
                            <div className="relative" title={`Foreign Key → ${field.fkTarget?.layer}.${field.fkTarget?.table}`}>
                              <Link2 className={`${fieldIconSize} text-blue-600`} />
                              {!isCompact && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full border border-white" />}
                            </div>
                          )}
                          {!isPK && !isFK && <div className={fieldIconSize} />}
                        </div>
                        
                        {/* Field Name - Dynamic size with better contrast and visual hierarchy */}
                        <span 
                          className={`font-mono ${isPK ? 'font-bold text-yellow-900' : isFK ? 'font-semibold text-blue-700' : 'font-medium text-gray-800'} flex-1 min-w-0 truncate ${fieldTextSize}`}
                          title={field.description || field.name}
                        >
                          {highlightMatch(field.name)}
                        </span>
                        
                        {/* Data Type - Show based on zoom level and field display mode */}
                        {showDataTypes && field.dataType && (
                          <span className={`text-gray-600 ${isCompact ? 'text-[9px] px-1 py-0.5' : isDetailed ? 'text-[10px] px-2 py-1' : 'text-[9px] px-1.5 py-0.5'} font-medium bg-gray-200/80 rounded border border-gray-300/50 flex-shrink-0`}>
                            {field.dataType}
                          </span>
                        )}
                      </div>
                      
                      {/* Description - Based on view mode with better styling */}
                      {showFieldDescriptions && field.description && (
                        <div className={`text-gray-700 ${isCompact ? 'text-[9px]' : isDetailed ? 'text-[10px]' : 'text-[9px]'} mt-1.5 ${isCompact ? 'ml-5' : 'ml-7'} ${showFullInfo ? 'leading-relaxed' : 'line-clamp-2'} bg-gray-50/50 rounded px-1.5 py-0.5 border-l-2 ${isPK ? 'border-l-yellow-400' : isFK ? 'border-l-blue-500' : 'border-l-gray-300'}`}>
                          {field.description}
                        </div>
                      )}
                      
                      {/* FK Target indicator - Always show for FK fields */}
                      {isFK && field.fkTarget && !isCompact && (
                        <div className={`text-blue-600 ${isDetailed ? 'text-[9px]' : 'text-[8px]'} mt-0.5 ${isCompact ? 'ml-5' : 'ml-7'} font-medium flex items-center gap-1`}>
                          <Link2 className="w-2.5 h-2.5" />
                          <span>→ {field.fkTarget.layer}.{field.fkTarget.table}.{field.fkTarget.field}</span>
                        </div>
                      )}
                      
                      {/* Additional info for full mode */}
                      {showFullInfo && field.whyRequired && (
                        <div className={`text-gray-600 ${isCompact ? 'text-[8px]' : 'text-[9px]'} mt-1 ${isCompact ? 'ml-5' : 'ml-7'} italic bg-amber-50/50 rounded px-1.5 py-0.5 border-l-2 border-amber-300`}>
                          <span className="font-semibold">Why:</span> {field.whyRequired}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs flex-col gap-1">
                <div>Zoom in to see fields</div>
                <div className="text-[10px] opacity-75">Current zoom: {Math.round(zoom * 100)}%</div>
              </div>
            )}

            {/* Stats Footer - Dynamic sizing */}
            <div className={`flex items-center justify-between ${footerPadding} border-t border-gray-200/60 bg-white/80 flex-shrink-0`}>
              <div className={`flex items-center ${isCompact ? 'gap-1.5' : 'gap-2.5'} ${footerTextSize} text-gray-600`}>
                {pkFields.length > 0 && (
                  <div className={`flex items-center ${isCompact ? 'gap-0.5' : 'gap-1'}`}>
                    <Key className={`${isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'} text-yellow-600`} />
                    <span className="font-semibold">{pkFields.length}</span>
                  </div>
                )}
                {fkFields.length > 0 && (
                  <div className={`flex items-center ${isCompact ? 'gap-0.5' : 'gap-1'}`}>
                    <Link2 className={`${isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'} text-blue-600`} />
                    <span className="font-semibold">{fkFields.length}</span>
                  </div>
                )}
                {!isCompact && (
                  <span className={`text-gray-500 ${footerTextSize}`}>{table.fields.length} fields</span>
                )}
              </div>
              
              {/* Expand/Collapse Button - Dynamic size */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className={`${isCompact ? 'px-1.5 py-0.5 text-[9px]' : isDetailed ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'} font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center ${isCompact ? 'gap-0.5' : 'gap-1'}`}
                title={isExpanded ? "Collapse" : "Expand for descriptions"}
              >
                {isExpanded ? (
                  <>
                    <ChevronDown className={isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                    {!isCompact && <span>Less</span>}
                  </>
                ) : (
                  <>
                    <ChevronRight className={isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                    {!isCompact && <span>More</span>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
