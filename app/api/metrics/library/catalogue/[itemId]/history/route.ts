import { NextRequest } from 'next/server';
import { getCatalogueItem } from '@/lib/metric-library/store';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getChangeHistory } from '@/lib/governance/change-logger';

/**
 * GET /api/metrics/library/catalogue/[itemId]/history
 *
 * Paginated change history for a catalogue item.
 * Query params: limit (default 50, max 200), offset (default 0)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  return withErrorHandling(async () => {
    const { itemId } = await params;
    const decodedId = decodeURIComponent(itemId);

    // Verify item exists
    const item = getCatalogueItem(decodedId);
    if (!item) {
      return jsonError('Not found', { status: 404, code: 'NOT_FOUND' });
    }

    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1),
      200,
    );
    const offset = Math.max(
      parseInt(url.searchParams.get('offset') ?? '0', 10) || 0,
      0,
    );

    const result = await getChangeHistory({ itemId: decodedId, limit, offset });

    return jsonSuccess({
      item_id: decodedId,
      entries: result.entries,
      total: result.total,
      limit,
      offset,
      has_more: offset + limit < result.total,
    });
  });
}
