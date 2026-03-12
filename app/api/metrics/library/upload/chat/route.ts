/**
 * POST /api/metrics/library/upload/chat
 *
 * AI-powered conversational follow-up for metric upload validation.
 * Takes the validation report + user message, uses Claude/Gemini to suggest
 * fixes, answer questions, and return updated metrics.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { getEnvVar } from '@/lib/env';
import { getSchemaSummary } from '@/lib/schema-bundle';
import type { MetricWithSources } from '@/lib/metric-library/template-parser';
import type { ValidationReport } from '@/lib/metric-library/upload-validator';

const CLAUDE_MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 4096;

interface ChatRequest {
  message: string;
  metrics: MetricWithSources[];
  validation: ValidationReport;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function buildSystemPrompt(schemaSummary: object): string {
  return `You are a data model expert helping a user fix issues with their uploaded metric definitions.

## Context
The user uploaded metrics via an Excel template. The system validated them against the data dictionary and found issues.
Your job: help resolve validation issues by suggesting fixes, answering questions, and returning corrected metric data.

## Data Model Summary
${JSON.stringify(schemaSummary, null, 2)}

## Rules
- When suggesting table/field corrections, use exact names from the data dictionary.
- When the user says "fix all" or "apply all fixes", return the corrected metrics as JSON in a \`\`\`json code block.
- Format corrected metrics as: \`\`\`json\n{"fixed_metrics": [...]}\n\`\`\` where each metric has the same shape as the input.
- Be concise and direct. Focus on actionable fixes.
- If you're unsure about a correction, ask a clarifying question.`;
}

function buildUserMessage(req: ChatRequest): string {
  const issues = req.validation.metrics
    .filter((m) => m.status !== 'valid')
    .map((m) => {
      const issueList = m.issues.map((i) => `  - [${i.severity}] ${i.field}: ${i.message}${i.suggestion ? ` ${i.suggestion}` : ''}`).join('\n');
      return `${m.metric_id} (${m.name}):\n${issueList}`;
    })
    .join('\n\n');

  return `## Uploaded Metrics
${JSON.stringify(req.metrics, null, 2)}

## Validation Issues
${issues || 'No issues found.'}

## User Message
${req.message}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.message) {
      return jsonError('Message is required', { status: 400 });
    }

    // Try Claude first, then Gemini
    const anthropicKey = getEnvVar('ANTHROPIC_API_KEY');
    const geminiKey = getEnvVar('GOOGLE_GEMINI_API_KEY');

    if (!anthropicKey && !geminiKey) {
      return jsonError('No AI provider configured. Set ANTHROPIC_API_KEY or GOOGLE_GEMINI_API_KEY.', {
        status: 503,
        code: 'NO_AI_PROVIDER',
      });
    }

    const summary = getSchemaSummary();
    const systemPrompt = buildSystemPrompt(summary);
    const userMessage = buildUserMessage(body);

    let reply: string;

    if (anthropicKey) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });

      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (body.history) {
        for (const h of body.history) {
          messages.push({ role: h.role, content: h.content });
        }
      }
      messages.push({ role: 'user', content: userMessage });

      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      });

      reply = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');
    } else {
      // Gemini fallback
      const { GoogleGenAI } = await import('@google/genai');
      const genai = new GoogleGenAI({ apiKey: geminiKey! });

      const result = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
      });

      reply = result.text ?? 'No response from AI.';
    }

    // Try to extract fixed_metrics JSON from the reply
    let fixedMetrics: MetricWithSources[] | null = null;
    const jsonMatch = reply.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.fixed_metrics && Array.isArray(parsed.fixed_metrics)) {
          fixedMetrics = parsed.fixed_metrics;
        }
      } catch {
        // JSON parse failed — that's fine, just return the text
      }
    }

    return jsonSuccess({
      reply,
      fixed_metrics: fixedMetrics,
    });
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
