import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenAI,
  createPartFromFunctionResponse,
  createUserContent,
  type Content,
} from '@google/genai';
import OpenAI from 'openai';
import { getSchemaBundle, getSchemaSummary } from '@/lib/schema-bundle';
import { buildSystemPrompt } from '@/lib/agent/prompt';
import { TOOL_DECLARATIONS, runTool } from '@/lib/agent/tools';
import { CLAUDE_TOOLS } from '@/lib/agent/claude-tools';
import { getEnvVar } from '@/lib/env';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// Next.js requires a static literal for maxDuration (no ternary). Use 60 so Vercel Hobby works; locally timeout is getAgentTimeoutMs() (180s).
export const maxDuration = 60;

const MODEL = 'gemini-2.0-flash';
const MAX_TOOL_ROUNDS = 10;
const CLAUDE_MAX_TOKENS = 4096;
const TIMEOUT_VERCEL_MS = 55_000;
const TIMEOUT_LOCAL_MS = 180_000;
const TIMEOUT_MAX_MS = 300_000;

/** Agent timeout in ms. On Vercel use 55s to respond before 60s kill; local 180s. Override with AGENT_TIMEOUT_MS. */
function getAgentTimeoutMs(): number {
  const envVal = typeof process.env.AGENT_TIMEOUT_MS !== 'undefined' ? String(process.env.AGENT_TIMEOUT_MS).trim() : '';
  if (envVal) {
    const n = parseInt(envVal, 10);
    if (Number.isFinite(n) && n > 0) return Math.min(n, TIMEOUT_MAX_MS);
  }
  return process.env.VERCEL === '1' ? TIMEOUT_VERCEL_MS : TIMEOUT_LOCAL_MS;
}

const ENV_VAR_GEMINI = 'GOOGLE_GEMINI_API_KEY';
const ENV_VAR_ANTHROPIC = 'ANTHROPIC_API_KEY';
const ENV_OLLAMA_BASE_URL = 'OLLAMA_BASE_URL';
const ENV_OLLAMA_MODEL = 'OLLAMA_MODEL';

function getApiKey(): string | undefined {
  return getEnvVar(ENV_VAR_GEMINI);
}

function getAnthropicApiKey(): string | undefined {
  return getEnvVar(ENV_VAR_ANTHROPIC);
}

/** When set, use local Llama via Ollama (OpenAI-compatible API). No API key needed. */
function getOllamaBaseUrl(): string | undefined {
  const v = getEnvVar(ENV_OLLAMA_BASE_URL);
  if (v && typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function getOllamaModel(): string {
  const v = getEnvVar(ENV_OLLAMA_MODEL);
  if (v && typeof v === 'string' && v.trim()) return v.trim();
  return 'llama3.2';
}

const CLAUDE_MODEL = 'claude-haiku-4-5';

/** OpenAI-format tools for Ollama (same as Claude tools, different shape). */
const OPENAI_TOOLS = CLAUDE_TOOLS.map((t) => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

type ClaudeMessageParam = { role: 'user' | 'assistant'; content: string | Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown>; tool_use_id?: string; content?: string }> };

function toClaudeMessages(
  message: string | undefined,
  messages: Array<{ role: string; content: string }> | undefined
): ClaudeMessageParam[] {
  if (message && typeof message === 'string') {
    return [{ role: 'user', content: message }];
  }
  if (Array.isArray(messages) && messages.length > 0) {
    return messages.map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(m.content ?? ''),
    }));
  }
  return [];
}

