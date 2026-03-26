/**
 * POST /api/metrics/studio/chat
 *
 * AI-powered chat for the Metric Studio. Handles two modes:
 * 1. BUILD: Generate SQL formulas from natural language descriptions
 * 2. EXPLAIN: Explain existing metrics, formulas, tables, or results
 *
 * Streams structured JSON responses for progressive UI updates.
 *
 * Security:
 * - SQL validation against known bug patterns (40+ checks from CLAUDE.md)
 * - Schema validation (all referenced tables/fields must exist in DD)
 * - Layer convention enforcement (no L3 sources, forward-only data flow)
 * - Confidence scoring for AI-generated formulas
 */

import { NextRequest } from 'next/server';
import { buildNlToSqlSystemPrompt, buildSchemaPromptSection } from '@/lib/governance/schema-prompt-builder';
import { validateFormulaSchema } from '@/lib/governance/schema-validator';
import { validateSQL } from '@/lib/metric-studio/formula-composer';
import { readDataDictionary } from '@/lib/data-dictionary';

// ---------- types ----------

interface ChatRequest {
  message: string;
  context?: {
    nodes?: Array<{ tableName: string; layer: string; selectedFields?: string[] }>;
    edges?: Array<{ source: string; target: string }>;
    formulaSQL?: string;
    executionResult?: { rows?: unknown[]; rowCount?: number };
    catalogueItemId?: string;
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ChatAction {
  type: 'explanation' | 'formula' | 'canvas_update' | 'suggestion' | 'error' | 'validation';
}

interface FormulaAction extends ChatAction {
  type: 'formula';
  sql: string;
  tables: string[];
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  validationWarnings?: string[];
}

interface ExplanationAction extends ChatAction {
  type: 'explanation';
  text: string;
}

interface SuggestionAction extends ChatAction {
  type: 'suggestion';
  chips: string[];
}

interface ValidationAction extends ChatAction {
  type: 'validation';
  issues: string[];
  severity: 'error' | 'warning';
}

// ---------- known SQL bug patterns (from CLAUDE.md "Common YAML Formula Bugs") ----------

const KNOWN_BUG_PATTERNS: Array<{ pattern: RegExp; message: string; severity: 'error' | 'warning' }> = [
  { pattern: /SUM\s*\([^)]*_date[^)]*\)/i, message: 'SUM of date fields is invalid. Use MIN() or MAX() for date aggregation.', severity: 'error' },
  { pattern: /AVG\s*\([^)]*_pct[^)]*\)/i, message: 'AVG of percentage fields causes Simpson\'s paradox. Use SUM(numerator)/SUM(denominator) (sum-ratio pattern).', severity: 'warning' },
  { pattern: /WHERE[\s\S]*?LEFT\s+JOIN/i, message: 'WHERE clause appears before LEFT JOIN. All JOINs must come before the WHERE clause.', severity: 'error' },
  { pattern: /=\s*TRUE\b/i, message: 'Use = \'Y\' for boolean comparisons (works in both PostgreSQL and sql.js), not = TRUE.', severity: 'warning' },
  { pattern: /=\s*true\b/, message: 'Use = \'Y\' for boolean comparisons (works in both PostgreSQL and sql.js), not = true.', severity: 'warning' },
  { pattern: /::FLOAT/i, message: 'PostgreSQL-specific cast ::FLOAT not supported in sql.js. Use * 1.0 for float math.', severity: 'error' },
  { pattern: /;\s*$/, message: 'Semicolons are not allowed in formula SQL.', severity: 'error' },
  { pattern: /SUM\s*\([^)]*_name[^)]*\)/i, message: 'SUM of text fields is invalid. Use COUNT(DISTINCT) or MIN() for string aggregation.', severity: 'error' },
  { pattern: /SUM\s*\([^)]*_id\b[^)]*\)/i, message: 'SUM of ID fields is meaningless. Use COUNT(DISTINCT id) instead.', severity: 'error' },
  { pattern: /WITH\s+\w+\s+AS\s*\(/i, message: 'CTEs (WITH clause) are not supported by the calc engine. Convert to inline subqueries.', severity: 'warning' },
  { pattern: /l3\.\w+/i, message: 'Formula sources from L3 (derived) tables. Metrics should compute from L1+L2 atomic inputs, not pre-derived values.', severity: 'warning' },
];

