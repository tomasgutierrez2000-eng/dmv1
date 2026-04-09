import { describe, it, expect } from 'vitest';
import { generateSummaries, type ReleaseSummary } from '../release-summary';
import type { ReleaseEntry } from '../release-tracker-data';

function entry(overrides: Partial<ReleaseEntry> & { table: string; field: string }): ReleaseEntry {
  return {
    date: '2025-01-15',
    layer: 'L2',
    changeType: 'Added',
    rationale: 'Test',
    ...overrides,
  };
}

/* ────────────────── generateSummaries — grouping ────────────────── */

describe('generateSummaries', () => {
  it('groups entries by date, sorted descending', () => {
    const entries: ReleaseEntry[] = [
      entry({ date: '2025-01-10', table: 'a', field: 'x' }),
      entry({ date: '2025-01-15', table: 'b', field: 'y' }),
      entry({ date: '2025-01-10', table: 'c', field: 'z' }),
    ];
    const result = generateSummaries(entries);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2025-01-15');
    expect(result[1].date).toBe('2025-01-10');
    expect(result[1].entries).toHaveLength(2);
  });

  it('returns empty array for no entries', () => {
    expect(generateSummaries([])).toEqual([]);
  });
});

/* ────────────────── stats computation ────────────────── */

describe('stats computation', () => {
  it('counts tables added and removed', () => {
    const entries: ReleaseEntry[] = [
      entry({ table: 'new_table', field: '(new table)', changeType: 'Added' }),
      entry({ table: 'new_table', field: 'col_a', changeType: 'Added' }),
      entry({ table: 'old_table', field: '(entire table)', changeType: 'Removed' }),
    ];
    const [summary] = generateSummaries(entries);
    expect(summary.stats.tablesAdded).toBe(1);
    expect(summary.stats.tablesRemoved).toBe(1);
    expect(summary.stats.fieldsAdded).toBe(1); // col_a
    expect(summary.stats.totalChanges).toBe(3);
  });

  it('tracks by-layer counts', () => {
    const entries: ReleaseEntry[] = [
      entry({ layer: 'L1', table: 'a', field: 'x' }),
      entry({ layer: 'L1', table: 'b', field: 'y' }),
      entry({ layer: 'L2', table: 'c', field: 'z' }),
      entry({ layer: 'L3', table: 'd', field: 'w' }),
    ];
    const [summary] = generateSummaries(entries);
    expect(summary.stats.byLayer.L1).toBe(2);
    expect(summary.stats.byLayer.L2).toBe(1);
    expect(summary.stats.byLayer.L3).toBe(1);
  });
});

/* ────────────────── theme detection ────────────────── */

describe('table migration detection', () => {
  it('detects table moved from L1 to L2', () => {
    const entries: ReleaseEntry[] = [
      entry({ layer: 'L1', table: 'my_table', field: '(entire table)', changeType: 'Removed' }),
      entry({ layer: 'L2', table: 'my_table', field: '(new table)', changeType: 'Added' }),
      entry({ layer: 'L2', table: 'my_table', field: 'col_a', changeType: 'Added' }),
    ];
    const [summary] = generateSummaries(entries);
    const migrationBullet = summary.bullets.find(b => b.category === 'Layer Migration');
    expect(migrationBullet).toBeDefined();
    expect(migrationBullet!.text).toContain('L1 to L2');
    expect(migrationBullet!.changeType).toBe('Moved');
  });
});

describe('naming standardization detection', () => {
  it('detects _flag suffix standardization', () => {
    const entries: ReleaseEntry[] = [
      entry({ table: 'facility_master', field: 'is_active', changeType: 'Removed' }),
      entry({ table: 'facility_master', field: 'is_active_flag', changeType: 'Added' }),
      entry({ table: 'counterparty', field: 'is_deleted', changeType: 'Removed' }),
      entry({ table: 'counterparty', field: 'is_deleted_flag', changeType: 'Added' }),
    ];
    const [summary] = generateSummaries(entries);
    const namingBullet = summary.bullets.find(b => b.category === 'Naming Standardization');
    expect(namingBullet).toBeDefined();
    expect(namingBullet!.text).toContain('_flag');
  });
});

describe('surrogate key detection', () => {
  it('detects _sk fields added across L3 tables', () => {
    const entries: ReleaseEntry[] = [
      entry({ layer: 'L3', table: 'cube_a', field: 'facility_sk', changeType: 'Added' }),
      entry({ layer: 'L3', table: 'cube_a', field: 'counterparty_sk', changeType: 'Added' }),
      entry({ layer: 'L3', table: 'cube_b', field: 'date_sk', changeType: 'Added' }),
    ];
    const [summary] = generateSummaries(entries);
    const skBullet = summary.bullets.find(b => b.category === 'Infrastructure');
    expect(skBullet).toBeDefined();
    expect(skBullet!.text).toContain('surrogate keys');
  });
});

