import { describe, it, expect } from 'vitest';
import { getRiskStripeForTable } from '../risk-stripe-assignments';

describe('getRiskStripeForTable', () => {
  // L1 mappings
  it('L1 Reference → Reference', () => {
    expect(getRiskStripeForTable('L1', 'Reference')).toBe('Reference');
  });

  it('L1 Date & time → Reference', () => {
    expect(getRiskStripeForTable('L1', 'Date & time')).toBe('Reference');
  });

  it('L1 Facility & agreement → Credit', () => {
    expect(getRiskStripeForTable('L1', 'Facility & agreement')).toBe('Credit');
  });

  it('L1 Netting, collateral & CRM → Credit', () => {
    expect(getRiskStripeForTable('L1', 'Netting, collateral & CRM')).toBe('Credit');
  });

  it('L1 Run & reporting → Other', () => {
    expect(getRiskStripeForTable('L1', 'Run & reporting')).toBe('Other');
  });

  it('L1 unknown category → Other', () => {
    expect(getRiskStripeForTable('L1', 'UnknownCategory')).toBe('Other');
  });

  // L2 mappings
  it('L2 Position & exposure → Credit', () => {
    expect(getRiskStripeForTable('L2', 'Position & exposure')).toBe('Credit');
  });

  it('L2 Exceptions & data quality → Other', () => {
    expect(getRiskStripeForTable('L2', 'Exceptions & data quality')).toBe('Other');
  });

  it('L2 unknown category defaults to Credit', () => {
    expect(getRiskStripeForTable('L2', 'SomeNewCategory')).toBe('Credit');
  });

  // L3 mappings
  it('L3 Data Quality → Other', () => {
    expect(getRiskStripeForTable('L3', 'Data Quality')).toBe('Other');
  });

  it('L3 anything else → Credit', () => {
    expect(getRiskStripeForTable('L3', 'Metrics')).toBe('Credit');
    expect(getRiskStripeForTable('L3', 'Aggregations')).toBe('Credit');
  });

  // Edge cases
  it('empty category string → falls through to default', () => {
    expect(getRiskStripeForTable('L1', '')).toBe('Other');
    expect(getRiskStripeForTable('L2', '')).toBe('Credit');
    expect(getRiskStripeForTable('L3', '')).toBe('Credit');
  });
});
