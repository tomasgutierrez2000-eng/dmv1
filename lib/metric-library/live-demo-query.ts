/**
 * Live Demo Data Query — pulls real facility-level data from PostgreSQL
 * to auto-populate demo_data for newly deployed metrics.
 *
 * Direct DB query approach for demo data generation:
 * 1. Queries source tables referenced by the metric's ingredient_fields
 * 2. Joins facility_master + counterparty + hierarchy for context
 * 3. Selects a diverse sample of facilities (spread across counterparties)
 * 4. Returns DemoData in the format the UI expects
 */

import type { DemoData, DemoFacility, CatalogueItem } from './types';
import { getCatalogueItem, upsertCatalogueItem } from './store';

const SAMPLE_SIZE = 5;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Query the live database and populate demo_data for a catalogue item.
 * Returns the DemoData if successful, or null if DB is unavailable.
 */
export async function generateLiveDemoData(
  itemId: string,
): Promise<DemoData | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const item = getCatalogueItem(itemId);
  if (!item) return null;

  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const facilities = await queryDemoFacilities(client, item);
      if (!facilities.length) return null;
      return { facilities };
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error(`[live-demo-query] Failed for ${itemId}:`, err);
    return null;
  }
}

/**
 * Generate demo data and persist it directly to the catalogue item.
 * Returns true if successful.
 */
export async function generateAndPersistDemoData(
  itemId: string,
): Promise<boolean> {
  const demoData = await generateLiveDemoData(itemId);
  if (!demoData) return false;

  const item = getCatalogueItem(itemId);
  if (!item) return false;

  item.demo_data = demoData;
  await upsertCatalogueItem(item);
  return true;
}

// ---------------------------------------------------------------------------
// Core query — joins facility + counterparty + hierarchy + ingredient fields
// ---------------------------------------------------------------------------

interface PgClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

