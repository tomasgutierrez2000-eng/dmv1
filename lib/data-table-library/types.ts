/**
 * Data Table Library — types for tables and fields.
 * Aligned with sql/data-table-library/01_DDL.sql.
 */

export type DTLayer = 'Raw Landing' | 'Conformed/Curated' | 'Reporting/Aggregated' | 'Reference Data';

export interface DTLTable {
  table_id: string;
  table_name_business: string;
  table_name_technical: string;
  layer: DTLayer;
  source_of_origin?: string;
  refresh_frequency?: string;
  sla?: string;
  record_count_current?: number;
  grain?: string;
  unique_key?: string;
  data_steward?: string;
  owning_team?: string;
  retention_policy?: string;
  created_at?: string;
  updated_at?: string;
}

export type FieldClassification = 'Sourced' | 'Derived' | 'Enriched' | 'Configuration';

export interface DTLField {
  field_id: string;
  table_id: string;
  field_name_technical: string;
  field_name_business?: string;
  data_type?: string;
  precision_info?: string;
  business_definition?: string;
  field_classification?: FieldClassification;
  source_lineage?: string;
  golden_source_flag?: boolean;
  sensitivity?: string;
  quality_profile_ref?: string;
  created_at?: string;
  updated_at?: string;
}
