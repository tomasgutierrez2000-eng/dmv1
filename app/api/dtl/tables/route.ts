import { NextRequest, NextResponse } from 'next/server';
import { getTables, getTable, saveTable } from '@/lib/data-table-library/store';
import type { DTLTable } from '@/lib/data-table-library/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const layer = searchParams.get('layer') ?? undefined;
  const list = getTables(layer);
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  let body: DTLTable;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.table_id || !body.table_name_business || !body.table_name_technical || !body.layer) {
    return NextResponse.json({ error: 'table_id, table_name_business, table_name_technical, layer required' }, { status: 400 });
  }
  saveTable(body);
  return NextResponse.json(getTable(body.table_id)!);
}