async function runClaudeAgent(params: {
  anthropicKey: string;
  message: string | undefined;
  messages: Array<{ role: string; content: string }> | undefined;
  systemPrompt: string;
  bundle: ReturnType<typeof getSchemaBundle>;
  timeoutMs: number;
}): Promise<NextResponse> {
  const { anthropicKey, message, messages, systemPrompt, bundle, timeoutMs } = params;
  const claudeMessages = toClaudeMessages(message, messages);
  if (claudeMessages.length === 0) {
    return NextResponse.json(
      { error: 'Provide "message" (string) or "messages" (array of { role, content })' },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey, timeout: timeoutMs });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentMessages: ClaudeMessageParam[] = [...claudeMessages];
    let toolCallsMade: Array<{ name: string; args: Record<string, unknown> }> = [];
    let rounds = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await anthropic.messages.create(
        {
          model: CLAUDE_MODEL,
          max_tokens: CLAUDE_MAX_TOKENS,
          system: systemPrompt,
          messages: currentMessages as MessageParam[],
          tools: CLAUDE_TOOLS,
        },
        { signal: controller.signal }
      );

      const content = response.content ?? [];
      type ToolUseLike = { type: string; id?: string; name?: string; input?: Record<string, unknown> };
      const toolUseBlocks = content.filter((b: { type: string }) => b.type === 'tool_use') as ToolUseLike[];

      if (toolUseBlocks.length === 0 || rounds >= MAX_TOOL_ROUNDS) {
        clearTimeout(timeoutId);
        const reply = content
          .filter((b: { type: string }) => b.type === 'text')
          .map((b: { type: string; text?: string }) => b.text ?? '')
          .join('');
        return NextResponse.json({
          reply: reply || '(No text in response.)',
          ...(toolCallsMade.length > 0 && { toolCalls: toolCallsMade }),
        });
      }

      rounds += 1;
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
      for (const block of toolUseBlocks) {
        const id = block.id ?? '';
        const name = block.name ?? 'unknown';
        const input = block.input ?? {};
        toolCallsMade.push({ name, args: input });
        const result = runTool(name, input, bundle);
        toolResults.push({ type: 'tool_result', tool_use_id: id, content: JSON.stringify(result) });
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: content as ClaudeMessageParam['content'] },
        { role: 'user', content: toolResults },
      ];
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    console.error('[agent] Claude', err);
    let userError = 'Agent request failed';
    let userHint = message;
    if (message.includes('429') || message.includes('overloaded')) {
      userError = 'Rate limit or quota exceeded';
      userHint = 'Anthropic rate limit hit. Wait a moment and try again.';
    } else if (message.includes('401') || message.includes('invalid_api_key')) {
      userError = 'Invalid API key';
      userHint = 'Check ANTHROPIC_API_KEY in .env (https://console.anthropic.com/).';
    } else if (message.includes('abort') || message.includes('timeout') || message.includes('ETIMEDOUT')) {
      userError = 'Request timed out';
      const limit = process.env.VERCEL === '1' ? 'On Vercel, runs are limited to ~60s.' : '';
      userHint = `The request took too long. Try a shorter question or try again. ${limit}`.trim();
    }
    return NextResponse.json({ error: userError, details: userHint }, { status: 500 });
  }
}

/** Build OpenAI chat messages from request (system passed separately). */
function toOpenAIMessages(
  message: string | undefined,
  messages: Array<{ role: string; content: string }> | undefined
): OpenAI.Chat.ChatCompletionMessageParam[] {
  if (message && typeof message === 'string') {
    return [{ role: 'user', content: message }];
  }
  if (Array.isArray(messages) && messages.length > 0) {
    return messages.map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }));
  }
  return [];
}

