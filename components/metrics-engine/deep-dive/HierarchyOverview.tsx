'use client';

import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import type { CalculationDimension, SourceField } from '@/data/l3-metrics';
import { ROLLUP_HIERARCHY_LEVELS, ROLLUP_LEVEL_LABELS, type RollupLevelKey } from '@/lib/metric-library/types';
import { extractSourceTables } from '@/lib/deep-dive/lineage-parser';
import type { DimensionData } from '@/lib/deep-dive/cross-tier-resolver';
import { LAYER_COLORS, TIER_SVG, TABLE_PILL_SVG, LAYOUT } from './shared-styles';

/* ── Dimension ↔ rollup mapping ── */
const DIM_TO_ROLLUP: Record<CalculationDimension, RollupLevelKey> = {
  facility: 'facility',
  counterparty: 'counterparty',
  L3: 'desk',
  L2: 'portfolio',
  L1: 'lob',
};

const ROLLUP_TO_DIM: Record<RollupLevelKey, CalculationDimension> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'L3',
  portfolio: 'L2',
  lob: 'L1',
};

/* ── Layout helpers ── */
interface TierLayout {
  tier: RollupLevelKey;
  label: string;
  x: number;
  y: number;
  sourceTables: { layer: string; table: string; fields: string[] }[];
  tablePositions: { x: number; y: number; layer: string; table: string; fields: string[] }[];
  rollupLogic?: string;
}

function computeLayout(
  dimensionDataMap: Map<CalculationDimension, DimensionData>,
  currentDimension: CalculationDimension
): { tiers: TierLayout[]; width: number; height: number } {
  const { TIER_W, TIER_H, TABLE_W, TABLE_H, TABLE_FIELD_H, COL_GAP, ROW_GAP, PADDING } = LAYOUT;

  const currentRollup = DIM_TO_ROLLUP[currentDimension];
  const currentIdx = ROLLUP_HIERARCHY_LEVELS.indexOf(currentRollup);

  // Build source tables per tier
  const tierData: { tier: RollupLevelKey; tables: { layer: string; table: string; fields: string[] }[]; rollupLogic?: string }[] = [];
  for (const level of ROLLUP_HIERARCHY_LEVELS) {
    const dim = ROLLUP_TO_DIM[level];
    const data = dimensionDataMap.get(dim);
    const tables = data?.sourceFields ? extractSourceTables(data.sourceFields) : [];

    // Deduplicate tables that also appear in lower tiers — only show NEW tables at each tier
    const lowerTables = new Set<string>();
    for (const prev of tierData) {
      for (const t of prev.tables) {
        lowerTables.add(`${t.layer}.${t.table}`);
      }
    }
    const newTables = tables.filter((t) => !lowerTables.has(`${t.layer}.${t.table}`));
    // But always show tables that gained new fields at this tier
    const existingWithNewFields = tables.filter((t) => {
      const key = `${t.layer}.${t.table}`;
      if (!lowerTables.has(key)) return false;
      // Check if there are new fields compared to what was already shown
      const prevTableEntry = tierData
        .flatMap((td) => td.tables)
        .find((pt) => `${pt.layer}.${pt.table}` === key);
      if (!prevTableEntry) return false;
      return t.fields.some((f) => !prevTableEntry.fields.includes(f));
    });

    tierData.push({
      tier: level,
      tables: [...newTables, ...existingWithNewFields],
      rollupLogic: data?.rollupLogic,
    });
  }

  // Compute positions
  const tiers: TierLayout[] = [];
  let maxTableStack = 0;
  for (const td of tierData) {
    const tableCount = td.tables.reduce(
      (acc, t) => acc + 1 + Math.min(t.fields.length, 3),
      0
    );
    if (tableCount > maxTableStack) maxTableStack = tableCount;
  }

  const tierY = PADDING + 8;
  for (let i = 0; i < tierData.length; i++) {
    const td = tierData[i];
    const x = PADDING + i * (TIER_W + COL_GAP);

    // Position source table pills below the tier node
    const tablePositions: TierLayout['tablePositions'] = [];
    let tableY = tierY + TIER_H + ROW_GAP + 4;
    for (const t of td.tables) {
      const fieldCount = Math.min(t.fields.length, 3);
      tablePositions.push({
        x: x + (TIER_W - TABLE_W) / 2,
        y: tableY,
        layer: t.layer,
        table: t.table,
        fields: t.fields,
      });
      tableY += TABLE_H + fieldCount * TABLE_FIELD_H + ROW_GAP;
    }

    tiers.push({
      tier: td.tier,
      label: ROLLUP_LEVEL_LABELS[td.tier],
      x,
      y: tierY,
      sourceTables: td.tables,
      tablePositions,
      rollupLogic: td.rollupLogic,
    });
  }

  // Compute total dimensions
  const lastTier = tiers[tiers.length - 1];
  const width = lastTier ? lastTier.x + TIER_W + PADDING : 400;

  // Height: tier + tallest table stack
  let maxBottom = tierY + TIER_H + PADDING;
  for (const tier of tiers) {
    for (const tp of tier.tablePositions) {
      const fieldCount = Math.min(tp.fields.length, 3);
      const bottom = tp.y + TABLE_H + fieldCount * TABLE_FIELD_H + PADDING;
      if (bottom > maxBottom) maxBottom = bottom;
    }
  }

  return { tiers, width, height: maxBottom };
}

