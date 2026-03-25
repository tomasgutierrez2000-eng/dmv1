/**
 * GET /api/metrics/studio/schema
 *
 * Returns data dictionary tables, fields, and FK relationships
 * for client-side use in the Metric Studio canvas.
 *
 * This is the server-side proxy that avoids importing fs-based
 * readDataDictionary() in browser code.
 */

import { NextResponse } from 'next/server';
import { readDataDictionary, type DataDictionaryTable } from '@/lib/data-dictionary';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import type { StudioSchemaResponse, FKEdge } from '@/lib/metric-studio/types';

export async function GET(): Promise<NextResponse> {
  const dd = readDataDictionary();
  if (!dd) {
    return jsonError('Data dictionary not available', { status: 503, code: 'DD_NOT_FOUND' });
  }

  const mapTable = (t: DataDictionaryTable) => ({
    name: t.name,
    layer: t.layer.toLowerCase() as 'l1' | 'l2' | 'l3',
    category: t.category,
    fields: t.fields.map(f => ({
      name: f.name,
      dataType: f.data_type,
      description: f.description,
      isPk: f.pk_fk?.is_pk ?? false,
      fkTarget: f.pk_fk?.fk_target ? {
        layer: f.pk_fk.fk_target.layer.toLowerCase(),
        table: f.pk_fk.fk_target.table,
        field: f.pk_fk.fk_target.field,
      } : undefined,
    })),
  });

  // L3 tables are lazy-loaded: include name + category but no fields (fetched on-demand)
  const mapL3Table = (t: DataDictionaryTable) => ({
    name: t.name,
    layer: 'l3' as const,
    category: t.category,
    fields: [] as ReturnType<typeof mapTable>['fields'],
  });

  const tables = [
    ...dd.L1.map(mapTable),
    ...dd.L2.map(mapTable),
    ...dd.L3.map(mapL3Table),
  ];

  // Convert DD relationships to FKEdge format (bare table names)
  const relationships: FKEdge[] = (dd.relationships || [])
    .filter(r => r.from_table !== r.to_table) // Filter self-refs
    .map(r => ({
      fromTable: r.from_table,
      fromColumn: r.from_field,
      fromLayer: r.from_layer.toLowerCase(),
      toTable: r.to_table,
      toColumn: r.to_field,
      toLayer: r.to_layer.toLowerCase(),
    }));

  const response: StudioSchemaResponse = { tables, relationships };
  return jsonSuccess(response);
}
