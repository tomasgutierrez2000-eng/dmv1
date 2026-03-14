import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getCatalogueItem } from '@/lib/metric-library/store';

const CLAUDE_MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 4096;

function getEnvVar(key: string): string | undefined {
  return process.env[key] || undefined;
}

const SYSTEM_PROMPT = `You are a SQL formula generator for a GSIB banking data model.
You generate PostgreSQL SELECT queries for metric calculations.

IMPORTANT RULES:
- Only generate SELECT statements (no DML, no DDL)
- Use :as_of_date bind parameter for date filtering
- Always alias the grouping column as "dimension_key"
- Always alias the metric value as "metric_value"
- Use NULLIF to prevent division by zero
- Use explicit schema prefixes (l1., l2., l3.)

AVAILABLE TABLES:
- l2.facility_master (facility_id, committed_facility_amt, counterparty_id, lob_segment_id, product_node_id, portfolio_id)
- l2.collateral_snapshot (facility_id, as_of_date, current_valuation_usd, collateral_type_id)
- l1.enterprise_business_taxonomy (managed_segment_id, parent_segment_id, segment_name, tree_level)
- l1.enterprise_product_taxonomy (product_node_id, product_code, product_name)
- l1.portfolio_dim (portfolio_id, portfolio_code, portfolio_name)
- l1.counterparty (counterparty_id, legal_name, industry_sector)

ROLLUP PATTERN (sum-ratio):
For ratio metrics like LTV, the rollup pattern is:
1. Compute numerator and denominator per facility
2. SUM both components at the target level
3. Divide: SUM(numerator) / SUM(denominator) * 100

Return ONLY the SQL query, no explanation. The SQL must be valid PostgreSQL.`;

/**
 * POST /api/metrics/governance/nl-to-sql
 *
 * Generate SQL from natural language using Claude Haiku.
 *
 * Body: {
 *   prompt: string,
 *   context: { item_id, level, current_sql }
 * }
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = await req.json();
    const { prompt, context } = body as {
      prompt?: string;
      context?: { item_id?: string; level?: string; current_sql?: string };
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

    // Enrich with catalogue context when item_id provided
    let catalogueContext = '';
    if (context?.item_id) {
      const item = getCatalogueItem(context.item_id);
      if (item) {
        const levelKey = context.level ?? 'facility';
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
    }

    const userMessage = [
      catalogueContext ? `Context:\n${catalogueContext}\n` : '',
      `Level: ${context?.level ?? 'facility'}`,
      context?.current_sql ? `Current SQL:\n${context.current_sql}` : '',
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
          system: SYSTEM_PROMPT,
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
          contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }] }],
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

    return jsonSuccess({
      sql: generatedSql,
      provider: anthropicKey ? 'claude' : 'gemini',
    });
  });
}
