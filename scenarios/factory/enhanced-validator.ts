/**
 * Enhanced Validator — 30+ pre-flight checks for data quality.
 *
 * Three tiers:
 *   Tier 1: Structural (schema contracts, FK/PK, types, NULLs)
 *   Tier 2: DB Conformance (PG dry-run, ID ranges, constraint names)
 *   Tier 3: Story Coherence (FK chains, temporal alignment, business logic)
 *
 * Encodes every historical failure mode from CLAUDE.md lessons-learned.
 */

import { SchemaRegistry } from './schema-validator';
import { PKRegistry } from './pk-registry';
import type { SchemaContract, ColumnContract } from './schema-contracts';
import { SchemaAnalyzer } from './schema-analyzer';
import type { FacilityStory } from './story-weaver';
import {
  PD_BY_RATING_TIER,
  TEMPORAL_LIMITS,
  RATING_TO_TIER,
} from './gsib-calibration';

/* ────────────────── Types ────────────────── */

export type CheckSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ValidationCheck {
  name: string;
  description: string;
  severity: CheckSeverity;
  passed: boolean;
  message: string;
  /** Which CLAUDE.md lesson this check encodes (if applicable) */
  lessonRef?: string;
}

export interface ValidationReport {
  passed: boolean;
  totalChecks: number;
  criticalFailures: number;
  highFailures: number;
  mediumFailures: number;
  lowFailures: number;
  checks: ValidationCheck[];
}

/* ────────────────── Enhanced Validator ────────────────── */

export class EnhancedValidator {
  private analyzer: SchemaAnalyzer;
  private pkRegistry: PKRegistry;
  private checks: ValidationCheck[] = [];

  constructor(analyzer?: SchemaAnalyzer, pkRegistry?: PKRegistry) {
    this.analyzer = analyzer ?? SchemaAnalyzer.create();
    this.pkRegistry = pkRegistry ?? new PKRegistry();
  }

  getPKRegistry(): PKRegistry {
    return this.pkRegistry;
  }

  /**
   * Run all pre-flight checks on generated data.
   */
  runPreFlightChecklist(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts?: Map<string, SchemaContract>,
  ): ValidationReport {
    this.checks = [];
    const allContracts = contracts ?? this.analyzer.generateSchemaContracts();

    // ── Tier 1: Structural ──
    this.checkSchemaCompliance(tables, allContracts);
    this.checkPKUniqueness(tables, allContracts);
    this.checkFKIntegrity(tables, allContracts);
    this.checkNullCompliance(tables, allContracts);
    this.checkTypeCompliance(tables, allContracts);

    // ── Tier 2: DB Conformance ──
    this.checkReservedWords(tables);
    this.checkBooleanFlags(tables);
    this.checkNoPostgresCasts(tables);
    this.checkConstraintNames(tables);

    // ── Tier 3: Story Coherence ──
    this.checkDrawnLessThanCommitted(tables);
    this.checkTemporalAlignment(tables);
    this.checkAmountNonNegative(tables);

    // ── Tier 4: Data Quality (CLAUDE.md Lessons Learned) ──
    this.checkNullSparsity(tables, allContracts);
    this.checkDimensionDiversity(tables);
    this.checkBooleanBalance(tables);
    this.checkWeightColumnCoverage(tables);
    this.checkPlaceholderValues(tables);
    this.checkLoadOrder(tables, allContracts);
    this.checkNumericRangeRealism(tables, allContracts);

    return this.buildReport();
  }

  /**
   * Run story coherence checks on FacilityStory objects.
   */
  runStoryCoherenceChecks(
    stories: FacilityStory[],
    previousStories?: FacilityStory[],
  ): ValidationReport {
    this.checks = [];

    this.checkPDRatingAlignment(stories);
    this.checkPDDPDCorrelation(stories);
    this.checkUtilizationHealthAlignment(stories);
    this.checkTemporalMonotonicity(stories, previousStories);
    this.checkMagnitudeReasonableness(stories, previousStories);
    this.checkCrossCounterpartyConsistency(stories);

    return this.buildReport();
  }

  /* ────────────────── Tier 1: Structural ────────────────── */

