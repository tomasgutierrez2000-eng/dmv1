import { NextRequest } from 'next/server';
import { getParentMetrics } from '@/lib/metric-library/store';
import { jsonSuccess } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain') ?? undefined;
  const parents = getParentMetrics(domain);
  return jsonSuccess(parents);
}
