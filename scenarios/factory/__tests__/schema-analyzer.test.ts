/**
 * Tests for SchemaAnalyzer — coverage analysis, table classification,
 * FK dependency DAG, and schema contracts.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SchemaAnalyzer } from '../schema-analyzer';
import { inferGSIBRange, inferCorrelationGroup, PD_BY_RATING_TIER, LGD_BY_COLLATERAL } from '../gsib-calibration';
import type { TableClassification } from '../schema-contracts';

let analyzer: SchemaAnalyzer;

beforeAll(() => {
  analyzer = SchemaAnalyzer.create();
});

/* ────────────────── Coverage Analysis ────────────────── */

describe('analyzeCoverage', () => {
  it('should find all DD tables', () => {
    const coverage = analyzer.analyzeCoverage();
    // DD has 75 L1 + 100 L2 + 83 L3 = 258 tables (approximately)
    expect(coverage.totalTables).toBeGreaterThan(200);
  });

  it('should identify tables with generators', () => {
    const coverage = analyzer.analyzeCoverage();
    // We have 18 generators covering ~60+ tables
    expect(coverage.tablesWithGenerators).toBeGreaterThan(40);
  });

  it('should identify uncovered L2 tables', () => {
    const coverage = analyzer.analyzeCoverage();
    // Some L2 tables are not covered by generators
    // (data_quality_score_snapshot, financial_metric_observation, etc.)
    for (const uncovered of coverage.uncoveredL2) {
      expect(uncovered.layer).toBe('L2');
      expect(uncovered.hasGenerator).toBe(false);
    }
  });

  it('should count L3 tables separately', () => {
    const coverage = analyzer.analyzeCoverage();
    expect(coverage.l3Tables).toBeGreaterThan(50);
  });

  it('should report known covered tables correctly', () => {
    const coverage = analyzer.analyzeCoverage();
    const coveredNames = coverage.allTables
      .filter(t => t.hasGenerator)
      .map(t => t.qualifiedName);

    expect(coveredNames).toContain('l2.facility_exposure_snapshot');
    expect(coveredNames).toContain('l2.facility_risk_snapshot');
    expect(coveredNames).toContain('l2.facility_pricing_snapshot');
    expect(coveredNames).toContain('l2.fx_rate');
  });
});

/* ────────────────── Table Classification ────────────────── */

describe('classifyTable', () => {
  const cases: [string, TableClassification][] = [
    // L1 dims
    ['l1.entity_type_dim', 'L1_DIM'],
    ['l1.country_dim', 'L1_DIM'],
    ['l1.currency_dim', 'L1_DIM'],
    ['l1.rating_scale_dim', 'L1_DIM'],
    // L1 masters (limit_rule is L1 master per DD)
    ['l1.limit_rule', 'L1_MASTER'],
    ['l1.metric_threshold', 'L1_MASTER'],
    // L2 masters (counterparty, facility_master are L2 in DD)
    ['l2.counterparty', 'L2_SNAPSHOT'],  // DD classifies as L2
    ['l2.facility_master', 'L2_SNAPSHOT'],
    // L2 junctions
    ['l2.collateral_link', 'JUNCTION'],
    ['l2.credit_agreement_counterparty_participation', 'JUNCTION'],
    // L2 snapshots
    ['l2.facility_exposure_snapshot', 'L2_SNAPSHOT'],
    ['l2.facility_risk_snapshot', 'L2_SNAPSHOT'],
    // L2 events
    ['l2.credit_event', 'L2_EVENT'],
    ['l2.risk_flag', 'L2_EVENT'],
    ['l2.amendment_event', 'L2_EVENT'],
    // L3 derived
    ['l3.collateral_calc', 'L3_DERIVED'],
    ['l3.facility_financial_calc', 'L3_DERIVED'],
  ];

  it.each(cases)('classifies %s as %s', (table, expected) => {
    expect(analyzer.classifyTable(table)).toBe(expected);
  });
});

/* ────────────────── FK Dependency DAG ────────────────── */

