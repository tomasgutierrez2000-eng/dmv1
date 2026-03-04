import type { RiskStripe } from '../types/model';

/** Maps L1 category names to risk stripes */
const L1_CATEGORY_TO_STRIPE: Record<string, RiskStripe> = {
  'Reference': 'Reference',
  'Date & time': 'Reference',
  'Source & taxonomy': 'Reference',
  'Entity masters': 'Reference',
  'Hierarchies & participation': 'Reference',
  'Facility & agreement': 'Credit',
  'Netting, collateral & CRM': 'Credit',
  'Limits & FX': 'Credit',
  'Run & reporting': 'Other',
};

/** Maps L2 category names to risk stripes */
const L2_CATEGORY_TO_STRIPE: Record<string, RiskStripe> = {
  'Position & exposure': 'Credit',
  'Exposure & collateral snapshots': 'Credit',
  'Facility snapshots': 'Credit',
  'Limits': 'Credit',
  'Events & amendments': 'Credit',
  'Credit events': 'Credit',
  'Stress test & pipeline': 'Credit',
  'Ratings & metrics': 'Credit',
  'Exceptions & data quality': 'Other',
};

/** L3 categories that map to Other; everything else defaults to Credit */
const L3_OTHER_CATEGORIES = new Set(['Data Quality']);

/**
 * Determine the default risk stripe for a table based on its layer and category.
 * Used to fill in tables that don't have an explicit riskStripe from the overlay.
 */
export function getRiskStripeForTable(
  layer: 'L1' | 'L2' | 'L3',
  category: string,
): RiskStripe {
  if (layer === 'L1') return L1_CATEGORY_TO_STRIPE[category] ?? 'Other';
  if (layer === 'L2') return L2_CATEGORY_TO_STRIPE[category] ?? 'Credit';
  // L3: all credit risk output except Data Quality
  return L3_OTHER_CATEGORIES.has(category) ? 'Other' : 'Credit';
}
