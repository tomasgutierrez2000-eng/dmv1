import { NextRequest } from 'next/server';
import { getCatalogueItem, upsertCatalogueItem } from '@/lib/metric-library/store';
import type { CatalogueItem } from '@/lib/metric-library/types';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { parseGovernanceUser, parseChangeReason } from '@/lib/governance/identity';
import { logMetricChange } from '@/lib/governance/change-logger';
import type { ChangeType } from '@/lib/governance/change-logger';
import { validateTransition } from '@/lib/governance/status-machine';
import type { GovernanceStatus } from '@/lib/governance/status-machine';

const STATUS_TRANSITIONS_REQUIRING_IDENTITY = new Set<GovernanceStatus>([
  'APPROVED', 'CHANGES_REQUESTED', 'ACTIVE',
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const decodedId = decodeURIComponent(itemId);
  if (decodedId.length > 100) {
    return jsonError('Invalid item ID', { status: 400 });
  }
  const item = getCatalogueItem(decodedId);
  if (!item) {
    return jsonError('Not found', { status: 404 });
  }
  return jsonSuccess(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const decodedId = decodeURIComponent(itemId);
  const existing = getCatalogueItem(decodedId);
  if (!existing) {
    return jsonError('Not found', { status: 404 });
  }

  try {
    const body = (await req.json()) as Partial<CatalogueItem>;
    const user = parseGovernanceUser(req);

    // Status transition validation
    if (body.status && body.status !== existing.status) {
      const toStatus = body.status as GovernanceStatus;
      const fromStatus = (existing.status ?? 'DRAFT') as GovernanceStatus;

      if (STATUS_TRANSITIONS_REQUIRING_IDENTITY.has(toStatus) && !user) {
        return jsonError('Governance identity required. Set your identity in Settings.', {
          status: 401,
          code: 'IDENTITY_REQUIRED',
        });
      }

      const validation = validateTransition({
        from: fromStatus,
        to: toStatus,
        role: user?.role ?? 'analyst',
        lastEditorId: existing.last_editor_id ?? null,
        reviewerId: user?.user_id ?? null,
      });
      if (!validation.valid) {
        return jsonError(validation.errors.join('; '), {
          status: 403,
          code: 'GOVERNANCE_VIOLATION',
        });
      }
    }

    const updated: CatalogueItem = { ...existing, ...body, item_id: existing.item_id };

    // Update last_editor when non-status fields change (not when reviewer approves/rejects)
    const isStatusOnlyChange = Object.keys(body).length === 1 && body.status !== undefined;
    if (!isStatusOnlyChange && user) {
      updated.last_editor_id = user.user_id;
      updated.last_editor_name = user.display_name;
    }

    // Determine change type from body hint or default to UPDATE
    let changeType: ChangeType = 'UPDATE';
    if (body.status && body.status !== existing.status) {
      changeType = 'STATUS_CHANGE';
    }

    // Save the updated item (async with mutex locking)
    await upsertCatalogueItem(updated);

    // Fire-and-forget: log the change for audit trail
    const reason = parseChangeReason(req);
    logMetricChange({
      itemId: decodedId,
      changeType,
      user,
      reason,
      before: existing,
      after: updated,
      governanceStatus: updated.status,
    }).catch((err) => {
      console.error('[governance] Failed to log change:', err);
    });

    return jsonSuccess(updated);
  } catch (err) {
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
