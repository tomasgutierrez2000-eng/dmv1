/**
 * Python file validator — validates uploaded Python calculator files for the
 * metric calculation engine using pure text/regex analysis (no Python execution).
 *
 * Detects two modes:
 *  - **Full mode**: a class extending BaseCalculator with required class
 *    attributes (metric_id, catalogue_id, name) and required methods
 *    (facility_level, counterparty_level, desk_level).
 *  - **Simple mode**: a standalone top-level `facility_level` function.
 *
 * Also performs safety checks to reject files with dangerous imports or calls.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PythonValidationResult {
  valid: boolean;
  mode: 'full' | 'simple' | 'unknown';
  /** Class name for full mode (e.g. "DSCRCalculator") */
  className?: string;
  /** Function name for simple mode (always "facility_level") */
  functionName?: string;
  /** Extracted metric_id class attribute value */
  metricId?: string;
  /** Extracted catalogue_id class attribute value */
  catalogueId?: string;
  /** Extracted name class attribute value */
  calculatorName?: string;
  issues: PythonValidationIssue[];
}

export interface PythonValidationIssue {
  severity: 'error' | 'warning';
  /** 1-based line number where the issue was detected, if applicable */
  line?: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 50_000; // 50 KB

/** Modules that must never be imported. */
const DANGEROUS_MODULES = ['os', 'sys', 'subprocess', 'shutil'] as const;

/** Callable patterns that indicate unsafe code. */
const DANGEROUS_CALLS = ['eval(', 'exec(', 'open(', '__import__('] as const;

/** Required methods for full mode (BaseCalculator subclass). */
const REQUIRED_METHODS = [
  'facility_level',
  'counterparty_level',
  'desk_level',
] as const;

/** Required class attributes for full mode. */
const REQUIRED_ATTRIBUTES = [
  'metric_id',
  'catalogue_id',
  'name',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip Python comments and basic string literals from a line so that safety
 * checks do not trigger on content inside comments or strings.
 *
 * This is intentionally simple: it removes `# ...` comments and replaces
 * quoted strings (single, double, triple-quoted) with empty placeholders.
 * It does not handle all edge cases (e.g. escaped quotes inside strings)
 * but is sufficient for a safety-focused heuristic check.
 */
function stripCommentsAndStrings(line: string): string {
  // Remove triple-quoted strings first (""" ... """ or ''' ... ''')
  let cleaned = line.replace(/"""[^]*?"""/g, '""');
  cleaned = cleaned.replace(/'''[^]*?'''/g, "''");
  // Remove regular strings
  cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  // Remove inline comments (# to end of line)
  const hashIdx = cleaned.indexOf('#');
  if (hashIdx >= 0) {
    cleaned = cleaned.slice(0, hashIdx);
  }
  return cleaned;
}

/**
 * Return true if the line is a pure comment line (ignoring leading whitespace).
 */
function isCommentLine(line: string): boolean {
  return /^\s*#/.test(line);
}

/**
 * Build a "cleaned" version of the full file content where each line has
 * comments and string literals removed. Used for safety scanning.
 */
function buildCleanedLines(content: string): string[] {
  return content.split('\n').map((line) =>
    isCommentLine(line) ? '' : stripCommentsAndStrings(line)
  );
}

// ---------------------------------------------------------------------------
// Safety checks
// ---------------------------------------------------------------------------

/**
 * Scan cleaned lines for dangerous imports.
 * Looks for `import <module>` and `from <module> import ...` patterns.
 */
function checkDangerousImports(
  cleanedLines: string[],
  issues: PythonValidationIssue[]
): void {
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i].trim();
    if (!line) continue;

    for (const mod of DANGEROUS_MODULES) {
      // Match: import os, import os.path, from os import ...
      const importPattern = new RegExp(
        `^import\\s+${mod}\\b|^from\\s+${mod}\\b`
      );
      if (importPattern.test(line)) {
        issues.push({
          severity: 'error',
          line: i + 1,
          message: `Dangerous import detected: '${mod}' is not allowed.`,
        });
      }
    }
  }
}

/**
 * Scan cleaned lines for dangerous function calls.
 */
