import { NextResponse } from 'next/server';
import { getValidationRuns, getOpenBreaks } from '@/lib/accuracy-assurance/store';

/**
 * GET /api/accuracy/summary
 * Aggregated summary for Page 4 Data Integrity: pass/warn/fail by layer, open break count.
 */
export async function GET() {
  const runs = getValidationRuns();
  const openBreaks = getOpenBreaks();
  const byLayer: Record<number, { pass: number; warning: number; fail: number }> = { 1: { pass: 0, warning: 0, fail: 0 }, 2: { pass: 0, warning: 0, fail: 0 }, 3: { pass: 0, warning: 0, fail: 0 }, 4: { pass: 0, warning: 0, fail: 0 } };
  for (const r of runs) {
    if (byLayer[r.layer]) byLayer[r.layer][r.result]++;
  }
  const totalPass = Object.values(byLayer).reduce((s, l) => s + l.pass, 0);
  const totalWarn = Object.values(byLayer).reduce((s, l) => s + l.warning, 0);
  const totalFail = Object.values(byLayer).reduce((s, l) => s + l.fail, 0);
  const total = totalPass + totalWarn + totalFail;
  const dataQualityScore = total > 0 ? Math.round((totalPass / total) * 100) : null;
  return NextResponse.json({
    data_quality_score: dataQualityScore,
    validation_by_layer: byLayer,
    open_breaks_count: openBreaks.length,
    open_breaks_by_severity: {
      Critical: openBreaks.filter((b) => b.severity === 'Critical').length,
      High: openBreaks.filter((b) => b.severity === 'High').length,
      Medium: openBreaks.filter((b) => b.severity === 'Medium').length,
      Low: openBreaks.filter((b) => b.severity === 'Low').length,
    },
  });
}
