#!/usr/bin/env npx tsx
/**
 * End-to-End Calculation Engine Test Suite
 *
 * Tests the governance calculator API with correct and deliberately broken
 * formulas to verify robustness, error handling, and result quality.
 *
 * Usage: npx tsx scripts/e2e-calc-test.ts
 *
 * Requires DATABASE_URL and a running dev server on port 3000.
 */

/* ── Types ─────────────────────────────────────────────────────── */

interface TestScenario {
  id: string;
  name: string;
  category: string;
  sql: string;
  level: string;
  expectation: 'success' | 'error' | 'warning';
  checks: ((result: TestResult) => CheckResult)[];
  description: string;
}

interface TestResult {
  ok: boolean;
  status: number;
  data?: {
    rows: { dimension_key: unknown; metric_value: unknown; dimension_label?: string }[];
    row_count: number;
    duration_ms: number;
    as_of_date: string;
    truncated: boolean;
    warnings?: string[];
  };
  // Flat response fields (API returns these at top level)
  rows?: { dimension_key: unknown; metric_value: unknown; dimension_label?: string }[];
  row_count?: number;
  duration_ms?: number;
  error?: string;
  code?: string;
  details?: string;
}

interface CheckResult {
  pass: boolean;
  label: string;
  detail: string;
}

interface ScenarioResult {
  scenario: TestScenario;
  result: TestResult;
  checks: CheckResult[];
  overallPass: boolean;
  durationMs: number;
}

/* ── Configuration ─────────────────────────────────────────────── */

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';
const API_URL = `${API_BASE}/api/metrics/governance/calculator`;
const DEFAULT_DATE = process.env.AS_OF_DATE ?? '2025-01-31';

/* ── Helper Functions ──────────────────────────────────────────── */

async function runQuery(sql: string, level: string, asOfDate?: string): Promise<{ result: TestResult; status: number }> {
  const body: Record<string, unknown> = { sql, level, max_rows: 500 };
  body.as_of_date = asOfDate ?? DEFAULT_DATE;

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await resp.json();

  // Normalize: API returns flat {rows, row_count, ...} on success, or {error, code} on failure.
  // Unify into data.* for consistent check functions.
  const normalized: TestResult = {
    ok: resp.ok,
    status: resp.status,
    error: json.error,
    code: json.code,
    details: json.details,
  };

  if (resp.ok && json.rows) {
    // Parse metric_value from string to number (PG returns NUMERIC as string)
    const rows = (json.rows as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      metric_value: r.metric_value !== null && r.metric_value !== undefined
        ? Number(r.metric_value)
        : null,
      dimension_key: r.dimension_key,
    }));
    normalized.data = {
      rows,
      row_count: json.row_count ?? rows.length,
      duration_ms: json.duration_ms ?? 0,
      as_of_date: json.as_of_date ?? DEFAULT_DATE,
      truncated: json.truncated ?? false,
      warnings: json.warnings ?? [],
    };
  }

  return { result: normalized, status: resp.status };
}

/* ── Check Factories ───────────────────────────────────────────── */

function checkHttpOk(): (r: TestResult) => CheckResult {
  return (r) => ({
    pass: r.ok && r.status === 200,
    label: 'HTTP 200',
    detail: r.ok ? 'Got 200 OK' : `Got ${r.status}: ${r.error ?? 'unknown'}`,
  });
}

function checkHasRows(minRows = 1): (r: TestResult) => CheckResult {
  return (r) => {
    const count = r.data?.row_count ?? 0;
    return {
      pass: count >= minRows,
      label: `Rows >= ${minRows}`,
      detail: `Got ${count} rows`,
    };
  };
}

function checkAllValuesNumeric(): (r: TestResult) => CheckResult {
  return (r) => {
    const rows = r.data?.rows ?? [];
    const nonNumeric = rows.filter(
      (row) => row.metric_value !== null && typeof row.metric_value !== 'number'
    );
    return {
      pass: nonNumeric.length === 0,
      label: 'All values numeric',
      detail: nonNumeric.length > 0
        ? `${nonNumeric.length} non-numeric values found`
        : `All ${rows.length} values are numeric or null`,
    };
  };
}

function checkNoNullKeys(): (r: TestResult) => CheckResult {
  return (r) => {
    const rows = r.data?.rows ?? [];
    const nullKeys = rows.filter((row) => row.dimension_key === null || row.dimension_key === undefined);
    return {
      pass: nullKeys.length === 0,
      label: 'No NULL dimension_keys',
      detail: nullKeys.length > 0
        ? `${nullKeys.length} rows with NULL dimension_key`
        : `All ${rows.length} dimension_keys are non-null`,
    };
  };
}

