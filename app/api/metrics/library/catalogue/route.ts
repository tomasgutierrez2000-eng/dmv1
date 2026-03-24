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

    // Catalogue is YAML-generated — direct writes are allowed but discouraged
    console.warn('[catalogue] Direct POST to catalogue.json — prefer editing YAML and running calc:sync', { item_id: body.item_id });

    await upsertCatalogueItem(body);
    const res = jsonSuccess(body, 201);
    res.headers.set('X-Catalogue-Warning', 'Direct write — catalogue.json is generated from YAML. Run calc:sync to regenerate.');
    return res;
  } catch (err) {
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
