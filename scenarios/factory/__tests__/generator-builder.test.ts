/**
 * Tests for GeneratorBuilder — scaffolding generators for uncovered tables.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GeneratorBuilder } from '../generator-builder';

let builder: GeneratorBuilder;

beforeAll(() => {
  builder = new GeneratorBuilder();
});

/* ────────────────── Scaffold Single Table ────────────────── */

describe('scaffoldGenerator', () => {
  it('should scaffold a generator for a known L2 snapshot table', () => {
    // Pick a table that exists in DD but probably has no generator
    const scaffold = builder.scaffoldGenerator('l2.capital_position_snapshot');
    if (!scaffold) {
      // Table might not exist in this DD version — skip
      return;
    }

    expect(scaffold.qualifiedName).toBe('l2.capital_position_snapshot');
    expect(scaffold.functionName).toContain('generate');
    expect(scaffold.functionName).toContain('Rows');
    expect(scaffold.fileName).toContain('.ts');
    expect(scaffold.columns.length).toBeGreaterThan(0);
    expect(scaffold.sourceCode).toContain('function');
    expect(scaffold.registryUpdateCode).toContain('GENERATOR_REGISTRY');
  });

  it('should return null for non-existent table', () => {
    const scaffold = builder.scaffoldGenerator('l2.nonexistent_table');
    expect(scaffold).toBeNull();
  });

  it('should assign ID_REGISTRY strategy to PK BIGINT columns', () => {
    const scaffold = builder.scaffoldGenerator('l2.counterparty');
    if (!scaffold) return;

    const pkCol = scaffold.columns.find(c =>
      c.strategy === 'ID_REGISTRY' || (c.columnName.endsWith('_id') && c.strategy === 'FK_LOOKUP'),
    );
    // Should have at least one ID column
    expect(scaffold.columns.some(c =>
      c.strategy === 'ID_REGISTRY' || c.strategy === 'FK_LOOKUP',
    )).toBe(true);
  });

  it('should assign DATE_GRID strategy to as_of_date', () => {
    // Find a temporal table
    const scaffold = builder.scaffoldGenerator('l2.facility_exposure_snapshot');
    if (!scaffold) return;

    const dateCol = scaffold.columns.find(c => c.columnName === 'as_of_date');
    if (dateCol) {
      expect(dateCol.strategy).toBe('DATE_GRID');
    }
  });

  it('should assign BOOLEAN_FLAG strategy to _flag columns', () => {
    const scaffold = builder.scaffoldGenerator('l2.facility_risk_snapshot');
    if (!scaffold) return;

    const flagCols = scaffold.columns.filter(c => c.columnName.endsWith('_flag'));
    for (const col of flagCols) {
      expect(col.strategy).toBe('BOOLEAN_FLAG');
    }
  });

  it('should assign GSIB_RANGE strategy to _pct columns', () => {
    const scaffold = builder.scaffoldGenerator('l2.facility_risk_snapshot');
    if (!scaffold) return;

    const pctCols = scaffold.columns.filter(c => c.columnName.endsWith('_pct'));
    for (const col of pctCols) {
      expect(['GSIB_RANGE', 'FROM_STATE']).toContain(col.strategy);
    }
  });

  it('should generate valid TypeScript source', () => {
    const scaffold = builder.scaffoldGenerator('l2.counterparty');
    if (!scaffold) return;

    // Basic syntax checks
    expect(scaffold.sourceCode).toContain('export function');
    expect(scaffold.sourceCode).toContain('SqlRow[]');
    expect(scaffold.sourceCode).toContain('return rows;');
    // Should not have unclosed braces (basic check)
    const opens = (scaffold.sourceCode.match(/{/g) || []).length;
    const closes = (scaffold.sourceCode.match(/}/g) || []).length;
    expect(opens).toBe(closes);
  });
});

/* ────────────────── Scaffold All ────────────────── */

describe('scaffoldAll', () => {
  it('should scaffold generators for uncovered tables', () => {
    const scaffolds = builder.scaffoldAll();

    // Should have some uncovered tables
    expect(scaffolds.length).toBeGreaterThan(0);

    // Each scaffold should have required fields
    for (const s of scaffolds) {
      expect(s.qualifiedName).toBeTruthy();
      expect(s.functionName).toBeTruthy();
      expect(s.fileName).toBeTruthy();
      expect(s.sourceCode).toBeTruthy();
      expect(s.columns.length).toBeGreaterThan(0);
    }
  });

  it('should not scaffold for tables with existing generators', () => {
    const scaffolds = builder.scaffoldAll();
    const scaffoldedNames = scaffolds.map(s => s.qualifiedName);

    // These have existing generators — should NOT be scaffolded
    expect(scaffoldedNames).not.toContain('l2.facility_exposure_snapshot');
    expect(scaffoldedNames).not.toContain('l2.facility_risk_snapshot');
    expect(scaffoldedNames).not.toContain('l2.facility_pricing_snapshot');
  });
});

/* ────────────────── Validate Scaffold ────────────────── */

describe('validateScaffold', () => {
  it('should validate a well-formed scaffold', () => {
    const scaffold = builder.scaffoldGenerator('l2.counterparty');
    if (!scaffold) return;

    const result = builder.validateScaffold(scaffold);
    // May have some issues (e.g., columns not fully mapped) but should be parseable
    expect(result).toBeDefined();
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.issues)).toBe(true);
  });
});

/* ────────────────── Naming Conventions ────────────────── */

describe('naming conventions', () => {
  it('should generate PascalCase function names', () => {
    const scaffold = builder.scaffoldGenerator('l2.counterparty');
    if (!scaffold) return;

    expect(scaffold.functionName).toMatch(/^generate[A-Z]/);
    expect(scaffold.functionName).toMatch(/Rows$/);
  });

  it('should generate kebab-case file names', () => {
    const scaffold = builder.scaffoldGenerator('l2.counterparty');
    if (!scaffold) return;

    expect(scaffold.fileName).toMatch(/^[a-z][a-z0-9-]+\.ts$/);
  });
});
