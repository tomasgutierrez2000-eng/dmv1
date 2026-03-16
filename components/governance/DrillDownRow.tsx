'use client';

import { Loader2, ChevronDown, ChevronRight, AlertTriangle, Search } from 'lucide-react';
import {
  CHILD_LEVEL, formatNumber, formatMetricValue,
  type DrillLevel, type DrillDownNode,
} from '@/lib/governance/drill-down';

interface ResultRow {
  dimension_key: unknown;
  metric_value: unknown;
  dimension_label?: string;
  [key: string]: unknown;
}

interface DrillDownRowProps {
  level: DrillLevel;
  row: ResultRow;
  depth: number;
  pathPrefix: string;
  drillDownMap: Map<string, DrillDownNode>;
  expandedPaths: Set<string>;
  onToggleExpand: (pathKey: string, level: DrillLevel, dimKey: string) => void;
  metricColorFn: (v: number) => string;
  extraKeys: string[];
  unitType?: string;
  onScopeToRow?: (dimKey: string) => void;
}

const DEPTH_BG = [
  'bg-pwc-gray-light/5',
  'bg-pwc-gray-light/8',
  'bg-pwc-gray-light/12',
  'bg-pwc-gray-light/16',
  'bg-pwc-gray-light/20',
  'bg-pwc-gray-light/25',
];

export default function DrillDownRow({
  level,
  row,
  depth,
  pathPrefix,
  drillDownMap,
  expandedPaths,
  onToggleExpand,
  metricColorFn,
  extraKeys,
  unitType,
  onScopeToRow,
}: DrillDownRowProps) {
  const dimKey = String(row.dimension_key ?? '');
  const pathKey = pathPrefix ? `${pathPrefix}/${level}:${dimKey}` : `${level}:${dimKey}`;
  const isExpanded = expandedPaths.has(pathKey);
  const childLevel = CHILD_LEVEL[level];
  const canDrillDown = childLevel !== null;
  const node = drillDownMap.get(pathKey);

  const val = Number(row.metric_value);
  const isPosition = level === 'position';
  const label = row.dimension_label ? String(row.dimension_label) : null;

  const paddingLeft = 16 + depth * 24;

  return (
    <>
      {/* Main row */}
      <tr
        onClick={canDrillDown ? () => onToggleExpand(pathKey, level, dimKey) : undefined}
        className={`group/row border-b border-pwc-gray-light/20 hover:bg-pwc-gray-light/10 transition-colors
          ${canDrillDown ? 'cursor-pointer' : ''}
          ${isExpanded ? DEPTH_BG[Math.min(depth, DEPTH_BG.length - 1)] : ''}
        `}
      >
        <td
          className="py-2 font-mono text-gray-300"
          style={{ paddingLeft }}
        >
          <span className="flex items-center gap-1.5">
            {canDrillDown ? (
              isExpanded
                ? <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
                : <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
            ) : (
              <span className="w-3 h-3 flex-shrink-0" />
            )}
            <span className={isPosition ? 'text-xs text-gray-400' : ''}>
              {dimKey}
              {label && (
                <span className="ml-1.5 text-gray-500 font-sans text-xs">
                  {label}
                </span>
              )}
            </span>
            {onScopeToRow && depth === 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onScopeToRow(dimKey); }}
                className="ml-auto p-0.5 rounded text-gray-600 hover:text-pwc-orange hover:bg-pwc-orange/10 transition-colors opacity-0 group-hover/row:opacity-100"
                title="Scope input data to this row"
              >
                <Search className="w-3 h-3" />
              </button>
            )}
          </span>
        </td>
        <td className={`px-4 py-2 text-right font-semibold tabular-nums ${isNaN(val) ? 'text-gray-500' : isPosition ? 'text-gray-300' : metricColorFn(val)}`}>
          {isPosition
            ? (unitType === 'CURRENCY' ? formatMetricValue(val, 'CURRENCY') : formatNumber(val))
            : formatMetricValue(val, unitType)
          }
        </td>
        {extraKeys.map(k => (
          <td key={k} className="px-4 py-2 text-right text-gray-400 tabular-nums text-xs">
            {formatNumber(row[k])}
          </td>
        ))}
      </tr>

      {/* Expanded child content */}
      {isExpanded && canDrillDown && (
        <>
          {/* Loading state */}
          {node?.loading && (
            <tr className={DEPTH_BG[Math.min(depth + 1, DEPTH_BG.length - 1)]}>
              <td colSpan={2 + extraKeys.length} className="py-3" style={{ paddingLeft: paddingLeft + 24 }}>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin text-pwc-orange" />
                  Loading {childLevel} data...
                </span>
              </td>
            </tr>
          )}

          {/* Error state */}
          {node?.error && (
            <tr className={DEPTH_BG[Math.min(depth + 1, DEPTH_BG.length - 1)]}>
              <td colSpan={2 + extraKeys.length} className="py-2" style={{ paddingLeft: paddingLeft + 24 }}>
                <span className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {node.error}
                </span>
              </td>
            </tr>
          )}

          {/* Empty state */}
          {node && !node.loading && !node.error && node.rows.length === 0 && (
            <tr className={DEPTH_BG[Math.min(depth + 1, DEPTH_BG.length - 1)]}>
              <td colSpan={2 + extraKeys.length} className="py-2 text-xs text-gray-500" style={{ paddingLeft: paddingLeft + 24 }}>
                No {childLevel} entities found
              </td>
            </tr>
          )}

          {/* Child rows — recursive */}
          {node && !node.loading && !node.error && node.rows.length > 0 && (
            <>
              {/* Left border indicator */}
              {node.rows.map((childRow, cidx) => {
                const childExtraKeys = Object.keys(childRow).filter(
                  k => k !== 'dimension_key' && k !== 'metric_value' && k !== 'dimension_label'
                );
                return (
                  <DrillDownRow
                    key={cidx}
                    level={childLevel!}
                    row={childRow}
                    depth={depth + 1}
                    pathPrefix={pathKey}
                    drillDownMap={drillDownMap}
                    expandedPaths={expandedPaths}
                    onToggleExpand={onToggleExpand}
                    metricColorFn={metricColorFn}
                    extraKeys={childExtraKeys}
                    unitType={unitType}
                    onScopeToRow={onScopeToRow}
                  />
                );
              })}
            </>
          )}
        </>
      )}
    </>
  );
}