describe('GL changes detection', () => {
  it('detects GL table additions', () => {
    const entries: ReleaseEntry[] = [
      entry({ table: 'gl_journal_entry', field: '(new table)', changeType: 'Added' }),
      entry({ table: 'gl_journal_entry', field: 'amount', changeType: 'Added' }),
      entry({ table: 'gl_journal_entry', field: 'account_code', changeType: 'Added' }),
    ];
    const [summary] = generateSummaries(entries);
    const glBullet = summary.bullets.find(b => b.category === 'GL Accounting');
    expect(glBullet).toBeDefined();
    expect(glBullet!.text).toContain('GL');
  });
});

describe('foundation detection', () => {
  it('detects entire layer establishment', () => {
    const entries: ReleaseEntry[] = [
      entry({ layer: 'L1', table: '', field: '(entire layer)', rationale: 'Initial schema' }),
    ];
    const [summary] = generateSummaries(entries);
    const foundBullet = summary.bullets.find(b => b.category === 'Foundation');
    expect(foundBullet).toBeDefined();
    expect(foundBullet!.text).toContain('L1 layer established');
  });
});

describe('field migration detection', () => {
  it('detects field moved from L3 to L2', () => {
    const entries: ReleaseEntry[] = [
      entry({ layer: 'L3', table: 'calc_table', field: 'net_income_amt', changeType: 'Removed' }),
      entry({ layer: 'L2', table: 'snapshot_table', field: 'net_income_amt', changeType: 'Added' }),
      // Need 2+ fields for a report to be relevant, add more padding
      entry({ layer: 'L2', table: 'other', field: 'padding_a', changeType: 'Added' }),
      entry({ layer: 'L2', table: 'other', field: 'padding_b', changeType: 'Added' }),
    ];
    const [summary] = generateSummaries(entries);
    const migBullet = summary.bullets.find(b => b.category === 'Field Migration');
    expect(migBullet).toBeDefined();
    expect(migBullet!.text).toContain('L3 to L2');
  });
});

describe('rollup propagation detection', () => {
  it('detects same field added to multiple rollup tables', () => {
    // Use table names from the summaryTables list in release-summary.ts
    const entries: ReleaseEntry[] = [
      entry({ table: 'desk_derived', field: 'total_exposure_usd', changeType: 'Added' }),
      entry({ table: 'portfolio_derived', field: 'total_exposure_usd', changeType: 'Added' }),
      entry({ table: 'desk_derived', field: 'weighted_pd_pct', changeType: 'Added' }),
      entry({ table: 'portfolio_derived', field: 'weighted_pd_pct', changeType: 'Added' }),
    ];
    const [summary] = generateSummaries(entries);
    const rollupBullet = summary.bullets.find(b => b.category === 'Rollup Propagation');
    expect(rollupBullet).toBeDefined();
    expect(rollupBullet!.text).toContain('Propagated');
    expect(rollupBullet!.text).toContain('rollup');
  });
});

/* ────────────────── narrative generation ────────────────── */

describe('narrative generation', () => {
  it('generates descriptive narrative for small changes (ends with period)', () => {
    const entries: ReleaseEntry[] = [
      entry({ table: 'facility_master', field: 'new_col', changeType: 'Added' }),
    ];
    const [summary] = generateSummaries(entries);
    expect(summary.narrative.length).toBeGreaterThan(5);
    expect(summary.narrative).toMatch(/\.$/); // Ends with period
  });

  it('generates multi-sentence narrative for large changesets mentioning layer', () => {
    const entries: ReleaseEntry[] = [];
    for (let i = 0; i < 10; i++) {
      entries.push(entry({ table: `table_${i}`, field: `field_${i}`, changeType: 'Added' }));
    }
    const [summary] = generateSummaries(entries);
    expect(summary.narrative).toMatch(/\.$/); // Ends with period
    expect(summary.narrative).toContain('L2'); // References the layer
  });

  it('leads with schema expansion when many tables added', () => {
    const entries: ReleaseEntry[] = [];
    for (let i = 0; i < 5; i++) {
      entries.push(entry({ table: `new_table_${i}`, field: '(new table)', changeType: 'Added' }));
      entries.push(entry({ table: `new_table_${i}`, field: `col_a`, changeType: 'Added' }));
    }
    const [summary] = generateSummaries(entries);
    expect(summary.narrative.toLowerCase()).toContain('expansion');
  });

  it('leads with simplification when many tables removed', () => {
    const entries: ReleaseEntry[] = [];
    for (let i = 0; i < 4; i++) {
      entries.push(entry({ layer: 'L1', table: `old_table_${i}`, field: '(entire table)', changeType: 'Removed' }));
    }
    const [summary] = generateSummaries(entries);
    expect(summary.narrative.toLowerCase()).toContain('simplification');
  });
});
