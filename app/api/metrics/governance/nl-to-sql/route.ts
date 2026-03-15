import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getCatalogueItem } from '@/lib/metric-library/store';
import { validateFormulaSchema } from '@/lib/governance/schema-validator';
import { buildNlToSqlSystemPrompt } from '@/lib/governance/schema-prompt-builder';

const CLAUDE_MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 4096;

function getEnvVar(key: string): string | undefined {
  return process.env[key] || undefined;
}

/**
 * POST /api/metrics/governance/nl-to-sql
 *
 * Generate SQL from natural language using Claude Haiku.
 * System prompt is dynamically generated from the data dictionary,
 * focused on tables relevant to the metric being edited.
 *
 * Body: {
 *   prompt: string,
 *   context: { item_id, level, current_sql, error_context }
 * }
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = await req.json();
    const { prompt, context } = body as {
      prompt?: string;
      context?: { item_id?: string; level?: string; current_sql?: string; error_context?: string };
    };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return jsonError('prompt is required', { status: 400, code: 'VALIDATION_ERROR' });
    }

    if (prompt.length > 2000) {
      return jsonError('prompt exceeds 2000 character limit', { status: 400, code: 'VALIDATION_ERROR' });
    }

    const anthropicKey = getEnvVar('ANTHROPIC_API_KEY');
    const geminiKey = getEnvVar('GOOGLE_GEMINI_API_KEY');

    if (!anthropicKey && !geminiKey) {
      return jsonError('No AI provider configured. Set ANTHROPIC_API_KEY or GOOGLE_GEMINI_API_KEY.', {
        status: 503,
        code: 'AI_NOT_CONFIGURED',
      });
    }

    // Load catalogue item for context enrichment + dynamic prompt
    const item = context?.item_id ? getCatalogueItem(context.item_id) : null;
    const levelKey = context?.level ?? 'facility';

    // Build dynamic system prompt with schema from data dictionary
    const systemPrompt = buildNlToSqlSystemPrompt({
      itemId: context?.item_id,
      level: levelKey,
      ingredientFields: item?.ingredient_fields,
      domainIds: item?.domain_ids,
    });

    // Enrich user message with catalogue context
    let catalogueContext = '';
    if (item) {
      const levelDef = item.level_definitions?.find((ld) => ld.level === levelKey);
      const ingredients = item.ingredient_fields
        ?.map((f) => `${f.layer}.${f.table}.${f.field}`)
        .join(', ');
      catalogueContext = [
        `Metric: ${item.item_name} (${item.abbreviation})`,
        `Generic formula: ${item.generic_formula}`,
        ingredients ? `Ingredient fields: ${ingredients}` : '',
        levelDef?.level_logic ? `Level logic (${levelKey}): ${levelDef.level_logic}` : '',
        levelDef?.spec_formula ? `Spec formula: ${levelDef.spec_formula}` : '',
        levelDef?.formula_sql ? `Current formula SQL (${levelKey}):\n${levelDef.formula_sql}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    const userMessage = [
      catalogueContext ? `Context:\n${catalogueContext}\n` : '',
      `Level: ${levelKey}`,
      context?.current_sql ? `Current SQL:\n${context.current_sql}` : '',
      context?.error_context ? `Previous attempt had this error: ${context.error_context}\nPlease fix the SQL to resolve this error.` : '',
      `Request: ${prompt}`,
    ].filter(Boolean).join('\n\n');

    let generatedSql: string;

    try {
      if (anthropicKey) {
        // Use Claude Haiku
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey: anthropicKey });

        const response = await client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        generatedSql = response.content
          .filter((c) => c.type === 'text')
          .map((c) => (c as { type: 'text'; text: string }).text)
          .join('')
          .trim();
      } else {
        // Fallback to Gemini
        const { GoogleGenAI } = await import('@google/genai');
        const genai = new GoogleGenAI({ apiKey: geminiKey! });

        const result = await genai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
        });

        generatedSql = (result.text ?? '').trim();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonError('AI generation failed', { status: 502, details: msg, code: 'AI_ERROR' });
    }

    // Extract SQL from markdown code blocks if present
    const codeBlockMatch = generatedSql.match(/```(?:sql)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      generatedSql = codeBlockMatch[1].trim();
    }

    // Basic safety check
    const upper = generatedSql.toUpperCase();
    if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
      return jsonError('Generated SQL is not a SELECT statement', {
        status: 422,
        code: 'UNSAFE_SQL',
        details: generatedSql.slice(0, 200),
      });
    }

    // Schema validation: check that referenced tables exist
    const schemaCheck = validateFormulaSchema(generatedSql);

    return jsonSuccess({
      sql: generatedSql,
      provider: anthropicKey ? 'claude' : 'gemini',
      schema_warnings: schemaCheck.warnings.length > 0 ? schemaCheck.warnings : undefined,
      unknown_tables: schemaCheck.unknownTables.length > 0 ? schemaCheck.unknownTables : undefined,
    });
  });
}
