import { NextResponse } from 'next/server';
import { getEnvKeyInfo, getEnvVar } from '@/lib/env';

/**
 * GET /api/agent/env-check
 * Returns which agent backend is configured (Llama/Ollama preferred, then Claude, then Gemini), without revealing values.
 * ollamaBaseUrlSet: true when OLLAMA_BASE_URL is set (so UI can confirm Ollama is configured).
 */
export async function GET() {
  const useLlamaOnly = getEnvVar('AGENT_PROVIDER')?.toLowerCase().trim() === 'llama';
  const ollamaBaseUrl = getEnvVar('OLLAMA_BASE_URL')?.trim();
  const ollamaBaseUrlSet = Boolean(ollamaBaseUrl);
  const anthropic = getEnvKeyInfo('ANTHROPIC_API_KEY');
  const gemini = getEnvKeyInfo('GOOGLE_GEMINI_API_KEY');
  const ok = useLlamaOnly ? ollamaBaseUrlSet : ollamaBaseUrlSet || anthropic.set || gemini.set;
  // Prefer Llama whenever OLLAMA_BASE_URL is set; only then fall back to Claude/Gemini
  const provider = ollamaBaseUrlSet ? 'llama' : useLlamaOnly ? null : anthropic.set ? 'claude' : gemini.set ? 'gemini' : null;
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
    ollamaBaseUrlSet,
    keyLength: ok ? (provider === 'claude' ? anthropic.length : gemini.set ? gemini.length : 0) : 0,
  });
}
