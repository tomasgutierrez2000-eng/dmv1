export interface Field {
  name: string;
  description: string;
  whyRequired?: string;
  pkFk?: string; // raw value from Excel
  isPK: boolean;
  isFK: boolean;
  fkTarget?: { layer: string; table: string; field: string };
  dataType?: string; // L3 only
  formula?: string; // L3 only
  sourceTables?: Array<{ layer: string; table: string }>; // L3 only
  sourceFields?: string; // L3 only
  derivationLogic?: string; // L3 only
  dashboardUsage?: string; // L3 only
  grain?: string; // L3 only
  simplificationNote?: string; // L2 only
  notes?: string; // L3 only
}

export interface TableDef {
  key: string; // "L1.facility_master"
  name: string; // "facility_master"
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: Field[];
}

export interface Relationship {
  id: string;
  source: { layer: string; table: string; field: string; tableKey: string };
  target: { layer: string; table: string; field: string; tableKey: string };
  isCrossLayer: boolean;
  relationshipType: 'primary' | 'secondary'; // Primary = direct FK->PK, Secondary = derived/complex
}

export interface DataModel {
  tables: Record<string, TableDef>;
  relationships: Relationship[];
  categories: string[];
  layers: string[];
}

export interface TablePosition {
  x: number;
  y: number;
}
