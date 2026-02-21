import { NextRequest, NextResponse } from 'next/server';
import {
  readDataDictionary,
  writeDataDictionary,
  findTable,
  layerToSchema,
  type DataDictionary,
} from '@/lib/data-dictionary';
import { generateL3Ddl, generateLayerDdl } from '@/lib/ddl-generator';
import path from 'path';
import fs from 'fs';

type Layer = 'L1' | 'L2' | 'L3';

function isValidLayer(layer: string): layer is Layer {
  return layer === 'L1' || layer === 'L2' || layer === 'L3';
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ layer: string; tableName: string }> }
) {
  try {
    const { layer, tableName: rawTableName } = await context.params;
    const tableName = decodeURIComponent(rawTableName || '');
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

    const updatedTables = dd[layer].filter((t) => t.name !== tableName);
    const updatedRelationships = dd.relationships.filter(
      (r) =>
        !(r.from_layer === layer && r.from_table === tableName) &&
        !(r.to_layer === layer && r.to_table === tableName)
    );
    const updatedDerivationDag = { ...dd.derivation_dag };
    delete updatedDerivationDag[tableName];
    for (const key of Object.keys(updatedDerivationDag)) {
      updatedDerivationDag[key] = updatedDerivationDag[key].filter(
        (dep) => dep !== `${layer}.${tableName}`
      );
    }

    const updated: DataDictionary = {
      ...dd,
      [layer]: updatedTables,
      relationships: updatedRelationships,
      derivation_dag: updatedDerivationDag,
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
      message: `Table "${tableName}" removed from ${layer}.`,
    });
  } catch (error) {
    console.error('Remove table error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove table.' },
      { status: 500 }
    );
  }
}
