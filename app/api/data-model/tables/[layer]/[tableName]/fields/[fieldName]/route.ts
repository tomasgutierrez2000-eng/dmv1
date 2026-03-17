import { NextRequest } from 'next/server';
import {
  readDataDictionary,
  writeDataDictionary,
  findTable,
  type DataDictionary,
  type DataDictionaryField,
} from '@/lib/data-dictionary';
import { postMutationSync } from '@/lib/data-model-sync';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { logSchemaChange, extractSchemaUser } from '@/lib/governance/schema-change-logger';

type Layer = 'L1' | 'L2' | 'L3';

function isValidLayer(layer: string): layer is Layer {
  return layer === 'L1' || layer === 'L2' || layer === 'L3';
}

function decodeFieldName(encoded: string): string {
  return decodeURIComponent(encoded.replace(/\+/g, ' '));
}

/** PATCH: update field (name, data_type, pk_fk). Updates data dictionary and regenerates DDL. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ layer: string; tableName: string; fieldName: string }> }
) {
  try {
    const { layer, tableName: rawTableName, fieldName: encodedFieldName } = await context.params;
    const tableName = decodeURIComponent(rawTableName || '');
    const fieldName = decodeFieldName(encodedFieldName || '');

    if (!isValidLayer(layer)) {
      return jsonError('Invalid layer. Use L1, L2, or L3.', { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      data_type?: string;
      pk_fk?: { is_pk: boolean; fk_target?: { layer: string; table: string; field: string } };
    };

    const dd = readDataDictionary();
    if (!dd) {
      return jsonError('Data dictionary not found. Load or create a model first.', { status: 404 });
    }

    const table = findTable(dd, layer, tableName);
    if (!table) {
      return jsonError(`Table "${tableName}" not found in ${layer}.`, { status: 404 });
    }

    const fieldIndex = table.fields.findIndex((f) => f.name === fieldName);
    if (fieldIndex === -1) {
      return jsonError(`Field "${fieldName}" not found in table "${tableName}".`, { status: 404 });
    }

    const newName = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, '_') : fieldName;
    if (!newName) {
      return jsonError('Field name cannot be empty.', { status: 400 });
    }
    if (newName !== fieldName && table.fields.some((f) => f.name === newName)) {
      return jsonError(`Field "${newName}" already exists in table "${tableName}".`, { status: 409 });
    }

    const existing = table.fields[fieldIndex];
    const updatedField: DataDictionaryField = {
      ...existing,
      name: newName,
      data_type: body.data_type !== undefined ? (body.data_type === '' ? undefined : body.data_type) : existing.data_type,
      pk_fk: body.pk_fk !== undefined ? body.pk_fk : existing.pk_fk,
    };

    const updatedFields = table.fields.map((f, i) => (i === fieldIndex ? updatedField : f));
    const updatedTables = dd[layer].map((t) =>
      t.name === tableName ? { ...t, fields: updatedFields } : t
    );

    let updatedRelationships = dd.relationships;
    if (newName !== fieldName) {
      updatedRelationships = dd.relationships.map((r) => {
        if (r.from_layer === layer && r.from_table === tableName && r.from_field === fieldName) {
          return { ...r, from_field: newName };
        }
        return r;
      });
    }

    const updated: DataDictionary = {
      ...dd,
      [layer]: updatedTables,
      relationships: updatedRelationships,
    };
    writeDataDictionary(updated);

    // Audit: log schema change
    const user = extractSchemaUser(request);
    logSchemaChange({
      change_type: 'UPDATE_FIELD',
      layer,
      table_name: tableName,
      field_name: newName,
      changed_by_id: user.id,
      changed_by_name: user.name,
      before_snapshot: existing,
      after_snapshot: updatedField,
    }).catch(() => {}); // fire-and-forget

    // Sync: DDL files → PostgreSQL → introspect round-trip
    const syncResult = await postMutationSync(updated, {
      kind: 'update-field',
      layer,
      tableName,
      fieldName: newName,
      ...(newName !== fieldName ? { oldFieldName: fieldName } : {}),
    });

    return jsonSuccess({
      success: true,
      message: `Field "${fieldName}" updated.`,
      fieldName: newName,
      sync: { ddlFiles: syncResult.ddlFilesWritten.length, dbApplied: syncResult.dbApplied, ...(syncResult.dbError && { dbError: syncResult.dbError }) },
    });
  } catch (error) {
    console.error('Update field error:', error);
    const normalized = normalizeCaughtError(error);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ layer: string; tableName: string; fieldName: string }> }
) {
  try {
    const { layer, tableName: rawTableName, fieldName: encodedFieldName } = await context.params;
    const tableName = decodeURIComponent(rawTableName || '');
    const fieldName = decodeFieldName(encodedFieldName || '');

    if (!isValidLayer(layer)) {
      return jsonError('Invalid layer. Use L1, L2, or L3.', { status: 400 });
    }

    const dd = readDataDictionary();
    if (!dd) {
      return jsonError('Data dictionary not found. Load or create a model first.', { status: 404 });
    }

    const table = findTable(dd, layer, tableName);
    if (!table) {
      return jsonError(`Table "${tableName}" not found in ${layer}.`, { status: 404 });
    }

    if (!table.fields.some((f) => f.name === fieldName)) {
      return jsonError(`Field "${fieldName}" not found in table "${tableName}".`, { status: 404 });
    }

    const updatedTables = dd[layer].map((t) =>
      t.name === tableName
        ? { ...t, fields: t.fields.filter((f) => f.name !== fieldName) }
        : t
    );
    const updatedRelationships = dd.relationships.filter(
      (r) =>
        !(r.from_layer === layer && r.from_table === tableName && r.from_field === fieldName)
    );

    const updated: DataDictionary = {
      ...dd,
      [layer]: updatedTables,
      relationships: updatedRelationships,
    };
    writeDataDictionary(updated);

    // Audit: log schema change
    const user = extractSchemaUser(request);
    const deletedField = table.fields.find((f) => f.name === fieldName);
    logSchemaChange({
      change_type: 'DELETE_FIELD',
      layer,
      table_name: tableName,
      field_name: fieldName,
      changed_by_id: user.id,
      changed_by_name: user.name,
      before_snapshot: deletedField,
    }).catch(() => {}); // fire-and-forget

    // Sync: DDL files → PostgreSQL → introspect round-trip
    const syncResult = await postMutationSync(updated, { kind: 'delete-field', layer, tableName, fieldName });

    return jsonSuccess({
      success: true,
      message: `Field "${fieldName}" removed from ${layer}.${tableName}.`,
      sync: { ddlFiles: syncResult.ddlFilesWritten.length, dbApplied: syncResult.dbApplied, ...(syncResult.dbError && { dbError: syncResult.dbError }) },
    });
  } catch (error) {
    console.error('Remove field error:', error);
    const normalized = normalizeCaughtError(error);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
