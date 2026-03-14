/**
 * Governance Status Machine — controls metric lifecycle transitions.
 *
 * Status flow:
 *   DRAFT → PENDING_REVIEW → APPROVED → ACTIVE → DEPRECATED
 *                │                │
 *                ↓ (withdraw)     │
 *              DRAFT              │
 *                ↑                │
 *          CHANGES_REQUESTED ←────┘ (request changes)
 *                │
 *                └── DRAFT (re-submit after addressing feedback)
 *
 * Enforces maker-checker: the reviewer must be a different user than
 * the last editor. This is a core SR 11-7 requirement.
 */

export type GovernanceStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'CHANGES_REQUESTED'
  | 'DEPRECATED'
  | 'RETIRED';

/* ── Allowed Transitions ──────────────────────────────────────────── */

const TRANSITIONS: Record<GovernanceStatus, GovernanceStatus[]> = {
  DRAFT:              ['PENDING_REVIEW', 'DEPRECATED'],
  PENDING_REVIEW:     ['IN_REVIEW', 'DRAFT'],                    // withdraw back to draft
  IN_REVIEW:          ['APPROVED', 'CHANGES_REQUESTED'],
  APPROVED:           ['ACTIVE', 'CHANGES_REQUESTED'],
  ACTIVE:             ['DRAFT', 'DEPRECATED'],                    // re-open for edit
  CHANGES_REQUESTED:  ['DRAFT'],                                  // author addresses feedback
  DEPRECATED:         ['DRAFT'],                                  // un-deprecate
  RETIRED:            [],                                         // terminal state
};

/**
 * Check whether a status transition is allowed.
 */
export function canTransition(from: GovernanceStatus, to: GovernanceStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the list of valid next statuses from a given status.
 */
export function getValidTransitions(from: GovernanceStatus): GovernanceStatus[] {
  return TRANSITIONS[from] ?? [];
}

/* ── Maker-Checker Enforcement ────────────────────────────────────── */

/** Transitions that require a DIFFERENT user than the last editor. */
const MAKER_CHECKER_TRANSITIONS = new Set<GovernanceStatus>([
  'APPROVED',
  'CHANGES_REQUESTED',
]);

/**
 * Validate maker-checker rule: the reviewer must be a different user
 * than the last editor of the metric.
 *
 * @param targetStatus  The status being transitioned TO
 * @param lastEditorId  user_id of the last person who edited the metric
 * @param reviewerId    user_id of the person attempting the review
 * @returns { valid, error? }
 */
export function validateMakerChecker(
  targetStatus: GovernanceStatus,
  lastEditorId: string | null,
  reviewerId: string | null,
): { valid: boolean; error?: string } {
  if (!MAKER_CHECKER_TRANSITIONS.has(targetStatus)) {
    return { valid: true };
  }

  if (!reviewerId) {
    return { valid: false, error: 'Reviewer identity is required for this action' };
  }

  if (!lastEditorId) {
    // No prior editor recorded — allow (first-time review)
    return { valid: true };
  }

  if (lastEditorId === reviewerId) {
    return {
      valid: false,
      error: 'Maker-checker violation: the reviewer cannot be the same person who last edited this metric',
    };
  }

  return { valid: true };
}

/* ── Role-Based Access ────────────────────────────────────────────── */

import type { GovernanceRole } from './identity';

/** Which roles can initiate each transition. */
const ROLE_PERMISSIONS: Record<GovernanceStatus, GovernanceRole[]> = {
  DRAFT:              ['analyst', 'modeler', 'reviewer', 'admin'],
  PENDING_REVIEW:     ['analyst', 'modeler', 'admin'],            // submit for review
  IN_REVIEW:          ['reviewer', 'admin'],                      // pick up for review
  APPROVED:           ['reviewer', 'admin'],                      // approve
  ACTIVE:             ['admin'],                                  // activate
  CHANGES_REQUESTED:  ['reviewer', 'admin'],                      // request changes
  DEPRECATED:         ['admin'],                                  // deprecate
  RETIRED:            ['admin'],                                  // retire (terminal)
};

/**
 * Check if a role can initiate a transition TO a given status.
 */
export function canRoleTransition(role: GovernanceRole, targetStatus: GovernanceStatus): boolean {
  return ROLE_PERMISSIONS[targetStatus]?.includes(role) ?? false;
}

/* ── Transition Validation (Combined) ─────────────────────────────── */

export interface TransitionValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Full transition validation: checks allowed path, role permission,
 * and maker-checker in one call.
 */
export function validateTransition(params: {
  from: GovernanceStatus;
  to: GovernanceStatus;
  role: GovernanceRole;
  lastEditorId: string | null;
  reviewerId: string | null;
}): TransitionValidation {
  const errors: string[] = [];

  if (!canTransition(params.from, params.to)) {
    errors.push(`Cannot transition from ${params.from} to ${params.to}`);
  }

  if (!canRoleTransition(params.role, params.to)) {
    errors.push(`Role '${params.role}' cannot transition to ${params.to}`);
  }

  const mc = validateMakerChecker(params.to, params.lastEditorId, params.reviewerId);
  if (!mc.valid && mc.error) {
    errors.push(mc.error);
  }

  return { valid: errors.length === 0, errors };
}

/* ── Status Display Helpers ───────────────────────────────────────── */

export const STATUS_LABELS: Record<GovernanceStatus, string> = {
  DRAFT:              'Draft',
  PENDING_REVIEW:     'Pending Review',
  IN_REVIEW:          'In Review',
  APPROVED:           'Approved',
  ACTIVE:             'Active',
  CHANGES_REQUESTED:  'Changes Requested',
  DEPRECATED:         'Deprecated',
  RETIRED:            'Retired',
};

export const STATUS_COLORS: Record<GovernanceStatus, { bg: string; text: string; border: string }> = {
  DRAFT:              { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/40' },
  PENDING_REVIEW:     { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  IN_REVIEW:          { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
  APPROVED:           { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  ACTIVE:             { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/40' },
  CHANGES_REQUESTED:  { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
  DEPRECATED:         { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40' },
  RETIRED:            { bg: 'bg-red-800/20', text: 'text-red-400', border: 'border-red-800/40' },
};

/** Action labels for buttons that trigger a transition. */
export const TRANSITION_ACTIONS: Partial<Record<GovernanceStatus, string>> = {
  PENDING_REVIEW:     'Submit for Review',
  IN_REVIEW:          'Begin Review',
  APPROVED:           'Approve',
  ACTIVE:             'Activate',
  CHANGES_REQUESTED:  'Request Changes',
  DEPRECATED:         'Deprecate',
  DRAFT:              'Return to Draft',
};
