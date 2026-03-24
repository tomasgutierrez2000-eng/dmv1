/**
 * Central ID Registry — collision-free ID allocation for scenario data.
 *
 * Prevents the #1 source of data generation failures:
 *   - ID collisions between scenarios
 *   - Overlap with seed data ranges
 *   - Gap-related FK violations
 *
 * State persists to JSON for incremental scenario generation.
 */

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import path from 'path';

export interface AllocationBlock {
  table: string;
  scenarioId: string;
  startId: number;
  endId: number;
  count: number;
}

interface RegistryState {
  version: 1;
  nextId: Record<string, number>;
  allocations: AllocationBlock[];
}

/** Default starting IDs for new tables (above all seed + scenario ranges) */
const DEFAULT_STARTS: Record<string, number> = {
  // L1 entities
  counterparty:                   1721,   // seed 1-100, scenarios 1001-1720
  credit_agreement_master:        1181,   // seed 1-100, scenarios 1001-1180
  facility_master:                5721,   // seed 1-410, scenarios 5001-5720
  counterparty_hierarchy:         5001,
  sccl_counterparty_group:        5100,
  sccl_counterparty_group_member: 5100,
  control_relationship:           5100,
  collateral_asset_master:        50201,  // seed 1-5000, scenario 50101-50200
  limit_rule:                     5100,
  limit_threshold:                5100,

  // L2 events/snapshots (auto-increment IDs)
  credit_event:                   5200,   // seed 1-2000, scenario 5001-5199
  credit_event_facility_link:     5200,
  risk_flag:                      5200,   // seed 1-4000, scenario 5001-5199
  amendment_event:                5100,
  amendment_change_detail:        5100,
  exception_event:                5100,
  stress_test_result:             5100,
  stress_test_breach:             5100,
  deal_pipeline_fact:             5100,
  limit_utilization_event:        5100,

  // L2 surrogate-PK tables (generators allocate IDs via registry)
  facility_exposure_snapshot:     50001,  // seed 1-10000
  position:                       50001,
  position_detail:                50001,

  // Non-credit product positions (standalone, no facility chain)
  nc_position:                    800001, // above SEED_035 max ~707K, factory max ~601K
  nc_position_detail:             900001,
  cash_flow:                      50001,
  facility_lender_allocation:     100001, // gsib-enrichment was using module-level counter
};

/** Reserved ranges that must never be allocated */
const RESERVED_RANGES: { table: string; label: string; start: number; end: number }[] = [
  // Seed ranges
  { table: 'counterparty',            label: 'SEED',    start: 1,    end: 100  },
  { table: 'credit_agreement_master', label: 'SEED',    start: 1,    end: 100  },
  { table: 'facility_master',         label: 'SEED',    start: 1,    end: 410  },
  { table: 'credit_event',            label: 'SEED',    start: 1,    end: 2000 },
  { table: 'risk_flag',               label: 'SEED',    start: 1,    end: 4000 },
  { table: 'collateral_asset_master', label: 'SEED',    start: 1,    end: 5000 },

  // Existing 18 CRO scenarios (05-scenario-seed.sql)
  { table: 'counterparty',            label: 'S1-S18',  start: 1001, end: 1720 },
  { table: 'credit_agreement_master', label: 'S1-S18',  start: 1001, end: 1180 },
  { table: 'facility_master',         label: 'S1-S18',  start: 5001, end: 5720 },
  { table: 'credit_event',            label: 'S1-S18',  start: 5001, end: 5199 },
  { table: 'risk_flag',               label: 'S1-S18',  start: 5001, end: 5199 },
  { table: 'collateral_asset_master', label: 'S1-S18',  start: 50101, end: 50200 },

  // L2 surrogate-PK seed ranges
  { table: 'facility_exposure_snapshot', label: 'SEED', start: 1, end: 10000 },
];

