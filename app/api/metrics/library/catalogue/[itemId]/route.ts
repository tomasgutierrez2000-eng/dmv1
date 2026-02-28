import { NextRequest, NextResponse } from 'next/server';
import { getCatalogueItem, upsertCatalogueItem } from '@/lib/metric-library/store';
import type { CatalogueItem } from '@/lib/metric-library/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const item = getCatalogueItem(decodeURIComponent(itemId));
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const existing = getCatalogueItem(decodeURIComponent(itemId));
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = (await req.json()) as Partial<CatalogueItem>;
    const updated: CatalogueItem = { ...existing, ...body, item_id: existing.item_id };
    upsertCatalogueItem(updated);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Read-only file system or invalid JSON' },
      { status: 503 }
    );
  }
}
