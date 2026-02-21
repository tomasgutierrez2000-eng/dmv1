import { NextRequest, NextResponse } from 'next/server';
import { approveVariant } from '@/lib/metric-library/store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ variant_id: string }> }
) {
  const { variant_id } = await params;
  let body: { approved_by?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const updated = approveVariant(variant_id, body.approved_by);
  if (!updated) {
    return NextResponse.json(
      { error: 'Variant not found or not in DRAFT status' },
      { status: 400 }
    );
  }
  return NextResponse.json(updated);
}
