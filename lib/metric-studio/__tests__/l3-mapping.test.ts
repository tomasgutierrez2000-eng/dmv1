import { describe, it, expect } from 'vitest';
import { resolveL3Destination, PREFIX_TO_L3_TABLE } from '../l3-mapping';

describe('resolveL3Destination', () => {
  it('resolves EXP prefix to exposure_metric_cube', () => {
    expect(resolveL3Destination('EXP-015')).toBe('exposure_metric_cube');
  });

  it('resolves RSK prefix to risk_metric_cube', () => {
    expect(resolveL3Destination('RSK-009')).toBe('risk_metric_cube');
  });

  it('resolves CAP prefix to facility_rwa_calc', () => {
    expect(resolveL3Destination('CAP-001')).toBe('facility_rwa_calc');
  });

  it('resolves PRC prefix to lob_pricing_summary', () => {
    expect(resolveL3Destination('PRC-003')).toBe('lob_pricing_summary');
  });

  it('resolves PROF prefix to lob_profitability_summary', () => {
    expect(resolveL3Destination('PROF-108')).toBe('lob_profitability_summary');
  });

  it('resolves REF prefix to facility_derived', () => {
    expect(resolveL3Destination('REF-009')).toBe('facility_derived');
  });

  it('resolves AMD prefix to amendment_summary', () => {
    expect(resolveL3Destination('AMD-001')).toBe('amendment_summary');
  });

  it('returns null for unknown prefix', () => {
    expect(resolveL3Destination('UNKNOWN-001')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveL3Destination('')).toBeNull();
  });

  it('handles metric ID without dash', () => {
    // PREFIX_TO_L3_TABLE should not have a key for 'C001'
    expect(resolveL3Destination('C001')).toBeNull();
  });

  it('extracts only the first segment before dash', () => {
    // 'EXP-015-variant' should still match EXP
    expect(resolveL3Destination('EXP-015-variant')).toBe('exposure_metric_cube');
  });
});

describe('PREFIX_TO_L3_TABLE', () => {
  it('has entries for all known metric domains', () => {
    expect(Object.keys(PREFIX_TO_L3_TABLE)).toEqual(
      expect.arrayContaining(['EXP', 'RSK', 'CAP', 'PRC', 'PROF', 'REF', 'AMD'])
    );
  });

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(PREFIX_TO_L3_TABLE)) {
      expect(value, `${key} should map to a non-empty table name`).toBeTruthy();
      expect(typeof value).toBe('string');
    }
  });
});
