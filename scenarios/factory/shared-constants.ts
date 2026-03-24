/**
 * Shared constants for the data factory — single source of truth.
 *
 * These constants are used by both generators (enrichment) and validators.
 * Having them in one file prevents drift between production and validation code.
 */

/**
 * Valid entity type codes from l1.entity_type_dim.
 * All 12 Basel III exposure classes.
 */
export const VALID_ENTITY_TYPE_CODES = new Set([
  'BANK', 'CORP', 'FI', 'FUND', 'INS', 'MDB',
  'OTH', 'PE', 'PSE', 'RE', 'SOV', 'SPE',
]);

/**
 * Valid NAICS 2-digit industry codes from l1.industry_dim.
 * These are the only codes that exist in the dim table — internal factory
 * IDs (1-10) must be mapped to these codes before emitting counterparty rows.
 */
export const VALID_NAICS_CODES = new Set([
  11, 21, 22, 23, 31, 32, 33, 42, 44, 45,
  48, 49, 51, 52, 53, 54, 55, 56, 61, 62,
  71, 72, 81, 92,
]);

/**
 * FFIEC-standard DPD bucket codes from l1.dpd_bucket_dim.
 * Old codes ('0-30', '31-60', '61-90') are no longer valid.
 */
export const VALID_DPD_CODES = new Set([
  'CURRENT', '1-29', '30-59', '60-89', '90+',
]);
