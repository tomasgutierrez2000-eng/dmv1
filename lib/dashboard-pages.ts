/**
 * Centralized Executive Risk Reporting Dashboard — 8-page navigation.
 * Aligns with Data Lineage & Source Mapping Platform (doc): Pages 1–8, optional 9–11.
 */

export type DashboardPageId =
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4'
  | 'P5'
  | 'P6'
  | 'P7'
  | 'P8'
  | 'P9'
  | 'P10'
  | 'P11';

export interface DashboardPageConfig {
  id: DashboardPageId;
  name: string;
  shortName: string;
  /** Route path (empty = same as overview/lineage context). */
  path?: string;
  description: string;
  /** Doc section: main dashboard (1–8) vs optional power-user (9–11). */
  category: 'main' | 'optional';
}

/** Main 8 dashboard pages per functional requirements. */
export const DASHBOARD_PAGES_MAIN: DashboardPageConfig[] = [
  { id: 'P1', name: 'Executive Summary', shortName: 'Executive', path: '/lineage', category: 'main', description: 'High-level KPIs, limit utilization, velocity; Metric Details from Metric Library' },
  { id: 'P2', name: 'Exposure Composition', shortName: 'Exposure', path: '/lineage', category: 'main', description: 'Gross/net exposure, coverage, counterparty analysis' },
  { id: 'P3', name: 'Concentration & Limits', shortName: 'Concentration', path: '/lineage', category: 'main', description: 'Limit utilization, sector concentration, headroom' },
  { id: 'P4', name: 'Legal Entity & Data Integrity', shortName: 'Data Integrity', path: '/data-integrity', category: 'main', description: 'Data Quality Score, Reconciliation Breaks, Attribute DQ, trend (Accuracy Assurance Engine)' },
  { id: 'P5', name: 'Trends & Stress', shortName: 'Stress', path: '/lineage', category: 'main', description: 'Stress testing, threshold breaches' },
  { id: 'P6', name: 'Facility & Events', shortName: 'Facilities', path: '/lineage', category: 'main', description: 'Facility lifecycle, amendments, events' },
  { id: 'P7', name: 'Portfolio Analysis', shortName: 'Portfolio', path: '/lineage', category: 'main', description: 'Deterioration, rating migration, delinquency' },
  { id: 'P8', name: 'Data Export', shortName: 'Data Export', path: '/data-export', category: 'main', description: 'Underlying Records, Summarized Details; lineage metadata (Data Table Library)' },
];

/** Optional Pages 9–11 for power users and stewards. */
export const DASHBOARD_PAGES_OPTIONAL: DashboardPageConfig[] = [
  { id: 'P9', name: 'Metric Library', shortName: 'Metric Library', path: '/metrics/library', category: 'optional', description: 'Browse Metric Library catalog, search, filter, lineage' },
  { id: 'P10', name: 'Data Catalog & Lineage', shortName: 'Data Catalog', path: '/data-catalog', category: 'optional', description: 'Data Table Library browser, schema, quality profiles, lineage graph' },
  { id: 'P11', name: 'Platform Operations', shortName: 'Operations', path: '/platform-operations', category: 'optional', description: 'Feed health, validation scorecard, open issues (Accuracy Dashboard)' },
];

export const DASHBOARD_PAGES_ALL: DashboardPageConfig[] = [
  ...DASHBOARD_PAGES_MAIN,
  ...DASHBOARD_PAGES_OPTIONAL,
];

export const DASHBOARD_PAGE_MAP = new Map(DASHBOARD_PAGES_ALL.map((p) => [p.id, p]));
