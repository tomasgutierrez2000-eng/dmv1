'use client';

import React from 'react';
import type { DemoFacility } from '@/lib/metric-library/types';
import type {
  MetricVisualizationConfig,
  DemoEntity,
  WorkedExampleColumn,
} from '@/lib/metric-library/metric-config';
import { getValueColor, formatMetricValue, computeRollup } from '@/lib/metric-library/metric-config';

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function formatCellValue(
  val: number | string | undefined,
  col: WorkedExampleColumn,
): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'string') return val;
  switch (col.format) {
    case 'currency':
      return val >= 1_000_000
        ? `$${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}M`
        : `$${(val / 1_000).toFixed(0)}K`;
    case 'percentage':
      return `${val.toFixed(1)}%`;
    case 'ratio':
      return `${val.toFixed(2)}x`;
    case 'number':
      return val.toLocaleString();
    case 'text':
      return String(val);
    default:
      return String(val);
  }
}

function computeSubtotal(
  entities: DemoEntity[],
  col: WorkedExampleColumn,
  config: MetricVisualizationConfig,
): { value: string; raw: number } | null {
  if (!col.subtotal_fn || col.subtotal_fn === 'none') return null;

  const vals = entities.map(e => Number(e.fields[col.field]) || 0);

  switch (col.subtotal_fn) {
    case 'sum': {
      const sum = vals.reduce((s, v) => s + v, 0);
      return { value: formatCellValue(sum, col), raw: sum };
    }
    case 'count':
      return { value: String(entities.length), raw: entities.length };
    case 'weighted-avg': {
      const weightField = col.weight_field ?? config.metric_fields.weight_value ?? config.weight_field;
      if (!weightField) {
        // Fall back to simple average
        const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        return { value: formatCellValue(avg, col), raw: avg };
      }
      let weightedSum = 0;
      let totalWeight = 0;
      for (const e of entities) {
        const v = Number(e.fields[col.field]) || 0;
        const w = Number(e.fields[weightField]) || 0;
        weightedSum += v * w;
        totalWeight += w;
      }
      const wtdAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
      return { value: formatCellValue(wtdAvg, col), raw: wtdAvg };
    }
    default:
      return null;
  }
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  LOAN: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  COMMITMENT: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  SECURITY: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  DERIVATIVE: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  DEPOSIT: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  SFT: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
};

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] ?? { bg: 'bg-gray-500/15', text: 'text-gray-400' };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
      {type}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * POSITION TABLE — shows individual positions within a facility
 * (Already generic — no changes needed)
 * ──────────────────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