async function queryDemoFacilities(
  client: PgClient,
  item: CatalogueItem,
): Promise<DemoFacility[]> {
  // Build the list of extra fields to pull from ingredient_fields
  const ingredientSelects: string[] = [];
  const ingredientJoins: string[] = [];
  const joinedTables = new Set<string>();

  for (const ing of item.ingredient_fields ?? []) {
    const layer = ing.layer?.toLowerCase() || 'l2';
    const table = ing.table;
    const field = ing.field;
    if (!table || !field) continue;

    // Skip the base tables we already join
    if (table === 'facility_master' || table === 'counterparty') continue;

    const alias = `${table}_t`;
    if (!joinedTables.has(table)) {
      joinedTables.add(table);
      // Left join on facility_id (most L2 tables) or counterparty_id
      const joinCol = await detectJoinColumn(client, layer, table);
      if (joinCol) {
        ingredientJoins.push(
          `LEFT JOIN ${layer}.${table} ${alias} ON ${alias}.${joinCol} = fm.${joinCol}`
        );
      }
    }
    ingredientSelects.push(`${alias}.${field} AS ${field}`);
  }

  const extraSelectClause = ingredientSelects.length
    ? ', ' + ingredientSelects.join(', ')
    : '';
  const extraJoinClause = ingredientJoins.join('\n    ');

  // Main query: facility + counterparty + hierarchy + ingredient fields
  // Pick a diverse sample spread across different counterparties
  const sql = `
    WITH ranked AS (
      SELECT
        fm.facility_id,
        fm.facility_name,
        fm.counterparty_id,
        cp.legal_name AS counterparty_name,
        COALESCE(ebt.segment_name, 'Unknown') AS lob_name,
        COALESCE(ebt.desk_name, 'Unknown') AS desk_name,
        COALESCE(ebt.portfolio_name, 'Unknown') AS portfolio_name,
        COALESCE(ebt.segment_id::text, '') AS lob_segment_id,
        COALESCE(fes.committed_amount, 0) AS committed_amt,
        COALESCE(cs.market_value_amt, 0) AS collateral_value,
        CASE
          WHEN COALESCE(cs.market_value_amt, 0) > 0 AND COALESCE(fes.outstanding_balance_amt, 0) > 0
          THEN ROUND((fes.outstanding_balance_amt / cs.market_value_amt * 100)::numeric, 2)
          ELSE 0
        END AS ltv_pct
        ${extraSelectClause}
        , ROW_NUMBER() OVER (
            PARTITION BY fm.counterparty_id
            ORDER BY COALESCE(fes.committed_amount, 0) DESC
          ) AS rn
      FROM l2.facility_master fm
      JOIN l2.counterparty cp ON cp.counterparty_id = fm.counterparty_id
      LEFT JOIN l2.facility_exposure_snapshot fes
        ON fes.facility_id = fm.facility_id
        AND fes.as_of_date = (
          SELECT MAX(as_of_date) FROM l2.facility_exposure_snapshot
        )
      LEFT JOIN l1.enterprise_business_taxonomy ebt
        ON ebt.segment_id = fm.business_segment_id
      LEFT JOIN (
        SELECT facility_id, SUM(market_value_amt) AS market_value_amt
        FROM l2.collateral_snapshot
        WHERE as_of_date = (SELECT MAX(as_of_date) FROM l2.collateral_snapshot)
        GROUP BY facility_id
      ) cs ON cs.facility_id = fm.facility_id
      ${extraJoinClause}
    )
    SELECT *
    FROM ranked
    WHERE rn = 1
    ORDER BY committed_amt DESC
    LIMIT $1
  `;

  try {
    const res = await client.query(sql, [SAMPLE_SIZE]);
    return res.rows.map((row) => rowToDemoFacility(row, item));
  } catch (err) {
    // If the complex query fails (missing tables/columns), fall back to simple query
    console.warn('[live-demo-query] Complex query failed, trying simple fallback:', err);
    return simpleFallback(client);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect whether a table joins on facility_id or counterparty_id. */
async function detectJoinColumn(
  client: PgClient,
  layer: string,
  table: string,
): Promise<string | null> {
  try {
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
         AND column_name IN ('facility_id', 'counterparty_id')
       ORDER BY CASE column_name WHEN 'facility_id' THEN 1 ELSE 2 END
       LIMIT 1`,
      [layer, table],
    );
    return res.rows[0]?.column_name as string | null;
  } catch {
    return null;
  }
}

/** Convert a raw DB row to DemoFacility format. */
function rowToDemoFacility(
  row: Record<string, unknown>,
  item: CatalogueItem,
): DemoFacility {
  // Collect ingredient fields as extra_fields
  const knownKeys = new Set([
    'facility_id', 'facility_name', 'counterparty_id', 'counterparty_name',
    'lob_name', 'desk_name', 'portfolio_name', 'lob_segment_id',
    'committed_amt', 'collateral_value', 'ltv_pct', 'rn',
  ]);

  const extraFields: Record<string, number | string> = {};
  for (const [key, val] of Object.entries(row)) {
    if (knownKeys.has(key)) continue;
    if (val == null) continue;
    extraFields[key] = typeof val === 'number' ? val : String(val);
  }

  return {
    facility_id: `F-${row.facility_id}`,
    facility_name: String(row.facility_name ?? 'Unknown'),
    counterparty_id: `CP-${row.counterparty_id}`,
    counterparty_name: String(row.counterparty_name ?? 'Unknown'),
    lob_segment_id: String(row.lob_segment_id ?? ''),
    desk_name: String(row.desk_name ?? 'Unknown'),
    portfolio_name: String(row.portfolio_name ?? 'Unknown'),
    lob_name: String(row.lob_name ?? 'Unknown'),
    committed_amt: Number(row.committed_amt) || 0,
    collateral_value: Number(row.collateral_value) || 0,
    ltv_pct: Number(row.ltv_pct) || 0,
    positions: [],
    extra_fields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
  };
}

/** Simple fallback if complex query fails — just grab facilities + counterparties. */
async function simpleFallback(client: PgClient): Promise<DemoFacility[]> {
  const sql = `
    SELECT
      fm.facility_id,
      fm.facility_name,
      fm.counterparty_id,
      cp.legal_name AS counterparty_name
    FROM l2.facility_master fm
    JOIN l2.counterparty cp ON cp.counterparty_id = fm.counterparty_id
    ORDER BY fm.facility_id
    LIMIT $1
  `;
  const res = await client.query(sql, [SAMPLE_SIZE]);
  return res.rows.map((row) => ({
    facility_id: `F-${row.facility_id}`,
    facility_name: String(row.facility_name ?? 'Unknown'),
    counterparty_id: `CP-${row.counterparty_id}`,
    counterparty_name: String(row.counterparty_name ?? 'Unknown'),
    lob_segment_id: '',
    desk_name: 'Unknown',
    portfolio_name: 'Unknown',
    lob_name: 'Unknown',
    committed_amt: 0,
    collateral_value: 0,
    ltv_pct: 0,
    positions: [],
  }));
}
