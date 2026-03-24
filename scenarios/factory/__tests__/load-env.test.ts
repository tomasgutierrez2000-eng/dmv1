/**
 * Tests for shared environment loader.
 */

import { loadEnv } from '../load-env';

describe('loadEnv', () => {
  test('does not throw when no .env files exist', () => {
    // loadEnv should gracefully handle missing files
    expect(() => loadEnv()).not.toThrow();
  });

  test('does not overwrite existing environment variables', () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'test://existing';
    loadEnv();
    // dotenv does not overwrite existing env vars by default
    expect(process.env.DATABASE_URL).toBe('test://existing');
    // Restore
    if (original !== undefined) {
      process.env.DATABASE_URL = original;
    } else {
      delete process.env.DATABASE_URL;
    }
  });
});
