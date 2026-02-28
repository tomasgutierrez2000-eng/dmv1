import { NextRequest, NextResponse } from 'next/server';
import { getCatalogueItems, upsertCatalogueItem } from '@/lib/metric-library/store';
import type { CatalogueItem } from '@/lib/metric-library/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const kind = searchParams.get('kind') ?? undefined;
  const domain = searchParams.get('domain') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const items = getCatalogueItems({ kind, domain_id: domain, search, status });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CatalogueItem;

    if (!body.item_id || !body.item_name || !body.kind) {
      return NextResponse.json(
        { error: 'item_id, item_name, and kind are required' },
        { status: 400 }
      );
    }

    upsertCatalogueItem(body);
    return NextResponse.json(body, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Read-only file system or invalid JSON' },
      { status: 503 }
    );
  }
}
