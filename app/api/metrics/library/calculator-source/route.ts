import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { jsonSuccess, jsonError } from '@/lib/api-response';

/**
 * GET /api/metrics/library/calculator-source?metric_id=CR-001
 *
 * Scans Python calculator files for a matching metric_id or catalogue_id,
 * then returns the source code of the matching calculator file.
 */
export async function GET(req: NextRequest) {
  const metricId = req.nextUrl.searchParams.get('metric_id');

  if (!metricId || !/^[A-Za-z0-9_-]+$/.test(metricId)) {
    return jsonError('metric_id is required and must be alphanumeric', { status: 400 });
  }

  const calculatorsDir = path.join(process.cwd(), 'scripts', 'calc_engine', 'calculators');

  if (!fs.existsSync(calculatorsDir)) {
    return jsonSuccess({ found: false, file: null, source: null });
  }

  const pyFiles = fs.readdirSync(calculatorsDir).filter(
    (f) => f.endsWith('.py') && f !== '__init__.py' && f !== 'base.py' && f !== 'registry.py'
  );

  for (const pyFile of pyFiles) {
    const filePath = path.join(calculatorsDir, pyFile);
    const source = fs.readFileSync(filePath, 'utf-8');

    // Check if this file's calculator matches the metric_id
    // Look for: metric_id = "CR-001" or catalogue_id = "DSCR" or _legacy_ids = ["C003"]
    const metricIdMatch = source.match(/metric_id\s*=\s*"([^"]+)"/);
    const catalogueIdMatch = source.match(/catalogue_id\s*=\s*"([^"]+)"/);
    const legacyMatch = source.match(/_legacy_ids\s*=\s*\[([^\]]*)\]/);

    const ids = new Set<string>();
    if (metricIdMatch) ids.add(metricIdMatch[1]);
    if (catalogueIdMatch) ids.add(catalogueIdMatch[1]);
    if (legacyMatch) {
      const legacyStr = legacyMatch[1];
      for (const m of legacyStr.matchAll(/"([^"]+)"/g)) {
        ids.add(m[1]);
      }
    }

    if (ids.has(metricId)) {
      const relativePath = `scripts/calc_engine/calculators/${pyFile}`;
      return jsonSuccess({ found: true, file: relativePath, source });
    }
  }

  return jsonSuccess({ found: false, file: null, source: null });
}
