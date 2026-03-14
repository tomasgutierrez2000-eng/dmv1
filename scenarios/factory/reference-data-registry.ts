/**
 * Reference Data Registry — loads L1 seed data from SQL file at runtime.
 *
 * Parses INSERT statements from `sql/gsib-export/03-l1-seed.sql` to build
 * an in-memory registry of all L1 dimension tables and their PKs. This
 * replaces hardcoded maps (COUNTRY_MAP, CREDIT_STATUS_CODE, etc.) with
 * dynamic lookups that automatically adapt when L1 seed data changes.
 *
 * No database connection required — works purely from the SQL file.
 */

import { readFileSync } from 'fs';
import path from 'path';

/* ────────────────── Types ────────────────── */

export interface L1TableData {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  pkColumn: string;
  pkValues: Set<string | number>;
}

export interface DriftReport {
  mapName: string;
  l1Table: string;
  inMapNotInL1: (string | number)[];   // stale keys — map has them, L1 doesn't
  inL1NotInMap: (string | number)[];   // coverage gap — L1 has them, map doesn't
  isClean: boolean;
}

/* ────────────────── PK Inference ────────────────── */

/**
 * Known PK columns for L1 tables. Falls back to first column if not listed.
 * These must match the actual DDL PRIMARY KEY definitions.
 */
const KNOWN_PKS: Record<string, string> = {
  currency_dim: 'currency_code',
  country_dim: 'country_code',
  region_dim: 'region_code',
  entity_type_dim: 'entity_type_code',
  credit_status_dim: 'credit_status_code',
  exposure_type_dim: 'exposure_type_id',
  collateral_type: 'collateral_type_id',
  crm_type_dim: 'crm_type_code',
  dpd_bucket_dim: 'dpd_bucket_code',
  rating_grade_dim: 'rating_grade_id',
  pricing_tier_dim: 'pricing_tier_code',
  amendment_type_dim: 'amendment_type_code',
  amendment_status_dim: 'amendment_status_code',
  credit_event_type_dim: 'credit_event_type_code',
  source_system_registry: 'source_system_id',
  portfolio_dim: 'portfolio_id',
  org_unit_dim: 'org_unit_id',
  interest_rate_index_dim: 'rate_index_id',
  ledger_account_dim: 'ledger_account_id',
  industry_dim: 'industry_id',
  default_definition_dim: 'default_definition_id',
  maturity_bucket_dim: 'maturity_bucket_id',
  risk_rating_tier_dim: 'tier_code',
  utilization_status_dim: 'utilization_status_code',
  origination_date_bucket_dim: 'origination_bucket_code',
  counterparty_role_dim: 'counterparty_role_code',
  rating_scale_dim: 'rating_scale_id',
  fr2590_category_dim: 'fr2590_category_code',
  regulatory_jurisdiction: 'jurisdiction_id',
  internal_risk_rating_bucket_dim: 'internal_risk_rating_bucket_code',
  lob_segment_dim: 'lob_segment_id',
  // Factory-specific
  counterparty: 'counterparty_id',
  credit_agreement_master: 'credit_agreement_id',
  facility_master: 'facility_id',
};

/* ────────────────── SQL Value Parser ────────────────── */

/**
 * Parse a single SQL value (inside a VALUES clause).
 * Handles: quoted strings (with escaped quotes), numbers, booleans, NULL.
 */
function parseSqlValue(raw: string): string | number | boolean | null {
  const trimmed = raw.trim();

  if (trimmed.toUpperCase() === 'NULL') return null;
  if (trimmed.toUpperCase() === 'TRUE' || trimmed === "'Y'") return true;
  if (trimmed.toUpperCase() === 'FALSE' || trimmed === "'N'") return false;

  // Quoted string — strip outer quotes, unescape ''
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }

  // Number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;

  return trimmed;
}

/**
 * Split a VALUES clause into individual values, respecting quoted strings.
 * E.g. "1, 'Moody''s', TRUE, 0.05" → ["1", "'Moody''s'", "TRUE", "0.05"]
 */
