import { NextResponse } from 'next/server';
import { readDataDictionary } from '@/lib/data-dictionary';
import type { DataDictionary } from '@/lib/data-dictionary';
import type { DataModel, Relationship, Field } from '@/types/model';

function dataDictionaryToModel(dd: DataDictionary): DataModel {
  const tables: DataModel['tables'] = {};
  const categorySet = new Set<string>();
  const layers: string[] = [];

  for (const layer of ['L1', 'L2', 'L3'] as const) {
    const arr = dd[layer];
    if (arr.length > 0 && !layers.includes(layer)) layers.push(layer);
    for (const t of arr) {
      categorySet.add(t.category || 'Uncategorized');
      const tableKey = `${layer}.${t.name}`;
      const fkByField = new Map<string, { layer: string; table: string; field: string }>();
      for (const r of dd.relationships) {
        if (r.from_layer === layer && r.from_table === t.name) {
          fkByField.set(r.from_field, {
            layer: r.to_layer,
            table: r.to_table,
            field: r.to_field,
          });
        }
      }
      const fields: Field[] = t.fields.map((f) => ({
        name: f.name,
        description: f.description ?? '',
        isPK: !!f.pk_fk?.is_pk,
        isFK: !!f.pk_fk?.fk_target || fkByField.has(f.name),
        ...(f.pk_fk?.fk_target && { fkTarget: f.pk_fk.fk_target }),
        ...(f.data_type && { dataType: f.data_type }),
      }));
      tables[tableKey] = {
        key: tableKey,
        name: t.name,
        layer,
        category: t.category || 'Uncategorized',
        fields,
      };
    }
  }

  const relationships: Relationship[] = dd.relationships.map((r, i) => ({
    id: `rel-${r.from_layer}-${r.from_table}-${r.from_field}-${i}`,
    source: {
      layer: r.from_layer,
      table: r.from_table,
      field: r.from_field,
      tableKey: `${r.from_layer}.${r.from_table}`,
    },
    target: {
      layer: r.to_layer,
      table: r.to_table,
      field: r.to_field,
      tableKey: `${r.to_layer}.${r.to_table}`,
    },
    isCrossLayer: r.from_layer !== r.to_layer,
    relationshipType: 'primary',
  }));

  const categories = Array.from(categorySet).sort();

  return {
    tables,
    relationships,
    categories,
    layers: layers.length > 0 ? layers : ['L1', 'L2', 'L3'],
  };
}

/**
 * GET: Return the current data dictionary as a DataModel for the visualizer.
 * Ensures the visualizer can show the same tables/fields as the data model page
 * after add/edit/remove, and that all changes persist to SQL/DDL.
 */
export async function GET() {
  try {
    const dd = readDataDictionary();
    if (!dd) {
      return NextResponse.json(
        { error: 'Data dictionary not found. Load or create a model first (e.g. upload Excel or add tables in Data Model).' },
        { status: 404 }
      );
    }

    const model = dataDictionaryToModel(dd);
    return NextResponse.json(model);
  } catch (error) {
    console.error('Data model from dictionary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build model from data dictionary.' },
      { status: 500 }
    );
  }
}