/* ── SVG edge helpers ── */
function tierToTierEdge(from: TierLayout, to: TierLayout): string {
  const x1 = from.x + LAYOUT.TIER_W;
  const y1 = from.y + LAYOUT.TIER_H / 2;
  const x2 = to.x;
  const y2 = to.y + LAYOUT.TIER_H / 2;
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
}

function tableToTierEdge(
  tx: number,
  ty: number,
  tableH: number,
  tierX: number,
  tierY: number
): string {
  const x1 = tx + LAYOUT.TABLE_W / 2;
  const y1 = ty;
  const x2 = tierX + LAYOUT.TIER_W / 2;
  const y2 = tierY + LAYOUT.TIER_H;
  const cy = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`;
}

/* ── Component ── */
interface HierarchyOverviewProps {
  metricName: string;
  currentDimension: CalculationDimension;
  allDimensionData: Map<CalculationDimension, DimensionData>;
}

export default function HierarchyOverview({
  metricName,
  currentDimension,
  allDimensionData,
}: HierarchyOverviewProps) {
  const { tiers, width, height } = useMemo(
    () => computeLayout(allDimensionData, currentDimension),
    [allDimensionData, currentDimension]
  );

  const currentRollup = DIM_TO_ROLLUP[currentDimension];
  const currentIdx = ROLLUP_HIERARCHY_LEVELS.indexOf(currentRollup);

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
        <Layers className="w-3.5 h-3.5" />
        Hierarchy Overview
      </h2>
      <div className="rounded-xl bg-white/[0.03] border border-white/10 overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          style={{ minWidth: width }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth={LAYOUT.ARROW_SIZE}
              markerHeight={LAYOUT.ARROW_SIZE}
              refX={LAYOUT.ARROW_SIZE - 1}
              refY={LAYOUT.ARROW_SIZE / 2}
              orient="auto"
            >
              <polygon
                points={`0 0, ${LAYOUT.ARROW_SIZE} ${LAYOUT.ARROW_SIZE / 2}, 0 ${LAYOUT.ARROW_SIZE}`}
                fill="#6b7280"
              />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth={LAYOUT.ARROW_SIZE}
              markerHeight={LAYOUT.ARROW_SIZE}
              refX={LAYOUT.ARROW_SIZE - 1}
              refY={LAYOUT.ARROW_SIZE / 2}
              orient="auto"
            >
              <polygon
                points={`0 0, ${LAYOUT.ARROW_SIZE} ${LAYOUT.ARROW_SIZE / 2}, 0 ${LAYOUT.ARROW_SIZE}`}
                fill="#a855f7"
              />
            </marker>
          </defs>

          {/* Tier-to-tier edges */}
          {tiers.map((tier, i) => {
            if (i === 0) return null;
            const prev = tiers[i - 1];
            const isActive = i <= currentIdx;
            return (
              <path
                key={`edge-${prev.tier}-${tier.tier}`}
                d={tierToTierEdge(prev, tier)}
                fill="none"
                stroke={isActive ? '#a855f7' : '#374151'}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? undefined : '4 4'}
                markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                opacity={i > currentIdx + 1 ? 0.25 : 1}
              />
            );
          })}

          {/* Table-to-tier edges */}
          {tiers.map((tier) => {
            const tierIdx = ROLLUP_HIERARCHY_LEVELS.indexOf(tier.tier);
            const isDimmed = tierIdx > currentIdx;
            return tier.tablePositions.map((tp) => (
              <path
                key={`table-edge-${tier.tier}-${tp.layer}.${tp.table}`}
                d={tableToTierEdge(tp.x, tp.y, LAYOUT.TABLE_H, tier.x, tier.y)}
                fill="none"
                stroke={TABLE_PILL_SVG[tp.layer]?.stroke ?? '#6b7280'}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={isDimmed ? 0.2 : 0.5}
              />
            ));
          })}

          {/* Tier nodes */}
          {tiers.map((tier) => {
            const tierIdx = ROLLUP_HIERARCHY_LEVELS.indexOf(tier.tier);
            const isSelected = tier.tier === currentRollup;
            const isDimmed = tierIdx > currentIdx;
            const style = isSelected
              ? TIER_SVG.selected
              : isDimmed
                ? TIER_SVG.dimmed
                : TIER_SVG.default;

            return (
              <g key={`tier-${tier.tier}`} opacity={isDimmed ? 0.35 : 1}>
                {/* Glow for selected */}
                {isSelected && (
                  <rect
                    x={tier.x - 3}
                    y={tier.y - 3}
                    width={LAYOUT.TIER_W + 6}
                    height={LAYOUT.TIER_H + 6}
                    rx={12}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={2}
                    opacity={0.4}
                  />
                )}
                <rect
                  x={tier.x}
                  y={tier.y}
                  width={LAYOUT.TIER_W}
                  height={LAYOUT.TIER_H}
                  rx={10}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text
                  x={tier.x + LAYOUT.TIER_W / 2}
                  y={tier.y + 22}
                  textAnchor="middle"
                  fill={style.textFill}
                  fontSize={12}
                  fontWeight={600}
                >
                  {tier.label}
                </text>
                {tier.rollupLogic && (
                  <text
                    x={tier.x + LAYOUT.TIER_W / 2}
                    y={tier.y + 40}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize={9}
                  >
                    {tier.rollupLogic.length > 22
                      ? tier.rollupLogic.slice(0, 20) + '...'
                      : tier.rollupLogic}
                  </text>
                )}
              </g>
            );
          })}

          {/* Source table pills */}
          {tiers.map((tier) => {
            const tierIdx = ROLLUP_HIERARCHY_LEVELS.indexOf(tier.tier);
            const isDimmed = tierIdx > currentIdx;
            return tier.tablePositions.map((tp) => {
              const colors = TABLE_PILL_SVG[tp.layer] ?? TABLE_PILL_SVG.L2;
              const fieldCount = Math.min(tp.fields.length, 3);
              const totalH = LAYOUT.TABLE_H + fieldCount * LAYOUT.TABLE_FIELD_H;

              return (
                <g
                  key={`table-${tier.tier}-${tp.layer}.${tp.table}`}
                  opacity={isDimmed ? 0.2 : 0.85}
                >
                  <rect
                    x={tp.x}
                    y={tp.y}
                    width={LAYOUT.TABLE_W}
                    height={totalH}
                    rx={6}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={1}
                  />
                  {/* Layer badge */}
                  <rect
                    x={tp.x + 4}
                    y={tp.y + 4}
                    width={20}
                    height={14}
                    rx={3}
                    fill={colors.stroke}
                    opacity={0.25}
                  />
                  <text
                    x={tp.x + 14}
                    y={tp.y + 14}
                    textAnchor="middle"
                    fill={colors.textFill}
                    fontSize={8}
                    fontWeight={700}
                  >
                    {tp.layer}
                  </text>
                  {/* Table name */}
                  <text
                    x={tp.x + 28}
                    y={tp.y + 15}
                    fill={colors.textFill}
                    fontSize={10}
                    fontWeight={600}
                  >
                    {tp.table.length > 18 ? tp.table.slice(0, 16) + '...' : tp.table}
                  </text>
                  {/* Field names */}
                  {tp.fields.slice(0, 3).map((field, fi) => (
                    <text
                      key={field}
                      x={tp.x + 10}
                      y={tp.y + LAYOUT.TABLE_H + fi * LAYOUT.TABLE_FIELD_H + 12}
                      fill="#9ca3af"
                      fontSize={9}
                      fontFamily="monospace"
                    >
                      {field.length > 22 ? field.slice(0, 20) + '...' : field}
                    </text>
                  ))}
                  {tp.fields.length > 3 && (
                    <text
                      x={tp.x + 10}
                      y={tp.y + LAYOUT.TABLE_H + 3 * LAYOUT.TABLE_FIELD_H + 12}
                      fill="#6b7280"
                      fontSize={8}
                    >
                      +{tp.fields.length - 3} more
                    </text>
                  )}
                </g>
              );
            });
          })}
        </svg>
      </div>
    </section>
  );
}
