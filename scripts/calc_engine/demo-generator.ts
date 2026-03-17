/**
 * Core demo data generator: select facilities, extract ingredients, assemble DemoFacility[].
 *
 * Port of scripts/calc_engine/demo_generator.py to TypeScript.
 * Uses the generic SQL calculator instead of Python BaseCalculator subclasses.
 */

import { DataLoader, type TableData } from './data-loader';
import { buildHierarchyLookup, type HierarchyInfo } from './hierarchy';
import { executeMetricLevel } from './generic-calculator';
import { loadMetricDefinitions } from './loader/yaml-loader';
import type { MetricDefinition, AggregationLevel } from './types';
import type { DemoFacility as CatalogueDemoFacility, CatalogueItem, IngredientField } from '@/lib/metric-library/types';

export interface GenerateDemoResult {
  ok: boolean;
  demoData?: { facilities: CatalogueDemoFacility[] };
  error?: string;
  diagnostics?: Record<string, unknown>;
}

interface DemoPosition {
  position_id: string;
  facility_id: string;
  position_type: string;
  balance_amount: number;
  description: string;
}

/**
 * Auto-generate demo_data for a CatalogueItem.
 *
 * 1. Load facility_master, counterparty, enterprise_business_taxonomy
 * 2. Execute YAML formula_sql at facility level for per-facility metric values
 * 3. Select representative facilities
 * 4. Enrich with counterparty names, hierarchy, positions, ingredient values
 * 5. Return GenerateDemoResult
 */
