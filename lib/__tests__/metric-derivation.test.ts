import { describe, it, expect } from 'vitest';
import { deriveDimensionsFromSourceFields, suggestTogglesFromSourceFields } from '../metric-derivation';
import type { SourceField } from '@/data/l3-metrics';

function sf(table: string, field: string, layer: 'L1' | 'L2' = 'L2'): SourceField {
  return { layer, table, field, description: '' } as SourceField;
}

// ─── deriveDimensionsFromSourceFields ──────────────────────────────────

describe('deriveDimensionsFromSourceFields', () => {
  it('returns default 4 dimensions when no source fields', () => {
    const dims = deriveDimensionsFromSourceFields([], null);
    expect(dims).toHaveLength(4);
    expect(dims[0].dimension).toBe('as_of_date');
    expect(dims[0].interaction).toBe('GROUP_BY');
  });

  it('returns default dimensions when schema is null', () => {
    const dims = deriveDimensionsFromSourceFields([sf('fes', 'drawn_amount')], null);
    expect(dims).toHaveLength(4);
  });

  it('derives dimensions from schema tables', () => {
    const schema = {
      tables: {
        'L2.fes': {
          key: 'L2.fes',
          name: 'fes',
          layer: 'L2' as const,
          fields: [
            { name: 'facility_id' },
            { name: 'as_of_date' },
            { name: 'counterparty_id' },
            { name: 'drawn_amount' },
          ],
        },
      },
    };
    const dims = deriveDimensionsFromSourceFields([sf('fes', 'drawn_amount')], schema);
    expect(dims.length).toBeGreaterThan(0);
    const dimNames = dims.map(d => d.dimension);
    expect(dimNames).toContain('as_of_date');
    expect(dimNames).toContain('facility_id');
    expect(dimNames).toContain('counterparty_id');
    // drawn_amount is not a common dimension, should not appear
    expect(dimNames).not.toContain('drawn_amount');
  });

  it('respects default interaction override', () => {
    const dims = deriveDimensionsFromSourceFields([], null, 'FILTER');
    expect(dims.every(d => d.interaction === 'FILTER')).toBe(true);
  });

  it('preserves COMMON_DIMENSIONS ordering', () => {
    const schema = {
      tables: {
        'L2.t': {
          key: 'L2.t',
          name: 't',
          layer: 'L2' as const,
          fields: [
            { name: 'counterparty_id' },
            { name: 'as_of_date' },
            { name: 'facility_id' },
          ],
        },
      },
    };
    const dims = deriveDimensionsFromSourceFields([sf('t', 'x')], schema);
    const names = dims.map(d => d.dimension);
    // Should follow the COMMON_DIMENSIONS order: as_of_date before counterparty_id before facility_id
    expect(names.indexOf('as_of_date')).toBeLessThan(names.indexOf('counterparty_id'));
    expect(names.indexOf('counterparty_id')).toBeLessThan(names.indexOf('facility_id'));
  });
});

// ─── suggestTogglesFromSourceFields ────────────────────────────────────

describe('suggestTogglesFromSourceFields', () => {
  it('suggests exposure_calc for exposure fields', () => {
    const toggles = suggestTogglesFromSourceFields([sf('fes', 'gross_exposure')], 'P2');
    expect(toggles).toContain('exposure_calc');
  });

  it('suggests product_grouping for product_node fields', () => {
    const toggles = suggestTogglesFromSourceFields([sf('t', 'product_node_id')], 'P2');
    expect(toggles).toContain('product_grouping');
  });

  it('suggests risk_rating for risk rating fields', () => {
    const toggles = suggestTogglesFromSourceFields([sf('t', 'internal_risk_rating')], 'P2');
    expect(toggles).toContain('risk_rating');
  });

  it('returns empty when no patterns match', () => {
    const toggles = suggestTogglesFromSourceFields([sf('t', 'random_field')], 'P2');
    expect(toggles).toHaveLength(0);
  });

  it('deduplicates suggested toggles', () => {
    const toggles = suggestTogglesFromSourceFields(
      [sf('t', 'gross_exposure'), sf('t', 'net_exposure')],
      'P2'
    );
    const exposureCount = toggles.filter(t => t === 'exposure_calc').length;
    expect(exposureCount).toBeLessThanOrEqual(1);
  });
});
