import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { validateFormulaSql } from '@/lib/governance/validation';
import { validateSqlSyntax } from '@/lib/governance/sandbox-runner';

/**
 * POST /api/metrics/governance/validate-sql
 *
 * Validate formula SQL safety and syntax.
 * 1. Client-side keyword checks (no DML, single statement)
 * 2. PostgreSQL PREPARE to validate syntax (if DATABASE_URL available)
 *
 * Body: { sql: string }
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = await req.json();
    const { sql } = body as { sql?: string };

    if (!sql || typeof sql !== 'string') {
      return jsonError('sql is required', { status: 400, code: 'VALIDATION_ERROR' });
    }

    // Step 1: Client-side safety checks
    const safetyCheck = validateFormulaSql(sql);
    if (!safetyCheck.valid) {
      return jsonSuccess({
        valid: false,
        error: safetyCheck.error,
        warnings: safetyCheck.warnings,
        syntax_checked: false,
      });
    }

    // Step 2: PostgreSQL PREPARE (if available)
    let syntaxValid = true;
    let syntaxError: string | undefined;
    if (process.env.DATABASE_URL) {
      const result = await validateSqlSyntax(sql);
      syntaxValid = result.valid;
      syntaxError = result.error;
    }

    return jsonSuccess({
      valid: syntaxValid,
      error: syntaxError ?? null,
      warnings: safetyCheck.warnings,
      syntax_checked: !!process.env.DATABASE_URL,
    });
  });
}
