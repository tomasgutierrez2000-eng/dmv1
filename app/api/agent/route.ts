import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenAI,
  createPartFromFunctionResponse,
  createUserContent,
  type Content,
} from '@google/genai';
import { getSchemaBundle, getSchemaSummary } from '@/lib/schema-bundle';
import { buildSystemPrompt } from '@/lib/agent/prompt';
import { TOOL_DECLARATIONS, runTool } from '@/lib/agent/tools';
import { CLAUDE_TOOLS } from '@/lib/agent/claude-tools';
import { getEnvVar } from '@/lib/env';
import Anthropic from '@anthropic-ai/sdk';

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

function getApiKey(): string | undefined {
  return getEnvVar(ENV_VAR_GEMINI);
}

function getAnthropicApiKey(): string | undefined {
  return getEnvVar(ENV_VAR_ANTHROPIC);
}

const CLAUDE_MODEL = 'claude-3-5-haiku-latest';

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
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        system: systemPrompt,
        messages: currentMessages,
        tools: CLAUDE_TOOLS,
        abortSignal: controller.signal,
      });

      const content = response.content ?? [];
      const toolUseBlocks = content.filter((b: { type: string }) => b.type === 'tool_use');

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
        const input = (block.input ?? {}) as Record<string, unknown>;
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

/** Request body for POST /api/agent. */
interface AgentRequestBody {
  message?: string;
  messages?: Array<{ role: string; content: string }>;
}

/**
 * POST /api/agent
 * Body: { message: string } or { messages: Array<{ role: "user" | "model", content: string }> }
 * Returns: { reply: string, toolCalls?: Array<{ name, args }> }
 * Uses Claude if ANTHROPIC_API_KEY is set, otherwise Gemini (GOOGLE_GEMINI_API_KEY).
 */
export async function POST(request: NextRequest) {
  const anthropicKey = getAnthropicApiKey();
  const apiKey = getApiKey();

  if (!anthropicKey && !apiKey) {
    return NextResponse.json(
      {
        error: 'No API key set',
        details: 'Add either ANTHROPIC_API_KEY (for Claude) or GOOGLE_GEMINI_API_KEY (for Gemini) to .env in the project root, then restart the dev server.',
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

  const message = body.message;
  const messages = body.messages;

  const hasMessage = message && typeof message === 'string';
  const hasMessages = Array.isArray(messages) && messages.length > 0;
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
    if (anthropicKey) {
      return await runClaudeAgent({ anthropicKey, message, messages, systemPrompt, bundle, timeoutMs });
    }
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key set', details: 'Set GOOGLE_GEMINI_API_KEY in .env.' },
        { status: 500 }
      );
    }

    const contents: Content[] = hasMessage
      ? [createUserContent(message!)]
      : messages!.map((m) =>
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
