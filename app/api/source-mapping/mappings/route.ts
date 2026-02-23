import { NextRequest, NextResponse } from 'next/server';
import { getMappings, saveMapping } from '@/lib/source-mapping/store';
import type { MappingRecord } from '@/lib/source-mapping/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const metric_ref_id = searchParams.get('metric_ref_id');
  const metric_ref_type = searchParams.get('metric_ref_type');
  const status = searchParams.get('status');
  const list = getMappings({
    metric_ref_id: metric_ref_id ?? undefined,
    metric_ref_type: metric_ref_type ?? undefined,
    status: status ?? undefined,
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  let body: MappingRecord;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.mapping_id || !body.metric_ref_type || !body.metric_ref_id) {
    return NextResponse.json({ error: 'mapping_id, metric_ref_type, metric_ref_id required' }, { status: 400 });
  }
  saveMapping({
    ...body,
    status: body.status ?? 'Draft',
    version: body.version ?? 1,
  });
  return NextResponse.json(getMappings().find((m) => m.mapping_id === body.mapping_id)!);
}