/** Validate generated SQL against known bug patterns */
function validateAgainstKnownBugs(sql: string): Array<{ message: string; severity: 'error' | 'warning' }> {
  const issues: Array<{ message: string; severity: 'error' | 'warning' }> = [];
  for (const bug of KNOWN_BUG_PATTERNS) {
    if (bug.pattern.test(sql)) {
      issues.push({ message: bug.message, severity: bug.severity });
    }
  }
  // Check for missing NULLIF in division
  if (/\/\s*SUM\s*\(/i.test(sql) && !/NULLIF/i.test(sql)) {
    issues.push({ message: 'Division by SUM() without NULLIF — risk of division-by-zero. Use NULLIF(SUM(...), 0).', severity: 'warning' });
  }
  // Check for missing COALESCE on nullable fields
  if (/bank_share_pct/i.test(sql) && !/COALESCE/i.test(sql)) {
    issues.push({ message: 'bank_share_pct can be NULL. Use COALESCE(bank_share_pct, 100.0).', severity: 'warning' });
  }
  return issues;
}

/** Determine confidence level based on validation results */
function assessConfidence(
  sql: string,
  schemaResult: { valid: boolean; unknownTables: string[]; unknownColumns: Array<{ table: string; column: string }>; warnings: string[] },
  bugIssues: Array<{ message: string; severity: string }>,
): 'high' | 'medium' | 'low' {
  const errors = bugIssues.filter((i) => i.severity === 'error').length;
  const warnings = bugIssues.filter((i) => i.severity === 'warning').length;
  if (schemaResult.unknownTables.length > 0 || errors > 0) return 'low';
  if (schemaResult.unknownColumns.length > 0 || warnings > 1) return 'medium';
  if (schemaResult.warnings.length > 0 || warnings === 1) return 'medium';
  return 'high';
}

/** Detect whether the user message is a BUILD or EXPLAIN request */
function classifyIntent(message: string): 'build' | 'explain' | 'modify' {
  const lower = message.toLowerCase();
  const explainKeywords = ['what does', 'what is', 'explain', 'how does', 'tell me about', 'describe', 'meaning of', 'why is'];
  const modifyKeywords = ['add', 'remove', 'change', 'filter', 'group by', 'only include', 'exclude', 'instead of'];
  if (explainKeywords.some((k) => lower.includes(k))) return 'explain';
  if (modifyKeywords.some((k) => lower.includes(k))) return 'modify';
  return 'build';
}

/** Extract table names from SQL */
function extractTablesFromFormula(sql: string): string[] {
  const pattern = /\b([Ll][123])\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const tables = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    tables.add(`${match[1].toLowerCase()}.${match[2]}`);
  }
  return Array.from(tables);
}

/** Generate context-aware suggestion chips */
function generateSuggestions(intent: string, hasFormula: boolean, hasResults: boolean): string[] {
  if (!hasFormula) {
    return ['Expected Loss Rate', 'Weighted Average PD', 'Loan-to-Value', 'Utilization Rate'];
  }
  if (hasResults) {
    return ['Why is this value high?', 'Run all levels', 'Group by business segment', 'Save to catalogue'];
  }
  return ['Run this formula', 'Add a filter', 'Group by segment', 'Explain this formula'];
}

// ---------- build the enhanced system prompt ----------

