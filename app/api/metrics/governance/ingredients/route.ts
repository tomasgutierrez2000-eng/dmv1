import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getCatalogueItem } from '@/lib/metric-library/store';
import { executeSandboxQuery } from '@/lib/governance/sandbox-runner';

function tableAlias(table: string): string {
  return table
    .split('_')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toLowerCase() || table.slice(0, 2);
}

function inferJoinRelationships(
  tables: Array<{ key: string; layer: string; table: string; fields: Array<{ field: string }> }>,
): Array<{ from: string; to: string; join_type: string }> {
  const seen = new Set<string>();
  const joins: Array<{ from: string; to: string; join_type: string }> = [];
  const tableFields = new Map<string, Set<string>>();
  for (const t of tables) {
    const fields = new Set(t.fields.map((f) => f.field));
    tableFields.set(t.table, fields);
  }

  for (const t1 of tables) {
    for (const t2 of tables) {
      if (t1.key === t2.key) continue;
      const f1 = tableFields.get(t1.table);
      const f2 = tableFields.get(t2.table);
      if (!f1 || !f2) continue;
      for (const field of f1) {
        if (!field.endsWith('_id')) continue;
        if (f2.has(field)) {
          const a1 = tableAlias(t1.table);
          const a2 = tableAlias(t2.table);
          const key = [a1, field, a2].join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          joins.push({
            from: `${a1}.${field}`,
            to: `${a2}.${field}`,
            join_type: 'INNER',
          });
        }
      }
    }
  }
  return joins;
}

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

    // Infer join relationships from shared _id fields across tables
    const joinRelationships = inferJoinRelationships(tables);

    return jsonSuccess({
      item_id: itemId,
      item_name: item.item_name,
      tables,
      join_relationships: joinRelationships,
      db_connected: !!process.env.DATABASE_URL,
    });
  });
}
