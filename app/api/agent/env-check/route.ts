import { NextResponse } from 'next/server';
import { getEnvKeyInfo, getEnvVar } from '@/lib/env';

/**
 * GET /api/agent/env-check
 * Returns which agent API key is set (Claude preferred if both set), without revealing values.
 * Also reports whether a password is required.
 */
export async function GET() {
  const anthropic = getEnvKeyInfo('ANTHROPIC_API_KEY');
  const gemini = getEnvKeyInfo('GOOGLE_GEMINI_API_KEY');
  const ok = anthropic.set || gemini.set;
  const provider = anthropic.set ? 'claude' : gemini.set ? 'gemini' : null;
  const passwordRequired = Boolean(getEnvVar('AGENT_PASSWORD'));
  return NextResponse.json({
    ok,
    provider,
    passwordRequired,
    message: ok ? (provider === 'claude' ? 'Using Claude' : 'Using Gemini') : 'No API key set',
    keyLength: ok ? (provider === 'claude' ? anthropic.length : gemini.length) : 0,
  });
}
