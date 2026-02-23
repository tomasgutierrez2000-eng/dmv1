/**
 * Source Mapping Engine — types for Source Registry and Mappings.
 * Aligned with sql/source-mapping/01_DDL.sql.
 */

export type SourceSystemEnvironment = 'Production' | 'UAT' | 'Development';

export interface SourceSystem {
  source_system_id: string;
  name: string;
  system_type?: string;
  environment: SourceSystemEnvironment;
  owner?: string;
  technical_contact?: string;
  connectivity?: string;
  health_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SourceFeed {
  feed_id: string;
  source_system_id: string;
  feed_name: string;
  frequency?: string;
  sla_window?: string;
  schema_ref?: string;
  created_at?: string;
  updated_at?: string;
}

export type MetricRefType = 'parent' | 'variant';
export type MappingStatus = 'Draft' | 'Under Review' | 'Approved' | 'Active' | 'Suspended' | 'Deprecated';

export interface TransformationStep {
  input_field?: string;
  output_field?: string;
  transformation_type?: string;
  logic?: string;
}

export interface MappingRecord {
  mapping_id: string;
  metric_ref_type: MetricRefType;
  metric_ref_id: string;
  target_field_ref?: string;
  source_path?: string;
  transformation_steps?: TransformationStep[];
  effective_date?: string;
  expiration_date?: string;
  status: MappingStatus;
  version: number;
  approved_by?: string;
  change_rationale?: string;
  created_at?: string;
  updated_at?: string;
}