export function PositionTable({ facility }: { facility: DemoFacility }) {
  const total = facility.positions.reduce((s, p) => s + p.balance_amount, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 px-3 font-semibold">Position</th>
            <th className="text-left py-2 px-3 font-semibold">Type</th>
            <th className="text-left py-2 px-3 font-semibold">Description</th>
            <th className="text-right py-2 px-3 font-semibold">Balance</th>
          </tr>
        </thead>
        <tbody>
          {facility.positions.map((p) => (
            <tr key={p.position_id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
              <td className="py-2 px-3 font-mono text-xs text-gray-400">{p.position_id}</td>
              <td className="py-2 px-3"><TypeBadge type={p.product_code} /></td>
              <td className="py-2 px-3 text-gray-300">{p.description}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-200">{fmt(p.balance_amount)}</td>
            </tr>
          ))}
          <tr className="bg-white/[0.03] font-semibold">
            <td colSpan={3} className="py-2 px-3 text-gray-400 text-xs uppercase tracking-wider">
              Facility Total (= committed_facility_amt)
            </td>
            <td className="py-2 px-3 text-right font-mono text-emerald-400">{fmt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ENTITY TABLE — config-driven table showing entities with metric columns
 * Replaces the old FacilityTable with isDscr branching
 * ──────────────────────────────────────────────────────────────────────────── */

interface EntityTableProps {
  entities: DemoEntity[];
  columns: WorkedExampleColumn[];
  config: MetricVisualizationConfig;
  groupBy?: 'desk' | 'counterparty';
  showPositionCount?: boolean;
  highlightResult?: boolean;
}

export function EntityTable({
  entities,
  columns,
  config,
  groupBy,
  showPositionCount,
  highlightResult = true,
}: EntityTableProps) {
  // Group entities if requested
  let groups: { label: string; items: DemoEntity[] }[] = [];
  if (groupBy === 'desk') {
    const byDesk = new Map<string, DemoEntity[]>();
    for (const e of entities) {
      const key = e.desk_name ?? 'Unknown';
      const arr = byDesk.get(key) ?? [];
      arr.push(e);
      byDesk.set(key, arr);
    }
    groups = Array.from(byDesk.entries()).map(([label, items]) => ({ label, items }));
  } else if (groupBy === 'counterparty') {
    const byCp = new Map<string, DemoEntity[]>();
    for (const e of entities) {
      const arr = byCp.get(e.counterparty_name) ?? [];
      arr.push(e);
      byCp.set(e.counterparty_name, arr);
    }
    groups = Array.from(byCp.entries()).map(([label, items]) => ({ label, items }));
  }

  const totalColSpan = 1 + (showPositionCount ? 1 : 0) + columns.length;
  const resultCol = columns.find(c => c.is_result);
  const grandTotalLabel = config.rollup_strategy === 'weighted-avg'
    ? 'Weighted Avg'
    : config.rollup_strategy === 'avg'
      ? 'Average'
      : config.rollup_strategy === 'count'
        ? 'Count'
        : 'Grand Total';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 px-3 font-semibold min-w-[240px]">Facility</th>
            {showPositionCount && <th className="text-center py-2 px-3 font-semibold whitespace-nowrap">Positions</th>}
            {columns.map((col) => (
              <th key={col.field} className="text-right py-2 px-3 font-semibold whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.length > 0 ? (
            groups.map((g) => (
              <React.Fragment key={g.label}>
                {/* Group header */}
                <tr className="bg-gray-800/30">
                  <td colSpan={totalColSpan} className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                    {g.label}
                  </td>
                </tr>
                {/* Group rows */}
                {g.items.map((entity) => (
                  <EntityRow
                    key={entity.entity_id}
                    entity={entity}
                    columns={columns}
                    config={config}
                    showPositionCount={showPositionCount}
                  />
                ))}
                {/* Subtotal row */}
                <SubtotalRow
                  label={`Subtotal — ${g.label}`}
                  entities={g.items}
                  columns={columns}
                  config={config}
                  showPositionCount={showPositionCount}
                  isGrand={false}
                />
              </React.Fragment>
            ))
          ) : (
            entities.map((entity) => (
              <EntityRow
                key={entity.entity_id}
                entity={entity}
                columns={columns}
                config={config}
                showPositionCount={showPositionCount}
              />
            ))
          )}
          {/* Grand total row */}
          {entities.length > 1 && (
            <SubtotalRow
              label={grandTotalLabel}
              entities={entities}
              columns={columns}
              config={config}
              showPositionCount={showPositionCount}
              isGrand={true}
              highlightResult={highlightResult}
            />
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ENTITY ROW — single row in the table
 * ──────────────────────────────────────────────────────────────────────────── */

function EntityRow({
  entity,
  columns,
  config,
  showPositionCount,
}: {
  entity: DemoEntity;
  columns: WorkedExampleColumn[];
  config: MetricVisualizationConfig;
  showPositionCount?: boolean;
}) {
  return (
    <tr className="border-b border-gray-800/50 hover:bg-white/[0.02]">
      {/* Facility name cell */}
      <td className="py-2 px-3 min-w-[240px]">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="font-mono text-[10px] text-gray-500 flex-shrink-0">{entity.entity_id}</span>
          <span className="text-gray-300 text-sm">{entity.entity_name}</span>
        </div>
        <div className="text-[10px] text-gray-600 mt-0.5 whitespace-nowrap">{entity.counterparty_name}</div>
      </td>
      {/* Position count */}
      {showPositionCount && (
        <td className="py-2 px-3 text-center font-mono text-xs text-gray-500">
          {entity.positions?.length ?? 0}
        </td>
      )}
      {/* Metric columns */}
      {columns.map((col) => {
        const val = entity.fields[col.field];
        const numVal = typeof val === 'number' ? val : Number(val);
        const colorClass = col.is_result && !isNaN(numVal)
          ? getValueColor(numVal, config.value_format)
          : 'text-gray-200';
        const fontWeight = col.is_result ? 'font-semibold' : '';
        return (
          <td key={col.field} className={`py-2 px-3 text-right font-mono whitespace-nowrap ${fontWeight} ${colorClass}`}>
            {formatCellValue(val, col)}
          </td>
        );
      })}
    </tr>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SUBTOTAL ROW — aggregated row (group subtotal or grand total)
 * ──────────────────────────────────────────────────────────────────────────── */

function SubtotalRow({
  label,
  entities,
  columns,
  config,
  showPositionCount,
  isGrand,
  highlightResult,
}: {
  label: string;
  entities: DemoEntity[];
  columns: WorkedExampleColumn[];
  config: MetricVisualizationConfig;
  showPositionCount?: boolean;
  isGrand: boolean;
  highlightResult?: boolean;
}) {
  const bgClass = isGrand
    ? highlightResult ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
    : 'bg-white/[0.02]';

  return (
    <tr className={`${isGrand ? 'font-semibold' : ''} ${bgClass}`}>
      <td className={`py-${isGrand ? '2' : '1.5'} px-3 text-gray-${isGrand ? '300' : '500'} text-xs min-w-[240px] whitespace-nowrap ${isGrand ? 'uppercase tracking-wider' : 'italic'}`}>
        {label}
      </td>
      {showPositionCount && (
        <td className="py-1.5 px-3 text-center font-mono text-xs text-gray-400">
          {isGrand ? entities.reduce((s, e) => s + (e.positions?.length ?? 0), 0) : ''}
        </td>
      )}
      {columns.map((col) => {
        const sub = computeSubtotal(entities, col, config);
        if (!sub) {
          return (
            <td key={col.field} className="py-1.5 px-3 text-right font-mono text-xs text-gray-400 whitespace-nowrap">
              —
            </td>
          );
        }

        const colorClass = col.is_result
          ? (isGrand && highlightResult
              ? getValueColor(sub.raw, config.value_format)
              : getValueColor(sub.raw, config.value_format))
          : (isGrand ? 'text-emerald-400' : 'text-gray-400');

        return (
          <td
            key={col.field}
            className={`py-${isGrand ? '2' : '1.5'} px-3 text-right font-mono whitespace-nowrap ${
              isGrand && col.is_result ? 'font-bold text-lg' : 'text-xs'
            } ${col.is_result ? colorClass : (isGrand ? 'text-emerald-400' : 'text-gray-400')}`}
          >
            {col.is_result && isGrand
              ? formatMetricValue(sub.raw, config.value_format)
              : sub.value}
          </td>
        );
      })}
    </tr>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * LEGACY WRAPPER — FacilityTable for backward compatibility
 * Converts DemoFacility[] to DemoEntity[] and renders EntityTable
 * ──────────────────────────────────────────────────────────────────────────── */

interface FacilityTableProps {
  facilities: DemoFacility[];
  groupBy?: 'desk' | 'counterparty';
  showPositionCount?: boolean;
  highlightResult?: boolean;
  metricType?: 'LTV' | 'DSCR';
}

function facilityToEntity(f: DemoFacility): DemoEntity {
  return {
    entity_id: f.facility_id,
    entity_name: f.facility_name,
    counterparty_id: f.counterparty_id,
    counterparty_name: f.counterparty_name,
    desk_name: f.desk_name,
    portfolio_name: f.portfolio_name,
    lob_name: f.lob_name,
    fields: {
      committed_amt: f.committed_amt,
      collateral_value: f.collateral_value,
      ltv_pct: f.ltv_pct,
      noi_current_amt: f.noi_current_amt ?? 0,
      debt_service_amt: f.debt_service_amt ?? 0,
      dscr_value: f.dscr_value ?? 0,
      unfunded_amt: f.unfunded_amt ?? 0,
      bank_share_pct: f.bank_share_pct ?? 0,
      undrawn_exposure_amt: f.undrawn_exposure_amt ?? 0,
    },
    positions: f.positions.map(p => ({
      position_id: p.position_id,
      product_code: p.product_code,
      balance_amount: p.balance_amount,
      description: p.description,
    })),
  };
}

const LTV_COLUMNS: WorkedExampleColumn[] = [
  { field: 'committed_amt', header: 'Committed', format: 'currency', subtotal_fn: 'sum' },
  { field: 'collateral_value', header: 'Collateral', format: 'currency', subtotal_fn: 'sum' },
  { field: 'ltv_pct', header: 'LTV', format: 'percentage', is_result: true, subtotal_fn: 'none' },
];

const DSCR_COLUMNS: WorkedExampleColumn[] = [
  { field: 'noi_current_amt', header: 'Property NOI', format: 'currency', subtotal_fn: 'none' },
  { field: 'debt_service_amt', header: 'Debt Service', format: 'currency', subtotal_fn: 'none' },
  { field: 'dscr_value', header: 'DSCR', format: 'ratio', is_result: true, subtotal_fn: 'weighted-avg', weight_field: 'committed_amt' },
];

const LTV_CONFIG: MetricVisualizationConfig = {
  item_id: 'MET-001',
  abbreviation: 'LTV',
  rollup_strategy: 'sum-ratio',
  metric_fields: {
    primary_value: 'ltv_pct',
    numerator_value: 'committed_amt',
    denominator_value: 'collateral_value',
  },
  value_format: {
    format: 'percentage',
    decimals: 1,
    suffix: '%',
    color_bands: [
      { threshold: 100, color: 'red-400', label: 'Critical' },
      { threshold: 80, color: 'amber-400', label: 'Watch' },
      { threshold: 0, color: 'gray-200', label: 'Healthy' },
    ],
    direction: 'LOWER_BETTER',
  },
  formula_decomposition: {
    numerator: [],
    denominator: [],
    result_format: 'percentage',
  },
  worked_example_columns: LTV_COLUMNS,
};

const DSCR_CONFIG: MetricVisualizationConfig = {
  item_id: 'MET-002',
  abbreviation: 'DSCR',
  rollup_strategy: 'weighted-avg',
  weight_field: 'committed_amt',
  metric_fields: {
    primary_value: 'dscr_value',
    weight_value: 'committed_amt',
  },
  value_format: {
    format: 'ratio',
    decimals: 2,
    suffix: 'x',
    color_bands: [
      { threshold: 1.5, color: 'emerald-400', label: 'Strong' },
      { threshold: 1.25, color: 'yellow-400', label: 'Adequate' },
      { threshold: 1.0, color: 'amber-400', label: 'Watch' },
      { threshold: 0, color: 'red-400', label: 'Critical' },
    ],
    direction: 'HIGHER_BETTER',
  },
  formula_decomposition: {
    numerator: [],
    denominator: [],
    result_format: 'ratio',
  },
  worked_example_columns: DSCR_COLUMNS,
};

export function FacilityTable({
  facilities,
  groupBy,
  showPositionCount,
  highlightResult = true,
  metricType = 'LTV',
}: FacilityTableProps) {
  const entities = facilities.map(facilityToEntity);
  const isDscr = metricType === 'DSCR';
  const columns = isDscr ? DSCR_COLUMNS : LTV_COLUMNS;
  const config = isDscr ? DSCR_CONFIG : LTV_CONFIG;

  return (
    <EntityTable
      entities={entities}
      columns={columns}
      config={config}
      groupBy={groupBy}
      showPositionCount={showPositionCount}
      highlightResult={highlightResult}
    />
  );
}
