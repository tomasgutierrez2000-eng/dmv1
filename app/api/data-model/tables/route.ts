import { NextRequest } from 'next/server';
import {
  readDataDictionary,
  writeDataDictionary,
  ensureEmptyDataDictionary,
  findTable,
  type DataDictionary,
  type DataDictionaryTable,
  type DataDictionaryField,
  type DataDictionaryRelationship,
} from '@/lib/data-dictionary';
import { postMutationSync } from '@/lib/data-model-sync';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { logSchemaChange, extractSchemaUser } from '@/lib/governance/schema-change-logger';

/** Request body for adding a table. */
interface AddTableBody {
  layer: 'L1' | 'L2' | 'L3';
  name: string;
  category: string;
  fields: Array<{
    name: string;
    data_type?: string;
    description?: string;
    pk_fk?: {
      is_pk: boolean;
      is_composite?: boolean;
      fk_target?: { layer: string; table: string; field: string };
    };
  }>;
}

function normalizeTableName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AddTableBody;
    const { layer, name, category, fields } = body;

    if (!layer || !name || !Array.isArray(fields) || fields.length === 0) {
      return jsonError('Missing required fields: layer, name, and at least one field.', { status: 400 });
    }

    const tableName = normalizeTableName(name);
    if (!tableName) {
      return jsonError('Table name cannot be empty.', { status: 400 });
    }

    const normalizedFieldNames = fields
      .map((f) => (f.name && typeof f.name === 'string' ? f.name.trim().replace(/\s+/g, '_') : ''))
      .filter(Boolean);
    if (normalizedFieldNames.length === 0) {
      return jsonError('At least one field with a non-empty name is required.', { status: 400 });
    }
    const uniqueNames = new Set(normalizedFieldNames);
    if (uniqueNames.size !== normalizedFieldNames.length) {
      return jsonError('Duplicate field names are not allowed within a table.', { status: 400 });
    }

    let dd = readDataDictionary();
    if (!dd) dd = ensureEmptyDataDictionary();

    if (findTable(dd, layer, tableName)) {
      return jsonError(`Table "${tableName}" already exists in ${layer}.`, { status: 409 });
    }

    const ddFields: DataDictionaryField[] = fields
      .filter((f) => f.name && typeof f.name === 'string' && f.name.trim())
      .map((f) => ({
        name: f.name.trim().replace(/\s+/g, '_'),
        description: f.description ?? '',
        data_type: f.data_type?.trim(),
        pk_fk: f.pk_fk,
      }));

    const newTable: DataDictionaryTable = {
      name: tableName,
      layer,
      category: (category || 'Uncategorized').trim(),
      fields: ddFields,
    };

    const relationships: DataDictionaryRelationship[] = [...dd.relationships];
    for (const f of ddFields) {
      const target = f.pk_fk?.fk_target;
      if (target) {
        relationships.push({
          from_table: tableName,
          from_field: f.name,
          to_table: target.table,
          to_field: target.field,
          from_layer: layer,
          to_layer: target.layer,
        });
      }
    }

    const updated: DataDictionary = {
      ...dd,
      [layer]: [...dd[layer], newTable],
      relationships,
    };
    writeDataDictionary(updated);

    // Audit: log schema change
    const user = extractSchemaUser(request);
    logSchemaChange({
      change_type: 'ADD_TABLE',
      layer,
      table_name: tableName,
      changed_by_id: user.id,
      changed_by_name: user.name,
      after_snapshot: newTable,
    }).catch(() => {}); // fire-and-forget

    // Sync: DDL files → PostgreSQL → introspect round-trip
    const syncResult = await postMutationSync(updated, { kind: 'add-table', layer, tableName });

    return jsonSuccess({
      success: true,
      message: `Table "${tableName}" added to ${layer}.`,
      tableKey: `${layer}.${tableName}`,
      sync: { ddlFiles: syncResult.ddlFilesWritten.length, dbApplied: syncResult.dbApplied, ...(syncResult.dbError && { dbError: syncResult.dbError }) },
    });
  } catch (error) {
    console.error('Add table error:', error);
    const normalized = normalizeCaughtError(error);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
