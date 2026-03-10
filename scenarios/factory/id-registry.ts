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

import { readFileSync, writeFileSync, existsSync } from 'fs';
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

  // L2 composite-PK tables don't need auto-increment IDs
  // (they use facility_id + as_of_date as PK)
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
  allocate(table: string, count: number, scenarioId: string): number[] {
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

    return Array.from({ length: count }, (_, i) => start + i);
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
  isAllocated(table: string, id: number): boolean {
    return this.state.allocations.some(
      a => a.table === table && id >= a.startId && id <= a.endId
    );
  }

  /** Persist state to JSON */
  save(): void {
    writeFileSync(this.persistPath, JSON.stringify(this.state, null, 2) + '\n');
  }

  /** Get summary stats */
  summary(): { tables: number; scenarios: number; totalIds: number } {
    const tables = new Set(this.state.allocations.map(a => a.table)).size;
    const scenarios = new Set(this.state.allocations.map(a => a.scenarioId)).size;
    const totalIds = this.state.allocations.reduce((s, a) => s + a.count, 0);
    return { tables, scenarios, totalIds };
  }

  /** Remove all allocations for a scenario (allows re-generation) */
  deallocate(scenarioId: string): number {
    const before = this.state.allocations.length;
    this.state.allocations = this.state.allocations.filter(a => a.scenarioId !== scenarioId);
    return before - this.state.allocations.length;
  }
}