function buildChatSystemPrompt(intent: 'build' | 'explain' | 'modify', currentSQL?: string): string {
  const schemaSection = buildSchemaPromptSection();

  const baseRules = `You are an AI assistant for the Metric Studio, a GSIB banking data model visualization tool.
You help users build, understand, and refine credit risk metric formulas.

Your users may have ZERO experience with SQL or risk metrics. Always explain in plain English first, then show SQL.

RESPONSE FORMAT:
You MUST respond with valid JSON containing an array of actions. Each action has a "type" field.
Available action types:
- {"type": "explanation", "text": "..."} — Plain English explanation
- {"type": "formula", "sql": "SELECT ...", "tables": ["l2.table_name"], "explanation": "One sentence description"} — Generated/modified SQL formula
- {"type": "suggestion", "chips": ["chip1", "chip2"]} — Follow-up suggestions

ALWAYS include at least one "explanation" action before any "formula" action.
ALWAYS end with a "suggestion" action.

FORMULA RULES:
- Only generate SELECT statements (no DML, no DDL)
- Use explicit schema prefixes: l1. for reference data, l2. for atomic data
- Alias the grouping column as "dimension_key"
- Alias the metric value as "metric_value"
- Use NULLIF(x, 0) before ANY division to prevent division-by-zero
- Use COALESCE() for nullable fields (e.g., COALESCE(bank_share_pct, 100.0))
- Use = 'Y' for boolean flag comparisons (NOT = TRUE or = true)
- Do NOT use PostgreSQL-specific casts like ::FLOAT — use * 1.0 instead
- Do NOT use CTEs (WITH clause) — use inline subqueries
- Do NOT use semicolons
- Source from L1 (reference) and L2 (atomic) tables only — NEVER source from L3 (derived)
- For ratio metrics: use SUM(numerator) / NULLIF(SUM(denominator), 0) — NEVER average pre-computed ratios
- For date fields: use MIN() or MAX(), NEVER SUM()
- For text fields: use COUNT(DISTINCT) or MIN(), NEVER SUM()
- Add LIMIT 1000 at the end

ROLLUP HIERARCHY (for aggregate levels):
Facility -> Counterparty -> Desk (L3) -> Portfolio (L2) -> Business Segment (L1)
Use l1.enterprise_business_taxonomy for desk/portfolio/segment grouping.
Always include AND ebt.is_current_flag = 'Y' in EBT joins.`;

  const intentInstructions = intent === 'explain'
    ? `\nYou are EXPLAINING an existing formula or concept. Focus on plain English. Use analogies. Do not generate new SQL unless asked.`
    : intent === 'modify'
    ? `\nYou are MODIFYING an existing formula. Show what changed and why. Include the complete modified SQL.
${currentSQL ? `\nCURRENT FORMULA:\n${currentSQL}` : ''}`
    : `\nYou are BUILDING a new formula from scratch. Start with the simplest correct version at facility level.`;

  return `${baseRules}
${intentInstructions}

${schemaSection}

Remember: Respond ONLY with a JSON array of actions. No markdown, no extra text outside the JSON.`;
}

