/**
 * Shared environment loader for factory scripts.
 *
 * Searches for .env files in standard locations relative to the project root.
 * Replaces hard-coded absolute paths that break on other machines.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';

/**
 * Load environment variables from the nearest .env file.
 * Search order:
 *   1. CWD/.env.local
 *   2. CWD/../../.env.local  (for running from scenarios/factory/)
 *   3. CWD/.env
 *   4. CWD/../../.env
 *   5. __dirname/../../.env  (relative to this file)
 */
export function loadEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '..', '..', '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenvConfig({ path: p });
      return;
    }
  }
  // No .env found — rely on environment variables being set externally
}

/**
 * Load env and return DATABASE_URL, or exit with error if not set.
 */
export function loadEnvOrDie(): string {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: DATABASE_URL not set. Check .env or .env.local');
    process.exit(1);
  }
  return url;
}
