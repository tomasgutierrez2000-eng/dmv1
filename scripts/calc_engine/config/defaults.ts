/**
 * GSIB Calculation Engine — Default Constants
 */

export const ENGINE_VERSION = '0.1.0';

export const DEFAULT_POOL_SIZE = 5;
export const DEFAULT_STATEMENT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 3_000;
export const DEFAULT_BASE_CURRENCY = 'USD';

/** Transient PostgreSQL error codes that warrant retry */
export const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  '57P01',    // admin_shutdown
  '57P02',    // crash_shutdown
  '57P03',    // cannot_connect_now
  '08006',    // connection_failure
  '08001',    // sqlclient_unable_to_establish_sqlconnection
]);
