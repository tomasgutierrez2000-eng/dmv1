import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getCatalogueItems, upsertCatalogueItem } from '@/lib/metric-library/store';

function jsonSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function jsonError(message: string, status = 500, details?: string) {
  return NextResponse.json({ ok: false, error: message, ...(details ? { details } : {}) }, { status });
}

const execAsync = promisify(exec);

/**
 * POST /api/metrics/library/generate-demo
 *
 * Auto-generate demo_data for a catalogue item by running the Python
 * calculation engine against L1/L2 data (PostgreSQL or sample JSON).
 *
 * Body: { item_id: string, facility_count?: number, strategy?: string, persist?: boolean, force?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item_id, facility_count = 5, strategy = 'diverse', persist = false, force = false } = body;

    if (!item_id) {
      return jsonError('item_id is required', 400);
    }

    // Find the catalogue item
    const items = getCatalogueItems({});
    const item = items.find((i) => i.item_id === item_id);
    if (!item) {
      return jsonError(`Catalogue item not found: ${item_id}`, 404);
    }

    // Skip if already has demo data and not forcing
    if (!force && item.demo_data?.facilities?.length) {
      return jsonSuccess({
        item_id,
        skipped: true,
        message: `Already has demo_data (${item.demo_data.facilities.length} facilities). Use force: true to overwrite.`,
        demo_data: item.demo_data,
      });
    }

    // Run the Python generator
    const projectRoot = process.cwd();
    const args = [
      '-m', 'scripts.calc-engine.generate_demo_data',
      '--metric', item_id,
      '--count', String(facility_count),
      '--strategy', strategy,
    ];

    const { stdout, stderr } = await execAsync(
      `python3 ${args.map(a => `"${a}"`).join(' ')}`,
      {
        cwd: projectRoot,
        timeout: 30_000,
        env: { ...process.env, PYTHONPATH: projectRoot },
      },
    );

    if (stderr) {
      console.warn('[generate-demo] stderr:', stderr);
    }

    // Parse the JSON output (Python prints JSON to stdout when no --output/--persist)
    let result;
    try {
      // Extract JSON from stdout (skip any diagnostic lines after the JSON)
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return jsonError('Python generator produced no JSON output', 500, stderr || stdout);
      }
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return jsonError('Failed to parse Python generator output', 500, stdout);
    }

    // Persist if requested
    if (persist && result.demo_data) {
      item.demo_data = result.demo_data;
      upsertCatalogueItem(item);
    }

    return jsonSuccess({
      item_id,
      demo_data: result.demo_data,
      diagnostics: result.diagnostics,
      persisted: persist,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`Demo generation failed: ${message}`, 500);
  }
}