function checkDangerousCalls(
  cleanedLines: string[],
  issues: PythonValidationIssue[]
): void {
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    if (!line.trim()) continue;

    for (const call of DANGEROUS_CALLS) {
      if (line.includes(call)) {
        // Extract the function name portion (without the trailing paren)
        const funcName = call.slice(0, -1);
        issues.push({
          severity: 'error',
          line: i + 1,
          message: `Dangerous call detected: '${funcName}()' is not allowed.`,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Mode detection — Full (BaseCalculator subclass)
// ---------------------------------------------------------------------------

interface FullModeInfo {
  className: string;
  metricId?: string;
  catalogueId?: string;
  calculatorName?: string;
  /** Set of required methods that were found in the class body. */
  foundMethods: Set<string>;
}

/**
 * Try to detect full mode: a class that extends BaseCalculator.
 * Returns null if no such class is found.
 */
function detectFullMode(content: string): FullModeInfo | null {
  const classMatch = content.match(
    /class\s+(\w+)\s*\(\s*BaseCalculator\s*\)/
  );
  if (!classMatch) return null;

  const className = classMatch[1];

  // Extract class attributes — these are defined at class body level,
  // typically as `metric_id = "..."` or `metric_id: str = "..."`.
  const metricIdMatch = content.match(
    /metric_id\s*(?::\s*\w+\s*)?=\s*["']([^"']+)["']/
  );
  const catalogueIdMatch = content.match(
    /catalogue_id\s*(?::\s*\w+\s*)?=\s*["']([^"']+)["']/
  );
  // The "name" attribute — be specific to avoid matching random variables.
  // Look for assignment at class body indentation level (4 spaces or 1 tab).
  const nameMatch = content.match(
    /(?:^|\n)[ \t]+name\s*(?::\s*\w+\s*)?=\s*["']([^"']+)["']/
  );

  // Find which of the required methods are defined
  const foundMethods = new Set<string>();
  for (const method of REQUIRED_METHODS) {
    const methodPattern = new RegExp(`def\\s+${method}\\s*\\(`);
    if (methodPattern.test(content)) {
      foundMethods.add(method);
    }
  }

  return {
    className,
    metricId: metricIdMatch?.[1],
    catalogueId: catalogueIdMatch?.[1],
    calculatorName: nameMatch?.[1],
    foundMethods,
  };
}

// ---------------------------------------------------------------------------
// Mode detection — Simple (top-level facility_level function)
// ---------------------------------------------------------------------------

/**
 * Try to detect simple mode: a top-level (unindented) `def facility_level(...)`.
 * Returns true if found.
 */
function detectSimpleMode(content: string): boolean {
  // Match `def facility_level(` at the start of a line (no leading whitespace)
  return /^def\s+facility_level\s*\(/m.test(content);
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

/**
 * Validate a Python calculator file using pure text/regex analysis.
 *
 * @param content     - The raw Python file content as a string.
 * @param expectedMetricId - If provided, verifies that the metric_id attribute
 *                           in a full-mode class matches this value.
 * @returns A validation result with mode, extracted identifiers, and issues.
 */
export function validatePythonFile(
  content: string,
  expectedMetricId?: string
): PythonValidationResult {
  const issues: PythonValidationIssue[] = [];

  // ------------------------------------------------------------------
  // 1. File size check
  // ------------------------------------------------------------------
  if (content.length > MAX_FILE_SIZE) {
    issues.push({
      severity: 'error',
      message: `File is too large (${content.length.toLocaleString()} bytes). Maximum allowed size is ${MAX_FILE_SIZE.toLocaleString()} bytes.`,
    });
    return { valid: false, mode: 'unknown', issues };
  }

  // ------------------------------------------------------------------
  // 2. Build cleaned lines for safety scanning
  // ------------------------------------------------------------------
  const cleanedLines = buildCleanedLines(content);

  // ------------------------------------------------------------------
  // 3. Safety checks — dangerous imports and calls
  // ------------------------------------------------------------------
  checkDangerousImports(cleanedLines, issues);
  checkDangerousCalls(cleanedLines, issues);

  // If any safety errors were found, bail early with mode unknown
  if (issues.some((i) => i.severity === 'error')) {
    return { valid: false, mode: 'unknown', issues };
  }

  // ------------------------------------------------------------------
  // 4. Try full mode detection first
  // ------------------------------------------------------------------
  const fullInfo = detectFullMode(content);
  if (fullInfo) {
    return validateFullMode(fullInfo, content, expectedMetricId, issues);
  }

  // ------------------------------------------------------------------
  // 5. Try simple mode detection
  // ------------------------------------------------------------------
  if (detectSimpleMode(content)) {
    return validateSimpleMode(content, issues);
  }

  // ------------------------------------------------------------------
  // 6. Neither mode detected
  // ------------------------------------------------------------------
  issues.push({
    severity: 'error',
    message:
      'Could not detect a valid calculator. Expected either a class extending ' +
      'BaseCalculator or a top-level facility_level() function.',
  });

  return { valid: false, mode: 'unknown', issues };
}

// ---------------------------------------------------------------------------
// Full mode validation
// ---------------------------------------------------------------------------

function validateFullMode(
  info: FullModeInfo,
  content: string,
  expectedMetricId: string | undefined,
  issues: PythonValidationIssue[]
): PythonValidationResult {
  // Check required methods
  for (const method of REQUIRED_METHODS) {
    if (!info.foundMethods.has(method)) {
      issues.push({
        severity: 'error',
        message: `Missing required method '${method}' in class '${info.className}'.`,
      });
    }
  }

  // Check required class attributes
  if (!info.metricId) {
    issues.push({
      severity: 'error',
      message: `Class '${info.className}' is missing a 'metric_id' attribute.`,
    });
  }
  if (!info.catalogueId) {
    issues.push({
      severity: 'warning',
      message: `Class '${info.className}' is missing a 'catalogue_id' attribute.`,
    });
  }
  if (!info.calculatorName) {
    issues.push({
      severity: 'warning',
      message: `Class '${info.className}' is missing a 'name' attribute.`,
    });
  }

  // Check metric_id match if expected
  if (expectedMetricId && info.metricId && info.metricId !== expectedMetricId) {
    issues.push({
      severity: 'error',
      message:
        `metric_id mismatch: file declares '${info.metricId}' but ` +
        `expected '${expectedMetricId}'.`,
    });
  }

  // Warn if pandas is not imported (likely needed for all calculators)
  if (!/import\s+pandas\b|from\s+pandas\b/.test(content)) {
    issues.push({
      severity: 'warning',
      message: "File does not import 'pandas'. Most calculators need it.",
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    valid: !hasErrors,
    mode: 'full',
    className: info.className,
    metricId: info.metricId,
    catalogueId: info.catalogueId,
    calculatorName: info.calculatorName,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Simple mode validation
// ---------------------------------------------------------------------------

function validateSimpleMode(
  content: string,
  issues: PythonValidationIssue[]
): PythonValidationResult {
  // Verify the function signature looks reasonable (has loader and as_of_date params)
  const sigMatch = content.match(
    /^def\s+facility_level\s*\(([^)]*)\)/m
  );
  if (sigMatch) {
    const params = sigMatch[1];
    if (!params.includes('loader')) {
      issues.push({
        severity: 'warning',
        message:
          "facility_level() signature does not include a 'loader' parameter. " +
          'Expected signature: facility_level(loader, as_of_date).',
      });
    }
    if (!params.includes('as_of_date')) {
      issues.push({
        severity: 'warning',
        message:
          "facility_level() signature does not include an 'as_of_date' parameter. " +
          'Expected signature: facility_level(loader, as_of_date).',
      });
    }
  }

  // Check for optional companion functions
  const hasCounterparty = /^def\s+counterparty_level\s*\(/m.test(content);
  const hasDesk = /^def\s+desk_level\s*\(/m.test(content);

  if (!hasCounterparty) {
    issues.push({
      severity: 'warning',
      message:
        'No top-level counterparty_level() function found. Only facility-level ' +
        'calculations will be available.',
    });
  }
  if (!hasDesk) {
    issues.push({
      severity: 'warning',
      message:
        'No top-level desk_level() function found. Only facility-level ' +
        'calculations will be available.',
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    valid: !hasErrors,
    mode: 'simple',
    functionName: 'facility_level',
    issues,
  };
}
