/**
 * GSIB Calculation Engine — Runtime Configuration
 */

import type { EngineConfig } from '../types';
import {
  DEFAULT_POOL_SIZE,
  DEFAULT_STATEMENT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
} from './defaults';

export function loadEngineConfig(overrides: Partial<EngineConfig> = {}): EngineConfig {
  const databaseUrl = overrides.databaseUrl ?? process.env.DATABASE_URL ?? '';

  return {
    databaseUrl,
    poolSize: overrides.poolSize ?? DEFAULT_POOL_SIZE,
    statementTimeoutMs: overrides.statementTimeoutMs ?? DEFAULT_STATEMENT_TIMEOUT_MS,
    maxRetriesOnConnError: overrides.maxRetriesOnConnError ?? DEFAULT_MAX_RETRIES,
    retryDelayMs: overrides.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    continueOnError: overrides.continueOnError ?? true,
    dryRun: overrides.dryRun ?? false,
    verbose: overrides.verbose ?? false,
  };
}
