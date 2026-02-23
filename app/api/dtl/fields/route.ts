import { NextRequest, NextResponse } from 'next/server';
import { getFields, getField, saveField } from '@/lib/data-table-library/store';
import type { DTLField } from '@/lib/data-table-library/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const table_id = searchParams.get('table_id') ?? undefined;
  const list = getFields(table_id);
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  let body: DTLField;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.field_id || !body.table_id || !body.field_name_technical) {
    return NextResponse.json({ error: 'field_id, table_id, field_name_technical required' }, { status: 400 });
  }
  saveField(body);
  return NextResponse.json(getField(body.field_id)!);
}
