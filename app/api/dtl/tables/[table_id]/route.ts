import { NextRequest, NextResponse } from 'next/server';
import { getTable } from '@/lib/data-table-library/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ table_id: string }> }
) {
  const { table_id } = await params;
  const table = getTable(table_id);
  if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(table);
}
