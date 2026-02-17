'use client';

import { useMemo } from 'react';
import { ChevronDown, ChevronRight, Database, Layers } from 'lucide-react';
import type { TableDef } from '../../types/model';
import { useModelStore } from '../../store/modelStore';
import { getCategoryColor } from '../../utils/colors';

interface DomainContainerProps {
  domain: string;
  tables: TableDef[];
  position: { x: number; y: number };
  width: number;
  height: number;
  isExpanded: boolean;
  onToggle: () => void;
  /** When true (compact overview), use a shorter header so the frame fits tightly */
  compactFrame?: boolean;
}

export default function DomainContainer({
  domain,
  tables,
  position,
  width,
  height,
  isExpanded,
  onToggle,
  compactFrame = false,
}: DomainContainerProps) {
  const { model, visibleLayers, layoutMode } = useModelStore();
  const categoryColor = getCategoryColor(domain);
  
  // Calculate domain statistics
  const stats = useMemo(() => {
    const visibleTables = tables.filter(t => visibleLayers[t.layer]);
    const byLayer = {
      L1: visibleTables.filter(t => t.layer === 'L1').length,
      L2: visibleTables.filter(t => t.layer === 'L2').length,
      L3: visibleTables.filter(t => t.layer === 'L3').length,
    };
    const totalFields = visibleTables.reduce((sum, t) => sum + t.fields.length, 0);
    const relationships = model ? model.relationships.filter(r => {
      const sourceTable = visibleTables.find(t => t.key === r.source.tableKey);
      const targetTable = visibleTables.find(t => t.key === r.target.tableKey);
      return sourceTable || targetTable;
    }).length : 0;
    
    return { byLayer, totalFields, relationships, tableCount: visibleTables.length };
  }, [tables, visibleLayers, model]);

  const isOverview = layoutMode === 'domain-overview';
  const headerHeight = isOverview ? (compactFrame ? 28 : 45) : 80;

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      style={{
        transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Domain Container Background - in overview let clicks pass through to tables */}
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx={isOverview ? 10 : 16}
        fill="rgba(31, 41, 55, 0.75)"
        stroke={categoryColor.color}
        strokeWidth={isOverview ? 2 : 4}
        className="drop-shadow-2xl"
        style={{
          pointerEvents: isOverview ? 'none' : 'auto',
          filter: isOverview
            ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
            : 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4))',
          strokeOpacity: 0.8,
          transition:
            'width 260ms cubic-bezier(0.22, 1, 0.36, 1), height 260ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms ease, stroke-opacity 220ms ease',
        }}
      />

      {/* Domain Header - keep pointer-events so header click still toggles */}
      <foreignObject
        x="0"
        y="0"
        width={width}
        height={headerHeight}
        style={{
          pointerEvents: 'auto',
          transition: 'width 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className={`h-full ${isOverview ? 'px-2 py-1' : 'px-6 py-4'} rounded-t-xl cursor-pointer transition-all hover:bg-white/10`}
          onClick={onToggle}
          style={{
            background: `linear-gradient(135deg, ${categoryColor.color}20 0%, ${categoryColor.color}10 100%)`,
            borderBottom: `${isOverview ? 2 : 3}px solid ${categoryColor.color}60`,
          }}
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div
                className={`${isOverview ? 'w-3 h-3' : 'w-5 h-5'} rounded-full shadow-lg flex-shrink-0 border-2 border-white/20`}
                style={{ backgroundColor: categoryColor.color }}
              />
              <div className="flex-1 min-w-0">
                <h3
                  className={`${isOverview ? 'text-base leading-tight' : 'text-2xl'} font-extrabold text-white truncate ${isOverview ? '' : 'mb-1'}`}
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                >
                  {domain}
                </h3>
                {!isOverview && (
                  <div className="flex items-center space-x-5 text-sm text-white/70">
                    <span className="flex items-center space-x-1.5 font-medium">
                      <Database className="w-4 h-4" />
                      <span>{stats.tableCount} tables</span>
                    </span>
                    <span className="flex items-center space-x-1.5 font-medium">
                      <Layers className="w-4 h-4" />
                      <span>{stats.totalFields} fields</span>
                    </span>
                    {stats.relationships > 0 && (
                      <span className="font-medium">{stats.relationships} rels</span>
                    )}
                  </div>
                )}
                {isOverview && (
                  <div className="flex items-center space-x-2 text-xs text-white/60 font-medium">
                    <span>{stats.tableCount} tables</span>
                    <span className="text-white/40">|</span>
                    <span>{stats.totalFields} fields</span>
                  </div>
                )}
              </div>
            </div>
            {!isOverview && (
              <div className="flex items-center space-x-3 flex-shrink-0">
                <div className="flex items-center space-x-1.5">
                  {stats.byLayer.L1 > 0 && (
                    <span className="px-2 py-1 bg-pwc-orange/25 text-pwc-orange-light text-xs rounded-md font-semibold border border-pwc-orange/40">
                      L1:{stats.byLayer.L1}
                    </span>
                  )}
                  {stats.byLayer.L2 > 0 && (
                    <span className="px-2 py-1 bg-pwc-orange/15 text-white/80 text-xs rounded-md font-semibold border border-pwc-orange/30">
                      L2:{stats.byLayer.L2}
                    </span>
                  )}
                  {stats.byLayer.L3 > 0 && (
                    <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-md font-semibold border border-white/20">
                      L3:{stats.byLayer.L3}
                    </span>
                  )}
                </div>
                <button className="text-white/60 hover:text-white transition-colors p-1 hover:bg-white/20 rounded">
                  {isExpanded ? (
                    <ChevronDown className="w-6 h-6" />
                  ) : (
                    <ChevronRight className="w-6 h-6" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </foreignObject>
      
      {/* Collapsed state indicator */}
      {!isExpanded && !isOverview && (
        <foreignObject
          x="0"
          y={headerHeight}
          width={width}
          height={height - headerHeight}
          style={{
            transition:
              'width 260ms cubic-bezier(0.22, 1, 0.36, 1), height 260ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="h-full flex items-center justify-center text-white/50 text-sm font-medium">
            Click to expand and view tables
          </div>
        </foreignObject>
      )}
    </g>
  );
}
