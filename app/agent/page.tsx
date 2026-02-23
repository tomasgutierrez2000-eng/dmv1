'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, MessageCircle, Wrench, CheckCircle, XCircle, AlertTriangle, Lock } from 'lucide-react';

const SUGGESTIONS = [
  'What tables are in L2?',
  'Describe facility_master',
  'How do I get from facility to counterparty?',
  'List L3 metrics for the Executive page',
];

/** Client-side abort timeout: must exceed server timeout (180s local). */
const CLIENT_TIMEOUT_MS = 195_000;

/** API success response from POST /api/agent. */
interface AgentApiResponse {
  reply: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  partial?: boolean;
}

/** API error response (4xx/5xx). */
interface AgentErrorResponse {
  error?: string;
  details?: string;
  hint?: string;
}

type Message = {
  role: 'user' | 'model';
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  /** True when the API returned a partial reply (e.g. hit timeout). */
  partial?: boolean;
};

const SESSION_KEY = 'agent-password';

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envOk, setEnvOk] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<'claude' | 'gemini' | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore password from sessionStorage and check if password is required
  useEffect(() => {
    fetch('/api/agent/env-check')
      .then((r) => r.json())
      .then((d) => {
        setEnvOk(d.ok === true);
        setProvider(d.provider ?? null);
        const needsPassword = d.passwordRequired === true;
        setPasswordRequired(needsPassword);
        if (!needsPassword) {
          setUnlocked(true);
        } else {
          const saved = sessionStorage.getItem(SESSION_KEY);
          if (saved) setUnlocked(true);
        }
      })
      .catch(() => setEnvOk(false));
  }, []);

  // Scroll to bottom when new message or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  function submitText(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: t }]);
    setLoading(true);
    doSend(t);
  }

  async function doSend(text: string) {
    try {
      const history = [...messages, { role: 'user' as const, content: text }].map(
        (m) => ({ role: m.role, content: m.content })
      );
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
      let res: Response;
      try {
        const savedPassword = sessionStorage.getItem(SESSION_KEY);
        res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, ...(savedPassword && { password: savedPassword }) }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      let data: AgentApiResponse | AgentErrorResponse;
      try {
        data = (await res.json()) as AgentApiResponse | AgentErrorResponse;
      } catch {
        setError('Server returned invalid JSON. Is the dev server running? Run: npm run dev');
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }
      if (res.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        setUnlocked(false);
        setPasswordError('Invalid password. Please try again.');
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const err = data as AgentErrorResponse;
        const msg = [err.error, err.details ?? err.hint].filter(Boolean).join(' — ');
        setError(msg || 'Request failed');
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        inputRef.current?.focus();
        return;
      }
      const success = data as AgentApiResponse;
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: success.reply ?? '(No response.)',
          toolCalls: success.toolCalls,
          partial: success.partial === true,
        },
      ]);
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setError(isAbort ? 'Request timed out. The model took too long to respond — try again or ask a shorter question.' : err instanceof Error ? err.message : 'Network error. Run "npm run dev" from the project folder and open the URL shown (e.g. http://localhost:3000).');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    submitText(text);
  }

  return (
    <div className="min-h-screen bg-pwc-black text-pwc-white flex flex-col">
      {/* Header - matches overview/visualizer pattern */}
      <header className="border-b border-pwc-gray bg-pwc-gray/20 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-pwc-gray-light hover:text-pwc-white hover:bg-pwc-gray/50 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pwc-orange focus:ring-offset-2 focus:ring-offset-pwc-black"
            aria-label="Back to overview"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-pwc-gray-light" />
            <span className="font-medium text-pwc-white">Ask the data model</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Password gate */}
      {!unlocked && passwordRequired && (
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pwc-gray border border-pwc-gray-light mb-4">
                <Lock className="w-7 h-7 text-pwc-gray-light" />
              </div>
              <p className="text-pwc-gray-light text-sm">Enter the password to use the agent.</p>
            </div>
            {passwordError && (
              <div className="rounded-xl px-4 py-2 bg-red-950/50 border border-red-800 text-red-200 text-sm mb-4 text-center" role="alert">
                {passwordError}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pw = passwordInput.trim();
                if (!pw) return;
                sessionStorage.setItem(SESSION_KEY, pw);
                setPasswordError(null);
                setUnlocked(true);
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-pwc-gray border border-pwc-gray-light text-pwc-white placeholder-pwc-gray-light text-sm focus:outline-none focus:ring-2 focus:ring-pwc-orange focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!passwordInput.trim()}
                className="min-h-[44px] px-5 rounded-xl bg-pwc-orange hover:bg-pwc-orange-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-pwc-orange focus:ring-offset-2 focus:ring-offset-pwc-gray"
              >
                Unlock
              </button>
            </form>
          </div>
        </main>
      )}

      {/* Messages - role="log" so assistive tech announces new messages */}
      {unlocked && <main className="flex-1 overflow-y-auto overflow-x-hidden" role="log" aria-live="polite" aria-label="Chat messages">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {envOk === false && (
            <div className="rounded-xl px-4 py-3 bg-amber-950/50 border border-amber-700 text-amber-200 text-sm mb-6 flex flex-col gap-2" role="alert">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>No API key set. Add ANTHROPIC_API_KEY or GOOGLE_GEMINI_API_KEY to .env in the project root, then restart the dev server (Ctrl+C, then npm run dev).</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:text-amber-200 underline w-fit">Get Claude API key (Anthropic)</a>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:text-amber-200 underline w-fit">Get Gemini API key (Google AI Studio)</a>
              </div>
            </div>
          )}
          {envOk === true && (
            <div className="rounded-xl px-4 py-2 bg-emerald-950/30 border border-emerald-800 text-emerald-300 text-sm mb-6 flex items-center gap-2 w-fit">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {provider === 'claude' ? 'Using Claude' : 'Using Gemini'}
            </div>
          )}

          {messages.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pwc-gray border border-pwc-gray-light mb-4" aria-hidden="true">
                <MessageCircle className="w-7 h-7 text-pwc-gray-light" />
              </div>
              <p className="text-pwc-gray-light text-sm mb-3">Ask about tables, relationships, metrics, or lineage.</p>
              <p className="text-pwc-gray-light/80 text-xs mb-4">Try a suggestion or type your own question.</p>
              <div className="flex flex-wrap gap-2 justify-center mb-6" role="group" aria-label="Suggested questions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submitText(s)}
                    disabled={loading || envOk === false}
                    className="px-4 py-2.5 rounded-xl bg-pwc-gray border border-pwc-gray-light text-pwc-white text-sm hover:border-pwc-orange hover:bg-pwc-gray/90 focus:outline-none focus:ring-2 focus:ring-pwc-orange focus:ring-offset-2 focus:ring-offset-pwc-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left max-w-full"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-pwc-gray-light/70 text-xs mt-4">Run <code className="bg-pwc-gray px-1 rounded">npm run dev</code> in the project folder, then open the URL from the terminal. Need a key? <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-pwc-gray-light hover:text-pwc-white underline">Claude</a> or <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-pwc-gray-light hover:text-pwc-white underline">Gemini</a>.</p>
            </div>
          )}

          {messages.map((m, i) => (
                <div
                key={`msg-${i}-${m.role}`}
                className={`mb-6 ${m.role === 'user' ? 'flex justify-end' : ''}`}
              >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-pwc-gray text-pwc-white'
                    : 'bg-pwc-gray/80 border border-pwc-gray-light/30 text-pwc-white'
                }`}
              >
                {m.role === 'model' && m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {m.toolCalls.map((tc, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pwc-gray text-pwc-gray-light text-xs font-mono"
                        title={JSON.stringify(tc.args)}
                      >
                        <Wrench className="w-3 h-3" />
                        {tc.name}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {m.role === 'model' && m.partial && (
                  <div className="flex items-center gap-1.5 mt-2 text-amber-400 text-xs" role="status">
                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>Response may be incomplete (ran out of time). Try a more specific question.</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start mb-6" aria-live="polite" aria-busy="true">
              <div className="rounded-2xl px-4 py-3 bg-pwc-gray/80 border border-pwc-gray-light/30 inline-flex items-center gap-2 text-pwc-gray-light text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking…
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 bg-red-950/50 border border-red-800 text-red-200 text-sm mb-6 flex items-start gap-3" role="alert">
              <p className="flex-1 min-w-0">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 p-1 rounded-md hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-red-950 transition-colors"
                aria-label="Dismiss error"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>}

      {/* Input */}
      {unlocked && <footer className="border-t border-pwc-gray bg-pwc-gray/20 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3" aria-label="Send a message">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask about the data model…"
              rows={1}
              className="flex-1 min-h-[44px] max-h-32 px-4 py-3 rounded-xl bg-pwc-gray border border-pwc-gray-light text-pwc-white placeholder-pwc-gray-light text-sm resize-y focus:outline-none focus:ring-2 focus:ring-pwc-orange focus:border-transparent"
              disabled={loading}
              aria-label="Message input"
              title="Enter to send, Shift+Enter for new line"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 min-h-[44px] min-w-[44px] px-5 rounded-xl bg-pwc-orange hover:bg-pwc-orange-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-pwc-orange focus:ring-offset-2 focus:ring-offset-pwc-gray"
              title="Send message"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              Send
            </button>
          </form>
        </div>
      </footer>}
    </div>
  );
}
