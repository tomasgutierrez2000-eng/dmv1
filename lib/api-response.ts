/**
 * Standard API response shapes and helpers for Next.js route handlers.
 * Use for consistent success/error bodies and status codes.
 */

import { NextResponse } from 'next/server';
import { isReadOnlyFsError } from '@/lib/metrics-store';

/** Success response: { ok: true, data: T } */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** Error response: { ok: false, error: string, details?: string, code?: string } */
export interface ApiError {
  ok: false;
  error: string;
  details?: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Build a JSON success response. Optionally use standard shape { ok: true, data }. */
export function jsonSuccess<T>(data: T, status = 200, useStandardShape = false): NextResponse {
  const body = useStandardShape ? { ok: true as const, data } : data;
  return NextResponse.json(body, { status });
}

/**
 * Build a JSON error response with standard shape { ok: false, error, details?, code? }.
 * Normalizes common error types (read-only FS, validation) to appropriate status and messages.
 */
export function jsonError(
  error: string,
  options: { status?: number; details?: string; code?: string } = {}
): NextResponse {
  const { status = 500, details, code } = options;
  const body: ApiError = { ok: false, error, ...(details && { details }), ...(code && { code }) };
  return NextResponse.json(body, { status });
}

/**
 * Normalize a caught exception to a user-safe error message and optional details.
 * Returns { message, details?, status, code? } for use with jsonError.
 */
export function normalizeCaughtError(err: unknown): {
  message: string;
  details?: string;
  status: number;
  code?: string;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const details = err instanceof Error && err.stack ? undefined : undefined;

  if (isReadOnlyFsError(err)) {
    return {
      message: 'Write not available',
      details: 'Filesystem is read-only (e.g. serverless). Custom metrics and schema writes are disabled.',
      status: 503,
      code: 'READ_ONLY_FS',
    };
  }

  if (msg.includes('ENOENT') || msg.includes('no such file')) {
    return { message: 'Data not available', details: 'Required file or directory not found.', status: 404, code: 'NOT_FOUND' };
  }
  if (msg.includes('EACCES') || msg.includes('permission')) {
    return { message: 'Access denied', details: 'Insufficient permissions for this operation.', status: 503, code: 'EACCES' };
  }
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
    return { message: 'Rate limit exceeded', details: msg, status: 429, code: 'RATE_LIMIT' };
  }
  if (msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('API key')) {
    return { message: 'Invalid API key', details: msg, status: 401, code: 'AUTH' };
  }

  // PostgreSQL-specific errors: surface details for formula debugging
  const pgCode = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : undefined;
  if (pgCode) {
    // 42P01 = undefined table, 42703 = undefined column, 42601 = syntax error, 42804 = type mismatch
    if (pgCode === '42P01' || msg.includes('does not exist')) {
      return { message: 'Table or column not found', details: msg, status: 400, code: 'PG_NOT_FOUND' };
    }
    if (pgCode === '42703') {
      return { message: 'Column not found', details: msg, status: 400, code: 'PG_COLUMN_NOT_FOUND' };
    }
    if (pgCode === '42601' || msg.includes('syntax error')) {
      return { message: 'SQL syntax error', details: msg, status: 400, code: 'PG_SYNTAX_ERROR' };
    }
    if (pgCode === '42804') {
      return { message: 'Type mismatch', details: msg, status: 400, code: 'PG_TYPE_MISMATCH' };
    }
    if (pgCode === '57014' || msg.includes('statement timeout')) {
      return { message: 'Query timed out', details: 'Try narrowing your filters or simplifying the formula.', status: 408, code: 'PG_TIMEOUT' };
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET')) {
      return { message: 'Database connection failed', details: 'Please try again.', status: 503, code: 'DB_UNAVAILABLE' };
    }
    // Other PG errors: surface the error message directly
    return { message: msg, status: 400, code: `PG_${pgCode}` };
  }

  return { message: 'An unexpected error occurred', details: msg, status: 500 };
}

/**
 * Wrap a route handler: catch errors, normalize, and return jsonError response.
 * Use when you want consistent error responses without try/catch in every route.
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse>,
  fallbackStatus = 500
): Promise<NextResponse> {
  return handler().catch((err) => {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status: status || fallbackStatus, details, code });
  });
}
