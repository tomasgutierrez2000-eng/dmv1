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
 * Valid DPD bucket codes — L1 dpd_bucket_dim PK values.
 * These are the codes as stored in PostgreSQL, not the factory's internal names.
 * Factory internal → L1 PK mapping is done in v2/types.ts DPD_BUCKET_CODE_MAP.
 */
export const VALID_DPD_CODES = new Set([
  '0-30', '1-29', '31-60', '61-90', '90+',
]);
