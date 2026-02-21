import { NextRequest, NextResponse } from 'next/server';
import {
  readDataDictionary,
  writeDataDictionary,
  findTable,
  layerToSchema,
  type DataDictionary,
  type DataDictionaryField,
} from '@/lib/data-dictionary';
import { generateL3Ddl, generateLayerDdl } from '@/lib/ddl-generator';
import path from 'path';
import fs from 'fs';

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
      return NextResponse.json({ error: 'Invalid layer. Use L1, L2, or L3.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      data_type?: string;
      pk_fk?: { is_pk: boolean; fk_target?: { layer: string; table: string; field: string } };
    };

    const dd = readDataDictionary();
    if (!dd) {
      return NextResponse.json(
        { error: 'Data dictionary not found. Load or create a model first.' },
        { status: 404 }
      );
    }

    const table = findTable(dd, layer, tableName);
    if (!table) {
      return NextResponse.json(
        { error: `Table "${tableName}" not found in ${layer}.` },
        { status: 404 }
      );
    }

    const fieldIndex = table.fields.findIndex((f) => f.name === fieldName);
    if (fieldIndex === -1) {
      return NextResponse.json(
        { error: `Field "${fieldName}" not found in table "${tableName}".` },
        { status: 404 }
      );
    }

    const newName = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, '_') : fieldName;
    if (!newName) {
      return NextResponse.json(
        { error: 'Field name cannot be empty.' },
        { status: 400 }
      );
    }
    if (newName !== fieldName && table.fields.some((f) => f.name === newName)) {
      return NextResponse.json(
        { error: `Field "${newName}" already exists in table "${tableName}".` },
        { status: 409 }
      );
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

    const sqlDir = path.join(process.cwd(), 'sql', layerToSchema(layer));
    const ddlPath = path.join(sqlDir, '01_DDL_all_tables.sql');
    if (fs.existsSync(sqlDir)) {
      const ddlContent =
        layer === 'L3' ? generateL3Ddl(updated) : generateLayerDdl(updated, layer);
      fs.writeFileSync(ddlPath, ddlContent, 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: `Field "${fieldName}" updated.`,
      fieldName: newName,
    });
  } catch (error) {
    console.error('Update field error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update field.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ layer: string; tableName: string; fieldName: string }> }
) {
  try {
    const { layer, tableName: rawTableName, fieldName: encodedFieldName } = await context.params;
    const tableName = decodeURIComponent(rawTableName || '');
    const fieldName = decodeFieldName(encodedFieldName || '');

    if (!isValidLayer(layer)) {
      return NextResponse.json({ error: 'Invalid layer. Use L1, L2, or L3.' }, { status: 400 });
    }

    const dd = readDataDictionary();
    if (!dd) {
      return NextResponse.json(
        { error: 'Data dictionary not found. Load or create a model first.' },
        { status: 404 }
      );
    }

    const table = findTable(dd, layer, tableName);
    if (!table) {
      return NextResponse.json(
        { error: `Table "${tableName}" not found in ${layer}.` },
        { status: 404 }
      );
    }

    if (!table.fields.some((f) => f.name === fieldName)) {
      return NextResponse.json(
        { error: `Field "${fieldName}" not found in table "${tableName}".` },
        { status: 404 }
      );
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

    const sqlDir = path.join(process.cwd(), 'sql', layerToSchema(layer));
    const ddlPath = path.join(sqlDir, '01_DDL_all_tables.sql');
    if (fs.existsSync(sqlDir)) {
      const ddlContent =
        layer === 'L3' ? generateL3Ddl(updated) : generateLayerDdl(updated, layer);
      fs.writeFileSync(ddlPath, ddlContent, 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: `Field "${fieldName}" removed from ${layer}.${tableName}.`,
    });
  } catch (error) {
    console.error('Remove field error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove field.' },
      { status: 500 }
    );
  }
}
