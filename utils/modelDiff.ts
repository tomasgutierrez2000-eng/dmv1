import type { DataModel } from '../types/model';

export interface ModelDiff {
  tablesAdded: string[];
  tablesRemoved: string[];
  tablesModified: string[];
  fieldsAdded: Array<{ tableKey: string; fieldName: string }>;
  fieldsRemoved: Array<{ tableKey: string; fieldName: string }>;
  fieldsModified: Array<{ tableKey: string; fieldName: string }>;
  relationshipsAdded: string[];
  relationshipsRemoved: string[];
  summary: {
    tablesAdded: number;
    tablesRemoved: number;
    tablesModified: number;
    fieldsAdded: number;
    fieldsRemoved: number;
    fieldsModified: number;
    relationshipsAdded: number;
    relationshipsRemoved: number;
  };
}

function fieldSignature(f: { name: string; dataType?: string; description?: string; isPK: boolean; isFK: boolean }) {
  return `${f.name}|${f.dataType ?? ''}|${f.description ?? ''}|${f.isPK}|${f.isFK}`;
}

export function computeModelDiff(current: DataModel | null, imported: DataModel): ModelDiff {
  const tablesAdded: string[] = [];
  const tablesRemoved: string[] = [];
  const tablesModified: string[] = [];
  const fieldsAdded: Array<{ tableKey: string; fieldName: string }> = [];
  const fieldsRemoved: Array<{ tableKey: string; fieldName: string }> = [];
  const fieldsModified: Array<{ tableKey: string; fieldName: string }> = [];
  const relationshipsAdded: string[] = [];
  const relationshipsRemoved: string[] = [];

  const currentTables = current?.tables ?? {};
  const currentRels = new Set((current?.relationships ?? []).map((r) => r.id));
  const importedTableKeys = new Set(Object.keys(imported.tables));
  const currentTableKeys = new Set(Object.keys(currentTables));

  for (const key of importedTableKeys) {
    if (!currentTableKeys.has(key)) tablesAdded.push(key);
    else {
      const curr = currentTables[key];
      const imp = imported.tables[key];
      const currSigs = new Set(curr.fields.map(fieldSignature));
      const impSigs = new Set(imp.fields.map(fieldSignature));
      const currNames = new Set(curr.fields.map((f) => f.name));
      const impNames = new Set(imp.fields.map((f) => f.name));
      for (const f of imp.fields) {
        if (!currNames.has(f.name)) fieldsAdded.push({ tableKey: key, fieldName: f.name });
        else if (!currSigs.has(fieldSignature(f))) fieldsModified.push({ tableKey: key, fieldName: f.name });
      }
      for (const f of curr.fields) {
        if (!impNames.has(f.name)) fieldsRemoved.push({ tableKey: key, fieldName: f.name });
      }
      if (fieldsAdded.some((x) => x.tableKey === key) || fieldsRemoved.some((x) => x.tableKey === key) || fieldsModified.some((x) => x.tableKey === key)) {
        tablesModified.push(key);
      }
    }
  }
  for (const key of currentTableKeys) {
    if (!importedTableKeys.has(key)) tablesRemoved.push(key);
  }

  const importedRels = new Set(imported.relationships.map((r) => r.id));
  for (const id of importedRels) {
    if (!currentRels.has(id)) relationshipsAdded.push(id);
  }
  for (const id of currentRels) {
    if (!importedRels.has(id)) relationshipsRemoved.push(id);
  }

  return {
    tablesAdded,
    tablesRemoved,
    tablesModified: [...new Set(tablesModified)],
    fieldsAdded,
    fieldsRemoved,
    fieldsModified,
    relationshipsAdded,
    relationshipsRemoved,
    summary: {
      tablesAdded: tablesAdded.length,
      tablesRemoved: tablesRemoved.length,
      tablesModified: tablesModified.length,
      fieldsAdded: fieldsAdded.length,
      fieldsRemoved: fieldsRemoved.length,
      fieldsModified: fieldsModified.length,
      relationshipsAdded: relationshipsAdded.length,
      relationshipsRemoved: relationshipsRemoved.length,
    },
  };
}
