import { jsonSuccess } from '@/lib/api-response';
import { readModelGaps } from '@/lib/model-gaps-store';

/** GET: return stored model gaps (from last Excel import with ModelGaps sheet). */
export async function GET() {
  const gaps = readModelGaps();
  return jsonSuccess({ gaps });
}
