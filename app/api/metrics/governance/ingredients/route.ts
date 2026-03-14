import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getCatalogueItem } from '@/lib/metric-library/store';
import { executeSandboxQuery } from '@/lib/governance/sandbox-runner';

/**
 * GET /api/metrics/governance/ingredients?item_id=MET-109
 *
 * Returns ingredient field metadata for a catalogue item,
 * enriched with live row counts from PostgreSQL.
 */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const url = new URL(req.url);
    const itemId = url.searchParams.get('item_id');

    if (!itemId) {
      return jsonError('item_id is required', { status: 400, code: 'VALIDATION_ERROR' });
    }

    const item = getCatalogueItem(itemId);
    if (!item) {
      return jsonError('Item not found', { status: 404, code: 'NOT_FOUND' });
    }

    // Group ingredient fields by table
    const tableMap = new Map<string, { layer: string; table: string; fields: typeof item.ingredient_fields }>();
    for (const field of item.ingredient_fields) {
      const key = `${field.layer.toLowerCase()}.${field.table}`;
      if (!tableMap.has(key)) {
        tableMap.set(key, { layer: field.layer, table: field.table, fields: [] });
      }
      tableMap.get(key)!.fields.push(field);
    }

    // Enrich with live row counts if DATABASE_URL is available
    const tables = [...tableMap.entries()].map(([key, info]) => ({
      key,
      layer: info.layer,
      table: info.table,
      fields: info.fields,
      row_count: -1 as number,
    }));

    if (process.env.DATABASE_URL) {
      await Promise.allSettled(
        tables.map(async (t) => {
          try {
            const schema = t.layer.toLowerCase();
            const result = await executeSandboxQuery(
              `SELECT COUNT(*) AS cnt FROM ${schema}.${t.table}`,
              {},
              { maxRows: 1, timeoutMs: 5000 },
            );
            t.row_count = Number(result.rows[0]?.cnt ?? 0);
          } catch {
            t.row_count = -1;
          }
        }),
      );
    }

    return jsonSuccess({
      item_id: itemId,
      item_name: item.item_name,
      tables,
      db_connected: !!process.env.DATABASE_URL,
    });
  });
}
