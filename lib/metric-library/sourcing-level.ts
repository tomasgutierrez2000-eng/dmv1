/**
 * Sourcing Level Architecture — config for atomic level and category display.
 * Aligns with "where the bank provides each metric" and "reconciliation anchors."
 */

import type { RollupLevelKey, SourcingCategory } from './types';
import { ROLLUP_LEVEL_LABELS } from './types';

/** Display labels for sourcing level (same as rollup hierarchy). */
export const SOURCING_LEVEL_LABELS = ROLLUP_LEVEL_LABELS;

export interface SourcingCategoryConfig {
  id: SourcingCategory;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}

export const SOURCING_CATEGORIES: Record<SourcingCategory, SourcingCategoryConfig> = {
  obligor: {
    id: 'obligor',
    label: 'Obligor-Level → Your Rollup',
    shortLabel: 'Obligor',
    description: 'Source at counterparty. Inherit to facilities. You roll up to all higher levels.',
    color: '#2563eb',
  },
  facility: {
    id: 'facility',
    label: 'Facility-Level → Your Rollup',
    shortLabel: 'Facility',
    description: 'Source at facility. You roll up to counterparty and all higher levels.',
    color: '#059669',
  },
  facility_with_exceptions: {
    id: 'facility_with_exceptions',
    label: 'Facility + Aggregate Anchor',
    shortLabel: 'Facility + Anchor',
    description: 'Source at facility AND source aggregate-level anchor for reconciliation.',
    color: '#7c3aed',
  },
  dual_level: {
    id: 'dual_level',
    label: 'Dual-Level (Atomic + Enterprise Anchor)',
    shortLabel: 'Dual-Level',
    description: 'Source at atomic level AND at enterprise/portfolio level. The gap reveals overlay or scope issues.',
    color: '#dc2626',
  },
  flexible_level: {
    id: 'flexible_level',
    label: 'Flexible Level (Bank-Dependent)',
    shortLabel: 'Flexible',
    description: 'Source at the lowest level the bank provides. May be facility, desk, or LoB.',
    color: '#b45309',
  },
  configuration: {
    id: 'configuration',
    label: 'Configuration Data',
    shortLabel: 'Config',
    description: 'Not a metric — reference data that defines limits, thresholds, and governance rules.',
    color: '#6b7280',
  },
};

export function getSourcingLevelLabel(level: RollupLevelKey | undefined): string {
  if (!level) return '—';
  return SOURCING_LEVEL_LABELS[level] ?? level;
}

export function getSourcingCategoryConfig(category: SourcingCategory | undefined): SourcingCategoryConfig | null {
  if (!category) return null;
  return SOURCING_CATEGORIES[category] ?? null;
}
