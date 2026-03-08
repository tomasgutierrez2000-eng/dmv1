/**
 * GSIB Calculation Engine — JSON Schema for Metric YAML Validation
 */

import type { JSONSchemaType } from 'ajv';

// We use a loose schema type since ajv's JSONSchemaType is strict about
// optional fields. The actual validation is what matters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const metricDefinitionSchema: Record<string, any> = {
  type: 'object',
  required: [
    'metric_id',
    'name',
    'version',
    'owner',
    'status',
    'effective_date',
    'domain',
    'sub_domain',
    'metric_class',
    'direction',
    'unit_type',
    'display_format',
    'description',
    'source_tables',
    'levels',
    'depends_on',
    'output',
    'validations',
    'tags',
  ],
  properties: {
    metric_id: { type: 'string', pattern: '^[A-Z]+-\\d{3}$' },
    name: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    owner: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['ACTIVE', 'DRAFT', 'DEPRECATED', 'RETIRED'] },
    effective_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    supersedes: { type: ['string', 'null'] },

    domain: { type: 'string', minLength: 1 },
    sub_domain: { type: 'string', minLength: 1 },
    metric_class: { type: 'string', enum: ['SOURCED', 'CALCULATED', 'HYBRID'] },
    direction: { type: 'string', enum: ['HIGHER_BETTER', 'LOWER_BETTER', 'NEUTRAL'] },
    unit_type: {
      type: 'string',
      enum: ['CURRENCY', 'PERCENTAGE', 'RATIO', 'COUNT', 'RATE', 'BPS', 'DAYS', 'INDEX', 'ORDINAL'],
    },
    display_format: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },

    regulatory_references: {
      type: 'array',
      items: {
        type: 'object',
        required: ['framework', 'description'],
        properties: {
          framework: { type: 'string' },
          section: { type: 'string' },
          schedule: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
        },
        additionalProperties: false,
      },
    },

    source_tables: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['schema', 'table', 'alias', 'join_type', 'fields'],
        properties: {
          schema: { type: 'string', enum: ['l1', 'l2', 'l3'] },
          table: { type: 'string', minLength: 1 },
          alias: { type: 'string', minLength: 1 },
          join_type: { type: 'string', enum: ['BASE', 'INNER', 'LEFT', 'CROSS'] },
          join_on: { type: 'string' },
          fields: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['name', 'role'],
              properties: {
                name: { type: 'string', minLength: 1 },
                role: { type: 'string', enum: ['MEASURE', 'DIMENSION', 'FILTER', 'JOIN_KEY'] },
                description: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },

    levels: {
      type: 'object',
      required: ['facility', 'counterparty', 'desk', 'portfolio', 'business_segment'],
      properties: {
        facility: { $ref: '#/$defs/levelFormula' },
        counterparty: { $ref: '#/$defs/levelFormula' },
        desk: { $ref: '#/$defs/levelFormula' },
        portfolio: { $ref: '#/$defs/levelFormula' },
        business_segment: { $ref: '#/$defs/levelFormula' },
      },
      additionalProperties: false,
    },

    depends_on: {
      type: 'array',
      items: { type: 'string' },
    },

    output: {
      type: 'object',
      required: ['table'],
      properties: {
        table: { type: 'string', minLength: 1 },
        additional_tables: {
          type: 'array',
          items: {
            type: 'object',
            required: ['schema', 'table', 'column'],
            properties: {
              schema: { type: 'string' },
              table: { type: 'string' },
              column: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },

    validations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['rule_id', 'type', 'description', 'severity'],
        properties: {
          rule_id: { type: 'string', minLength: 1 },
          type: {
            type: 'string',
            enum: ['NOT_NULL', 'NON_NEGATIVE', 'THRESHOLD', 'RECONCILIATION', 'PERIOD_OVER_PERIOD', 'CUSTOM_SQL'],
          },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['ERROR', 'WARNING', 'INFO'] },
          params: { type: 'object' },
          custom_sql: { type: 'string' },
        },
        additionalProperties: false,
      },
    },

    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    dashboard_pages: {
      type: 'array',
      items: { type: 'string' },
    },
    legacy_metric_ids: {
      type: 'array',
      items: { type: 'string' },
    },
    catalogue: {
      type: 'object',
      properties: {
        item_id: { type: 'string', minLength: 1 },
        abbreviation: { type: 'string', minLength: 1 },
        insight: { type: 'string' },
        rollup_strategy: { type: 'string', minLength: 1 },
        primary_value_field: { type: 'string', minLength: 1 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,

  $defs: {
    levelFormula: {
      type: 'object',
      required: ['aggregation_type', 'formula_text', 'formula_sql'],
      properties: {
        aggregation_type: {
          type: 'string',
          enum: ['RAW', 'SUM', 'WEIGHTED_AVG', 'COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX', 'MEDIAN', 'CUSTOM'],
        },
        formula_text: { type: 'string', minLength: 1 },
        formula_sql: { type: 'string', minLength: 1 },
        weighting_field: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};