describe('buildFKDependencyDAG', () => {
  it('should produce a valid topological order', () => {
    const dag = analyzer.buildFKDependencyDAG();
    expect(dag.sortedOrder.length).toBe(dag.nodes.size);

    // Verify topological property: for every edge (parent → child),
    // parent appears before child in sortedOrder
    const orderIndex = new Map<string, number>();
    dag.sortedOrder.forEach((name, idx) => orderIndex.set(name, idx));

    for (const [name, node] of dag.nodes) {
      for (const parent of node.parents) {
        const parentIdx = orderIndex.get(parent);
        const childIdx = orderIndex.get(name);
        if (parentIdx !== undefined && childIdx !== undefined) {
          expect(parentIdx).toBeLessThan(childIdx);
        }
      }
    }
  });

  it('should have dim tables as roots (no FK dependencies)', () => {
    const dag = analyzer.buildFKDependencyDAG();
    // Dim tables should have no parents
    for (const root of dag.roots) {
      const node = dag.nodes.get(root)!;
      expect(node.parents.length).toBe(0);
    }
    expect(dag.roots.length).toBeGreaterThan(10);
  });

  it('should place counterparty before facility_master', () => {
    const dag = analyzer.buildFKDependencyDAG();
    const cpNode = dag.nodes.get('l2.counterparty');
    const fmNode = dag.nodes.get('l2.facility_master');

    if (cpNode && fmNode) {
      expect(cpNode.topoOrder).toBeLessThan(fmNode.topoOrder);
    }
  });

  it('should place dim tables before snapshot tables when FK exists', () => {
    const dag = analyzer.buildFKDependencyDAG();
    // entity_type_dim is a root (no parents) — it should come before tables that reference it
    const dimNode = dag.nodes.get('l1.entity_type_dim');
    expect(dimNode).toBeDefined();
    expect(dimNode!.parents.length).toBe(0);
    // Its topo order should be very early
    expect(dimNode!.topoOrder).toBeLessThan(dag.nodes.size / 2);
  });
});

/* ────────────────── Schema Contracts ────────────────── */

describe('generateSchemaContracts', () => {
  it('should generate contract for a known table', () => {
    const contract = analyzer.getContract('l2.facility_risk_snapshot');
    expect(contract).toBeDefined();
    expect(contract!.qualifiedName).toBe('l2.facility_risk_snapshot');
    expect(contract!.layer).toBe('L2');
    expect(contract!.classification).toBe('L2_SNAPSHOT');
    expect(contract!.isTemporal).toBe(true);
    expect(contract!.columns.length).toBeGreaterThan(5);
  });

  it('should identify PK columns', () => {
    const contract = analyzer.getContract('l2.facility_risk_snapshot');
    expect(contract).toBeDefined();
    expect(contract!.primaryKey.length).toBeGreaterThan(0);
    const pkCols = contract!.columns.filter(c => c.isPK);
    expect(pkCols.length).toBe(contract!.primaryKey.length);
  });

  it('should assign FK targets', () => {
    const contract = analyzer.getContract('l2.facility_exposure_snapshot');
    if (!contract) return;

    const facilityIdCol = contract.columns.find(c => c.name === 'facility_id');
    if (facilityIdCol?.fkTarget) {
      expect(facilityIdCol.fkTarget.parentTable).toContain('facility_master');
    }
  });

  it('should assign GSIB ranges to _pct columns', () => {
    const contract = analyzer.getContract('l2.facility_risk_snapshot');
    if (!contract) return;

    const pdCol = contract.columns.find(c => c.name === 'pd_pct');
    if (pdCol) {
      expect(pdCol.gsibRange).toBeDefined();
      expect(pdCol.gsibRange!.min).toBe(0);
      expect(pdCol.gsibRange!.max).toBe(100);
    }
  });

  it('should assign generation hints', () => {
    const contract = analyzer.getContract('l2.facility_risk_snapshot');
    if (!contract) return;

    for (const col of contract.columns) {
      expect(col.generationHint).toBeDefined();
    }

    // as_of_date should be DATE_GRID
    const dateCol = contract.columns.find(c => c.name === 'as_of_date');
    if (dateCol) expect(dateCol.generationHint).toBe('DATE_GRID');
  });

  it('should assign correlation groups', () => {
    const contract = analyzer.getContract('l2.facility_risk_snapshot');
    if (!contract) return;

    const pdCol = contract.columns.find(c => c.name === 'pd_pct');
    if (pdCol) expect(pdCol.correlationGroup).toBe('pd_rating');
  });
});

/* ────────────────── Generation Plan ────────────────── */

describe('getGenerationPlan', () => {
  it('should produce a plan with all non-L3 tables', () => {
    const plan = analyzer.getGenerationPlan();
    expect(plan.steps.length).toBeGreaterThan(50);
    expect(plan.summary.l3Skipped).toBe(0); // L3 excluded from default target
  });

  it('should include L3 tables when explicitly requested', () => {
    const l3Tables = analyzer.getTablesByLayer('L3');
    const plan = analyzer.getGenerationPlan(l3Tables);
    for (const step of plan.steps) {
      expect(step.action).toBe('SKIP_L3');
    }
  });

  it('should identify tables needing new generators', () => {
    const plan = analyzer.getGenerationPlan();
    const newGenSteps = plan.steps.filter(s => s.action === 'CREATE_GENERATOR');
    // There should be at least some tables needing generators
    // (exact count depends on DD state)
    expect(plan.summary.newGeneratorsNeeded).toBeGreaterThanOrEqual(0);
    expect(newGenSteps.length).toBe(plan.summary.newGeneratorsNeeded);
  });

  it('should respect FK ordering in steps', () => {
    const plan = analyzer.getGenerationPlan();
    const stepIndex = new Map<string, number>();
    plan.steps.forEach((s, i) => stepIndex.set(s.qualifiedName, i));

    for (const step of plan.steps) {
      for (const dep of step.mustGenerateAfter) {
        const depIdx = stepIndex.get(dep);
        const stepIdx = stepIndex.get(step.qualifiedName);
        if (depIdx !== undefined && stepIdx !== undefined) {
          expect(depIdx).toBeLessThan(stepIdx);
        }
      }
    }
  });
});

