/**
 * Semantic Layer — API Utilities
 *
 * Shared helpers for semantic API routes.
 */

import { NextResponse } from 'next/server';

/** Cache duration aligned with registry's CACHE_TTL_MS (60s). */
const CACHE_HEADER = 'public, s-maxage=60, stale-while-revalidate=300';

/** Attach Cache-Control headers to a semantic API response. */
export function cached(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', CACHE_HEADER);
  return res;
}
