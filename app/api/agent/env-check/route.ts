import { NextResponse } from 'next/server';
import { getEnvKeyInfo, getEnvVar } from '@/lib/env';

/**
 * GET /api/agent/env-check
 * Returns which agent backend is configured (Llama/Ollama preferred, then Claude, then Gemini), without revealing values.
 * Also reports whether a password is required.
 */
export async function GET() {
  const ollamaBaseUrl = getEnvVar('OLLAMA_BASE_URL')?.trim();
  const anthropic = getEnvKeyInfo('ANTHROPIC_API_KEY');
  const gemini = getEnvKeyInfo('GOOGLE_GEMINI_API_KEY');
  const ok = Boolean(ollamaBaseUrl) || anthropic.set || gemini.set;
  const provider = ollamaBaseUrl ? 'llama' : anthropic.set ? 'claude' : gemini.set ? 'gemini' : null;
  const passwordRequired = Boolean(getEnvVar('AGENT_PASSWORD'));
  const message = ok
    ? provider === 'llama'
      ? 'Using Llama (Ollama)'
      : provider === 'claude'
        ? 'Using Claude'
        : 'Using Gemini'
    : 'No agent backend configured';
  return NextResponse.json({
    ok,
    provider,
    passwordRequired,
    message,
    keyLength: ok ? (provider === 'claude' ? anthropic.length : gemini.set ? gemini.length : 0) : 0,
  });
}