async function runLlamaAgent(params: {
  baseUrl: string;
  model: string;
  message: string | undefined;
  messages: Array<{ role: string; content: string }> | undefined;
  systemPrompt: string;
  bundle: ReturnType<typeof getSchemaBundle>;
  timeoutMs: number;
}): Promise<NextResponse> {
  const { baseUrl, model, message, messages, systemPrompt, bundle, timeoutMs } = params;
  const openAIMessages = toOpenAIMessages(message, messages);
  if (openAIMessages.length === 0) {
    return NextResponse.json(
      { error: 'Provide "message" (string) or "messages" (array of { role, content })' },
      { status: 400 }
    );
  }

  const client = new OpenAI({
    baseURL: baseUrl.replace(/\/$/, '') + '/v1',
    apiKey: 'ollama', // Ollama ignores key; OpenAI client requires something
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...openAIMessages,
    ];
    const toolCallsMade: Array<{ name: string; args: Record<string, unknown> }> = [];
    let rounds = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await client.chat.completions.create(
        {
          model,
          messages: currentMessages,
          tools: OPENAI_TOOLS,
          tool_choice: 'auto',
          max_tokens: CLAUDE_MAX_TOKENS,
        },
        { signal: controller.signal, timeout: timeoutMs }
      );

      const choice = response.choices?.[0];
      const msg = choice?.message;
      const content = msg?.content?.trim() ?? '';
      const toolCalls = msg?.tool_calls ?? [];

      if (toolCalls.length === 0 || rounds >= MAX_TOOL_ROUNDS) {
        clearTimeout(timeoutId);
        return NextResponse.json({
          reply: content || '(No text in response.)',
          ...(toolCallsMade.length > 0 && { toolCalls: toolCallsMade }),
        });
      }

      rounds += 1;
      type ToolCallLike = { id?: string; function?: { name?: string; arguments?: string } };
      const toolCallsTyped = toolCalls as ToolCallLike[];
      currentMessages = [
        ...currentMessages,
        {
          role: 'assistant',
          content: content || null,
          tool_calls: toolCallsTyped.map((tc) => ({
            id: tc.id ?? '',
            type: 'function' as const,
            function: { name: tc.function?.name ?? '', arguments: tc.function?.arguments ?? '{}' },
          })),
        },
      ] as OpenAI.Chat.ChatCompletionMessageParam[];

      for (const tc of toolCallsTyped) {
        const name = tc.function?.name ?? 'unknown';
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments ?? '{}') as Record<string, unknown>;
        } catch {
          // ignore
        }
        toolCallsMade.push({ name, args });
        const result = runTool(name, args, bundle);
        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.id ?? '',
          content: JSON.stringify(result),
        });
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    console.error('[agent] Llama', err);
    let userError = 'Agent request failed';
    let userHint = message;
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      userError = 'Cannot reach Ollama';
      userHint = 'Start Ollama (e.g. run `ollama serve`) and ensure OLLAMA_BASE_URL in .env points to it (default http://localhost:11434).';
    } else if (message.includes('abort') || message.includes('timeout') || message.includes('ETIMEDOUT')) {
      userError = 'Request timed out';
      userHint = `The request took too long. Try a shorter question or increase AGENT_TIMEOUT_MS.`;
    }
    return NextResponse.json({ error: userError, details: userHint }, { status: 500 });
  }
}

/** Request body for POST /api/agent. */
interface AgentRequestBody {
  message?: string;
  messages?: Array<{ role: 'user' | 'model'; content: string }>;
  password?: string;
}

/**
 * POST /api/agent
 * Body: { message: string } or { messages: Array<{ role: "user" | "model", content: string }> }
 * Returns: { reply: string, toolCalls?: Array<{ name, args }> }
 * Prefers Llama (Ollama) if OLLAMA_BASE_URL is set, then Claude (ANTHROPIC_API_KEY), then Gemini (GOOGLE_GEMINI_API_KEY).
 */
