import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/config';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // packaging can take a minute

export async function GET() {
  const root = getProjectRoot();
  const script = path.join(root, 'scripts', 'package-for-migration.sh');

  if (!fs.existsSync(script)) {
    return NextResponse.json(
      { ok: false, error: 'Migration packaging script not found.' },
      { status: 404 }
    );
  }

  const tmpDir = process.env.TMPDIR || '/tmp';

  try {
    // Run the packaging script, output to temp
    const { stdout, stderr } = await execFileAsync('bash', [script, '--output-dir', tmpDir, '--yes'], {
      cwd: root,
      timeout: 90_000,
      env: { ...process.env, HOME: process.env.HOME || '/tmp' },
    });

    // Find the zip file from stdout — the script prints "File: /path/to/zip"
    const fileMatch = stdout.match(/File:\s+(.+\.zip)/);
    if (!fileMatch) {
      console.error('Packaging stdout:', stdout);
      console.error('Packaging stderr:', stderr);
      return NextResponse.json(
        { ok: false, error: 'Packaging completed but zip file not found in output.' },
        { status: 500 }
      );
    }

    const zipPath = fileMatch[1].trim();
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json(
        { ok: false, error: `Zip file not found at ${zipPath}` },
        { status: 500 }
      );
    }

    const zipBuffer = fs.readFileSync(zipPath);
    const filename = path.basename(zipPath);

    // Clean up the temp zip
    try { fs.unlinkSync(zipPath); } catch { /* ignore */ }

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Migration package error:', msg);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate migration package.', details: msg },
      { status: 500 }
    );
  }
}
