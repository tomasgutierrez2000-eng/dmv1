/**
 * Shared color and style constants for the deep-dive hierarchy overview
 * and calculation walkthrough components.
 */

import type { StepType } from '@/lib/deep-dive/lineage-parser';

/** Layer-based color scheme (matching LineageExplorer / MetricDetailView). */
export const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; fill: string; stroke: string }> = {
  L1:        { bg: 'bg-blue-950/60',    border: 'border-blue-500/40',    text: 'text-blue-300',    fill: '#1e3a5f', stroke: '#3b82f6' },
  L2:        { bg: 'bg-amber-950/60',   border: 'border-amber-500/40',   text: 'text-amber-300',   fill: '#422006', stroke: '#f59e0b' },
  L3:        { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300', fill: '#064e3b', stroke: '#10b981' },
  transform: { bg: 'bg-purple-950/60',  border: 'border-purple-500/40',  text: 'text-purple-300',  fill: '#3b0764', stroke: '#a855f7' },
};

/** Step type badge colors for SOURCING / CALCULATION / HYBRID / OUTPUT. */
export const STEP_TYPE_STYLES: Record<StepType | 'OUTPUT', { bg: string; text: string; border: string; label: string }> = {
  SOURCING:    { bg: 'bg-blue-500/20',    text: 'text-blue-300',    border: 'border-blue-500/40',    label: 'SOURCING' },
  CALCULATION: { bg: 'bg-purple-500/20',  text: 'text-purple-300',  border: 'border-purple-500/40',  label: 'CALCULATION' },
  HYBRID:      { bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/40',   label: 'HYBRID' },
  OUTPUT:      { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', label: 'OUTPUT' },
};

/** SVG colors for tier nodes (hex values for use in SVG fill/stroke). */
export const TIER_SVG = {
  default:  { fill: '#1a1625', stroke: '#6b21a8', textFill: '#c4b5fd' },  // purple tones
  selected: { fill: '#2e1065', stroke: '#a855f7', textFill: '#e9d5ff' },  // bright purple
  dimmed:   { fill: '#0f0b1a', stroke: '#3b0764', textFill: '#6b7280' },  // very muted
};

/** SVG colors for source table pills by layer. */
export const TABLE_PILL_SVG: Record<string, { fill: string; stroke: string; textFill: string }> = {
  L1: { fill: '#172554', stroke: '#3b82f6', textFill: '#93c5fd' },
  L2: { fill: '#451a03', stroke: '#f59e0b', textFill: '#fcd34d' },
};

/** Shared SVG constants for layout. */
export const LAYOUT = {
  TIER_W: 160,
  TIER_H: 56,
  TABLE_W: 148,
  TABLE_H: 30,
  TABLE_FIELD_H: 18,
  COL_GAP: 72,
  ROW_GAP: 10,
  PADDING: 24,
  ARROW_SIZE: 6,
} as const;
