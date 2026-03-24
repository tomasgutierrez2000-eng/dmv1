/**
 * Next.js Middleware — Security headers, rate limiting, and request logging.
 *
 * Applies to all routes. Security headers on every response.
 * Rate limiting on API routes only (in-memory, per-IP, sliding window).
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Security Headers ───────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // HSTS: enforce HTTPS for 1 year, include subdomains
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // CSP: allow self + inline styles (Tailwind/Next.js needs them) + data URIs for images
  // In production, drop unsafe-eval (only needed for Next.js dev hot-reload)
  'Content-Security-Policy': [
    "default-src 'self'",
    IS_PRODUCTION
      ? "script-src 'self' 'unsafe-inline'"              // Prod: no unsafe-eval
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Dev: Next.js HMR needs eval
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

// ─── CORS ────────────────────────────────────────────────────────────────

// In production, restrict to same-origin only. In dev, allow localhost variants.
const ALLOWED_ORIGINS = IS_PRODUCTION
  ? new Set<string>()  // Empty = same-origin only (no cross-origin allowed)
  : new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);

function applyCorsHeaders(response: NextResponse, origin: string | null): void {
  if (!origin) return;
  if (!IS_PRODUCTION && ALLOWED_ORIGINS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Vary', 'Origin');
  }
  // In production: no ACAO header = browser blocks cross-origin requests (same-origin policy)
}

// ─── Middleware ──────────────────────────────────────────────────────────

export function middleware(request: NextRequest): NextResponse {
  const startedAt = Date.now();
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isAgentRoute = request.nextUrl.pathname.startsWith('/api/agent');
  const origin = request.headers.get('origin');

  // Handle CORS preflight (OPTIONS) for API routes
  if (isApiRoute && request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(response, origin);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

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

    // Add security + CORS headers
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    applyCorsHeaders(response, origin);
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