function splitValues(valuesStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i];

    if (ch === "'" && !inQuote) {
      inQuote = true;
      current += ch;
    } else if (ch === "'" && inQuote) {
      // Check for escaped quote ''
      if (i + 1 < valuesStr.length && valuesStr[i + 1] === "'") {
        current += "''";
        i++; // skip next quote
      } else {
        inQuote = false;
        current += ch;
      }
    } else if (ch === ',' && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

/* ────────────────── Main Parser ────────────────── */

/**
 * Parse all INSERT statements from an L1 seed SQL file.
 * Expected format: INSERT INTO l1.<table> (<columns>) VALUES (<values>);
 */
function parseSeedSQL(sqlContent: string): Map<string, L1TableData> {
  const tables = new Map<string, L1TableData>();

  // Match INSERT INTO l1.<table> (<cols>) VALUES (<vals>);
  // Use a line-by-line approach for robustness
  const lines = sqlContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('INSERT INTO l1.')) continue;

    // Extract table name
    const tableMatch = trimmed.match(/^INSERT INTO l1\.(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\);?\s*$/i);
    if (!tableMatch) continue;

    const tableName = tableMatch[1];
    const columnsStr = tableMatch[2];
    const valuesStr = tableMatch[3];

    // Parse columns (strip quotes)
    const columns = columnsStr.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

    // Parse values
    const rawValues = splitValues(valuesStr);
    const parsedValues = rawValues.map(parseSqlValue);

    // Build row object
    const row: Record<string, unknown> = {};
    for (let i = 0; i < columns.length && i < parsedValues.length; i++) {
      row[columns[i]] = parsedValues[i];
    }

    // Get or create table entry
    if (!tables.has(tableName)) {
      const pkColumn = KNOWN_PKS[tableName] ?? columns[0];
      tables.set(tableName, {
        tableName,
        columns,
        rows: [],
        pkColumn,
        pkValues: new Set(),
      });
    }

    const tableData = tables.get(tableName)!;
    tableData.rows.push(row);

    // Add PK value
    const pkVal = row[tableData.pkColumn];
    if (pkVal !== null && pkVal !== undefined) {
      tableData.pkValues.add(pkVal as string | number);
    }
  }

  return tables;
}

/* ────────────────── Registry Class ────────────────── */

export class ReferenceDataRegistry {
  private tables: Map<string, L1TableData>;
  private loadPath: string;

  private constructor(tables: Map<string, L1TableData>, loadPath: string) {
    this.tables = tables;
    this.loadPath = loadPath;
  }

  /**
   * Load registry from the L1 seed SQL file.
   * Default path: sql/gsib-export/03-l1-seed.sql relative to project root.
   */
  static fromSeedSQL(sqlPath?: string): ReferenceDataRegistry {
    const resolvedPath = sqlPath ?? path.join(__dirname, '..', '..', 'sql', 'gsib-export', '03-l1-seed.sql');
    const content = readFileSync(resolvedPath, 'utf-8');
    const tables = parseSeedSQL(content);
    return new ReferenceDataRegistry(tables, resolvedPath);
  }

  /* ── Table Access ── */

  /** Get all loaded table names. */
  tableNames(): string[] {
    return [...this.tables.keys()];
  }

  /** Get full table data for a specific L1 table. */
  getTable(tableName: string): L1TableData | undefined {
    return this.tables.get(tableName);
  }

  /** Get row count for a table. */
  rowCount(tableName: string): number {
    return this.tables.get(tableName)?.rows.length ?? 0;
  }

  /* ── FK Validation ── */

  /** Get the set of valid PK values for a table. */
  validPKs(tableName: string): Set<string | number> {
    return this.tables.get(tableName)?.pkValues ?? new Set();
  }

  /** Check if a value is a valid PK in the given table. */
  isValidPK(tableName: string, value: unknown): boolean {
    if (value === null || value === undefined) return false;
    const pks = this.tables.get(tableName)?.pkValues;
    if (!pks) return false;
    // Try both string and number forms for robustness
    if (pks.has(value as string | number)) return true;
    if (typeof value === 'number') return pks.has(String(value));
    if (typeof value === 'string') {
      const num = Number(value);
      if (!isNaN(num)) return pks.has(num);
    }
    return false;
  }

  /* ── Row Lookup ── */

  /** Look up a full row by PK value. Returns first match. */
  lookupRow(tableName: string, pkValue: unknown): Record<string, unknown> | undefined {
    const table = this.tables.get(tableName);
    if (!table) return undefined;
    return table.rows.find(r => {
      const val = r[table.pkColumn];
      if (val === pkValue) return true;
      // Loose comparison for string/number
      if (typeof pkValue === 'number' && val === String(pkValue)) return true;
      if (typeof pkValue === 'string' && val === Number(pkValue)) return true;
      return false;
    });
  }

  /** Look up a specific field value from a row identified by PK. */
  lookupField(tableName: string, pkValue: unknown, field: string): unknown {
    const row = this.lookupRow(tableName, pkValue);
    return row?.[field];
  }

  /* ── Specialized Lookups ── */