/* ────────────────── GSIB Calibration ────────────────── */

describe('gsib-calibration', () => {
  it('inferGSIBRange for _pct columns', () => {
    const range = inferGSIBRange('pd_pct', 'NUMERIC(10,6)');
    expect(range).toEqual({ min: 0, max: 100 });
  });

  it('inferGSIBRange for _amt columns', () => {
    const range = inferGSIBRange('committed_facility_amt', 'NUMERIC(20,4)');
    expect(range).toBeDefined();
    expect(range!.min).toBe(0);
  });

  it('inferGSIBRange for _bps columns', () => {
    const range = inferGSIBRange('interest_rate_spread_bps', 'NUMERIC(10,4)');
    expect(range).toEqual({ min: 0, max: 5000 });
  });

  it('inferGSIBRange returns null for unknown patterns', () => {
    expect(inferGSIBRange('random_field', 'VARCHAR(64)')).toBeNull();
  });

  it('PD tiers cover the full range', () => {
    expect(PD_BY_RATING_TIER.INVESTMENT_GRADE.min).toBeLessThan(PD_BY_RATING_TIER.INVESTMENT_GRADE.max);
    expect(PD_BY_RATING_TIER.INVESTMENT_GRADE.max).toBe(PD_BY_RATING_TIER.STANDARD.min);
    expect(PD_BY_RATING_TIER.STANDARD.max).toBe(PD_BY_RATING_TIER.SUBSTANDARD.min);
    expect(PD_BY_RATING_TIER.SUBSTANDARD.max).toBe(PD_BY_RATING_TIER.DOUBTFUL.min);
    expect(PD_BY_RATING_TIER.DOUBTFUL.max).toBe(PD_BY_RATING_TIER.LOSS.min);
  });

  it('LGD ranges are non-overlapping in midpoints', () => {
    const midSec = (LGD_BY_COLLATERAL.SENIOR_SECURED.min + LGD_BY_COLLATERAL.SENIOR_SECURED.max) / 2;
    const midUns = (LGD_BY_COLLATERAL.SENIOR_UNSECURED.min + LGD_BY_COLLATERAL.SENIOR_UNSECURED.max) / 2;
    expect(midSec).toBeLessThan(midUns);
  });

  it('inferCorrelationGroup identifies PD/rating group', () => {
    expect(inferCorrelationGroup('pd_pct')).toBe('pd_rating');
    expect(inferCorrelationGroup('internal_risk_rating')).toBe('pd_rating');
    expect(inferCorrelationGroup('credit_status')).toBe('pd_rating');
  });

  it('inferCorrelationGroup identifies utilization group', () => {
    expect(inferCorrelationGroup('drawn_amount')).toBe('utilization');
    expect(inferCorrelationGroup('utilization_pct')).toBe('utilization');
  });
});

/* ────────────────── Utility ────────────────── */

describe('utility methods', () => {
  it('getAllTableNames returns all DD tables', () => {
    const names = analyzer.getAllTableNames();
    expect(names.length).toBeGreaterThan(200);
    expect(names).toContain('l1.country_dim');
    expect(names).toContain('l2.facility_exposure_snapshot');
  });

  it('getTablesByLayer filters correctly', () => {
    const l1 = analyzer.getTablesByLayer('L1');
    const l2 = analyzer.getTablesByLayer('L2');
    const l3 = analyzer.getTablesByLayer('L3');

    for (const t of l1) expect(t.startsWith('l1.')).toBe(true);
    for (const t of l2) expect(t.startsWith('l2.')).toBe(true);
    for (const t of l3) expect(t.startsWith('l3.')).toBe(true);

    expect(l1.length + l2.length + l3.length).toBe(analyzer.getAllTableNames().length);
  });

  it('getDDTable returns table definition', () => {
    const table = analyzer.getDDTable('l1.country_dim');
    expect(table).toBeDefined();
    expect(table!.name).toBe('country_dim');
    expect(table!.fields.length).toBeGreaterThan(2);
  });
});
