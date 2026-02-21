/**
 * Claude API tool definitions (JSON Schema). Same tools as Gemini; handlers in tools.ts.
 */

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

export const CLAUDE_TOOLS: ClaudeTool[] = [
  {
    name: 'get_tables_by_layer',
    description: 'List all tables in a given layer (L1, L2, or L3). L1 = reference/dimension, L2 = snapshot/event, L3 = derived metrics/cubes.',
    input_schema: {
      type: 'object',
      properties: {
        layer: { type: 'string', description: 'Layer: L1, L2, or L3', enum: ['L1', 'L2', 'L3'] },
      },
      required: ['layer'],
    },
  },
  {
    name: 'get_table_details',
    description: 'Get full definition of a table: name, layer, category, and all fields (name, type, PK/FK, description, formula if L3).',
    input_schema: {
      type: 'object',
      properties: {
        layer: { type: 'string', description: 'Layer: L1, L2, or L3', enum: ['L1', 'L2', 'L3'] },
        tableName: { type: 'string', description: 'Table name (e.g. facility_master, exposure_metric_cube)' },
      },
      required: ['layer', 'tableName'],
    },
  },
  {
    name: 'get_relationships',
    description: 'Get relationships (foreign keys / joins) for the data model. Optionally filter by table name or layer.',
    input_schema: {
      type: 'object',
      properties: {
        tableName: { type: 'string', description: 'Optional. Filter to relationships involving this table (from or to).' },
        layer: { type: 'string', description: 'Optional. Filter to this layer (L1, L2, L3).' },
      },
    },
  },
  {
    name: 'get_derivation_dag',
    description: 'Get the L3 derivation DAG: which L3 tables depend on which (table-level dependencies).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_metrics_by_page',
    description: 'List L3 metrics for a dashboard page (P1–P7). Returns metric id, name, formula, dimensions.',
    input_schema: {
      type: 'object',
      properties: {
        page: { type: 'string', description: 'Dashboard page: P1 (Executive) through P7 (Portfolio)', enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'] },
      },
      required: ['page'],
    },
  },
  {
    name: 'get_metric_details',
    description: 'Get full details of a single L3 metric by id: formula, source fields, dimensions, lineage nodes/edges if available.',
    input_schema: {
      type: 'object',
      properties: {
        metricId: { type: 'string', description: 'Metric id (e.g. M001, M024)' },
      },
      required: ['metricId'],
    },
  },
  {
    name: 'search_tables_or_metrics',
    description: 'Search tables or metrics by name or keyword. Returns matching table names (with layer) and metric ids/names with short descriptions.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term (e.g. exposure, facility, limit)' },
      },
      required: ['query'],
    },
  },
];
