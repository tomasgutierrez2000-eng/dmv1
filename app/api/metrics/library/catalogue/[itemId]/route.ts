import { NextRequest } from 'next/server';
import { getCatalogueItem, upsertCatalogueItem } from '@/lib/metric-library/store';
import type { CatalogueItem } from '@/lib/metric-library/types';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

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
  const existing = getCatalogueItem(decodeURIComponent(itemId));
  if (!existing) {
    return jsonError('Not found', { status: 404 });
  }

  try {
    const body = (await req.json()) as Partial<CatalogueItem>;
    const updated: CatalogueItem = { ...existing, ...body, item_id: existing.item_id };
    upsertCatalogueItem(updated);
    return jsonSuccess(updated);
  } catch (err) {
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
