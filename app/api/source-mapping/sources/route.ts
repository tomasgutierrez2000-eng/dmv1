import { NextRequest, NextResponse } from 'next/server';
import { getSourceSystems, saveSourceSystem } from '@/lib/source-mapping/store';
import type { SourceSystem } from '@/lib/source-mapping/types';

export async function GET() {
  const list = getSourceSystems();
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  let body: SourceSystem;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.source_system_id || !body.name) {
    return NextResponse.json({ error: 'source_system_id and name required' }, { status: 400 });
  }
  saveSourceSystem({
    ...body,
    environment: body.environment ?? 'Production',
  });
  return NextResponse.json(getSourceSystems().find((s) => s.source_system_id === body.source_system_id)!);
}
