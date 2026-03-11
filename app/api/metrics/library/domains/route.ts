import { getDomains } from '@/lib/metric-library/store';
import { jsonSuccess } from '@/lib/api-response';

export async function GET() {
  const domains = getDomains();
  return jsonSuccess(domains);
}
