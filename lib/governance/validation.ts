/**
 * Governance Input Validation — GSIB-grade input sanitization.
 *
 * Every API endpoint validates inputs before processing.
 * SQL formulas are checked for safety (SELECT-only, no DML).
 */

import type { GovernanceRole } from './identity';

/* ── Field Length Limits ────────────────────────────────────────── */

export const FIELD_LIMITS = {
  item_name: 500,
  abbreviation: 50,
  definition: 5000,
  generic_formula: 5000,
  insight: 2000,
  formula_sql: 10000,
  level_logic: 10000,
  change_reason: 2000,
  ticket_reference: 100,
  display_name: 200,
  user_id: 100,
  email: 254,
  nl_prompt: 2000,
} as const;

/* ── Enum Allowlists ────────────────────────────────────────────── */

export const VALID_STATUSES = new Set(['ACTIVE', 'DRAFT', 'DEPRECATED']);
export const VALID_GOVERNANCE_STATUSES = new Set([
  'DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED',
  'ACTIVE', 'CHANGES_REQUESTED', 'DEPRECATED', 'RETIRED',
]);
export const VALID_SOURCING_TYPES = new Set(['Raw', 'Calc', 'Agg', 'Avg']);
export const VALID_LEVELS = new Set(['facility', 'counterparty', 'desk', 'portfolio', 'lob', 'business_segment']);
export const VALID_KINDS = new Set(['DATA_ELEMENT', 'METRIC']);
export const VALID_METRIC_CLASSES = new Set(['SOURCED', 'CALCULATED', 'HYBRID']);
export const VALID_UNIT_TYPES = new Set(['RATIO', 'PERCENTAGE', 'CURRENCY', 'COUNT', 'RATE', 'ORDINAL', 'DAYS', 'INDEX', 'BPS']);
export const VALID_DIRECTIONS = new Set(['HIGHER_BETTER', 'LOWER_BETTER', 'NEUTRAL']);
export const VALID_ROLES = new Set<GovernanceRole>(['analyst', 'modeler', 'reviewer', 'admin']);
export const VALID_MODEL_RISK_TIERS = new Set(['TIER_1', 'TIER_2', 'TIER_3']);
export const VALID_CHANGE_TYPES = new Set(['CREATE', 'UPDATE', 'STATUS_CHANGE', 'ROLLBACK', 'EXCEPTION']);

/* ── SQL Safety ─────────────────────────────────────────────────── */

/** DML keywords that are never allowed in formula SQL. */
const FORBIDDEN_SQL_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE',
  'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
  'COPY', 'LOAD', 'MERGE', 'CALL', 'SET',
];

/** Pattern to detect forbidden keywords at word boundaries. */
const FORBIDDEN_SQL_PATTERN = new RegExp(
  `\\b(${FORBIDDEN_SQL_KEYWORDS.join('|')})\\b`,
  'i',
);

export interface SqlValidationResult {
  valid: boolean;
  error?: string;
  warnings: string[];
}

/**
 * Client-side SQL safety check. Does NOT validate syntax — that
 * requires PostgreSQL PREPARE (see validate-sql API).
 */
export function validateFormulaSql(sql: string): SqlValidationResult {
  const warnings: string[] = [];

  if (!sql || typeof sql !== 'string') {
    return { valid: false, error: 'Formula SQL is required', warnings };
  }

  const trimmed = sql.trim();

  if (trimmed.length > FIELD_LIMITS.formula_sql) {
    return { valid: false, error: `Formula SQL exceeds ${FIELD_LIMITS.formula_sql} character limit`, warnings };
  }

  // Must start with SELECT (or WITH for CTEs)
  const upper = trimmed.toUpperCase();
  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
    return { valid: false, error: 'Formula SQL must start with SELECT or WITH', warnings };
  }

  // No semicolons (single statement only)
  if (trimmed.includes(';')) {
    return { valid: false, error: 'Formula SQL must be a single statement (no semicolons)', warnings };
  }

  // Check for forbidden DML keywords
  const match = trimmed.match(FORBIDDEN_SQL_PATTERN);
  if (match) {
    // Allow SET inside CASE WHEN ... THEN (false positive check)
    if (match[1].toUpperCase() === 'SET') {
      // SET inside CASE expressions is ok, SET at statement level is not
      const beforeMatch = trimmed.slice(0, match.index).toUpperCase();
      if (beforeMatch.includes('CASE') || beforeMatch.includes('OFFSET')) {
        // Likely in a CASE expression or OFFSET context, allow
      } else {
        return { valid: false, error: `Forbidden SQL keyword: ${match[1]}. Only SELECT statements are allowed.`, warnings };
      }
    } else {
      return { valid: false, error: `Forbidden SQL keyword: ${match[1]}. Only SELECT statements are allowed.`, warnings };
    }
  }

  // Warn about common issues (case-insensitive: dimension_key and metric_value)
  if (!upper.includes('DIMENSION_KEY') || !upper.includes('METRIC_VALUE')) {
    warnings.push('Formula should alias result columns as dimension_key and metric_value');
  }

  return { valid: true, warnings };
}

/* ── String Validation ──────────────────────────────────────────── */

export function validateStringField(
  value: unknown,
  fieldName: string,
  maxLength: number,
  required = false,
): { valid: boolean; error?: string; sanitized: string } {
  if (value === null || value === undefined) {
    if (required) return { valid: false, error: `${fieldName} is required`, sanitized: '' };
    return { valid: true, sanitized: '' };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string`, sanitized: '' };
  }
  const trimmed = value.trim();
  if (required && !trimmed) {
    return { valid: false, error: `${fieldName} is required`, sanitized: '' };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds ${maxLength} character limit`, sanitized: trimmed.slice(0, maxLength) };
  }
  return { valid: true, sanitized: trimmed };
}

/* ── Enum Validation ────────────────────────────────────────────── */

export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: Set<T>,
  required = false,
): { valid: boolean; error?: string; sanitized: T | null } {
  if (value === null || value === undefined) {
    if (required) return { valid: false, error: `${fieldName} is required`, sanitized: null };
    return { valid: true, sanitized: null };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string`, sanitized: null };
  }
  if (!allowedValues.has(value as T)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${[...allowedValues].join(', ')}`,
      sanitized: null,
    };
  }
  return { valid: true, sanitized: value as T };
}

/* ── Request Body Size ──────────────────────────────────────────── */

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export function validateRequestBodySize(body: string | object): { valid: boolean; error?: string } {
  const size = typeof body === 'string' ? body.length : JSON.stringify(body).length;
  if (size > MAX_BODY_SIZE) {
    return { valid: false, error: `Request body exceeds ${MAX_BODY_SIZE / 1024}KB limit` };
  }
  return { valid: true };
}