export async function POST(request: NextRequest) {
  const ollamaBaseUrl = getOllamaBaseUrl();
  const anthropicKey = getAnthropicApiKey();
  const apiKey = getApiKey();

  if (!ollamaBaseUrl && !anthropicKey && !apiKey) {
    return NextResponse.json(
      {
        error: 'No agent backend configured',
        details: 'Set OLLAMA_BASE_URL (e.g. http://localhost:11434 for Llama), or ANTHROPIC_API_KEY (Claude), or GOOGLE_GEMINI_API_KEY (Gemini) in .env, then restart the dev server.',
      },
      { status: 500 }
    );
  }

  let body: AgentRequestBody;
  try {
    body = (await request.json()) as AgentRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Password gate: if AGENT_PASSWORD is set, require it in the request body.
  const requiredPassword = getEnvVar('AGENT_PASSWORD');
  if (requiredPassword && body.password !== requiredPassword) {
    return NextResponse.json(
      { error: 'Unauthorized', details: 'Invalid or missing password.' },
      { status: 401 }
    );
  }

  const message = body.message;
  const rawMessages = body.messages;
  let validatedMessages: Array<{ role: 'user' | 'model'; content: string }> | undefined;
  if (Array.isArray(rawMessages) && rawMessages.length > 0) {
    validatedMessages = rawMessages
      .filter((m): m is { role: 'user' | 'model'; content: string } =>
        m != null && typeof m === 'object' && typeof (m as { content?: unknown }).content === 'string')
      .map((m) => ({
        role: (m as { role?: string }).role === 'model' ? ('model' as const) : ('user' as const),
        content: String((m as { content: string }).content),
      }));
  }
  const hasMessage = message && typeof message === 'string';
  const hasMessages = Array.isArray(validatedMessages) && validatedMessages.length > 0;
  if (!hasMessage && !hasMessages) {
    return NextResponse.json(
      { error: 'Provide "message" (string) or "messages" (array of { role, content })' },
      { status: 400 }
    );
  }

  try {
    const summary = getSchemaSummary();
    const systemPrompt = buildSystemPrompt(summary);
    const bundle = getSchemaBundle();

    const timeoutMs = getAgentTimeoutMs();
    if (ollamaBaseUrl) {
      return await runLlamaAgent({
        baseUrl: ollamaBaseUrl,
        model: getOllamaModel(),
        message,
        messages: validatedMessages,
        systemPrompt,
        bundle,
        timeoutMs,
      });
    }
    if (anthropicKey) {
      return await runClaudeAgent({ anthropicKey, message, messages: validatedMessages, systemPrompt, bundle, timeoutMs });
    }
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key set', details: 'Set GOOGLE_GEMINI_API_KEY in .env.' },
        { status: 500 }
      );
    }

    const contents: Content[] = hasMessage
      ? [createUserContent(message!)]
      : validatedMessages!.map((m) =>
          m.role === 'model'
            ? { role: 'model' as const, parts: [{ text: m.content }] }
            : createUserContent(m.content)
        );

    const ai = new GoogleGenAI({ apiKey });
    const config = {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      httpOptions: { timeout: timeoutMs },
      abortSignal: AbortSignal.timeout(timeoutMs),
    };

    let response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config,
    });

    let rounds = 0;
    const toolCallsMade: Array<{ name: string; args: Record<string, unknown> }> = [];

    while (response.functionCalls && response.functionCalls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;
      const candidate = response.candidates?.[0];
      if (!candidate?.content) {
        break;
      }

      // Append model turn (includes the function call(s))
      contents.push({
        role: 'model',
        parts: candidate.content.parts ?? [],
      } as Content);

      // Run each function call and build response parts
      const functionCalls = response.functionCalls ?? [];
      const responseParts = functionCalls.map((fc) => {
        const name = fc.name ?? 'unknown';
        const args = (fc.args ?? {}) as Record<string, unknown>;
        toolCallsMade.push({ name, args });
        const result = runTool(name, args, bundle);
        const id = fc.id ?? name;
        return createPartFromFunctionResponse(id, name, result);
      });

      // Single user turn with all function responses
      contents.push(createUserContent(responseParts));

      response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: { ...config, httpOptions: { timeout: timeoutMs }, abortSignal: AbortSignal.timeout(timeoutMs) },
      });
    }

    const reply = response.text ?? '';
    return NextResponse.json({
      reply: reply || '(No text in response.)',
      ...(toolCallsMade.length > 0 && { toolCalls: toolCallsMade }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[agent]', err);

    let userError = 'Agent request failed';
    let userHint = message;

    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota') || message.includes('rate')) {
      userError = 'Rate limit or quota exceeded';
      userHint = 'Your Gemini API free-tier limit may be reached. Wait a few minutes and try again, or check your plan at https://ai.google.dev/gemini-api/docs/rate-limits';
    } else if (message.includes('404') || message.includes('NOT_FOUND') || message.includes('is not found')) {
      userError = 'Model not available';
      userHint = 'The requested model is not available for your API key. The app uses gemini-2.0-flash; you can change it in app/api/agent/route.ts (see https://ai.google.dev/gemini-api/docs/models).';
    } else if (message.includes('401') || message.includes('API key')) {
      userError = 'Invalid API key';
      userHint = 'Check GOOGLE_GEMINI_API_KEY in .env and that the key is valid at https://aistudio.google.com/apikey';
    } else if (message.includes('timeout') || message.includes('aborted') || message.includes('ETIMEDOUT') || message.includes('AbortError')) {
      userError = 'Request timed out';
      const limit = process.env.VERCEL === '1' ? ' On Vercel, runs are limited to ~60s.' : '';
      userHint = `The request took too long. Try a shorter question or try again.${limit}`;
    }

    return NextResponse.json(
      { error: userError, details: userHint },
      { status: 500 }
    );
  }
}
