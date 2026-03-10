export type SectionId = 'spine' | 'branches' | 'l2-snapshots' | 'l3-derived' | 'rollup';

export interface SpineTable {
  tableName: string;
  layer: 'L1' | 'L2';
  label: string;
  subtitle: string;
  keyFields: FieldDisplay[];
  fkTo?: string;
  fkLabel?: string;
}

export interface FieldDisplay {
  name: string;
  type: 'pk' | 'fk' | 'field';
}

export interface BranchGroup {
  id: string;
  label: string;
  icon: string;
  color: string;
  tables: TableRef[];
  spineAttachment: string;
}

export interface TableRef {
  name: string;
  label: string;
  description?: string;
}

export interface L2Group {
  id: string;
  label: string;
  icon: string;
  color: string;
  tables: TableRef[];
  description: string;
}

export interface L3DomainGroup {
  id: string;
  label: string;
  color: string;
  tables: string[];
}