export class IDRegistry {
  private state: RegistryState;
  private persistPath: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath ?? path.join(__dirname, '..', 'config', 'id-registry.json');
    this.state = this.loadOrInit();
  }

  private loadOrInit(): RegistryState {
    if (existsSync(this.persistPath)) {
      const raw = JSON.parse(readFileSync(this.persistPath, 'utf-8')) as RegistryState;
      if (raw.version === 1) return raw;
    }
    return {
      version: 1,
      nextId: { ...DEFAULT_STARTS },
      allocations: RESERVED_RANGES.map(r => ({
        table: r.table,
        scenarioId: r.label,
        startId: r.start,
        endId: r.end,
        count: r.end - r.start + 1,
      })),
    };
  }

  /**
   * Allocate `count` contiguous IDs for a table within a scenario.
   * Returns an array of allocated IDs (inclusive).
   * Throws on collision with any existing allocation.
   */
  allocate(table: string, count: number, scenarioId: string = 'v2'): string[] {
    if (count <= 0) throw new Error(`IDRegistry: count must be positive, got ${count}`);

    const start = this.state.nextId[table] ?? DEFAULT_STARTS[table] ?? 10001;
    const end = start + count - 1;

    // Collision check against all existing allocations for this table
    const existing = this.state.allocations.filter(a => a.table === table);
    for (const block of existing) {
      if (start <= block.endId && end >= block.startId) {
        throw new Error(
          `IDRegistry: collision for ${table} in ${scenarioId}! ` +
          `Requested ${start}-${end} overlaps with ${block.scenarioId} (${block.startId}-${block.endId})`
        );
      }
    }

    // Record allocation
    this.state.allocations.push({ table, scenarioId, startId: start, endId: end, count });
    this.state.nextId[table] = end + 1;

    // Return string IDs — internal math uses numbers, public API returns strings
    return Array.from({ length: count }, (_, i) => String(start + i));
  }

  /** Get all allocations for a scenario */
  getAllocationsForScenario(scenarioId: string): AllocationBlock[] {
    return this.state.allocations.filter(a => a.scenarioId === scenarioId);
  }

  /** Get all allocations for a table */
  getAllocationsForTable(table: string): AllocationBlock[] {
    return this.state.allocations.filter(a => a.table === table);
  }

  /** Check if a specific ID is already allocated for a table */
  isAllocated(table: string, id: string | number): boolean {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numId)) return false;
    return this.state.allocations.some(
      a => a.table === table && numId >= a.startId && numId <= a.endId
    );
  }

  /** Persist state to JSON (atomic: write tmp + rename to prevent corruption) */
  save(): void {
    const dir = path.dirname(this.persistPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tmp = this.persistPath + '.tmp';
    writeFileSync(tmp, JSON.stringify(this.state, null, 2) + '\n');
    renameSync(tmp, this.persistPath);
  }

  /** Get summary stats */
  summary(): { tables: number; scenarios: number; totalIds: number } {
    const tables = new Set(this.state.allocations.map(a => a.table)).size;
    const scenarios = new Set(this.state.allocations.map(a => a.scenarioId)).size;
    const totalIds = this.state.allocations.reduce((s, a) => s + a.count, 0);
    return { tables, scenarios, totalIds };
  }

  /**
   * Reconcile registry nextId values against PostgreSQL MAX(pk) values.
   * Ensures nextId is always > MAX(pk) in the database, preventing PK collisions
   * when the registry JSON is stale or missing.
   *
   * @param client A connected pg Client instance
   */
  async reconcileFromDatabase(client: { query: (sql: string) => Promise<{ rows: { max_id: string | null }[] }> }): Promise<{ table: string; before: number; after: number }[]> {
    const TABLE_PK_MAP: Record<string, { schema: string; pk: string }> = {
      counterparty:                   { schema: 'l2', pk: 'counterparty_id' },
      credit_agreement_master:        { schema: 'l2', pk: 'credit_agreement_id' },
      facility_master:                { schema: 'l2', pk: 'facility_id' },
      credit_event:                   { schema: 'l2', pk: 'credit_event_id' },
      credit_event_facility_link:     { schema: 'l2', pk: 'link_id' },
      risk_flag:                      { schema: 'l2', pk: 'risk_flag_id' },
      amendment_event:                { schema: 'l2', pk: 'amendment_id' },
      amendment_change_detail:        { schema: 'l2', pk: 'change_detail_id' },
      exception_event:                { schema: 'l2', pk: 'exception_id' },
      stress_test_result:             { schema: 'l2', pk: 'result_id' },
      stress_test_breach:             { schema: 'l2', pk: 'breach_id' },
      deal_pipeline_fact:             { schema: 'l2', pk: 'pipeline_id' },
      limit_utilization_event:        { schema: 'l2', pk: 'limit_utilization_event_id' },
      facility_exposure_snapshot:     { schema: 'l2', pk: 'facility_exposure_id' },
      collateral_asset_master:        { schema: 'l2', pk: 'collateral_asset_id' },
      position:                       { schema: 'l2', pk: 'position_id' },
      position_detail:                { schema: 'l2', pk: 'position_detail_id' },
      cash_flow:                      { schema: 'l2', pk: 'cash_flow_id' },
      facility_lender_allocation:     { schema: 'l2', pk: 'lender_allocation_id' },
      counterparty_hierarchy:         { schema: 'l2', pk: 'counterparty_id' },
      limit_rule:                     { schema: 'l1', pk: 'limit_rule_id' },
    };

    const changes: { table: string; before: number; after: number }[] = [];

    for (const [table, { schema, pk }] of Object.entries(TABLE_PK_MAP)) {
      try {
        const result = await client.query(`SELECT MAX(${pk})::TEXT AS max_id FROM ${schema}.${table}`);
        const maxId = result.rows[0]?.max_id;
        if (maxId == null) continue; // Table is empty

        const dbMax = parseInt(maxId, 10);
        if (isNaN(dbMax)) continue;

        const newNextId = dbMax + 1;
        const currentNextId = this.state.nextId[table] ?? DEFAULT_STARTS[table] ?? 10001;

        // Never go below the existing nextId — only increase
        if (newNextId > currentNextId) {
          const before = currentNextId;
          this.state.nextId[table] = newNextId;
          changes.push({ table, before, after: newNextId });
        }
      } catch {
        // Table may not exist in DB — skip silently
      }
    }

    return changes;
  }

  /** Remove all allocations for a scenario (allows re-generation) */
  deallocate(scenarioId: string): number {
    const before = this.state.allocations.length;
    this.state.allocations = this.state.allocations.filter(a => a.scenarioId !== scenarioId);
    const removed = before - this.state.allocations.length;

    // Reclaim ID space: reset nextId per table to max(remaining allocation ends + 1, DEFAULT_START)
    if (removed > 0) {
      const tableMaxes = new Map<string, number>();
      for (const a of this.state.allocations) {
        const cur = tableMaxes.get(a.table) ?? 0;
        if (a.endId > cur) tableMaxes.set(a.table, a.endId);
      }
      for (const [table, defaultStart] of Object.entries(DEFAULT_STARTS)) {
        const maxEnd = tableMaxes.get(table);
        // Never go below DEFAULT_STARTS (preserves separation from seed ranges)
        this.state.nextId[table] = Math.max(
          maxEnd != null ? maxEnd + 1 : defaultStart,
          defaultStart,
        );
      }
    }

    return removed;
  }
}
