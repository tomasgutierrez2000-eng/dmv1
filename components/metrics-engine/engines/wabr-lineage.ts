import type { L3Metric, LineageNode, LineageEdge, SourceField } from '@/data/l3-metrics';

/**
 * WABR (Weighted Average Base Rate) lineage engine.
 *
 * Maps the WABR metric to its L2 atomic source fields and generates
 * lineage nodes/edges for the LineageFlowView renderer.
 *
 * Source tables:
 *   L2.position       → position_id, facility_id (join key)
 *   L2.position_detail → rate_index (benchmark rate), total_commitment (weight base)
 *   L1.facility_lender_allocation → bank_share_pct (GSIB syndication adjustment)
 *   L1.facility_master → facility_id (central hub), counterparty_id, lob_segment_id
 *   L1.enterprise_business_taxonomy → tree_level, managed_segment_id (LoB hierarchy)
 */

/** Build sourceFields for WABR: each mapped to one L2 atomic element (table.column). */
export function wabrSourceFields(): SourceField[] {
  return [
    {
      layer: 'L2',
      table: 'position_detail',
      field: 'rate_index',
      description: 'Benchmark interest rate (SOFR, Prime) — the rate being weighted',
    },
    {
      layer: 'L2',
      table: 'position_detail',
      field: 'total_commitment',
      description: 'Total commitment per position — weight base before bank share adjustment',
    },
    {
      layer: 'L1' as 'L2', // SourceField only supports L1/L2 — using L1 tables via L2 join
      table: 'facility_lender_allocation',
      field: 'bank_share_pct',
      description: 'Bank syndication share — adjusts total_commitment for GSIB weighting',
    },
  ];
}

/** Build lineage nodes/edges for WABR. Same L1→L2→transform→L3 flow as DSCR. */
export function wabrLineage(): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  // L2 source: position_detail
  nodes.push({
    id: 'table-L2-position_detail',
    layer: 'L2',
    table: 'position_detail',
    field: 'rate_index, total_commitment',
    fields: ['rate_index', 'total_commitment'],
    description: 'L2.position_detail: rate_index (benchmark), total_commitment (weight base)',
    sampleValue: 'SOFR 5.25%, $60M',
  });

  // L1 source: facility_lender_allocation
  nodes.push({
    id: 'table-L1-facility_lender_allocation',
    layer: 'L1',
    table: 'facility_lender_allocation',
    field: 'bank_share_pct',
    description: 'L1.facility_lender_allocation: bank syndication share for GSIB adjustment',
    sampleValue: '50%',
  });

  // Transform
  nodes.push({
    id: 'transform-formula',
    layer: 'transform',
    table: '',
    field: 'Formula',
    formula: 'Σ(rate_index × adjusted_weight) where adjusted_weight = (total_commitment × bank_share_pct) / Σ(total_commitment × bank_share_pct)',
    sampleValue: '5.275%',
    description: 'Commitment-weighted average with syndication adjustment at aggregation scope',
  });

  // L3 output
  nodes.push({
    id: 'l3-output',
    layer: 'L3',
    table: 'metric_value_fact',
    field: 'Weighted Average Base Rate (%)',
    sampleValue: '5.275%',
    formula: 'Σ(rate_index × adjusted_weight)',
    description: 'WABR stored per aggregation level (facility, counterparty, desk, portfolio, LoB)',
  });

  // Edges
  edges.push({ from: 'table-L2-position_detail', to: 'transform-formula', label: 'rate + commitment' });
  edges.push({ from: 'table-L1-facility_lender_allocation', to: 'transform-formula', label: 'bank share' });
  edges.push({ from: 'transform-formula', to: 'l3-output', label: '→' });

  return { nodes, edges };
}

/** Build full L3Metric for WABR. */
export function wabrMetric(): Partial<L3Metric> {
  const sourceFields = wabrSourceFields();
  const { nodes, edges } = wabrLineage();

  return {
    id: 'WABR',
    name: 'Weighted Average Base Rate (%)',
    page: 'P2',
    section: 'Pricing & Rate Environment',
    metricType: 'Aggregate',
    formula: 'Σ(rate_index × adjusted_weight)',
    description: 'Commitment-weighted benchmark rate across positions, adjusted for bank syndication share. Reflects the effective base rate of the portfolio.',
    displayFormat: '0.00%',
    sampleValue: '5.275%',
    sourceFields,
    dimensions: [],
    allowedDimensions: ['facility', 'counterparty', 'L3', 'L2', 'L1'],
    nodes,
    edges,
  };
}
