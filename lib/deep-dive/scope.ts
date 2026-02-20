export const DEEP_DIVE_METRIC_IDS = [
  'C100',
  'C101',
  'C102',
  'C103',
  'C104',
  'C105',
  'C106',
  'C107',
] as const;

const set = new Set<string>(DEEP_DIVE_METRIC_IDS);

export function isDeepDiveMetric(metricId: string): boolean {
  return set.has(metricId);
}
