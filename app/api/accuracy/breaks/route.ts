import { NextRequest, NextResponse } from 'next/server';
import { getBreaks, saveBreak } from '@/lib/accuracy-assurance/store';
import type { ReconciliationBreak } from '@/lib/accuracy-assurance/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const list = getBreaks({ status });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  let body: ReconciliationBreak;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.break_id || !body.break_type || !body.severity) {
    return NextResponse.json({ error: 'break_id, break_type, severity required' }, { status: 400 });
  }
  saveBreak({ ...body, status: body.status ?? 'Identified' });
  return NextResponse.json(body);
}
