import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { fetchReferenceData, getLatestAsOfDate, getAvailableAsOfDates } from '@/lib/governance/sandbox-runner';
import { getDistinctAsOfDates } from '@/lib/metrics-calculation/sql-runner';

/**
 * Fallback: get dates from in-memory sql.js sample data when DB is unavailable.
 */
function getSampleDataDates(): { latest: string | null; available: string[] } {
  // Use common L2 tables that typically have as_of_date
  const tables = ['L2.facility_exposure_snapshot', 'L2.collateral_snapshot', 'L2.facility_risk_snapshot'];
  const dates = getDistinctAsOfDates(tables);
  return { latest: dates[0] ?? null, available: dates };
}

/**
 * GET /api/metrics/governance/reference-data?type=segments|products|portfolios|dates
 *
 * Returns reference data for calculator filter dropdowns.
 * Falls back to in-memory sample data when DATABASE_URL is not set.
 */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    if (!type) {
      return jsonError('type parameter is required', { status: 400, code: 'VALIDATION_ERROR' });
    }

    const hasDb = !!process.env.DATABASE_URL;

    // For dates, always provide a fallback from sample data
    if (type === 'dates') {
      if (hasDb) {
        try {
          const [latestDate, available] = await Promise.all([
            getLatestAsOfDate(),
            getAvailableAsOfDates(30),
          ]);
          return jsonSuccess({ type: 'dates', latest: latestDate, available, source: 'postgresql' });
        } catch {
          // DB failed at runtime — fall through to sample data
        }
      }
      const fallback = getSampleDataDates();
      return jsonSuccess({ type: 'dates', latest: fallback.latest, available: fallback.available, source: 'sample-data' });
    }

    // Other reference data types require live DB
    if (!hasDb) {
      return jsonError('Database not connected', { status: 503, code: 'DB_UNAVAILABLE' });
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

      default:
        return jsonError(`Unknown reference data type: ${type}`, { status: 400, code: 'VALIDATION_ERROR' });
    }
  });
}
