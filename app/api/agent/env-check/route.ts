import { NextResponse } from 'next/server';
import { getEnvKeyInfo } from '@/lib/env';

/**
 * GET /api/agent/env-check
 * Returns which agent API key is set (Claude preferred if both set), without revealing values.
 * Does not expose cwd or filesystem details.
 */
export async function GET() {
  const anthropic = getEnvKeyInfo('ANTHROPIC_API_KEY');
  const gemini = getEnvKeyInfo('GOOGLE_GEMINI_API_KEY');
  const ok = anthropic.set || gemini.set;
  const provider = anthropic.set ? 'claude' : gemini.set ? 'gemini' : null;
  return NextResponse.json({
    ok,
    provider,
    message: ok ? (provider === 'claude' ? 'Using Claude' : 'Using Gemini') : 'No API key set',
    keyLength: ok ? (provider === 'claude' ? anthropic.length : gemini.length) : 0,
  });
}
