import { NextRequest, NextResponse } from 'next/server';
import {
  readDataDictionary,
  writeDataDictionary,
  findTable,
  type DataDictionary,
} from '@/lib/data-dictionary';
import { postMutationSync } from '@/lib/data-model-sync';

type Layer = 'L1' | 'L2' | 'L3';

function isValidLayer(layer: string): layer is Layer {
  return layer === 'L1' || layer === 'L2' || layer === 'L3';
}

/** PATCH: update table (category). Updates data dictionary and regenerates DDL. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ layer: string; tableName: string }> }
) {
  try {
    const { layer, tableName: rawTableName } = await context.params;
    const tableName = decodeURIComponent(rawTableName || '');
    if (!isValidLayer(layer)) {
      return NextResponse.json({ error: 'Invalid layer. Use L1, L2, or L3.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({})) as { category?: string };
    const category = typeof body.category === 'string' ? body.category.trim() : undefined;
    if (category === undefined) {
      return NextResponse.json(
        { error: 'Body must include "category" to update.' },
        { status: 400 }
      );
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

    const updatedTables = dd[layer].map((t) =>
      t.name === tableName ? { ...t, category: category || t.category } : t
    );
    const updated: DataDictionary = {
      ...dd,
      [layer]: updatedTables,
    };
    writeDataDictionary(updated);

    // Sync: DDL files → PostgreSQL → introspect round-trip
    const syncResult = await postMutationSync(updated, { kind: 'update-table', layer, tableName });

    return NextResponse.json({
      success: true,
      message: `Table "${tableName}" updated.`,
      sync: { ddlFiles: syncResult.ddlFilesWritten.length, dbApplied: syncResult.dbApplied },
    });
  } catch (error) {
    console.error('Update table error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update table.' },
      { status: 500 }
    );
  }
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

    // Sync: DDL files → PostgreSQL → introspect round-trip
    const syncResult = await postMutationSync(updated, { kind: 'delete-table', layer, tableName });

    return NextResponse.json({
      success: true,
      message: `Table "${tableName}" removed from ${layer}.`,
      sync: { ddlFiles: syncResult.ddlFilesWritten.length, dbApplied: syncResult.dbApplied, ...(syncResult.dbError && { dbError: syncResult.dbError }) },
    });
  } catch (error) {
    console.error('Remove table error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove table.' },
      { status: 500 }
    );
  }
}
