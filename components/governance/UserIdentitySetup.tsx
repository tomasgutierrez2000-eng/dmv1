'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { Shield, User, Mail } from 'lucide-react';
import type { GovernanceRole } from '@/lib/governance/identity';
import {
  GOVERNANCE_ROLES,
  getStoredIdentity,
  setStoredIdentity,
  generateUserId,
  validateGovernanceUser,
} from '@/lib/governance/identity';

interface UserIdentitySetupProps {
  /** Force open even if identity is already stored. */
  forceOpen?: boolean;
  /** Called when identity is saved. */
  onComplete?: () => void;
  /** Called when modal is dismissed without saving. */
  onDismiss?: () => void;
}

/**
 * First-use modal for governance identity setup.
 * Appears when no identity is in localStorage. Captures display name,
 * role, and optional email. Generates a deterministic user_id from name.
 */
export default function UserIdentitySetup({
  forceOpen = false,
  onComplete,
  onDismiss,
}: UserIdentitySetupProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<GovernanceRole>('analyst');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      // Pre-fill from existing identity if available
      const existing = getStoredIdentity();
      if (existing) {
        setDisplayName(existing.display_name);
        setRole(existing.role);
        setEmail(existing.email ?? '');
      }
      return;
    }
    // Auto-show if no identity stored
    const existing = getStoredIdentity();
    if (!existing) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleSave = useCallback(() => {
    setError(null);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Display name is required');
      return;
    }
    if (trimmedName.length > 200) {
      setError('Display name must be under 200 characters');
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && trimmedEmail.length > 254) {
      setError('Email must be under 254 characters');
      return;
    }

    const userId = generateUserId(trimmedName);
    const user = {
      user_id: userId,
      display_name: trimmedName,
      role,
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
    };

    const validated = validateGovernanceUser(user);
    if (!validated) {
      setError('Invalid identity. Name must contain at least one alphanumeric character.');
      return;
    }

    try {
      setStoredIdentity(validated);
      setOpen(false);
      onComplete?.();
    } catch {
      setError('Failed to save identity');
    }
  }, [displayName, role, email, onComplete]);

  const handleClose = useCallback(() => {
    // Only allow dismiss if identity already exists
    const existing = getStoredIdentity();
    if (existing || forceOpen) {
      setOpen(false);
      onDismiss?.();
    }
    // If no identity exists, modal stays open (required)
  }, [forceOpen, onDismiss]);

  const hasExistingIdentity = typeof window !== 'undefined' && getStoredIdentity() !== null;
  const generatedId = displayName.trim() ? generateUserId(displayName.trim()) : '';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-pwc-orange" />
          Governance Identity
        </span>
      }
      panelClassName="max-w-md w-full"
      closeOnBackdrop={hasExistingIdentity || forceOpen}
      closeOnEscape={hasExistingIdentity || forceOpen}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Set your identity for the metric governance audit trail.
          All changes will be attributed to this identity.
        </p>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Display Name
            </span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Jane Smith"
            className="w-full px-3 py-2 bg-pwc-black border border-pwc-gray-light rounded-lg
                       text-pwc-white placeholder-gray-500 text-sm
                       focus:outline-none focus:border-pwc-orange focus:ring-1 focus:ring-pwc-orange/30"
            autoFocus
            maxLength={200}
          />
          {generatedId && (
            <p className="mt-1 text-xs text-gray-500">
              User ID: <code className="text-gray-400">{generatedId}</code>
            </p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Role
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GOVERNANCE_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${role === r.value
                    ? 'bg-pwc-orange/20 border-pwc-orange text-pwc-orange'
                    : 'bg-pwc-black border-pwc-gray-light text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {role === 'analyst' && 'Can edit metrics and submit for review'}
            {role === 'modeler' && 'Can edit formulas, run sandbox tests, and submit for review'}
            {role === 'reviewer' && 'Can approve/reject metric changes (maker-checker)'}
            {role === 'admin' && 'Full access including status activation and deprecation'}
          </p>
        </div>

        {/* Email (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email <span className="text-gray-500 font-normal">(optional)</span>
            </span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane.smith@bank.com"
            className="w-full px-3 py-2 bg-pwc-black border border-pwc-gray-light rounded-lg
                       text-pwc-white placeholder-gray-500 text-sm
                       focus:outline-none focus:border-pwc-orange focus:ring-1 focus:ring-pwc-orange/30"
            maxLength={254}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-pwc-orange text-white rounded-lg font-medium text-sm
                       hover:bg-pwc-orange/90 transition-colors focus:outline-none focus:ring-2 focus:ring-pwc-orange/50"
          >
            {hasExistingIdentity ? 'Update Identity' : 'Set Identity'}
          </button>
          {(hasExistingIdentity || forceOpen) && (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <p className="text-xs text-gray-600 text-center">
          Stored locally. Upgradeable to SSO without schema changes.
        </p>
      </div>
    </Modal>
  );
}
