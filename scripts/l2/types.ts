/**
 * L2 column/table definitions. FK may reference l1.table(col) or l2.table(col).
 */
export interface L2ColumnDef {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  pk?: boolean;
  fk?: string; // "l1.facility_master(facility_id)" or "l2.amendment_event(amendment_id)"
}

export type L2SCDType = 'Snapshot' | 'Event' | 'SCD-1';

export interface L2TableDef {
  tableName: string;
  scd: L2SCDType;
  columns: L2ColumnDef[];
}
