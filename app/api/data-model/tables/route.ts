import { NextRequest, NextResponse } from 'next/server';
import {
  readDataDictionary,
  writeDataDictionary,
  ensureEmptyDataDictionary,
  findTable,
  type DataDictionary,
  type DataDictionaryTable,
  type DataDictionaryField,
  type DataDictionaryRelationship,
  layerToSchema,
} from '@/lib/data-dictionary';
import { generateL3Ddl, generateLayerDdl } from '@/lib/ddl-generator';
import path from 'path';
import fs from 'fs';

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
      return NextResponse.json(
        { error: 'Missing required fields: layer, name, and at least one field.' },
        { status: 400 }
      );
    }

    const tableName = normalizeTableName(name);
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name cannot be empty.' },
        { status: 400 }
      );
    }

    const normalizedFieldNames = fields
      .map((f) => (f.name && typeof f.name === 'string' ? f.name.trim().replace(/\s+/g, '_') : ''))
      .filter(Boolean);
    if (normalizedFieldNames.length === 0) {
      return NextResponse.json(
        { error: 'At least one field with a non-empty name is required.' },
        { status: 400 }
      );
    }
    const uniqueNames = new Set(normalizedFieldNames);
    if (uniqueNames.size !== normalizedFieldNames.length) {
      return NextResponse.json(
        { error: 'Duplicate field names are not allowed within a table.' },
        { status: 400 }
      );
    }

    let dd = readDataDictionary();
    if (!dd) dd = ensureEmptyDataDictionary();

    if (findTable(dd, layer, tableName)) {
      return NextResponse.json(
        { error: `Table "${tableName}" already exists in ${layer}.` },
        { status: 409 }
      );
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

    // Write DDL file for the layer so SQL stays in sync
    const sqlDir = path.join(process.cwd(), 'sql', layerToSchema(layer));
    if (!fs.existsSync(sqlDir)) {
      fs.mkdirSync(sqlDir, { recursive: true });
    }
    const ddlPath = path.join(sqlDir, '01_DDL_all_tables.sql');
    const ddlContent =
      layer === 'L3' ? generateL3Ddl(updated) : generateLayerDdl(updated, layer);
    fs.writeFileSync(ddlPath, ddlContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Table "${tableName}" added to ${layer}.`,
      tableKey: `${layer}.${tableName}`,
    });
  } catch (error) {
    console.error('Add table error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add table.' },
      { status: 500 }
    );
  }
}
