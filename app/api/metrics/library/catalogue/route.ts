import { NextRequest } from 'next/server';
import { getCatalogueItems, upsertCatalogueItem } from '@/lib/metric-library/store';
import type { CatalogueItem } from '@/lib/metric-library/types';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const kind = searchParams.get('kind') ?? undefined;
  const domain = searchParams.get('domain') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const items = getCatalogueItems({ kind, domain_id: domain, search, status });
  return jsonSuccess(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CatalogueItem;

    if (!body.item_id || !body.item_name || !body.kind) {
      return jsonError('item_id, item_name, and kind are required', { status: 400 });
    }

    await upsertCatalogueItem(body);
    return jsonSuccess(body, 201);
  } catch (err) {
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
