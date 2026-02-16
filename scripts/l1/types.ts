/**
 * Column definition for L1 DDL generator.
 * type: PostgreSQL type (BIGINT, VARCHAR(n), DATE, etc.)
 * fk: e.g. "l1.currency_dim(currency_code)" for FOREIGN KEY reference
 */
export interface ColumnDef {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  check?: string;
  pk?: boolean;
  fk?: string; // "l1.referenced_table(ref_column)"
}

export type SCDType = 'SCD-0' | 'SCD-1' | 'SCD-2' | 'Snapshot';

export interface TableDef {
  tableName: string;
  scd: SCDType;
  columns: ColumnDef[];
}
