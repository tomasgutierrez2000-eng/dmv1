import { describe, it, expect } from 'vitest';
import { normalizeCaughtError } from '../api-response';

describe('normalizeCaughtError', () => {
  it('normalizes read-only FS error', () => {
    const err = new Error('EROFS: read-only file system');
    (err as any).code = 'EROFS';
    const result = normalizeCaughtError(err);
    expect(result.status).toBe(503);
    expect(result.code).toBe('READ_ONLY_FS');
  });

  it('normalizes ENOENT to 404', () => {
    const result = normalizeCaughtError(new Error('ENOENT: no such file or directory'));
    expect(result.status).toBe(404);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('normalizes "no such file" to 404', () => {
    const result = normalizeCaughtError(new Error('no such file found'));
    expect(result.status).toBe(404);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('normalizes permission error to 503', () => {
    const result = normalizeCaughtError(new Error('EACCES: permission denied'));
    expect(result.status).toBe(503);
    expect(result.code).toBe('EACCES');
  });

  it('normalizes rate limit error to 429', () => {
    const result = normalizeCaughtError(new Error('429 rate limit exceeded'));
    expect(result.status).toBe(429);
    expect(result.code).toBe('RATE_LIMIT');
  });

  it('normalizes quota error to 429', () => {
    const result = normalizeCaughtError(new Error('API quota exceeded'));
    expect(result.status).toBe(429);
    expect(result.code).toBe('RATE_LIMIT');
  });

  it('normalizes API key error to 401', () => {
    const result = normalizeCaughtError(new Error('401 invalid_api_key'));
    expect(result.status).toBe(401);
    expect(result.code).toBe('AUTH');
  });

  // PostgreSQL errors
  it('normalizes PG undefined table (42P01) to 400', () => {
    const err = new Error('relation "l2.missing_table" does not exist');
    (err as any).code = '42P01';
    const result = normalizeCaughtError(err);
    expect(result.status).toBe(400);
    expect(result.code).toBe('PG_NOT_FOUND');
  });

  it('normalizes PG undefined column (42703) to 400', () => {
    // Note: "does not exist" in message matches 42P01 check first,
    // so use a message that only triggers the 42703 code path
    const err = new Error('column "bad_col" not recognized');
    (err as any).code = '42703';
    const result = normalizeCaughtError(err);
    expect(result.status).toBe(400);
    expect(result.code).toBe('PG_COLUMN_NOT_FOUND');
  });

  it('normalizes PG syntax error (42601) to 400', () => {
    const err = new Error('syntax error at or near "FROM"');
    (err as any).code = '42601';
    const result = normalizeCaughtError(err);
    expect(result.status).toBe(400);
    expect(result.code).toBe('PG_SYNTAX_ERROR');
  });

  it('normalizes PG type mismatch (42804) to 400', () => {
    const err = new Error('cannot compare types');
    (err as any).code = '42804';
    const result = normalizeCaughtError(err);
    expect(result.status).toBe(400);
    expect(result.code).toBe('PG_TYPE_MISMATCH');
  });

  it('normalizes PG statement timeout (57014) to 408', () => {
    const err = new Error('canceling statement due to statement timeout');
    (err as any).code = '57014';
    const result = normalizeCaughtError(err);
    expect(result.status).toBe(408);
    expect(result.code).toBe('PG_TIMEOUT');
  });

  it('normalizes DB connection errors to 503', () => {
    const err = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    (err as any).code = 'ECONNREFUSED';
    const result = normalizeCaughtError(err);
    expect(result.status).toBe(503);
    expect(result.code).toBe('DB_UNAVAILABLE');
  });

  it('normalizes unknown PG error with code', () => {
    const err = new Error('some pg error');
    (err as any).code = '23505';
    const result = normalizeCaughtError(err);
    expect(result.status).toBe(400);
    expect(result.code).toBe('PG_23505');
  });

  it('defaults to 500 for unknown errors', () => {
    const result = normalizeCaughtError(new Error('something unexpected'));
    expect(result.status).toBe(500);
    expect(result.message).toBe('An unexpected error occurred');
  });

  it('handles non-Error values (strings)', () => {
    const result = normalizeCaughtError('string error');
    expect(result.status).toBe(500);
  });

  it('handles non-Error values (null)', () => {
    const result = normalizeCaughtError(null);
    expect(result.status).toBe(500);
  });
});
