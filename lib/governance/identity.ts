/**
 * Governance Identity — lightweight user identity for audit trail.
 *
 * No auth system exists. Identity is stored in localStorage and sent
 * as an HTTP header. Sufficient for audit trail and maker-checker
 * enforcement. Upgradeable to SSO later without schema changes.
 */

import type { NextRequest } from 'next/server';

/* ── Types ──────────────────────────────────────────────────────── */

export type GovernanceRole = 'analyst' | 'modeler' | 'reviewer' | 'admin';

export interface GovernanceUser {
  user_id: string;
  display_name: string;
  role: GovernanceRole;
  email?: string;
}

export const GOVERNANCE_ROLES: { value: GovernanceRole; label: string }[] = [
  { value: 'analyst', label: 'Analyst' },
  { value: 'modeler', label: 'Modeler' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'admin', label: 'Admin' },
];

export const VALID_ROLES = new Set<string>(GOVERNANCE_ROLES.map(r => r.value));

/* ── Constants ──────────────────────────────────────────────────── */

export const GOVERNANCE_HEADER = 'X-Governance-User';
export const CHANGE_REASON_HEADER = 'X-Change-Reason';
const STORAGE_KEY = 'governance_user';

/* ── Validation ─────────────────────────────────────────────────── */

/** Alphanumeric + hyphens + underscores only (prevents header injection). */
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
const MAX_DISPLAY_NAME = 200;
const MAX_EMAIL = 254;

export function validateGovernanceUser(user: unknown): GovernanceUser | null {
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;

  const userId = typeof u.user_id === 'string' ? u.user_id.trim() : '';
  const displayName = typeof u.display_name === 'string' ? u.display_name.trim() : '';
  const role = typeof u.role === 'string' ? u.role.trim() : '';
  const email = typeof u.email === 'string' ? u.email.trim() : undefined;

  if (!userId || !SAFE_ID_PATTERN.test(userId)) return null;
  if (!displayName || displayName.length > MAX_DISPLAY_NAME) return null;
  if (!VALID_ROLES.has(role)) return null;
  if (email && email.length > MAX_EMAIL) return null;

  return {
    user_id: userId,
    display_name: displayName,
    role: role as GovernanceRole,
    ...(email ? { email } : {}),
  };
}

/* ── Client-Side (localStorage) ─────────────────────────────────── */

/** Read identity from localStorage. Returns null if not set or invalid. */
export function getStoredIdentity(): GovernanceUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateGovernanceUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Store identity in localStorage. */
export function setStoredIdentity(user: GovernanceUser): void {
  if (typeof window === 'undefined') return;
  const validated = validateGovernanceUser(user);
  if (!validated) throw new Error('Invalid governance user');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
}

/** Clear identity from localStorage. */
export function clearStoredIdentity(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Generate a deterministic user_id from display name (kebab-case). */
export function generateUserId(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'unknown';
}

/* ── HTTP Header Transport ──────────────────────────────────────── */

/** Encode user as base64 JSON for HTTP header. */
export function encodeGovernanceHeader(user: GovernanceUser): string {
  return btoa(JSON.stringify(user));
}

/** Build headers object for fetch calls including governance identity. */
export function governanceHeaders(
  user: GovernanceUser | null,
  changeReason?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user) {
    headers[GOVERNANCE_HEADER] = encodeGovernanceHeader(user);
  }
  if (changeReason) {
    headers[CHANGE_REASON_HEADER] = changeReason;
  }
  return headers;
}

/* ── Server-Side (Request Parsing) ──────────────────────────────── */

/** Extract governance user from NextRequest headers. */
export function parseGovernanceUser(req: NextRequest): GovernanceUser | null {
  const header = req.headers.get(GOVERNANCE_HEADER);
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return validateGovernanceUser(JSON.parse(decoded));
  } catch {
    return null;
  }
}

/** Extract change reason from NextRequest headers. */
export function parseChangeReason(req: NextRequest): string | null {
  const reason = req.headers.get(CHANGE_REASON_HEADER);
  if (!reason) return null;
  const trimmed = reason.trim();
  if (trimmed.length > 2000) return trimmed.slice(0, 2000);
  return trimmed || null;
}
