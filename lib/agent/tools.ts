/**
 * Data-model agent tools: declarative registry of Gemini function declarations
 * and handlers. All responses are schema-only (no row data).
 *
 * To add a new tool: add a FunctionDeclaration and a handler in TOOL_REGISTRY.
 */

import { Type, type FunctionDeclaration } from '@google/genai';
import type { SchemaBundle } from '@/lib/schema-bundle';
import {
  getRelationshipsForTable,
  findTableInBundle,
} from '@/lib/schema-bundle';
import { metricsByPage, getMetric } from '@/data/l3-metrics';
import type { DashboardPage } from '@/data/l3-metrics';

const LAYER_ENUM = ['L1', 'L2', 'L3'] as const;
const PAGE_ENUM = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'] as const;

// ─── Tool declarations (Gemini format) ─────────────────────────────────────

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_tables_by_layer',
    description:
      'List all tables in a given layer (L1, L2, or L3). L1 = reference/dimension, L2 = snapshot/event, L3 = derived metrics/cubes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        layer: {
          type: Type.STRING,
          description: 'Layer: L1, L2, or L3',
          enum: [...LAYER_ENUM],
        },
      },
      required: ['layer'],
    },
  },
  {
    name: 'get_table_details',
    description:
      'Get full definition of a table: name, layer, category, and all fields (name, type, PK/FK, description, formula if L3).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        layer: {
          type: Type.STRING,
          description: 'Layer: L1, L2, or L3',
          enum: [...LAYER_ENUM],
        },
        tableName: {
          type: Type.STRING,
          description: 'Table name (e.g. facility_master, exposure_metric_cube)',
        },
      },
      required: ['layer', 'tableName'],
    },
  },
  {
    name: 'get_relationships',
    description:
      'Get relationships (foreign keys / joins) for the data model. Optionally filter by table name or layer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tableName: {
          type: Type.STRING,
          description:
            'Optional. Filter to relationships involving this table (from or to).',
        },
        layer: {
          type: Type.STRING,
          description: 'Optional. Filter to this layer (L1, L2, L3).',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_derivation_dag',
    description:
      'Get the L3 derivation DAG: which L3 tables depend on which (table-level dependencies).',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_metrics_by_page',
    description:
      'List L3 metrics for a dashboard page (P1–P7). Returns metric id, name, formula, dimensions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: {
          type: Type.STRING,
          description: 'Dashboard page: P1 (Executive) through P7 (Portfolio)',
          enum: [...PAGE_ENUM],
        },
      },
      required: ['page'],
    },
  },
  {
    name: 'get_metric_details',
    description:
      'Get full details of a single L3 metric by id: formula, source fields, dimensions, lineage nodes/edges if available.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        metricId: {
          type: Type.STRING,
          description: 'Metric id (e.g. M001, M024)',
        },
      },
      required: ['metricId'],
    },
  },
  {
    name: 'search_tables_or_metrics',
    description:
      'Search tables or metrics by name or keyword. Returns matching table names (with layer) and metric ids/names with short descriptions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Search term (e.g. exposure, facility, limit)',
        },
      },
      required: ['query'],
    },
  },
];

// ─── Handlers (run with current bundle; return JSON-serializable object) ───

export type ToolHandler = (
  args: Record<string, unknown>,
  bundle: SchemaBundle
) => Record<string, unknown>;

function handleGetTablesByLayer(
  args: Record<string, unknown>,
  bundle: SchemaBundle
): Record<string, unknown> {
  const layer = (args.layer as string)?.toUpperCase() as 'L1' | 'L2' | 'L3';
  if (!layer || !['L1', 'L2', 'L3'].includes(layer)) {
    return { error: 'Invalid layer. Use L1, L2, or L3.' };
  }
  const dd = bundle.dataDictionary;
  if (!dd) {
    return { layer, tables: [], message: 'Data dictionary not loaded.' };
  }
  const arr = dd[layer] ?? [];
  const tables = arr.map((t) => ({
    name: t.name,
    category: t.category,
    fieldCount: t.fields?.length ?? 0,
  }));
  return { layer, tables };
}

function handleGetTableDetails(
  args: Record<string, unknown>,
  bundle: SchemaBundle
): Record<string, unknown> {
  const layer = (args.layer as string)?.toUpperCase() as 'L1' | 'L2' | 'L3';
  const tableName = String(args.tableName ?? '').trim();
  if (!layer || !tableName) {
    return { error: 'layer and tableName are required.' };
  }
  const table = findTableInBundle(bundle, layer, tableName);
  if (!table) {
    return {
      error: `Table not found: ${tableName} in layer ${layer}.`,
      hint: 'Use get_tables_by_layer to list available tables.',
    };
  }
  const fields = (table.fields ?? []).map((f) => ({
    name: f.name,
    description: f.description,
    data_type: f.data_type,
    pk_fk: f.pk_fk,
    formula: f.formula,
    source_fields: f.source_fields,
    grain: f.grain,
  }));
  return {
    name: table.name,
    layer: table.layer,
    category: table.category,
    fields,
  };
}

