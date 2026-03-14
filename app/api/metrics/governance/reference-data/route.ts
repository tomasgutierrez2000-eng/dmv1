import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { fetchReferenceData, getLatestAsOfDate, getAvailableAsOfDates } from '@/lib/governance/sandbox-runner';

/**
 * GET /api/metrics/governance/reference-data?type=segments|products|portfolios|dates
 *
 * Returns reference data for calculator filter dropdowns.
 */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    if (!process.env.DATABASE_URL) {
      return jsonError('Database not connected', { status: 503, code: 'DB_UNAVAILABLE' });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    if (!type) {
      return jsonError('type parameter is required', { status: 400, code: 'VALIDATION_ERROR' });
    }

    switch (type) {
      case 'segments': {
        const rows = await fetchReferenceData(
          'l1.enterprise_business_taxonomy',
          ['managed_segment_id', 'segment_name', 'parent_segment_id', 'tree_level'],
          { orderBy: 'tree_level, segment_name', limit: 500 },
        );
        return jsonSuccess({ type: 'segments', data: rows });
      }

      case 'products': {
        const rows = await fetchReferenceData(
          'l1.enterprise_product_taxonomy',
          ['product_node_id', 'product_code', 'product_name'],
          { orderBy: 'product_name', limit: 500 },
        );
        return jsonSuccess({ type: 'products', data: rows });
      }

      case 'portfolios': {
        const rows = await fetchReferenceData(
          'l1.portfolio_dim',
          ['portfolio_id', 'portfolio_code', 'portfolio_name'],
          { orderBy: 'portfolio_name', limit: 200 },
        );
        return jsonSuccess({ type: 'portfolios', data: rows });
      }

      case 'dates': {
        const [latestDate, available] = await Promise.all([
          getLatestAsOfDate(),
          getAvailableAsOfDates(30),
        ]);
        return jsonSuccess({ type: 'dates', latest: latestDate, available });
      }

      default:
        return jsonError(`Unknown reference data type: ${type}`, { status: 400, code: 'VALIDATION_ERROR' });
    }
  });
}