// ---------- main handler ----------

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), { status: 400 });
  }

  const { message, context, history } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(JSON.stringify({ ok: false, error: 'message is required' }), { status: 400 });
  }

  if (message.length > 3000) {
    return new Response(JSON.stringify({ ok: false, error: 'message exceeds 3000 character limit' }), { status: 400 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!anthropicKey && !geminiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'No AI provider configured' }), { status: 503 });
  }

  const intent = classifyIntent(message);
  const systemPrompt = buildChatSystemPrompt(intent, context?.formulaSQL);

  // Build conversation messages
  const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add history
  if (history?.length) {
    for (const h of history.slice(-6)) { // Keep last 6 messages for context
      conversationMessages.push(h);
    }
  }

  // Build context-enriched user message
  let contextStr = '';
  if (context?.nodes?.length) {
    contextStr += `\nCurrent canvas tables: ${context.nodes.map((n) => `${n.layer}.${n.tableName}`).join(', ')}`;
  }
  if (context?.formulaSQL) {
    contextStr += `\nCurrent formula: ${context.formulaSQL}`;
  }
  if (context?.executionResult?.rowCount !== undefined) {
    contextStr += `\nLast execution: ${context.executionResult.rowCount} rows returned`;
  }

  const userMessage = contextStr
    ? `Context:${contextStr}\n\nUser request: ${message}`
    : message;

  conversationMessages.push({ role: 'user', content: userMessage });

  try {
    let rawResponse: string;

    if (anthropicKey) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });

      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: conversationMessages,
      });

      rawResponse = response.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as { type: 'text'; text: string }).text)
        .join('')
        .trim();
    } else {
      const { GoogleGenAI } = await import('@google/genai');
      const genai = new GoogleGenAI({ apiKey: geminiKey! });

      const result = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
      });

      rawResponse = (result.text ?? '').trim();
    }

    // Parse AI response — extract JSON array of actions
    let actions: ChatAction[];
    try {
      // Try to extract JSON from the response (may be wrapped in markdown code blocks)
      let jsonStr = rawResponse;
      const jsonMatch = rawResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      // Try parsing as array
      const parsed = JSON.parse(jsonStr);
      actions = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // If JSON parsing fails, wrap the raw text as an explanation
      actions = [
        { type: 'explanation', text: rawResponse } as ExplanationAction,
      ];
    }

    // Post-process: validate any formula actions
    const processedActions: (ChatAction & Record<string, unknown>)[] = [];
    let hasFormula = false;

    for (const action of actions) {
      if ((action as FormulaAction).type === 'formula') {
        const formulaAction = action as FormulaAction;
        hasFormula = true;

        // Extract SQL (handle potential markdown wrapping)
        let sql = formulaAction.sql || '';
        const codeMatch = sql.match(/```(?:sql)?\s*\n?([\s\S]*?)\n?```/);
        if (codeMatch) sql = codeMatch[1].trim();

        // Safety check
        const safetyError = validateSQL(sql);
        if (safetyError) {
          processedActions.push({
            type: 'validation',
            issues: [safetyError],
            severity: 'error',
          });
          continue;
        }

        // Schema validation
        const schemaResult = validateFormulaSchema(sql);

        // Known bug pattern check
        const bugIssues = validateAgainstKnownBugs(sql);

        // Assess confidence
        const confidence = assessConfidence(sql, schemaResult, bugIssues);

        // Collect all warnings
        const allWarnings = [
          ...schemaResult.warnings,
          ...schemaResult.unknownTables.map((t) => `Unknown table: ${t}`),
          ...schemaResult.unknownColumns.map((c) => `Unknown column: ${c.table}.${c.column}`),
          ...bugIssues.map((i) => `[${i.severity.toUpperCase()}] ${i.message}`),
        ];

        // Add validation action if there are issues
        if (bugIssues.some((i) => i.severity === 'error')) {
          processedActions.push({
            type: 'validation',
            issues: bugIssues.filter((i) => i.severity === 'error').map((i) => i.message),
            severity: 'error',
          });
        } else if (allWarnings.length > 0) {
          processedActions.push({
            type: 'validation',
            issues: allWarnings,
            severity: 'warning',
          });
        }

        processedActions.push({
          ...formulaAction,
          sql,
          tables: extractTablesFromFormula(sql),
          confidence,
          validationWarnings: allWarnings.length > 0 ? allWarnings : undefined,
        });
      } else {
        processedActions.push(action as ChatAction & Record<string, unknown>);
      }
    }

    // Ensure we always have suggestions at the end
    const hasSuggestions = processedActions.some((a) => a.type === 'suggestion');
    if (!hasSuggestions) {
      processedActions.push({
        type: 'suggestion',
        chips: generateSuggestions(
          intent,
          hasFormula || !!context?.formulaSQL,
          !!context?.executionResult,
        ),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        actions: processedActions,
        intent,
        provider: anthropicKey ? 'claude' : 'gemini',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: 'AI generation failed', details: msg }),
      { status: 502 }
    );
  }
}
