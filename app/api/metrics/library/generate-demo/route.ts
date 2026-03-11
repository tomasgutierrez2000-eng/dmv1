import { NextRequest } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getCatalogueItems, upsertCatalogueItem } from '@/lib/metric-library/store';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

const execFileAsync = promisify(execFile);

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

    if (!item_id || typeof item_id !== 'string') {
      return jsonError('item_id is required and must be a string', { status: 400 });
    }

    // Validate item_id format (alphanumeric, hyphens, underscores only)
    if (!/^[A-Za-z0-9_-]+$/.test(item_id)) {
      return jsonError('item_id contains invalid characters', { status: 400 });
    }

    // Find the catalogue item
    const items = getCatalogueItems({});
    const item = items.find((i) => i.item_id === item_id);
    if (!item) {
      return jsonError(`Catalogue item not found: ${item_id}`, { status: 404 });
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

    // Run the Python generator using execFile (no shell — prevents injection)
    const projectRoot = process.cwd();
    const args = [
      '-m', 'scripts.calc_engine.generate_demo_data',
      '--metric', item_id,
      '--count', String(facility_count),
      '--strategy', strategy,
    ];

    const { stdout, stderr } = await execFileAsync('python3', args, {
      cwd: projectRoot,
      timeout: 30_000,
      env: { ...process.env, PYTHONPATH: projectRoot },
    });

    if (stderr) {
      console.warn('[generate-demo] stderr:', stderr);
    }

    // Parse JSON from stdout — find the outermost JSON object via brace matching
    let result;
    try {
      const jsonStart = stdout.indexOf('{');
      if (jsonStart === -1) {
        return jsonError('Python generator produced no JSON output', { status: 500, details: stderr || stdout });
      }
      let depth = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < stdout.length; i++) {
        if (stdout[i] === '{') depth++;
        else if (stdout[i] === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
      }
      if (jsonEnd === -1) {
        return jsonError('Incomplete JSON in Python generator output', { status: 500, details: stdout });
      }
      result = JSON.parse(stdout.slice(jsonStart, jsonEnd));
    } catch {
      return jsonError('Failed to parse Python generator output', { status: 500, details: stdout });
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
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