export async function generateDemoData(
  catalogueItem: CatalogueItem,
  loader: DataLoader,
  opts?: {
    facilityCount?: number;
    strategy?: 'diverse' | 'range-spread' | 'top-values';
    asOfDate?: string;
  },
): Promise<GenerateDemoResult> {
  const facilityCount = opts?.facilityCount ?? 5;
  const strategy = opts?.strategy ?? 'diverse';
  const asOfDate = opts?.asOfDate ?? '2025-01-31';

  try {
    // ── Load base tables ────────────────────────────────────
    const fm = await loader.loadTable('L2', 'facility_master');
    const cp = await loader.loadTable('L2', 'counterparty');
    const ebt = await loader.loadTable('L1', 'enterprise_business_taxonomy');

    // ── Build lookups ───────────────────────────────────────
    const cpMap = buildCounterpartyMap(cp.rows);
    const hierarchy = buildHierarchyLookup(ebt.rows);

    // ── Find and run metric calculation ─────────────────────
    const metric = findMetricForItem(catalogueItem);
    let metricRows: Record<string, unknown>[] = [];
    let calcSuccess = false;
    let primaryValueCol = 'metric_value';

    if (metric) {
      try {
        const result = await executeMetricLevel(metric, 'facility', loader, asOfDate);
        metricRows = result.rows;
        calcSuccess = metricRows.length > 0;

        // Determine primary value column
        const cataloguePrimary = catalogueItem.abbreviation?.toLowerCase();
        if (cataloguePrimary && metricRows[0] && cataloguePrimary in metricRows[0]) {
          primaryValueCol = cataloguePrimary;
        } else if (metricRows[0] && 'metric_value' in metricRows[0]) {
          primaryValueCol = 'metric_value';
        }
      } catch (e) {
        console.warn(`Warning: metric calculation failed: ${e}`);
      }
    }

    // ── Select facilities ───────────────────────────────────
    const selected = selectFacilities(
      fm.rows, metricRows, primaryValueCol, facilityCount, strategy
    );

    if (selected.length === 0) {
      return { ok: false, error: 'No facilities found in sample data' };
    }

    // ── Load positions ──────────────────────────────────────
    const positionsByFac = await loadPositions(loader, asOfDate);

    // ── Load ingredient values ──────────────────────────────
    const ingredientTables = await loadIngredientTables(
      loader, catalogueItem.ingredient_fields ?? [], asOfDate
    );

    // ── Load collateral ─────────────────────────────────────
    const collateralByFac = await loadCollateral(loader, asOfDate);

    // ── Assemble DemoFacility objects ───────────────────────
    const facilities: CatalogueDemoFacility[] = [];
    for (const facRow of selected) {
      const facId = toNum(facRow['facility_id']);
      const cpId = toNum(facRow['counterparty_id']);
      const lobSegId = toNum(facRow['lob_segment_id']);

      const h = hierarchy.get(lobSegId);
      const cpInfo = cpMap.get(cpId);

      const collVal = collateralByFac.get(facId) ?? 0;
      const committed = toFloat(facRow['committed_facility_amt']);
      const ltv = collVal > 0 ? (committed / collVal * 100) : 0;

      const demo: CatalogueDemoFacility = {
        facility_id: `F-${facId}`,
        facility_name: String(facRow['facility_name'] ?? `Facility ${facId}`),
        counterparty_id: `CP-${cpId}`,
        counterparty_name: String(cpInfo?.legal_name ?? `Counterparty ${cpId}`),
        lob_segment_id: `SEG-${lobSegId}`,
        desk_name: h?.deskName ?? 'Unknown Desk',
        portfolio_name: h?.portfolioName ?? 'Unknown Portfolio',
        lob_name: h?.lobName ?? 'Unknown Department',
        committed_amt: committed,
        collateral_value: collVal,
        ltv_pct: round(ltv, 2),
        positions: (positionsByFac.get(facId) ?? []).map(p => ({
          position_id: p.position_id,
          facility_id: p.facility_id,
          product_code: p.position_type,
          balance_amount: p.balance_amount,
          description: p.description,
        })),
      };

      // Add metric-specific extra fields
      if (metricRows.length > 0) {
        const metricRow = metricRows.find(r =>
          toNum(r['dimension_key'] ?? r['facility_id']) === facId
        );
        if (metricRow) {
          const extra: Record<string, number | string> = {};
          for (const [key, val] of Object.entries(metricRow)) {
            if (key === 'dimension_key' || key === 'facility_id') continue;
            if (val != null && !isNaN(Number(val))) {
              extra[key] = round(Number(val), 4);
            } else if (val != null) {
              extra[key] = String(val);
            }
          }
          demo.extra_fields = extra;
        }
      }

      // Add ingredient fields from L1/L2 tables
      const JOIN_KEYS = new Set([
        'facility_id', 'counterparty_id', 'as_of_date', 'position_id',
        'lob_segment_id', 'managed_segment_id', 'parent_segment_id',
        'tree_level', 'segment_name', 'credit_agreement_id',
      ]);

      for (const ing of catalogueItem.ingredient_fields ?? []) {
        const fieldName = ing.field;
        if (JOIN_KEYS.has(fieldName)) continue;
        if (demo.extra_fields && fieldName in demo.extra_fields) continue;

        const tableKey = `${ing.layer}.${ing.table}`;
        const tableData = ingredientTables.get(tableKey);
        if (tableData) {
          const val = lookupIngredient(tableData, facId, cpId, fieldName);
          if (val != null) {
            if (!demo.extra_fields) demo.extra_fields = {};
            demo.extra_fields[fieldName] = val;
          }
        }
      }

      facilities.push(demo);
    }

    return {
      ok: true,
      demoData: { facilities },
      diagnostics: {
        totalFacilitiesInSample: fm.rows.length,
        facilitiesSelected: facilities.length,
        metricCalculationSuccess: calcSuccess,
        asOfDateUsed: asOfDate,
        calculatorUsed: metric?.name ?? null,
      },
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ═══════════════════════════════════════════════════════════════
// Facility selection strategies
// ═══════════════════════════════════════════════════════════════

function selectFacilities(
  fmRows: Record<string, unknown>[],
  metricRows: Record<string, unknown>[],
  primaryValueCol: string,
  count: number,
  strategy: string,
): Record<string, unknown>[] {
  if (strategy === 'diverse') {
    return selectDiverse(fmRows, metricRows, primaryValueCol, count);
  } else if (strategy === 'range-spread') {
    return selectRangeSpread(fmRows, metricRows, primaryValueCol, count);
  } else if (strategy === 'top-values') {
    return selectTopValues(fmRows, metricRows, primaryValueCol, count);
  }
  // Random fallback — take first N
  return fmRows.slice(0, count);
}

function selectDiverse(
  fmRows: Record<string, unknown>[],
  metricRows: Record<string, unknown>[],
  primaryValueCol: string,
  count: number,
): Record<string, unknown>[] {
  if (metricRows.length > 0) {
    // Merge facility_master with metric results
    const metricByFac = new Map<number, Record<string, unknown>>();
    for (const r of metricRows) {
      const fid = toNum(r['dimension_key'] ?? r['facility_id']);
      metricByFac.set(fid, r);
    }

    const merged = fmRows
      .filter(f => metricByFac.has(toNum(f['facility_id'])))
      .map(f => {
        const fid = toNum(f['facility_id']);
        const mr = metricByFac.get(fid)!;
        return { ...f, [primaryValueCol]: mr[primaryValueCol] ?? mr['metric_value'] };
      })
      .filter(f => f[primaryValueCol] != null && !isNaN(Number(f[primaryValueCol])));

    if (merged.length === 0) return fmRows.slice(0, count);

    // Sort by metric value
    merged.sort((a, b) => Number(a[primaryValueCol]) - Number(b[primaryValueCol]));
    const n = merged.length;

    // Pick from percentiles — deduplicate indices when n is small
    const rawIndices = [
      0,
      Math.max(0, Math.floor(n / 4)),
      Math.max(0, Math.floor(n / 2)),
      Math.max(0, Math.floor(3 * n / 4)),
      n - 1,
    ];
    const percentileIndices = [...new Set(rawIndices)].sort((a, b) => a - b);

    // Prefer different counterparties, but always prefer unique facilities
    const selectedIds = new Set<number>();
    const seenCps = new Set<number>();

    // Pass 1: pick from percentiles, prefer different counterparties
    for (const idx of percentileIndices) {
      if (selectedIds.size >= count) break;
      const row = merged[idx]!;
      const fid = toNum(row['facility_id']);
      const cp = toNum(row['counterparty_id']);
      if (!selectedIds.has(fid) && !seenCps.has(cp)) {
        selectedIds.add(fid);
        seenCps.add(cp);
      }
    }

    // Pass 2: relax counterparty uniqueness, still from percentiles
    if (selectedIds.size < count) {
      for (const idx of percentileIndices) {
        if (selectedIds.size >= count) break;
        const row = merged[idx]!;
        const fid = toNum(row['facility_id']);
        if (!selectedIds.has(fid)) {
          selectedIds.add(fid);
        }
      }
    }

    // Pass 3: backfill from remaining merged rows
    if (selectedIds.size < count) {
      for (const row of merged) {
        if (selectedIds.size >= count) break;
        const fid = toNum(row['facility_id']);
        if (!selectedIds.has(fid)) {
          selectedIds.add(fid);
        }
      }
    }

    return fmRows.filter(f => selectedIds.has(toNum(f['facility_id'])));
  }

  // No metric data — pick by counterparty diversity, then backfill
  const selected = new Set<number>();
  const seenCps = new Set<number>();

  // First pass: one per counterparty
  for (const row of fmRows) {
    if (selected.size >= count) break;
    const fid = toNum(row['facility_id']);
    const cp = toNum(row['counterparty_id']);
    if (!seenCps.has(cp)) {
      selected.add(fid);
      seenCps.add(cp);
    }
  }

  // Backfill: any remaining unique facilities
  if (selected.size < count) {
    for (const row of fmRows) {
      if (selected.size >= count) break;
      const fid = toNum(row['facility_id']);
      if (!selected.has(fid)) {
        selected.add(fid);
      }
    }
  }

  const result = fmRows.filter(f => selected.has(toNum(f['facility_id'])));
  return result.length > 0 ? result : fmRows.slice(0, count);
}

function selectRangeSpread(
  fmRows: Record<string, unknown>[],
  metricRows: Record<string, unknown>[],
  primaryValueCol: string,
  count: number,
): Record<string, unknown>[] {
  if (metricRows.length === 0) return fmRows.slice(0, count);

  const metricByFac = new Map<number, Record<string, unknown>>();
  for (const r of metricRows) {
    metricByFac.set(toNum(r['dimension_key'] ?? r['facility_id']), r);
  }

  const merged = fmRows
    .filter(f => metricByFac.has(toNum(f['facility_id'])))
    .map(f => ({ ...f, __val: Number(metricByFac.get(toNum(f['facility_id']))![primaryValueCol] ?? 0) }))
    .filter(f => !isNaN(f.__val))
    .sort((a, b) => a.__val - b.__val);

  if (merged.length <= count) return merged;

  const step = merged.length / count;
  return Array.from({ length: count }, (_, i) =>
    merged[Math.min(Math.floor(i * step), merged.length - 1)]!
  );
}

function selectTopValues(
  fmRows: Record<string, unknown>[],
  metricRows: Record<string, unknown>[],
  primaryValueCol: string,
  count: number,
): Record<string, unknown>[] {
  if (metricRows.length === 0) {
    return [...fmRows]
      .sort((a, b) => toFloat(b['committed_facility_amt']) - toFloat(a['committed_facility_amt']))
      .slice(0, count);
  }

  const metricByFac = new Map<number, number>();
  for (const r of metricRows) {
    metricByFac.set(
      toNum(r['dimension_key'] ?? r['facility_id']),
      Number(r[primaryValueCol] ?? r['metric_value'] ?? 0)
    );
  }

  return [...fmRows]
    .filter(f => metricByFac.has(toNum(f['facility_id'])))
    .sort((a, b) =>
      (metricByFac.get(toNum(b['facility_id'])) ?? 0) -
      (metricByFac.get(toNum(a['facility_id'])) ?? 0)
    )
    .slice(0, count);
}

// ═══════════════════════════════════════════════════════════════
// Data extraction helpers
// ═══════════════════════════════════════════════════════════════

function buildCounterpartyMap(
  rows: Record<string, unknown>[]
): Map<number, { legal_name: string; external_rating_sp: string; country_code: string }> {
  const map = new Map<number, { legal_name: string; external_rating_sp: string; country_code: string }>();
  for (const row of rows) {
    map.set(toNum(row['counterparty_id']), {
      legal_name: String(row['legal_name'] ?? ''),
      external_rating_sp: String(row['external_rating_sp'] ?? ''),
      country_code: String(row['country_code'] ?? ''),
    });
  }
  return map;
}

async function loadPositions(
  loader: DataLoader,
  asOfDate: string,
): Promise<Map<number, DemoPosition[]>> {
  const map = new Map<number, DemoPosition[]>();
  try {
    const pos = await loader.loadTable('L2', 'position');
    for (const row of pos.rows) {
      if (String(row['as_of_date']) !== asOfDate) continue;
      const facId = toNum(row['facility_id']);
      if (!map.has(facId)) map.set(facId, []);
      map.get(facId)!.push({
        position_id: `P-${row['position_id'] ?? 0}`,
        facility_id: `F-${facId}`,
        position_type: String(row['position_type'] ?? 'LOAN'),
        balance_amount: toFloat(row['balance_amount']),
        description: `${row['position_type'] ?? 'Position'} exposure`,
      });
    }
  } catch {
    // position table may not exist
  }
  return map;
}

async function loadCollateral(
  loader: DataLoader,
  asOfDate: string,
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  try {
    const cs = await loader.loadTable('L2', 'collateral_snapshot');
    const valCol = cs.columns.includes('current_valuation_usd')
      ? 'current_valuation_usd'
      : 'valuation_amount';
    for (const row of cs.rows) {
      if (String(row['as_of_date']) !== asOfDate) continue;
      const facId = toNum(row['facility_id']);
      map.set(facId, (map.get(facId) ?? 0) + toFloat(row[valCol]));
    }
  } catch {
    // collateral table may not exist
  }
  return map;
}

async function loadIngredientTables(
  loader: DataLoader,
  ingredientFields: IngredientField[],
  asOfDate: string,
): Promise<Map<string, TableData>> {
  const tables = new Map<string, TableData>();
  const seen = new Set<string>();
  for (const ing of ingredientFields) {
    const key = `${ing.layer}.${ing.table}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const data = await loader.loadTable(ing.layer, ing.table);
      // Filter by as_of_date if column exists
      if (data.columns.includes('as_of_date')) {
        const filtered = data.rows.filter(r => String(r['as_of_date']) === asOfDate);
        tables.set(key, { columns: data.columns, rows: filtered });
      } else {
        tables.set(key, data);
      }
    } catch {
      // skip missing tables
    }
  }
  return tables;
}

function lookupIngredient(
  data: TableData,
  facilityId: number,
  counterpartyId: number,
  field: string,
): number | string | null {
  if (!data.columns.includes(field)) return null;

  let match: Record<string, unknown> | undefined;
  if (data.columns.includes('facility_id')) {
    match = data.rows.find(r => toNum(r['facility_id']) === facilityId);
  } else if (data.columns.includes('counterparty_id')) {
    match = data.rows.find(r => toNum(r['counterparty_id']) === counterpartyId);
  }

  if (!match) return null;
  const val = match[field];
  if (val == null) return null;
  if (typeof val === 'number') return round(val, 4);
  const num = Number(val);
  if (!isNaN(num)) return round(num, 4);
  return String(val);
}

// ═══════════════════════════════════════════════════════════════
// YAML metric cache — avoids re-parsing 110 YAML files per item
// ═══════════════════════════════════════════════════════════════

let cachedMetrics: MetricDefinition[] | null = null;
let cachedMetricIndex: Map<string, MetricDefinition> | null = null;

/**
 * Pre-load and cache all YAML metric definitions.
 * Call once before bulk operations to avoid 109× re-parsing.
 */
export function preloadMetricDefinitions(): void {
  const { metrics } = loadMetricDefinitions();
  cachedMetrics = metrics;
  cachedMetricIndex = new Map();
  for (const m of metrics) {
    // Index by metric_id
    cachedMetricIndex.set(m.metric_id, m);
    // Index by catalogue item_id if present
    if (m.catalogue?.item_id) {
      cachedMetricIndex.set(m.catalogue.item_id, m);
    }
    // Index by legacy IDs
    for (const legacyId of m.legacy_metric_ids ?? []) {
      cachedMetricIndex.set(legacyId, m);
    }
  }
}

/** Clear the metric cache (useful for testing). */
export function clearMetricCache(): void {
  cachedMetrics = null;
  cachedMetricIndex = null;
}

/**
 * Find the MetricDefinition that corresponds to a CatalogueItem.
 * Uses pre-built index if available (bulk mode), falls back to full load.
 */
function findMetricForItem(item: CatalogueItem): MetricDefinition | null {
  // Use cached index if available (bulk mode)
  if (cachedMetricIndex) {
    for (const searchId of [item.executable_metric_id, item.item_id]) {
      if (!searchId) continue;
      const found = cachedMetricIndex.get(searchId);
      if (found) return found;
    }
    return null;
  }

  // Single-metric fallback: load once
  const { metrics } = loadMetricDefinitions();
  const execId = item.executable_metric_id;
  const itemId = item.item_id;

  for (const searchId of [execId, itemId]) {
    if (!searchId) continue;
    const found = metrics.find(m =>
      m.metric_id === searchId ||
      m.catalogue?.item_id === searchId ||
      m.legacy_metric_ids?.includes(searchId)
    );
    if (found) return found;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

function toNum(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function toFloat(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function round(val: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}
