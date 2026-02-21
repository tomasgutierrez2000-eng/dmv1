import { NextRequest, NextResponse } from 'next/server';
import { deprecateVariant } from '@/lib/metric-library/store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ variant_id: string }> }
) {
  const { variant_id } = await params;
  let body: { supersedes_variant_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const updated = deprecateVariant(variant_id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}