  /**
   * Resolve a DPD (days past due) value to the correct dpd_bucket_code
   * using the dpd_min/dpd_max from dpd_bucket_dim.
   */
  resolveDPDBucket(dpd: number): string | undefined {
    const table = this.tables.get('dpd_bucket_dim');
    if (!table) return undefined;
    for (const row of table.rows) {
      const min = row.dpd_min as number;
      const max = row.dpd_max as number;
      if (dpd >= min && dpd <= max) {
        return row.dpd_bucket_code as string;
      }
    }
    return undefined;
  }

  /**
   * Get PD and LGD parameters for a rating grade.
   * Returns the pd_12m and lgd_downturn from rating_grade_dim.
   */
  getRatingPDRange(gradeId: number): { pd_12m: number; lgd_downturn: number } | undefined {
    const row = this.lookupRow('rating_grade_dim', gradeId);
    if (!row) return undefined;
    return {
      pd_12m: row.pd_12m as number,
      lgd_downturn: row.lgd_downturn as number,
    };
  }

  /**
   * Get spread range (min/max in bps) for a pricing tier.
   */
  getSpreadRange(tierCode: string): { min: number; max: number } | undefined {
    const row = this.lookupRow('pricing_tier_dim', tierCode);
    if (!row) return undefined;
    return {
      min: row.spread_min_bps as number,
      max: row.spread_max_bps as number,
    };
  }

  /**
   * Get the CCF percentage for an exposure type.
   */
  getExposureCCF(exposureTypeId: number): number | undefined {
    const row = this.lookupRow('exposure_type_dim', exposureTypeId);
    return row?.ccf_pct as number | undefined;
  }

  /**
   * Get credit status properties (default_flag, delinquency_bucket, status_category).
   */
  getCreditStatusInfo(code: number): {
    default_flag: boolean;
    delinquency_bucket: string;
    status_category: string;
    credit_status_name: string;
  } | undefined {
    const row = this.lookupRow('credit_status_dim', code);
    if (!row) return undefined;
    return {
      default_flag: row.default_flag === 'Y' || row.default_flag === true,
      delinquency_bucket: row.delinquency_bucket as string,
      status_category: row.status_category as string,
      credit_status_name: row.credit_status_name as string,
    };
  }

  /**
   * Check if a credit event type is a default trigger.
   */
  isDefaultTrigger(eventTypeCode: number): boolean {
    const row = this.lookupRow('credit_event_type_dim', eventTypeCode);
    return row?.default_trigger_flag === 'Y' || row?.default_trigger_flag === true;
  }

  /**
   * Get all default-trigger event type codes.
   */
  getDefaultTriggerCodes(): number[] {
    const table = this.tables.get('credit_event_type_dim');
    if (!table) return [];
    return table.rows
      .filter(r => r.default_trigger_flag === 'Y' || r.default_trigger_flag === true)
      .map(r => r.credit_event_type_code as number);
  }

  /* ── Drift Detection ── */

  /**
   * Compare a hardcoded map's keys against L1 table PKs.
   * Returns stale keys (in map but not L1) and coverage gaps (in L1 but not map).
   */
  checkDrift(
    mapName: string,
    mapKeys: Set<string | number>,
    l1Table: string,
  ): DriftReport {
    const l1PKs = this.validPKs(l1Table);

    const inMapNotInL1: (string | number)[] = [];
    const inL1NotInMap: (string | number)[] = [];

    for (const key of mapKeys) {
      if (!this.isValidPK(l1Table, key)) {
        inMapNotInL1.push(key);
      }
    }

    for (const pk of l1PKs) {
      // Check both string and number forms
      if (!mapKeys.has(pk)) {
        const alt = typeof pk === 'number' ? String(pk) : Number(pk);
        if (isNaN(alt as number) || !mapKeys.has(alt)) {
          inL1NotInMap.push(pk);
        }
      }
    }

    return {
      mapName,
      l1Table,
      inMapNotInL1,
      inL1NotInMap,
      isClean: inMapNotInL1.length === 0 && inL1NotInMap.length === 0,
    };
  }

  /* ── Summary ── */

  /** Summary stats for logging. */
  summary(): { tables: number; totalRows: number; details: Array<{ table: string; rows: number; pk: string }> } {
    let totalRows = 0;
    const details: Array<{ table: string; rows: number; pk: string }> = [];
    for (const [name, data] of this.tables) {
      totalRows += data.rows.length;
      details.push({ table: name, rows: data.rows.length, pk: data.pkColumn });
    }
    return { tables: this.tables.size, totalRows, details };
  }

  /** Get the file path this registry was loaded from. */
  getLoadPath(): string {
    return this.loadPath;
  }
}