function handleGetRelationships(
  args: Record<string, unknown>,
  bundle: SchemaBundle
): Record<string, unknown> {
  const tableName = args.tableName as string | undefined;
  const layer = args.layer as string | undefined;
  const rels = getRelationshipsForTable(bundle, tableName, layer);
  return {
    count: rels.length,
    relationships: rels.map((r) => ({
      from: `${r.from_layer}.${r.from_table}.${r.from_field}`,
      to: `${r.to_layer}.${r.to_table}.${r.to_field}`,
    })),
  };
}

function handleGetDerivationDag(
  _args: Record<string, unknown>,
  bundle: SchemaBundle
): Record<string, unknown> {
  const dd = bundle.dataDictionary;
  const dag = dd?.derivation_dag ?? {};
  const nodes = Object.keys(dag);
  const edges: { from: string; to: string }[] = [];
  for (const [from, toList] of Object.entries(dag)) {
    for (const to of toList ?? []) {
      edges.push({ from, to });
    }
  }
  return { nodes, edges, description: 'L3 table-level dependencies.' };
}

function handleGetMetricsByPage(
  args: Record<string, unknown>,
  _bundle: SchemaBundle
): Record<string, unknown> {
  const page = (args.page as string)?.toUpperCase() as DashboardPage;
  if (!page || !PAGE_ENUM.includes(page)) {
    return { error: 'Invalid page. Use P1, P2, P3, P4, P5, P6, or P7.' };
  }
  const metrics = metricsByPage(page);
  return {
    page,
    count: metrics.length,
    metrics: metrics.map((m) => ({
      id: m.id,
      name: m.name,
      section: m.section,
      formula: m.formula,
      dimensions: m.dimensions?.map((d) => `${d.dimension} (${d.interaction})`) ?? [],
    })),
  };
}

function handleGetMetricDetails(
  args: Record<string, unknown>,
  _bundle: SchemaBundle
): Record<string, unknown> {
  const metricId = String(args.metricId ?? '').trim();
  if (!metricId) return { error: 'metricId is required.' };
  const metric = getMetric(metricId);
  if (!metric) {
    return { error: `Metric not found: ${metricId}.`, hint: 'Use get_metrics_by_page to list metrics.' };
  }
  return {
    id: metric.id,
    name: metric.name,
    page: metric.page,
    section: metric.section,
    metricType: metric.metricType,
    formula: metric.formula,
    formulaSQL: metric.formulaSQL,
    description: metric.description,
    sourceFields: metric.sourceFields,
    dimensions: metric.dimensions,
    toggles: metric.toggles,
    nodes: metric.nodes,
    edges: metric.edges,
  };
}

function handleSearchTablesOrMetrics(
  args: Record<string, unknown>,
  bundle: SchemaBundle
): Record<string, unknown> {
  const query = String(args.query ?? '').toLowerCase().trim();
  if (!query) return { error: 'query is required.' };

  const tables: { layer: string; name: string }[] = [];
  const dd = bundle.dataDictionary;
  if (dd) {
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      const arr = dd[layer] ?? [];
      for (const t of arr) {
        if (t.name.toLowerCase().includes(query) || (t.category?.toLowerCase().includes(query))) {
          tables.push({ layer, name: t.name });
        }
      }
    }
  }
  const metrics = bundle.l3Metrics.filter(
    (m) =>
      m.id.toLowerCase().includes(query) ||
      m.name.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query)
  );
  return {
    query,
    tables,
    metrics: metrics.map((m) => ({ id: m.id, name: m.name, description: m.description })),
  };
}

// ─── Registry: name -> handler ─────────────────────────────────────────────

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  get_tables_by_layer: handleGetTablesByLayer,
  get_table_details: handleGetTableDetails,
  get_relationships: handleGetRelationships,
  get_derivation_dag: handleGetDerivationDag,
  get_metrics_by_page: handleGetMetricsByPage,
  get_metric_details: handleGetMetricDetails,
  search_tables_or_metrics: handleSearchTablesOrMetrics,
};

/** Execute a tool by name. Returns JSON-serializable result. */
export function runTool(
  name: string,
  args: Record<string, unknown>,
  bundle: SchemaBundle
): Record<string, unknown> {
  const handler = TOOL_HANDLERS[name];
  if (!handler) return { error: `Unknown tool: ${name}.` };
  try {
    return handler(args ?? {}, bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Tool ${name} failed: ${message}` };
  }
}