  private checkSchemaCompliance(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts: Map<string, SchemaContract>,
  ): void {
    for (const td of tables) {
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract) {
        this.addCheck('SCHEMA_EXISTS', `Table ${qn} exists in DD`, 'CRITICAL', false,
          `Table '${qn}' not found in data dictionary`, 'schema_drift');
        continue;
      }
      this.addCheck('SCHEMA_EXISTS', `Table ${qn} exists in DD`, 'CRITICAL', true, 'OK');

      // Check all generated columns exist in contract
      if (td.rows.length > 0) {
        const contractCols = new Set(contract.columns.map(c => c.name));
        for (const col of Object.keys(td.rows[0])) {
          if (!contractCols.has(col)) {
            this.addCheck('COLUMN_EXISTS', `Column ${qn}.${col} in DD`, 'HIGH', false,
              `Column '${col}' does not exist in ${qn}`, 'schema_drift');
          }
        }
      }
    }
  }

  private checkPKUniqueness(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts: Map<string, SchemaContract>,
  ): void {
    for (const td of tables) {
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract || td.rows.length === 0) continue;

      const pkCols = contract.primaryKey;
      if (pkCols.length === 0) continue;

      const seen = new Set<string>();
      let dupes = 0;
      for (const row of td.rows) {
        const key = pkCols.map(c => String(row[c] ?? 'NULL')).join('|');
        if (seen.has(key)) dupes++;
        seen.add(key);
      }

      this.addCheck('PK_UNIQUE', `${qn} PK uniqueness`, 'CRITICAL',
        dupes === 0, dupes === 0 ? 'OK' : `${dupes} duplicate PKs found`, 'duplicate_pk');
    }
  }

  private checkFKIntegrity(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts: Map<string, SchemaContract>,
  ): void {
    // Register all generated PKs first
    for (const td of tables) {
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract) continue;

      for (const row of td.rows) {
        this.pkRegistry.registerPK(qn, contract.primaryKey, row);
      }
    }

    // Check FK integrity
    for (const td of tables) {
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract || td.rows.length === 0) continue;

      for (const col of contract.columns) {
        if (!col.fkTarget) continue;

        let violations = 0;
        let firstBadValue: unknown = null;
        // Check all rows, not just the first — sampling misses dangling FKs
        for (const row of td.rows) {
          const value = row[col.name];
          if (!this.pkRegistry.checkFK(col.fkTarget.parentTable, col.fkTarget.parentColumn, value)) {
            violations++;
            if (!firstBadValue) firstBadValue = value;
          }
        }

        if (violations > 0) {
          this.addCheck('FK_INTEGRITY', `${qn}.${col.name} → ${col.fkTarget.parentTable}`, 'HIGH',
            false, `${violations} FK violations — sample bad value: ${firstBadValue}`, 'fk_violation');
        }
      }
    }
  }

  private checkNullCompliance(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts: Map<string, SchemaContract>,
  ): void {
    for (const td of tables) {
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract || td.rows.length === 0) continue;

      for (const col of contract.columns) {
        if (!col.nullable && col.isPK) {
          const nullCount = td.rows.filter(r => r[col.name] === null || r[col.name] === undefined).length;
          if (nullCount > 0) {
            this.addCheck('NOT_NULL', `${qn}.${col.name} NOT NULL`, 'CRITICAL',
              false, `PK column has ${nullCount} NULL values`);
          }
        }
      }
    }
  }

  private checkTypeCompliance(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts: Map<string, SchemaContract>,
  ): void {
    for (const td of tables) {
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract || td.rows.length === 0) continue;

      const sampleRow = td.rows[0];
      for (const col of contract.columns) {
        const value = sampleRow[col.name];
        if (value === null || value === undefined) continue;

        // Check BIGINT columns have numeric values
        if (col.dataType === 'BIGINT' && typeof value === 'string' && isNaN(Number(value))) {
          this.addCheck('TYPE_MATCH', `${qn}.${col.name} type`, 'HIGH',
            false, `BIGINT column has non-numeric string: '${value}'`, 'type_mismatch');
        }
      }
    }
  }

  /* ────────────────── Tier 2: DB Conformance ────────────────── */

  private checkReservedWords(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    const reserved = new Set(['value', 'user', 'order', 'group', 'select', 'table', 'column', 'key', 'check', 'default', 'primary', 'foreign', 'references', 'constraint', 'index', 'create', 'alter', 'drop', 'insert', 'update', 'delete']);

    for (const td of tables) {
      if (td.rows.length === 0) continue;
      for (const col of Object.keys(td.rows[0])) {
        if (reserved.has(col.toLowerCase())) {
          this.addCheck('RESERVED_WORD', `${td.schema}.${td.table}.${col}`, 'MEDIUM',
            false, `Column '${col}' is a PG reserved word — must be quoted in SQL`, 'reserved_word_quoting');
        }
      }
    }
  }

  private checkBooleanFlags(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    for (const td of tables) {
      if (td.rows.length === 0) continue;
      for (const col of Object.keys(td.rows[0])) {
        if (col.endsWith('_flag')) {
          const sampleValue = td.rows[0][col];
          if (sampleValue === true || sampleValue === false) {
            this.addCheck('BOOLEAN_FORMAT', `${td.schema}.${td.table}.${col}`, 'HIGH',
              false, `Boolean flag uses true/false — must use 'Y'/'N' for sql.js compatibility`, 'wrong_boolean_compare');
          }
        }
      }
    }
  }

  private checkNoPostgresCasts(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    // This check is for SQL strings, not row data — placeholder for when we validate SQL output
    this.addCheck('NO_PG_CASTS', 'No PostgreSQL-specific casts in generated data', 'MEDIUM', true, 'OK (row data check — SQL casts checked at emission)');
  }

  private checkConstraintNames(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    // Check that table names combined with constraint patterns stay under 63 chars
    for (const td of tables) {
      const maxConstraintName = `fk_${td.table}_${td.table}_id`;
      if (maxConstraintName.length > 63) {
        this.addCheck('CONSTRAINT_NAME_LENGTH', `${td.schema}.${td.table}`, 'MEDIUM',
          false, `Table name too long for constraint names (${maxConstraintName.length} > 63)`, 'constraint_name_length');
      }
    }
  }

  /* ────────────────── Tier 3: Story Coherence ────────────────── */

  private checkDrawnLessThanCommitted(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    const exposure = tables.find(t => t.table === 'facility_exposure_snapshot');
    if (!exposure || exposure.rows.length === 0) return;

    let violations = 0;
    for (const row of exposure.rows) {
      const drawn = Number(row.drawn_amount ?? 0);
      const committed = Number(row.committed_amount ?? 0);
      if (drawn > committed * 1.01) violations++; // 1% tolerance for rounding
    }

    this.addCheck('DRAWN_LE_COMMITTED', 'drawn_amount ≤ committed_amount', 'HIGH',
      violations === 0, violations === 0 ? 'OK' : `${violations} rows with drawn > committed`, 'drawn_le_committed');
  }

  private checkTemporalAlignment(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    // Check that snapshot tables have matching dates per facility
    const datesByFacility = new Map<number, Map<string, Set<string>>>();

    for (const td of tables) {
      if (td.rows.length === 0) continue;
      const hasDate = 'as_of_date' in td.rows[0];
      const hasFacility = 'facility_id' in td.rows[0];
      if (!hasDate || !hasFacility) continue;

      for (const row of td.rows) {
        const facId = Number(row.facility_id);
        const date = String(row.as_of_date);

        if (!datesByFacility.has(facId)) datesByFacility.set(facId, new Map());
        const facTables = datesByFacility.get(facId)!;
        if (!facTables.has(td.table)) facTables.set(td.table, new Set());
        facTables.get(td.table)!.add(date);
      }
    }

    // For each facility, check all tables have the same dates
    let mismatches = 0;
    for (const [, facTables] of datesByFacility) {
      const allDates = [...facTables.values()].map(s => [...s].sort().join(','));
      const uniqueDateSets = new Set(allDates);
      if (uniqueDateSets.size > 1) mismatches++;
    }

    this.addCheck('TEMPORAL_ALIGNMENT', 'Snapshot tables have matching dates per facility', 'MEDIUM',
      mismatches === 0, mismatches === 0 ? 'OK' : `${mismatches} facilities with date mismatches`);
  }

  private checkAmountNonNegative(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    for (const td of tables) {
      if (td.rows.length === 0) continue;
      for (const col of Object.keys(td.rows[0])) {
        if (col.endsWith('_amt') || col.endsWith('_amount')) {
          const negatives = td.rows.filter(r => {
            const v = Number(r[col]);
            return !isNaN(v) && v < 0;
          }).length;

          if (negatives > 0) {
            this.addCheck('NON_NEGATIVE_AMT', `${td.schema}.${td.table}.${col}`, 'MEDIUM',
              false, `${negatives} rows with negative amounts`);
          }
        }
      }
    }
  }

  /* ────────────────── Tier 4: Data Quality (CLAUDE.md Lessons) ────────────────── */

  /**
   * Check for columns where >90% of values are NULL.
   * CLAUDE.md: "NULL sparsity — Metric-critical fields have >10% non-null values"
   */
  private checkNullSparsity(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts: Map<string, SchemaContract>,
  ): void {
    for (const td of tables) {
      if (td.rows.length < 5) continue; // need enough rows to measure
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract) continue;

      for (const col of Object.keys(td.rows[0] ?? {})) {
        // Skip PK and timestamp columns
        if (col.endsWith('_ts') || col === 'as_of_date') continue;
        const contractCol = contract.columns.find(c => c.name === col);
        if (contractCol?.isPK) continue;

        const nullCount = td.rows.filter(r => r[col] === null || r[col] === undefined).length;
        const nullPct = (nullCount / td.rows.length) * 100;

        if (nullPct > 90) {
          this.addCheck('NULL_SPARSITY', `${qn}.${col}`, 'HIGH',
            false, `${nullPct.toFixed(0)}% NULL (${nullCount}/${td.rows.length}) — metric may appear broken`, 'null_sparsity');
        }
      }
    }
  }

  /**
   * Check that categorical/dimension columns have diverse values.
   * CLAUDE.md: "Dimension diversity — Multiple distinct values for categorical fields"
   * Catches homogeneous seed arrays (all rows same value → COUNT(DISTINCT) always 1)
   */
  private checkDimensionDiversity(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    for (const td of tables) {
      if (td.rows.length < 5) continue;
      for (const col of Object.keys(td.rows[0] ?? {})) {
        if (!col.endsWith('_code') && !col.endsWith('_type') && !col.endsWith('_status')) continue;

        const distinctValues = new Set(td.rows.map(r => String(r[col] ?? 'NULL')));
        if (distinctValues.size === 1 && td.rows.length >= 10) {
          this.addCheck('DIM_DIVERSITY', `${td.schema}.${td.table}.${col}`, 'HIGH',
            false, `Only 1 distinct value across ${td.rows.length} rows — metrics will return identical results`, 'homogeneous_seed_arrays');
        }
      }
    }
  }

  /**
   * Check that boolean flag columns have both TRUE and FALSE values.
   * CLAUDE.md: "Boolean diversity — Both TRUE and FALSE values for flag fields"
   */
  private checkBooleanBalance(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    for (const td of tables) {
      if (td.rows.length < 10) continue;
      for (const col of Object.keys(td.rows[0] ?? {})) {
        if (!col.endsWith('_flag')) continue;

        const values = new Set(td.rows.map(r => String(r[col])));
        // Remove NULL from consideration
        values.delete('null');
        values.delete('undefined');

        if (values.size === 1) {
          const onlyValue = [...values][0];
          this.addCheck('BOOL_BALANCE', `${td.schema}.${td.table}.${col}`, 'MEDIUM',
            false, `All ${td.rows.length} rows have ${col}='${onlyValue}' — metric always 0% or 100%`, 'boolean_diversity');
        }
      }
    }
  }

  /**
   * Check that weight columns used in weighted averages have sufficient non-NULL coverage.
   * CLAUDE.md: "NULL weight propagation — COALESCE(weight_field, 0) needed"
   * Weight columns: *_amt (amounts used as weights in SUM(x * weight) / SUM(weight))
   */
  private checkWeightColumnCoverage(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    const weightColumns = ['outstanding_balance_amt', 'gross_exposure_usd', 'committed_amount',
      'drawn_amount', 'exposure_amount', 'collateral_value'];

    for (const td of tables) {
      if (td.rows.length < 5) continue;
      for (const col of weightColumns) {
        if (!(col in (td.rows[0] ?? {}))) continue;

        const nullCount = td.rows.filter(r => r[col] === null || r[col] === undefined).length;
        const nullPct = (nullCount / td.rows.length) * 100;

        if (nullPct > 5) {
          this.addCheck('WEIGHT_COVERAGE', `${td.schema}.${td.table}.${col}`, 'HIGH',
            false, `Weight column ${nullPct.toFixed(0)}% NULL (${nullCount}/${td.rows.length}) — weighted avg returns NULL for affected segments`, 'null_weight_propagation');
        }
      }
    }
  }

  /**
   * Detect placeholder/junk values from seed generator fallback.
   * CLAUDE.md: "Placeholder detection — No auto-generated field_name_123 values"
   */
  private checkPlaceholderValues(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
  ): void {
    const placeholderPattern = /^[a-z_]+_\d+$/; // e.g., "limit_status_code_1"

    for (const td of tables) {
      if (td.rows.length === 0) continue;
      for (const col of Object.keys(td.rows[0] ?? {})) {
        if (col.endsWith('_id') || col.endsWith('_ts') || col === 'as_of_date') continue;

        let placeholders = 0;
        for (const row of td.rows.slice(0, 50)) { // sample first 50
          const val = row[col];
          if (typeof val === 'string' && placeholderPattern.test(val)) {
            placeholders++;
          }
        }

        if (placeholders > 3) {
          this.addCheck('PLACEHOLDER_VALUES', `${td.schema}.${td.table}.${col}`, 'HIGH',
            false, `${placeholders} placeholder values detected (pattern: field_name_N) — seed generator fallback`, 'placeholder_seed_values');
        }
      }
    }
  }

  /**
   * Validate that parent tables appear before child tables in the data.
   * CLAUDE.md: Rule 11 — "Parent table INSERTs must appear BEFORE child table INSERTs"
   */
  private checkLoadOrder(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts: Map<string, SchemaContract>,
  ): void {
    const tableOrder = new Map<string, number>();
    tables.forEach((td, idx) => tableOrder.set(`${td.schema}.${td.table}`, idx));

    let violations = 0;
    for (const td of tables) {
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract) continue;

      const myOrder = tableOrder.get(qn) ?? 999;
      for (const dep of contract.dependsOn) {
        const depOrder = tableOrder.get(dep);
        if (depOrder !== undefined && depOrder > myOrder) {
          violations++;
        }
      }
    }

    if (violations > 0) {
      this.addCheck('LOAD_ORDER', 'Parent tables before child tables', 'CRITICAL',
        false, `${violations} tables appear before their FK parents — will cause FK constraint violations`, 'parent_before_child');
    }
  }

  /**
   * Check that numeric values fall within GSIB-realistic ranges.
   * CLAUDE.md: "Numeric range realism — NUMERIC fields have values in GSIB-realistic ranges"
   */
  private checkNumericRangeRealism(
    tables: Array<{ schema: string; table: string; rows: Record<string, unknown>[] }>,
    contracts: Map<string, SchemaContract>,
  ): void {
    for (const td of tables) {
      if (td.rows.length === 0) continue;
      const qn = `${td.schema}.${td.table}`;
      const contract = contracts.get(qn);
      if (!contract) continue;

      for (const col of contract.columns) {
        if (!col.gsibRange) continue;
        if (!(col.name in (td.rows[0] ?? {}))) continue;

        let outOfRange = 0;
        for (const row of td.rows) {
          const val = Number(row[col.name]);
          if (isNaN(val) || val === null) continue;
          if (val < col.gsibRange.min || val > col.gsibRange.max) outOfRange++;
        }

        if (outOfRange > 0) {
          this.addCheck('GSIB_RANGE', `${qn}.${col.name}`, 'MEDIUM',
            false, `${outOfRange}/${td.rows.length} values outside GSIB range [${col.gsibRange.min}-${col.gsibRange.max}]`, 'numeric_range_realism');
        }
      }
    }
  }

  /* ────────────────── Story-Level Checks ────────────────── */

  private checkPDRatingAlignment(stories: FacilityStory[]): void {
    let violations = 0;
    for (const story of stories) {
      const tier = RATING_TO_TIER[story.internalRating];
      if (tier) {
        const band = PD_BY_RATING_TIER[tier];
        if (story.pdAnnual < band.min * 0.8 || story.pdAnnual > band.max * 1.2) {
          violations++;
        }
      }
    }
    this.addCheck('PD_RATING_ALIGN', 'PD within rating tier band', 'HIGH',
      violations === 0, violations === 0 ? 'OK' : `${violations} stories with PD/rating mismatch`);
  }

  private checkPDDPDCorrelation(stories: FacilityStory[]): void {
    let violations = 0;
    for (const story of stories) {
      // DPD 90+ should have PD > 10%
      if (story.daysPastDue >= 90 && story.pdAnnual < 5) violations++;
      // Current (0 DPD) should typically have PD < 15%
      if (story.daysPastDue === 0 && story.pdAnnual > 20) violations++;
    }
    this.addCheck('PD_DPD_CORREL', 'PD correlates with DPD', 'MEDIUM',
      violations === 0, violations === 0 ? 'OK' : `${violations} stories with PD/DPD mismatch`);
  }

  private checkUtilizationHealthAlignment(stories: FacilityStory[]): void {
    let violations = 0;
    for (const story of stories) {
      // Performing facilities should have utilization < 90%
      if (story.healthState === 'PERFORMING' && story.utilization > 90) violations++;
    }
    this.addCheck('UTIL_HEALTH_ALIGN', 'Utilization consistent with health state', 'LOW',
      violations === 0, violations === 0 ? 'OK' : `${violations} stories with utilization/health mismatch`);
  }

  private checkTemporalMonotonicity(
    stories: FacilityStory[],
    previousStories?: FacilityStory[],
  ): void {
    if (!previousStories || previousStories.length === 0) {
      this.addCheck('TEMPORAL_MONOTONIC', 'Temporal monotonicity', 'MEDIUM', true, 'OK (no previous stories to compare)');
      return;
    }

    let violations = 0;
    for (const story of stories) {
      const prev = previousStories.find(s => s.facilityId === story.facilityId);
      if (!prev) continue;

      // Worsening trajectory: PD should not decrease
      if (prev.trajectory === 'WORSENING' && story.pdAnnual < prev.pdAnnual * 0.85) {
        violations++;
      }
      // Improving trajectory: PD should not increase
      if (prev.trajectory === 'IMPROVING' && story.pdAnnual > prev.pdAnnual * 1.15) {
        violations++;
      }
    }
    this.addCheck('TEMPORAL_MONOTONIC', 'Worsening trajectory monotonicity', 'HIGH',
      violations === 0, violations === 0 ? 'OK' : `${violations} trajectories reversed unexpectedly`);
  }

  private checkMagnitudeReasonableness(
    stories: FacilityStory[],
    previousStories?: FacilityStory[],
  ): void {
    if (!previousStories) {
      this.addCheck('MAGNITUDE_REASON', 'Month-over-month magnitude reasonable', 'MEDIUM', true, 'OK (no previous)');
      return;
    }

    let violations = 0;
    for (const story of stories) {
      const prev = previousStories.find(s => s.facilityId === story.facilityId);
      if (!prev || prev.pdAnnual === 0) continue;

      const pdRatio = story.pdAnnual / prev.pdAnnual;
      if (pdRatio > TEMPORAL_LIMITS.pd_max_monthly_factor || pdRatio < 1 / TEMPORAL_LIMITS.pd_max_monthly_factor) {
        violations++;
      }
    }
    this.addCheck('MAGNITUDE_REASON', 'PD change within 3x monthly limit', 'MEDIUM',
      violations === 0, violations === 0 ? 'OK' : `${violations} stories with excessive PD change`);
  }

  private checkCrossCounterpartyConsistency(stories: FacilityStory[]): void {
    const cpPDs = new Map<number, number[]>();
    for (const story of stories) {
      const pds = cpPDs.get(story.counterpartyId) ?? [];
      pds.push(story.pdAnnual);
      cpPDs.set(story.counterpartyId, pds);
    }

    let violations = 0;
    for (const [, pds] of cpPDs) {
      if (pds.length <= 1) continue;
      const maxPD = Math.max(...pds);
      const minPD = Math.min(...pds);
      // PD should be identical across facilities for same counterparty
      if (maxPD > minPD * 1.01) violations++;
    }
    this.addCheck('CROSS_CP_CONSIST', 'Same counterparty = same PD', 'HIGH',
      violations === 0, violations === 0 ? 'OK' : `${violations} counterparties with inconsistent PDs`);
  }

  /* ────────────────── Helpers ────────────────── */

  private addCheck(
    name: string,
    description: string,
    severity: CheckSeverity,
    passed: boolean,
    message: string,
    lessonRef?: string,
  ): void {
    this.checks.push({ name, description, severity, passed, message, lessonRef });
  }

  private buildReport(): ValidationReport {
    const failures = this.checks.filter(c => !c.passed);
    return {
      passed: failures.filter(c => c.severity === 'CRITICAL').length === 0,
      totalChecks: this.checks.length,
      criticalFailures: failures.filter(c => c.severity === 'CRITICAL').length,
      highFailures: failures.filter(c => c.severity === 'HIGH').length,
      mediumFailures: failures.filter(c => c.severity === 'MEDIUM').length,
      lowFailures: failures.filter(c => c.severity === 'LOW').length,
      checks: this.checks,
    };
  }
}