function checkValueRange(min: number, max: number): (r: TestResult) => CheckResult {
  return (r) => {
    const rows = r.data?.rows ?? [];
    const values = rows.map((row) => row.metric_value as number).filter((v) => v !== null);
    const outOfRange = values.filter((v) => v < min || v > max);
    const actualMin = Math.min(...values);
    const actualMax = Math.max(...values);
    return {
      pass: outOfRange.length === 0,
      label: `Values in [${min}, ${max}]`,
      detail: outOfRange.length > 0
        ? `${outOfRange.length} values out of range (actual: ${actualMin.toFixed(4)} to ${actualMax.toFixed(4)})`
        : `Range: ${actualMin.toFixed(4)} to ${actualMax.toFixed(4)}`,
    };
  };
}

function checkPositiveValues(): (r: TestResult) => CheckResult {
  return (r) => {
    const rows = r.data?.rows ?? [];
    const values = rows.map((row) => row.metric_value as number).filter((v) => v !== null);
    const negatives = values.filter((v) => v < 0);
    return {
      pass: negatives.length === 0,
      label: 'All values >= 0',
      detail: negatives.length > 0
        ? `${negatives.length} negative values (min: ${Math.min(...negatives).toFixed(4)})`
        : `All ${values.length} values are non-negative`,
    };
  };
}

function checkHttpError(expectedCode?: string): (r: TestResult) => CheckResult {
  return (r) => {
    const isError = !r.ok || r.status >= 400;
    const codeMatch = !expectedCode || r.code === expectedCode;
    return {
      pass: isError && codeMatch,
      label: expectedCode ? `Error code: ${expectedCode}` : 'Returns error',
      detail: isError
        ? `Error: ${r.error ?? r.code ?? 'unknown'}`
        : `Expected error but got success with ${r.data?.row_count ?? 0} rows`,
    };
  };
}

function checkErrorMessage(pattern: string): (r: TestResult) => CheckResult {
  const re = new RegExp(pattern, 'i');
  return (r) => {
    const msg = r.error ?? r.details ?? '';
    return {
      pass: re.test(msg),
      label: `Error contains "${pattern}"`,
      detail: msg ? `Message: ${msg.slice(0, 120)}` : 'No error message',
    };
  };
}

function checkRollupConsistency(): (r: TestResult) => CheckResult {
  return (r) => {
    const rows = r.data?.rows ?? [];
    const values = rows.map((row) => row.metric_value as number).filter((v) => v !== null);
    if (values.length < 2) {
      return { pass: true, label: 'Rollup consistent', detail: 'Too few rows to check' };
    }
    const total = values.reduce((a, b) => a + b, 0);
    return {
      pass: total > 0,
      label: 'Rollup sum > 0',
      detail: `Sum of ${values.length} values = ${total.toFixed(2)}`,
    };
  };
}

function checkNoDuplicateKeys(): (r: TestResult) => CheckResult {
  return (r) => {
    const rows = r.data?.rows ?? [];
    const keys = rows.map((row) => String(row.dimension_key));
    const unique = new Set(keys);
    return {
      pass: keys.length === unique.size,
      label: 'No duplicate keys',
      detail: keys.length !== unique.size
        ? `${keys.length - unique.size} duplicate dimension_keys`
        : `All ${keys.length} keys unique`,
    };
  };
}

function checkDoubleCountDetection(singleCountSql: string): (r: TestResult) => CheckResult {
  // This check is deferred — we compare against the single-count result later
  return (r) => {
    // We'll populate this during execution
    return {
      pass: false,
      label: 'Double-count detected',
      detail: 'Comparison pending',
    };
  };
}

function checkWarningPresent(pattern: string): (r: TestResult) => CheckResult {
  const re = new RegExp(pattern, 'i');
  return (r) => {
    const warnings = r.data?.warnings ?? [];
    const match = warnings.some((w) => re.test(w));
    return {
      pass: match,
      label: `Warning: ${pattern}`,
      detail: match
        ? `Found warning matching "${pattern}"`
        : `No warning matching "${pattern}" in [${warnings.join(', ')}]`,
    };
  };
}

/* ── Test Scenarios ────────────────────────────────────────────── */

