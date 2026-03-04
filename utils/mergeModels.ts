import type { DataModel, TableDef, Field } from '../types/model';

/**
 * Merge an overlay model on top of a base model.
 * - New tables from overlay are added directly.
 * - Overlapping tables: fields are merged (union by name, base first);
 *   overlay metadata (riskStripe) is applied.
 * - Categories are unioned (base order preserved, overlay-only appended).
 * - Relationships are concatenated.
 * - Layers are unioned.
 */
export function mergeModels(base: DataModel, overlay: DataModel): DataModel {
  const tables: Record<string, TableDef> = { ...base.tables };

  for (const [key, overlayTable] of Object.entries(overlay.tables)) {
    const baseTable = tables[key];
    if (!baseTable) {
      tables[key] = overlayTable;
      continue;
    }

    // Merge fields: keep base fields, append overlay-only fields
    const existingNames = new Set(baseTable.fields.map((f) => f.name));
    const newFields: Field[] = overlayTable.fields.filter((f) => !existingNames.has(f.name));

    tables[key] = {
      ...baseTable,
      fields: [...baseTable.fields, ...newFields],
      ...(overlayTable.riskStripe && { riskStripe: overlayTable.riskStripe }),
    };
  }

  const relationships = [...base.relationships, ...overlay.relationships];

  const categorySet = new Set(base.categories);
  const categories = [...base.categories];
  for (const cat of overlay.categories) {
    if (!categorySet.has(cat)) {
      categories.push(cat);
      categorySet.add(cat);
    }
  }

  const layerSet = new Set(base.layers);
  const layers = [...base.layers];
  for (const layer of overlay.layers) {
    if (!layerSet.has(layer)) {
      layers.push(layer);
    }
  }

  return { tables, relationships, categories, layers };
}
