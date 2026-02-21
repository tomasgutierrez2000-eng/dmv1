/**
 * Calculation Authority — T1/T2/T3 tier reference for display and glossary.
 * T1 = Always Source, T2 = Source + Calculate to validate, T3 = Always Calculate.
 */

import type { CalculationAuthorityTier } from './types';

export interface CalculationAuthorityTierConfig {
  id: CalculationAuthorityTier;
  name: string;
  subtitle: string;
  shortDescription: string;
  color: string;
  bgLight: string;
  icon: string;
  /** Optional: full criteria and product value for "What does T1/T2/T3 mean?" blurb. */
  criteria?: string[];
  productValue?: string[];
  longTermEvolution?: string;
}

export const CALCULATION_AUTHORITY_TIERS: Record<CalculationAuthorityTier, CalculationAuthorityTierConfig> = {
  T1: {
    id: 'T1',
    name: 'Always Source',
    subtitle: 'Black Box — Regulatory Model Outputs',
    shortDescription:
      'The bank has regulatory-grade models. You ingest, validate, version, aggregate, compare, and alert. You do not replicate the model.',
    color: '#1e40af',
    bgLight: '#dbeafe',
    icon: '🔒',
    criteria: [
      'Output of a regulatory-validated model (SR 11-7)',
      'Model is examined / challenged by regulators',
      'Replication would require 3-5 years + $10M+ investment',
      "Bank would never trust a vendor's version over their own",
    ],
    productValue: [
      'Versioned historical storage',
      'Cross-system reconciliation',
      'Automated validation rules (staleness, range, consistency)',
      'Decomposition (e.g. PD change — credit migration or model recalibration?)',
      'Data quality scoring and alerting',
      'Lineage tracing back to source system',
    ],
    longTermEvolution:
      'Even for Always Source metrics, you may eventually ingest the COMPONENT DATA that feeds the model. You do not replicate the model, but you can validate its inputs and detect drift.',
  },
  T2: {
    id: 'T2',
    name: 'Source First → Calculate to Validate',
    subtitle: 'High-Value Reconciliation Layer',
    shortDescription:
      'The bank calculates these and you consume their answer, but you also have (or can get) the underlying components. Your move: calculate independently and RECONCILE against the bank’s number.',
    color: '#7c3aed',
    bgLight: '#ede9fe',
    icon: '🔄',
    criteria: [
      'Formula is well-defined and standardized (not proprietary model)',
      'Component data is available or obtainable in your data model',
      'Multiple systems at the bank may calculate it differently',
      'Calculation transparency and audit trail add significant value',
    ],
    productValue: [
      'Independent calculation creates a RECONCILIATION LAYER',
      'Catches data quality issues (e.g. different NOI in DSCR vs LTV)',
      'Full audit trail: every input → every step → final number',
      "Enables 'what-if' analysis",
      'Standardizes methodology across desks',
      "Creates the 'golden source' the bank may not have had",
    ],
    longTermEvolution:
      'This tier is a primary differentiator. Over time, some banks may switch from sourcing the bank’s number to trusting YOUR calculation as the golden source.',
  },
  T3: {
    id: 'T3',
    name: 'Always Calculate',
    subtitle: 'Pure Math on Data Already in Model',
    shortDescription:
      'These metrics are derived entirely from data already in your model. There is nothing to source — they are aggregations, ratios, distributions, and derived analytics that your product computes natively.',
    color: '#059669',
    bgLight: '#d1fae5',
    icon: '⚙️',
    criteria: [
      'All inputs are already in your data model',
      'No external model or proprietary methodology involved',
      'The formula is straightforward math (sum, ratio, weighted average, distribution)',
      'Value is in automation, consistency, and real-time availability',
    ],
    productValue: [
      'Automation of manual/Excel-based portfolio analytics',
      'Real-time (or near-real-time) vs. monthly manual runs',
      'Consistency guarantee (same formula every time, at every level)',
      'Rollup logic is encoded and governed',
      'Powers the dashboard layer directly',
    ],
    longTermEvolution:
      'As the data model grows, more metrics migrate here. Everything that CAN be calculated from components, IS calculated — with sourced values used as reconciliation benchmarks.',
  },
};

export const INTEGRATION_PATTERN_LABELS: Record<string, string> = {
  PUSH: 'GSIB sends to us (Push)',
  PULL: 'We request from GSIB (Pull)',
};

export function getTierConfig(tier: CalculationAuthorityTier | undefined): CalculationAuthorityTierConfig | null {
  if (!tier) return null;
  return CALCULATION_AUTHORITY_TIERS[tier] ?? null;
}