const scenarios: TestScenario[] = [
  // ──────────────────────────────────────────────────────────────
  // SCENARIO 1: Correct formula — Facility Utilization Rate
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S1',
    name: 'Correct Formula — Facility Utilization Rate',
    category: 'CORRECT FORMULA',
    description: 'Sum-ratio metric: drawn_amount / committed_amount * 100. Should return values 0-100%.',
    level: 'facility',
    sql: `SELECT
  fes.facility_id AS dimension_key,
  CASE WHEN NULLIF(fes.committed_amount, 0) IS NOT NULL
    THEN fes.drawn_amount * 100.0 / NULLIF(fes.committed_amount, 0)
    ELSE NULL
  END AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
  AND fm.is_current_flag = 'Y'
WHERE fes.as_of_date = :as_of_date
GROUP BY fes.facility_id, fes.drawn_amount, fes.committed_amount`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(5),
      checkAllValuesNumeric(),
      checkNoNullKeys(),
      checkValueRange(0, 200),
      checkNoDuplicateKeys(),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 2: Correct formula — Counterparty-level rollup
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S2',
    name: 'Correct Formula — Counterparty Gross Exposure',
    category: 'CORRECT FORMULA',
    description: 'Direct-sum metric at counterparty level with FX conversion. Sum drawn_amount * fx.rate.',
    level: 'counterparty',
    sql: `SELECT
  fm.counterparty_id AS dimension_key,
  SUM(fes.drawn_amount * COALESCE(fx.rate, 1)) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
  AND fm.is_current_flag = 'Y'
LEFT JOIN l2.fx_rate fx
  ON fx.from_currency_code = fes.currency_code
  AND fx.to_currency_code = 'USD'
  AND fx.as_of_date = fes.as_of_date
WHERE fes.as_of_date = :as_of_date
GROUP BY fm.counterparty_id`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(3),
      checkAllValuesNumeric(),
      checkNoNullKeys(),
      checkPositiveValues(),
      checkNoDuplicateKeys(),
      checkRollupConsistency(),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 3: Missing NULLIF — Division by zero
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S3',
    name: 'Missing NULLIF — Division by Zero Risk',
    category: 'FORMULA BUG — NULL SAFETY',
    description: 'LTV formula without NULLIF: collateral_value could be 0, causing division error or Infinity.',
    level: 'facility',
    sql: `SELECT
  fes.facility_id AS dimension_key,
  fes.drawn_amount / cs.current_valuation_usd AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
LEFT JOIN l2.collateral_snapshot cs
  ON cs.facility_id = fes.facility_id
  AND cs.as_of_date = fes.as_of_date
WHERE fes.as_of_date = :as_of_date`,
    expectation: 'success',  // PG returns NULL for division by zero with numeric, but may return Infinity for float
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      checkAllValuesNumeric(),
      // Key check: some values may be NULL due to zero collateral
      (r) => {
        const rows = r.data?.rows ?? [];
        const nullValues = rows.filter((row) => row.metric_value === null);
        const infinities = rows.filter(
          (row) => row.metric_value === Infinity || row.metric_value === -Infinity
        );
        return {
          pass: true, // This is informational
          label: 'Div-by-zero behavior',
          detail: `${nullValues.length} NULLs, ${infinities.length} Infinities out of ${rows.length} rows. ` +
            (infinities.length > 0
              ? 'WARNING: Infinity detected — NULLIF needed'
              : nullValues.length > 0
                ? 'PG returned NULL for 0/0 (safe but lossy — NULLIF would be explicit)'
                : 'No division issues detected in current data'),
        };
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 4: Missing COALESCE — NULL propagation
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S4',
    name: 'Missing COALESCE — NULL Weight Propagation',
    category: 'FORMULA BUG — NULL SAFETY',
    description: 'Weighted average without COALESCE on bank_share_pct. If bank_share_pct is NULL, entire row contribution disappears.',
    level: 'counterparty',
    sql: `SELECT
  fm.counterparty_id AS dimension_key,
  SUM(fes.drawn_amount * fla.bank_share_pct / 100.0) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
LEFT JOIN l2.facility_lender_allocation fla
  ON fla.facility_id = fes.facility_id
  AND fla.is_current_flag = 'Y'
WHERE fes.as_of_date = :as_of_date
GROUP BY fm.counterparty_id`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      // Key check: compare against correct version with COALESCE
      (r) => {
        const rows = r.data?.rows ?? [];
        const nullValues = rows.filter((row) => row.metric_value === null);
        const zeroValues = rows.filter((row) => row.metric_value === 0);
        return {
          pass: true,
          label: 'NULL propagation check',
          detail: `${nullValues.length} NULL and ${zeroValues.length} zero values out of ${rows.length} counterparties. ` +
            (nullValues.length > 0
              ? 'DETECTED: NULL bank_share_pct nullified entire counterparty exposure — COALESCE(bank_share_pct, 100) needed'
              : 'No NULL propagation in current data (all facilities have bank_share_pct)'),
        };
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 5: Double counting — missing GROUP BY causes fan-out
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S5',
    name: 'Double Counting — Missing Pre-aggregation',
    category: 'FORMULA BUG — DOUBLE COUNT',
    description: 'Joining facility_exposure to collateral without pre-aggregating collateral causes N:M fan-out. ' +
      'Each facility exposure row is multiplied by N collateral rows, inflating the total.',
    level: 'counterparty',
    sql: `SELECT
  fm.counterparty_id AS dimension_key,
  SUM(fes.drawn_amount) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
LEFT JOIN l2.collateral_snapshot cs
  ON cs.facility_id = fes.facility_id
  AND cs.as_of_date = fes.as_of_date
WHERE fes.as_of_date = :as_of_date
GROUP BY fm.counterparty_id`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      checkAllValuesNumeric(),
      // The actual double-count check will be done by comparing to S2
      (r) => ({
        pass: true,
        label: 'Double-count comparison pending',
        detail: 'Will compare against S2 (correct rollup) to detect fan-out inflation',
      }),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 6: Simpson's Paradox — averaging pre-computed ratios
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S6',
    name: "Simpson's Paradox — AVG of Ratios",
    category: 'FORMULA BUG — WRONG ROLLUP',
    description: 'Averaging facility-level utilization rates instead of sum-ratio (SUM(drawn)/SUM(committed)). ' +
      'This violates mathematical consistency: a small $100 facility at 90% and a large $10M facility at 10% ' +
      'would average to 50%, but the correct weighted answer is ~10%.',
    level: 'counterparty',
    sql: `SELECT
  fm.counterparty_id AS dimension_key,
  AVG(
    CASE WHEN NULLIF(fes.committed_amount, 0) IS NOT NULL
      THEN fes.drawn_amount * 100.0 / fes.committed_amount
      ELSE NULL
    END
  ) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
WHERE fes.as_of_date = :as_of_date
GROUP BY fm.counterparty_id`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      checkAllValuesNumeric(),
      checkValueRange(0, 100),
      (r) => ({
        pass: true,
        label: "Simpson's paradox comparison pending",
        detail: 'Will compare against correct sum-ratio to show divergence',
      }),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 6b: Correct sum-ratio (counterpart to S6)
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S6b',
    name: 'Correct Sum-Ratio — Utilization at Counterparty',
    category: 'CORRECT FORMULA',
    description: 'Correct approach: SUM(drawn) / SUM(committed) at counterparty level. No Simpson paradox.',
    level: 'counterparty',
    sql: `SELECT
  fm.counterparty_id AS dimension_key,
  SUM(fes.drawn_amount) * 100.0 / NULLIF(SUM(fes.committed_amount), 0) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
WHERE fes.as_of_date = :as_of_date
GROUP BY fm.counterparty_id`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      checkAllValuesNumeric(),
      checkValueRange(0, 200),
      checkNoDuplicateKeys(),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 7: SQL Syntax Error — WHERE before JOIN
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S7',
    name: 'SQL Syntax Error — WHERE before JOIN',
    category: 'SYNTAX ERROR',
    description: 'Common YAML bug: WHERE clause placed before LEFT JOIN. PostgreSQL will reject this.',
    level: 'facility',
    sql: `SELECT
  fes.facility_id AS dimension_key,
  fes.drawn_amount AS metric_value
FROM l2.facility_exposure_snapshot fes
WHERE fes.as_of_date = :as_of_date
LEFT JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id`,
    expectation: 'error',
    checks: [
      checkHttpError(),
      checkErrorMessage('syntax'),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 8: SQL Syntax Error — PostgreSQL-specific cast
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S8',
    name: 'PostgreSQL Cast — Should Work in PG',
    category: 'COMPATIBILITY',
    description: '::FLOAT cast is valid PostgreSQL but would fail in sql.js. Testing PG accepts it.',
    level: 'facility',
    sql: `SELECT
  fes.facility_id AS dimension_key,
  (fes.drawn_amount::FLOAT / NULLIF(fes.committed_amount::FLOAT, 0)) * 100 AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
WHERE fes.as_of_date = :as_of_date`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      checkAllValuesNumeric(),
      (r) => ({
        pass: r.ok === true,
        label: '::FLOAT accepted by PG',
        detail: r.ok
          ? '::FLOAT cast works in PostgreSQL (but would fail in sql.js — use *1.0 for compatibility)'
          : `PG rejected ::FLOAT: ${r.error}`,
      }),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 9: DML Injection — Should be blocked by validation
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S9',
    name: 'DML Injection — DELETE Statement',
    category: 'SECURITY',
    description: 'Attempt to run DELETE via the calculator API. Should be blocked by SQL validation layer.',
    level: 'facility',
    sql: `DELETE FROM l2.facility_exposure_snapshot WHERE 1=1`,
    expectation: 'error',
    checks: [
      checkHttpError('VALIDATION_ERROR'),
      checkErrorMessage('Forbidden SQL keyword|must start with SELECT'),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 10: Multi-statement injection — semicolon
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S10',
    name: 'Multi-Statement Injection — Semicolon',
    category: 'SECURITY',
    description: 'Attempt to chain statements with semicolon. Should be blocked.',
    level: 'facility',
    sql: `SELECT 1 AS dimension_key, 1 AS metric_value; DROP TABLE l2.facility_master`,
    expectation: 'error',
    checks: [
      checkHttpError('VALIDATION_ERROR'),
      checkErrorMessage('single statement|semicolon'),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 11: Non-existent table
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S11',
    name: 'Non-existent Table Reference',
    category: 'ERROR HANDLING',
    description: 'Formula references l2.fake_table_xyz. Engine should return clear error.',
    level: 'facility',
    sql: `SELECT
  ft.facility_id AS dimension_key,
  ft.some_amount AS metric_value
FROM l2.fake_table_xyz ft
WHERE ft.as_of_date = :as_of_date`,
    expectation: 'error',
    checks: [
      checkHttpError(),
      checkErrorMessage('does not exist|not found'),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 12: Non-existent column
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S12',
    name: 'Non-existent Column Reference',
    category: 'ERROR HANDLING',
    description: 'Formula references fes.nonexistent_amount_xyz. Engine should return clear error.',
    level: 'facility',
    sql: `SELECT
  fes.facility_id AS dimension_key,
  fes.nonexistent_amount_xyz AS metric_value
FROM l2.facility_exposure_snapshot fes
WHERE fes.as_of_date = :as_of_date`,
    expectation: 'error',
    checks: [
      checkHttpError(),
      checkErrorMessage('does not exist|not found|column'),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 13: EBT Hierarchy — correct desk-level rollup
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S13',
    name: 'Correct EBT Hierarchy — Desk Level',
    category: 'CORRECT FORMULA',
    description: 'Desk-level rollup using EBT hierarchy with is_current_flag filter.',
    level: 'desk',
    sql: `SELECT
  ebt.managed_segment_id AS dimension_key,
  SUM(fes.drawn_amount * COALESCE(fx.rate, 1)) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
  AND fm.is_current_flag = 'Y'
LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id
  AND ebt.is_current_flag = 'Y'
LEFT JOIN l2.fx_rate fx
  ON fx.from_currency_code = fes.currency_code
  AND fx.to_currency_code = 'USD'
  AND fx.as_of_date = fes.as_of_date
WHERE fes.as_of_date = :as_of_date
GROUP BY ebt.managed_segment_id`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      checkAllValuesNumeric(),
      checkPositiveValues(),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 14: EBT Hierarchy — MISSING is_current_flag (ghost rows)
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S14',
    name: 'Missing is_current_flag — EBT Ghost Rows',
    category: 'FORMULA BUG — DOUBLE COUNT',
    description: 'EBT join WITHOUT is_current_flag = Y. Historical/inactive EBT nodes can pollute results, ' +
      'causing facilities to be counted multiple times under different org units.',
    level: 'desk',
    sql: `SELECT
  ebt.managed_segment_id AS dimension_key,
  SUM(fes.drawn_amount * COALESCE(fx.rate, 1)) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.is_active_flag = 'Y'
  AND fm.is_current_flag = 'Y'
LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id
LEFT JOIN l2.fx_rate fx
  ON fx.from_currency_code = fes.currency_code
  AND fx.to_currency_code = 'USD'
  AND fx.as_of_date = fes.as_of_date
WHERE fes.as_of_date = :as_of_date
GROUP BY ebt.managed_segment_id`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      (r) => ({
        pass: true,
        label: 'Ghost row comparison pending',
        detail: 'Will compare row count against S13 (correct EBT) to detect inflation from historical nodes',
      }),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 15: Empty result set handling
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S15',
    name: 'Empty Result — Future Date',
    category: 'EDGE CASE',
    description: 'Query with as_of_date far in the future. Should return empty but valid result, not error.',
    level: 'facility',
    sql: `SELECT
  fes.facility_id AS dimension_key,
  fes.drawn_amount AS metric_value
FROM l2.facility_exposure_snapshot fes
WHERE fes.as_of_date = :as_of_date`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      (r) => {
        const count = r.data?.row_count ?? 0;
        return {
          pass: count === 0,
          label: 'Empty result (no error)',
          detail: count === 0
            ? 'Correctly returned 0 rows for future date — no crash'
            : `Expected 0 rows for future date but got ${count}`,
        };
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 16: SUM of dates (invalid aggregation)
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S16',
    name: 'SUM of Dates — Invalid Aggregation',
    category: 'FORMULA BUG — WRONG AGGREGATION',
    description: 'Summing date fields is mathematically invalid. PostgreSQL may error or return nonsense.',
    level: 'counterparty',
    sql: `SELECT
  fm.counterparty_id AS dimension_key,
  SUM(fm.origination_date::integer) AS metric_value
FROM l2.facility_master fm
WHERE fm.is_active_flag = 'Y'
GROUP BY fm.counterparty_id`,
    expectation: 'error',
    checks: [
      checkHttpError(),
      (r) => ({
        pass: !r.ok,
        label: 'Date SUM rejected',
        detail: r.error
          ? `PG error: ${r.error?.slice(0, 100)}`
          : 'Unexpectedly succeeded — SUM of dates should fail',
      }),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 17: Correct weighted average (PD weighted by exposure)
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S17',
    name: 'Correct Weighted Average — PD by Exposure',
    category: 'CORRECT FORMULA',
    description: 'Weighted-avg PD: SUM(pd * exposure) / SUM(exposure). Proper weighted aggregation.',
    level: 'counterparty',
    sql: `SELECT
  fm.counterparty_id AS dimension_key,
  SUM(frs.pd_pct * COALESCE(fes.drawn_amount, 0)) / NULLIF(SUM(COALESCE(fes.drawn_amount, 0)), 0) AS metric_value
FROM l2.facility_risk_snapshot frs
INNER JOIN l2.facility_master fm
  ON fm.facility_id = frs.facility_id
  AND fm.is_active_flag = 'Y'
LEFT JOIN l2.facility_exposure_snapshot fes
  ON fes.facility_id = frs.facility_id
  AND fes.as_of_date = frs.as_of_date
WHERE frs.as_of_date = :as_of_date
GROUP BY fm.counterparty_id`,
    expectation: 'success',
    checks: [
      checkHttpOk(),
      checkHasRows(1),
      checkAllValuesNumeric(),
      checkValueRange(0, 100),
      checkNoDuplicateKeys(),
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCENARIO 18: Timeout protection — cartesian join
  // ──────────────────────────────────────────────────────────────
  {
    id: 'S18',
    name: 'Timeout Protection — Cartesian Product',
    category: 'ROBUSTNESS',
    description: 'Cross join without conditions creates N*M rows. Should hit timeout or row limit.',
    level: 'facility',
    sql: `SELECT
  fes.facility_id AS dimension_key,
  COUNT(*) AS metric_value
FROM l2.facility_exposure_snapshot fes
CROSS JOIN l2.facility_master fm
CROSS JOIN l2.facility_risk_snapshot frs
WHERE fes.as_of_date = :as_of_date
GROUP BY fes.facility_id`,
    expectation: 'error',  // Should timeout or be blocked
    checks: [
      (r) => ({
        pass: !r.ok || (r.data?.duration_ms ?? 0) < 31000,
        label: 'Cartesian handled',
        detail: r.ok
          ? `Returned ${r.data?.row_count} rows in ${r.data?.duration_ms}ms (row limit prevented runaway)`
          : `Error: ${r.error?.slice(0, 100)} (timeout or memory protection kicked in)`,
      }),
    ],
  },
];

/* ── Comparison Tests (cross-scenario) ─────────────────────────── */

interface ComparisonTest {
  name: string;
  category: string;
  baseScenarioId: string;
  compareScenarioId: string;
  check: (base: ScenarioResult, compare: ScenarioResult) => CheckResult;
}

const comparisons: ComparisonTest[] = [
  {
    name: 'Double-Count Detection: S5 vs S2',
    category: 'CROSS-VALIDATION',
    baseScenarioId: 'S2',
    compareScenarioId: 'S5',
    check: (base, compare) => {
      if (!base.result.ok || !compare.result.ok) {
        return { pass: false, label: 'Double-count comparison', detail: 'One or both queries failed' };
      }
      const baseTotal = (base.result.data?.rows ?? [])
        .reduce((sum, r) => sum + ((r.metric_value as number) ?? 0), 0);
      const compareTotal = (compare.result.data?.rows ?? [])
        .reduce((sum, r) => sum + ((r.metric_value as number) ?? 0), 0);
      const ratio = compareTotal / (baseTotal || 1);
      const isInflated = ratio > 1.01; // More than 1% inflation
      return {
        pass: isInflated,
        label: 'Double-count detected',
        detail: `Correct total: $${baseTotal.toFixed(0)} | Fan-out total: $${compareTotal.toFixed(0)} | ` +
          `Ratio: ${ratio.toFixed(2)}x` +
          (isInflated
            ? ` — ${((ratio - 1) * 100).toFixed(1)}% INFLATION from N:M join`
            : ' — No inflation detected (collateral data may be 1:1)'),
      };
    },
  },
  {
    name: "Simpson's Paradox Detection: S6 vs S6b",
    category: 'CROSS-VALIDATION',
    baseScenarioId: 'S6b',
    compareScenarioId: 'S6',
    check: (base, compare) => {
      if (!base.result.ok || !compare.result.ok) {
        return { pass: false, label: 'Simpson check', detail: 'One or both queries failed' };
      }
      const baseRows = base.result.data?.rows ?? [];
      const compareRows = compare.result.data?.rows ?? [];

      // Match by counterparty_id and compare
      const baseMap = new Map(baseRows.map((r) => [String(r.dimension_key), r.metric_value as number]));
      let divergences = 0;
      let maxDiff = 0;
      for (const row of compareRows) {
        const key = String(row.dimension_key);
        const correctVal = baseMap.get(key);
        const avgVal = row.metric_value as number;
        if (correctVal !== undefined && avgVal !== null && correctVal !== null) {
          const diff = Math.abs(correctVal - avgVal);
          if (diff > 0.1) { divergences++; maxDiff = Math.max(maxDiff, diff); }
        }
      }

      return {
        pass: divergences > 0,
        label: "Simpson's paradox",
        detail: `${divergences} counterparties diverge between AVG(ratio) vs SUM/SUM. Max diff: ${maxDiff.toFixed(2)}pp. ` +
          (divergences > 0
            ? 'CONFIRMED: averaging ratios gives different results than sum-ratio'
            : 'No divergence detected (facilities may be equally sized)'),
      };
    },
  },
  {
    name: 'EBT Ghost Row Detection: S14 vs S13',
    category: 'CROSS-VALIDATION',
    baseScenarioId: 'S13',
    compareScenarioId: 'S14',
    check: (base, compare) => {
      if (!base.result.ok || !compare.result.ok) {
        return { pass: false, label: 'EBT ghost check', detail: 'One or both queries failed' };
      }
      const baseTotal = (base.result.data?.rows ?? [])
        .reduce((sum, r) => sum + ((r.metric_value as number) ?? 0), 0);
      const compareTotal = (compare.result.data?.rows ?? [])
        .reduce((sum, r) => sum + ((r.metric_value as number) ?? 0), 0);
      const baseCount = base.result.data?.row_count ?? 0;
      const compareCount = compare.result.data?.row_count ?? 0;
      const isInflated = compareTotal > baseTotal * 1.01 || compareCount > baseCount;

      return {
        pass: true,
        label: 'EBT ghost rows',
        detail: `With is_current_flag: ${baseCount} segments, $${baseTotal.toFixed(0)} | ` +
          `Without: ${compareCount} segments, $${compareTotal.toFixed(0)}` +
          (isInflated
            ? ' — GHOST ROWS DETECTED: historical EBT nodes inflating results'
            : ' — No ghost rows (EBT data may be clean)'),
      };
    },
  },
];

/* ── Test Runner ───────────────────────────────────────────────── */

async function runAllTests(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       E2E CALCULATION ENGINE TEST SUITE                        ║');
  console.log('║       Testing robustness of formula execution pipeline          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // First, check connectivity
  console.log('Checking API connectivity...');
  try {
    const probe = await fetch(`${API_BASE}/api/metrics/governance/calculator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: 'SELECT 1 AS dimension_key, 1 AS metric_value' }),
    });
    if (probe.status === 503) {
      console.error('ERROR: Database not connected (503). Set DATABASE_URL.');
      process.exit(1);
    }
    console.log(`API reachable. Status: ${probe.status}\n`);
  } catch (err) {
    console.error(`ERROR: Cannot reach API at ${API_URL}`);
    console.error('Make sure the dev server is running: npm run dev');
    process.exit(1);
  }

  const results: Map<string, ScenarioResult> = new Map();

  // Run all scenarios
  for (const scenario of scenarios) {
    console.log(`\n${'─'.repeat(66)}`);
    console.log(`[${scenario.id}] ${scenario.name}`);
    console.log(`Category: ${scenario.category}`);
    console.log(`${scenario.description}`);
    console.log('─'.repeat(66));

    const startMs = Date.now();
    try {
      const asOfDate = scenario.id === 'S15' ? '2099-12-31' : undefined;
      const { result } = await runQuery(scenario.sql, scenario.level, asOfDate);
      const durationMs = Date.now() - startMs;

      const checkResults = scenario.checks.map((check) => check(result));

      const overallPass = scenario.expectation === 'success'
        ? result.ok === true
        : result.ok === false || result.status >= 400;

      const sr: ScenarioResult = { scenario, result, checks: checkResults, overallPass, durationMs };
      results.set(scenario.id, sr);

      const statusIcon = overallPass ? '✓' : '✗';
      console.log(`\n  ${statusIcon} Status: ${result.ok ? 'SUCCESS' : 'ERROR'} (${durationMs}ms)`);
      if (result.ok) {
        console.log(`  Rows: ${result.data?.row_count ?? 0} | Duration: ${result.data?.duration_ms ?? 0}ms`);
      } else {
        console.log(`  Error: ${result.error?.slice(0, 100)}`);
      }

      for (const check of checkResults) {
        const icon = check.pass ? '  ✓' : '  ✗';
        console.log(`${icon} ${check.label}: ${check.detail}`);
      }
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const errorResult: TestResult = {
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : String(err),
      };
      results.set(scenario.id, {
        scenario,
        result: errorResult,
        checks: [{ pass: false, label: 'Execution', detail: `Exception: ${errorResult.error}` }],
        overallPass: false,
        durationMs,
      });
      console.log(`\n  ✗ EXCEPTION: ${errorResult.error}`);
    }
  }

  // Run cross-scenario comparisons
  console.log(`\n${'═'.repeat(66)}`);
  console.log('CROSS-SCENARIO COMPARISONS');
  console.log('═'.repeat(66));

  const comparisonResults: { name: string; category: string; result: CheckResult }[] = [];

  for (const comp of comparisons) {
    const base = results.get(comp.baseScenarioId);
    const compare = results.get(comp.compareScenarioId);
    if (!base || !compare) {
      console.log(`\n  ⚠ ${comp.name}: Missing scenario data`);
      continue;
    }
    const checkResult = comp.check(base, compare);
    comparisonResults.push({ name: comp.name, category: comp.category, result: checkResult });
    const icon = checkResult.pass ? '✓' : '⚠';
    console.log(`\n  ${icon} ${comp.name}`);
    console.log(`    ${checkResult.detail}`);
  }

  // ── SCORECARD ──────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(66)}`);
  console.log('                       SCORECARD');
  console.log('═'.repeat(66));

  // Group by category
  const categories = new Map<string, ScenarioResult[]>();
  for (const sr of results.values()) {
    const cat = sr.scenario.category;
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(sr);
  }

  let totalPass = 0;
  let totalFail = 0;
  let totalScenarios = 0;

  console.log('\n┌──────┬──────────────────────────────────────────────────┬────────┬──────┐');
  console.log('│  ID  │ Scenario                                         │ Result │  ms  │');
  console.log('├──────┼──────────────────────────────────────────────────┼────────┼──────┤');

  for (const [category, scenarioResults] of categories) {
    console.log(`│      │ ◆ ${category.padEnd(48)}│        │      │`);
    for (const sr of scenarioResults) {
      totalScenarios++;
      if (sr.overallPass) totalPass++; else totalFail++;
      const icon = sr.overallPass ? ' PASS ' : ' FAIL ';
      const name = sr.scenario.name.length > 48
        ? sr.scenario.name.slice(0, 45) + '...'
        : sr.scenario.name.padEnd(48);
      const ms = String(sr.durationMs).padStart(4);
      console.log(`│ ${sr.scenario.id.padEnd(4)} │ ${name} │${icon}│ ${ms} │`);
    }
  }

  console.log('├──────┼──────────────────────────────────────────────────┼────────┼──────┤');

  // Cross-validations
  console.log(`│      │ ◆ ${'CROSS-VALIDATION'.padEnd(48)}│        │      │`);
  for (const comp of comparisonResults) {
    const icon = comp.result.pass ? ' PASS ' : ' INFO ';
    const name = comp.name.length > 48 ? comp.name.slice(0, 45) + '...' : comp.name.padEnd(48);
    console.log(`│  --  │ ${name} │${icon}│   -- │`);
  }

  console.log('└──────┴──────────────────────────────────────────────────┴────────┴──────┘');

  // Summary
  const passRate = ((totalPass / totalScenarios) * 100).toFixed(0);
  console.log(`\n  TOTAL: ${totalScenarios} scenarios | ${totalPass} PASS | ${totalFail} FAIL | ${passRate}% pass rate`);

  // Category scores
  console.log('\n  Category Breakdown:');
  for (const [category, scenarioResults] of categories) {
    const catPass = scenarioResults.filter((sr) => sr.overallPass).length;
    const catTotal = scenarioResults.length;
    const catRate = ((catPass / catTotal) * 100).toFixed(0);
    const catIcon = catPass === catTotal ? '✓' : '✗';
    console.log(`    ${catIcon} ${category}: ${catPass}/${catTotal} (${catRate}%)`);
  }

  console.log('\n  Cross-Validation Insights:');
  for (const comp of comparisonResults) {
    const icon = comp.result.pass ? '✓' : '⚠';
    console.log(`    ${icon} ${comp.name}: ${comp.result.detail.slice(0, 80)}`);
  }

  // Overall assessment
  console.log('\n' + '═'.repeat(66));
  if (totalFail === 0) {
    console.log('  OVERALL: ALL SCENARIOS PASSED');
    console.log('  The calculation engine is robust for end-to-end formula testing.');
  } else {
    console.log(`  OVERALL: ${totalFail} SCENARIO(S) FAILED`);
    console.log('  Review failed scenarios above for details.');
  }
  console.log('═'.repeat(66));
  console.log('');

  process.exit(totalFail > 0 ? 1 : 0);
}

/* ── Entry Point ───────────────────────────────────────────────── */

runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(2);
});
