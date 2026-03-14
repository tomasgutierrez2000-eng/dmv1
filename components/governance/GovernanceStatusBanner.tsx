'use client';

import { useState, useCallback } from 'react';
import { Shield, ChevronDown, User, MessageSquare } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { getStoredIdentity, governanceHeaders } from '@/lib/governance/identity';
import type { GovernanceStatus } from '@/lib/governance/status-machine';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  TRANSITION_ACTIONS,
  getValidTransitions,
  canRoleTransition,
} from '@/lib/governance/status-machine';

interface GovernanceStatusBannerProps {
  itemId: string;
  currentStatus: GovernanceStatus;
  lastEditorId?: string | null;
  lastEditorName?: string | null;
  onStatusChange?: (newStatus: GovernanceStatus) => void;
  /** Called when API returns 401 (identity required). Use to open identity setup modal. */
  onIdentityRequired?: () => void;
}

/**
 * Shows the governance status of a metric and provides action buttons
 * for valid status transitions.
 */
export default function GovernanceStatusBanner({
  itemId,
  currentStatus,
  lastEditorId,
  lastEditorName,
  onStatusChange,
  onIdentityRequired,
}: GovernanceStatusBannerProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<GovernanceStatus | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const user = typeof window !== 'undefined' ? getStoredIdentity() : null;
  const statusColors = STATUS_COLORS[currentStatus] ?? STATUS_COLORS.DRAFT;
  const validTransitions = getValidTransitions(currentStatus);

  // Filter transitions by user role
  const availableTransitions = user
    ? validTransitions.filter(t => canRoleTransition(user.role, t))
    : [];

  const handleTransitionClick = useCallback((target: GovernanceStatus) => {
    // Require reason for all transitions
    setPendingTransition(target);
    setReason('');
    setShowReasonModal(true);
    setShowActions(false);
  }, []);

  const handleSubmitTransition = useCallback(async () => {
    if (!pendingTransition || !user) return;
    if (!reason.trim()) {
      toast({ type: 'warning', title: 'Reason required', description: 'Please provide a reason for this status change' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/metrics/library/catalogue/${encodeURIComponent(itemId)}`, {
        method: 'PUT',
        headers: governanceHeaders(user, reason.trim()),
        body: JSON.stringify({ status: pendingTransition }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401 && body.code === 'IDENTITY_REQUIRED') {
          onIdentityRequired?.();
        }
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      toast({
        type: 'success',
        title: 'Status updated',
        description: `${STATUS_LABELS[currentStatus]} → ${STATUS_LABELS[pendingTransition]}`,
      });

      setShowReasonModal(false);
      onStatusChange?.(pendingTransition);
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to update status',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSubmitting(false);
    }
  }, [pendingTransition, user, reason, itemId, currentStatus, toast, onStatusChange, onIdentityRequired]);

  return (
    <>
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-lg border ${statusColors.bg} ${statusColors.border}`}>
        <div className="flex items-center gap-3">
          <Shield className={`w-4 h-4 ${statusColors.text}`} />
          <span className={`text-sm font-semibold ${statusColors.text}`}>
            {STATUS_LABELS[currentStatus]}
          </span>
          {(lastEditorId || lastEditorName) && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <User className="w-3 h-3" />
              Last edit: {lastEditorName ?? lastEditorId}
            </span>
          )}
        </div>

        {/* Actions dropdown */}
        {availableTransitions.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActions(!showActions)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                ${statusColors.text} hover:bg-white/5 transition-colors`}
            >
              Actions
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActions ? 'rotate-180' : ''}`} />
            </button>

            {showActions && (
              <>
                {/* Backdrop to close dropdown */}
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />

                <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-pwc-gray border border-pwc-gray-light rounded-lg shadow-xl overflow-hidden">
                  {availableTransitions.map(target => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => handleTransitionClick(target)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-pwc-gray-light/50 hover:text-pwc-white transition-colors flex items-center gap-2"
                    >
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[target].bg} ${STATUS_COLORS[target].border} border`} />
                      {TRANSITION_ACTIONS[target] ?? STATUS_LABELS[target]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* No actions available message */}
        {availableTransitions.length === 0 && user && (
          <span className="text-xs text-gray-600">
            No actions available for {user.role} role
          </span>
        )}
      </div>

      {/* Reason modal */}
      <Modal
        open={showReasonModal}
        onClose={() => !submitting && setShowReasonModal(false)}
        title={
          <span className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-pwc-orange" />
            Change Reason
          </span>
        }
        panelClassName="max-w-md w-full"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Transitioning from <strong className={statusColors.text}>{STATUS_LABELS[currentStatus]}</strong>
            {' '}to{' '}
            <strong className={pendingTransition ? STATUS_COLORS[pendingTransition].text : ''}>
              {pendingTransition ? STATUS_LABELS[pendingTransition] : ''}
            </strong>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Reason for this change
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Updated formula per JIRA-1234 review feedback"
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 bg-pwc-black border border-pwc-gray-light rounded-lg
                         text-pwc-white placeholder-gray-500 text-sm resize-none
                         focus:outline-none focus:border-pwc-orange focus:ring-1 focus:ring-pwc-orange/30"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-600 text-right">
              {reason.length}/2000
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmitTransition}
              disabled={submitting || !reason.trim()}
              className="flex-1 px-4 py-2.5 bg-pwc-orange text-white rounded-lg font-medium text-sm
                         hover:bg-pwc-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-pwc-orange/50"
            >
              {submitting ? 'Submitting...' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setShowReasonModal(false)}
              disabled={submitting}
              className="px-4 py-2.5 text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
