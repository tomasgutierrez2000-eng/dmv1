import { NextRequest } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { jsonSuccess, jsonError } from '@/lib/api-response';

const execFileAsync = promisify(execFile);

const VALID_DIMENSIONS = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'];

/**
 * POST /api/metrics/library/run-calculator
 *
 * Executes a Python metric calculator and returns results as JSON.
 *
 * Body: { metric_id: string, dimension?: string, as_of_date?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { metric_id, dimension = 'facility', as_of_date } = body;

    if (!metric_id || typeof metric_id !== 'string') {
      return jsonError('metric_id is required', { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]+$/.test(metric_id)) {
      return jsonError('metric_id contains invalid characters', { status: 400 });
    }
    if (!VALID_DIMENSIONS.includes(dimension)) {
      return jsonError(`dimension must be one of: ${VALID_DIMENSIONS.join(', ')}`, { status: 400 });
    }

    const projectRoot = process.cwd();
    const args = [
      '-m', 'scripts.calc_engine.run_metric',
      '--metric', metric_id,
      '--dimension', dimension,
      '--json',
    ];
    if (as_of_date && typeof as_of_date === 'string') {
      args.push('--as-of-date', as_of_date);
    }

    const { stdout, stderr } = await execFileAsync('python3', args, {
      cwd: projectRoot,
      timeout: 30_000,
      env: { ...process.env, PYTHONPATH: projectRoot },
    });

    if (stderr) {
      console.warn('[run-calculator] stderr:', stderr);
    }

    // Parse JSON array from stdout — find the outermost JSON array
    let rows;
    try {
      const jsonStart = stdout.indexOf('[');
      if (jsonStart === -1) {
        return jsonError('Calculator produced no JSON output', { status: 500, details: stderr || stdout });
      }
      let depth = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < stdout.length; i++) {
        if (stdout[i] === '[') depth++;
        else if (stdout[i] === ']') { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
      }
      if (jsonEnd === -1) {
        return jsonError('Incomplete JSON in calculator output', { status: 500, details: stdout });
      }
      rows = JSON.parse(stdout.slice(jsonStart, jsonEnd));
    } catch {
      return jsonError('Failed to parse calculator output', { status: 500, details: stdout });
    }

    return jsonSuccess({
      metric_id,
      dimension,
      row_count: Array.isArray(rows) ? rows.length : 0,
      rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Detect Python not available (common on Vercel)
    if (message.includes('ENOENT') || message.includes('python3')) {
      return jsonError('Python runtime not available in this environment', { status: 503 });
    }
    return jsonError(`Calculator execution failed: ${message}`);
  }
}
