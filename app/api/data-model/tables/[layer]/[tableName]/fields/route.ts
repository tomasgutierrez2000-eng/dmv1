import { NextRequest } from 'next/server';
import {
  readDataDictionary,
  writeDataDictionary,
  findTable,
  type DataDictionary,
  type DataDictionaryField,
  type DataDictionaryRelationship,
} from '@/lib/data-dictionary';
import { postMutationSync } from '@/lib/data-model-sync';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

type Layer = 'L1' | 'L2' | 'L3';

function isValidLayer(layer: string): layer is Layer {
  return layer === 'L1' || layer === 'L2' || layer === 'L3';
}

/** Request body for adding a field. */
interface AddFieldBody {
  name: string;
  data_type?: string;
  description?: string;
  pk_fk?: {
    is_pk: boolean;
    is_composite?: boolean;
    fk_target?: { layer: string; table: string; field: string };
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ layer: string; tableName: string }> }
) {
  try {
    const { layer, tableName: rawTableName } = await context.params;
    const tableName = decodeURIComponent(rawTableName || '');
    if (!isValidLayer(layer)) {
      return jsonError('Invalid layer. Use L1, L2, or L3.', { status: 400 });
    }

    const body = (await request.json()) as AddFieldBody;
    const { name, data_type, description, pk_fk } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return jsonError('Field name is required.', { status: 400 });
    }

    const fieldName = name.trim().replace(/\s+/g, '_');
    const dd = readDataDictionary();
    if (!dd) {
      return jsonError('Data dictionary not found. Load or create a model first.', { status: 404 });
    }

    const table = findTable(dd, layer, tableName);
    if (!table) {
      return jsonError(`Table "${tableName}" not found in ${layer}.`, { status: 404 });
    }

    if (table.fields.some((f) => f.name === fieldName)) {
      return jsonError(`Field "${fieldName}" already exists in table "${tableName}".`, { status: 409 });
    }

    const newField: DataDictionaryField = {
      name: fieldName,
      description: description ?? '',
      data_type: data_type?.trim(),
      pk_fk,
    };

    const updatedTables = dd[layer].map((t) =>
      t.name === tableName
        ? { ...t, fields: [...t.fields, newField] }
        : t
    );
    const relationships: DataDictionaryRelationship[] = [...dd.relationships];
    if (newField.pk_fk?.fk_target) {
      const target = newField.pk_fk.fk_target;
      relationships.push({
        from_table: tableName,
        from_field: fieldName,
        to_table: target.table,
        to_field: target.field,
        from_layer: layer,
        to_layer: target.layer,
      });
    }

    const updated: DataDictionary = {
      ...dd,
      [layer]: updatedTables,
      relationships,
    };
    writeDataDictionary(updated);

    // Sync: DDL files → PostgreSQL → introspect round-trip
    const syncResult = await postMutationSync(updated, { kind: 'add-field', layer, tableName, fieldName });

    return jsonSuccess({
      success: true,
      message: `Field "${fieldName}" added to ${layer}.${tableName}.`,
      fieldName,
      sync: { ddlFiles: syncResult.ddlFilesWritten.length, dbApplied: syncResult.dbApplied, ...(syncResult.dbError && { dbError: syncResult.dbError }) },
    });
  } catch (error) {
    console.error('Add field error:', error);
    const normalized = normalizeCaughtError(error);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
