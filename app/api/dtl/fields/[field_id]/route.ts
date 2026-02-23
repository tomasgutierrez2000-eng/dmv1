import { NextRequest, NextResponse } from 'next/server';
import { getField } from '@/lib/data-table-library/store';
import { getMappings } from '@/lib/source-mapping/store';

/** GET field and optionally which mappings reference it (target_field_ref or source_path). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ field_id: string }> }
) {
  const { field_id } = await params;
  const field = getField(field_id);
  if (!field) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const mappings = getMappings().filter(
    (m) => m.target_field_ref?.includes(field_id) || m.target_field_ref?.includes(field.field_name_technical) || m.source_path?.includes(field.field_name_technical)
  );
  return NextResponse.json({ field, metric_references: mappings.length });
}
