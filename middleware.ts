/**
 * Next.js Middleware — Security headers, rate limiting, and request logging.
 *
 * Applies to all routes. Security headers on every response.
 * Rate limiting on API routes only (in-memory, per-IP, sliding window).
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Security Headers ───────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // CSP: allow self + inline styles (Tailwind/Next.js needs them) + data URIs for images
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js dev requires unsafe-eval
    "style-src 'self' 'unsafe-inline'",                  // Tailwind inline styles
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

// ─── Rate Limiting (in-memory sliding window) ───────────────────────────

interface RateEntry {
  timestamps: number[];
}

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100;          // 100 requests per minute per IP
const RATE_LIMIT_AGENT_MAX = 20;     // 20 agent requests per minute (LLM calls are expensive)

const rateLimitStore = new Map<string, RateEntry>();

// Periodic cleanup to prevent memory leak (every 5 min)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 300_000;

function cleanupStaleEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, entry] of rateLimitStore) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) rateLimitStore.delete(key);
  }
}

function checkRateLimit(ip: string, isAgent: boolean): { allowed: boolean; remaining: number } {
  cleanupStaleEntries();
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const key = isAgent ? `agent:${ip}` : `api:${ip}`;
  const max = isAgent ? RATE_LIMIT_AGENT_MAX : RATE_LIMIT_MAX;

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Slide window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  const remaining = Math.max(0, max - entry.timestamps.length);

  if (entry.timestamps.length >= max) {
    return { allowed: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: remaining - 1 };
}

// ─── Request Logging ────────────────────────────────────────────────────

function logRequest(req: NextRequest, status: number, durationMs: number): void {
  // Only log API routes to avoid noise from static assets
  if (!req.nextUrl.pathname.startsWith('/api/')) return;

  const payload = {
    method: req.method,
    path: req.nextUrl.pathname,
    status,
    durationMs,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
  };
  console.info('[api-request]', JSON.stringify(payload));
}

// ─── Middleware ──────────────────────────────────────────────────────────

export function middleware(request: NextRequest): NextResponse {
  const startedAt = Date.now();
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isAgentRoute = request.nextUrl.pathname.startsWith('/api/agent');

  // Rate limiting for API routes
  if (isApiRoute) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
    const { allowed, remaining } = checkRateLimit(ip, isAgentRoute);

    if (!allowed) {
      const response = NextResponse.json(
        { ok: false, error: 'Rate limit exceeded', code: 'RATE_LIMIT' },
        { status: 429 }
      );
      response.headers.set('Retry-After', '60');
      response.headers.set('X-RateLimit-Remaining', '0');
      logRequest(request, 429, Date.now() - startedAt);
      return response;
    }

    // Continue with rate limit headers
    const response = NextResponse.next();

    // Add security headers
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    response.headers.set('X-RateLimit-Remaining', String(remaining));

    logRequest(request, 200, Date.now() - startedAt);
    return response;
  }

  // Non-API routes: just add security headers
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
