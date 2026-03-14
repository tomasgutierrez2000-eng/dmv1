import { NextRequest } from 'next/server';
import { getCatalogueItem, upsertCatalogueItem } from '@/lib/metric-library/store';
import type { CatalogueItem } from '@/lib/metric-library/types';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { parseGovernanceUser, parseChangeReason } from '@/lib/governance/identity';
import { logMetricChange } from '@/lib/governance/change-logger';
import type { ChangeType } from '@/lib/governance/change-logger';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const item = getCatalogueItem(decodeURIComponent(itemId));
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
    const updated: CatalogueItem = { ...existing, ...body, item_id: existing.item_id };

    // Determine change type from body hint or default to UPDATE
    let changeType: ChangeType = 'UPDATE';
    if (body.status && body.status !== existing.status) {
      changeType = 'STATUS_CHANGE';
    }

    // Save the updated item
    upsertCatalogueItem(updated);

    // Fire-and-forget: log the change for audit trail
    const user = parseGovernanceUser(req);
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
