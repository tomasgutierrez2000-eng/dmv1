import { NextRequest, NextResponse } from 'next/server';
import { getAuditEvents } from '@/lib/audit/store';

/**
 * GET /api/audit?limit=50&entity_id=...&type=...
 * Read-only query on audit trail (append-only). Export for regulators.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const entity_id = searchParams.get('entity_id') ?? undefined;
  const type = searchParams.get('type') as import('@/lib/audit/store').AuditEventType | undefined;
  const events = getAuditEvents({
    limit: limit ? Math.min(500, parseInt(limit, 10) || 100) : 100,
    entity_id,
    type,
  });
  return NextResponse.json(events);
}
