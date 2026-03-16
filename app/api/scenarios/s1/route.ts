/**
 * S1 — Large Exposure Breach
 * Fetches counterparty 1001 (Meridian Energy), drawn vs limit, facility breakdown.
 * Requires DATABASE_URL and GSIB data loaded.
 */
import { NextResponse } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

export interface S1FacilityRow {
  facility_id: number;
  facility_name: string;
  drawn_amount: number;
  committed_amount: number;
  limit_status_code: string | null;
}

export interface S1Response {
  counterparty_id: number;
  counterparty_name: string;
  as_of_date: string;
  limit_amount_usd: number;
  limit_rule_name: string;
  utilized_amount: number;
  available_amount: number;
  utilization_pct: number;
  is_breach: boolean;
  facilities: S1FacilityRow[];
}

const S1_QUERY = `
SELECT
  c.counterparty_id,
  c.legal_name AS counterparty_name,
  lr.limit_amount_usd,
  lr.rule_name AS limit_rule_name,
  lu.utilized_amount,
  lu.available_amount,
  lu.as_of_date
FROM l1.counterparty c
JOIN l1.limit_rule lr ON lr.counterparty_id = c.counterparty_id AND lr.limit_type = 'LARGE_EXPOSURE'
LEFT JOIN l2.limit_utilization_event lu ON lu.limit_rule_id = lr.limit_rule_id AND lu.as_of_date = '2025-01-31'
WHERE c.counterparty_id = 1001
LIMIT 1
`;

const FACILITIES_QUERY = `
SELECT
  f.facility_id,
  f.facility_name,
  fes.drawn_amount,
  fes.committed_amount,
  fes.limit_status_code
FROM l1.facility_master f
JOIN l2.facility_exposure_snapshot fes ON fes.facility_id = f.facility_id
WHERE f.counterparty_id = $1 AND fes.as_of_date = $2
ORDER BY fes.drawn_amount DESC
`;

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return jsonError('DATABASE_URL not configured', { status: 503, code: 'NO_DB' });
  }

  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      const [mainRes, facRes] = await Promise.all([
        client.query(S1_QUERY),
        client.query(FACILITIES_QUERY, [1001, '2025-01-31']),
      ]);

      const main = mainRes.rows[0] as Record<string, unknown> | undefined;
      const facilities = (facRes.rows as Record<string, unknown>[]) ?? [];

      if (!main && facilities.length === 0) {
        return jsonError('S1 scenario data not found. Load GSIB data: npm run db:load-gsib', {
          status: 404,
          code: 'NO_DATA',
        });
      }

      const limitAmount = Number(main?.limit_amount_usd ?? 2_000_000_000);
      const utilizedAmount = Number(main?.utilized_amount ?? 0) || facilities.reduce((s, r) => s + Number(r.drawn_amount ?? 0), 0);
      const availableAmount = Number(main?.available_amount ?? 0);
      const utilizationPct = limitAmount > 0 ? (utilizedAmount / limitAmount) * 100 : 0;

      const data: S1Response = {
        counterparty_id: Number(main?.counterparty_id ?? 1001),
        counterparty_name: String(main?.counterparty_name ?? 'Meridian Energy Holdings'),
        as_of_date: String(main?.as_of_date ?? '2025-01-31'),
        limit_amount_usd: limitAmount,
        limit_rule_name: String(main?.limit_rule_name ?? 'Large Exposure Limit'),
        utilized_amount: utilizedAmount,
        available_amount: availableAmount,
        utilization_pct: Math.round(utilizationPct * 10) / 10,
        is_breach: utilizationPct > 100,
        facilities: facilities.map((r) => ({
          facility_id: Number(r.facility_id),
          facility_name: String(r.facility_name ?? ''),
          drawn_amount: Number(r.drawn_amount ?? 0),
          committed_amount: Number(r.committed_amount ?? 0),
          limit_status_code: r.limit_status_code ? String(r.limit_status_code) : null,
        })),
      };

      return jsonSuccess(data, 200, true);
    } finally {
      await client.end();
    }
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
