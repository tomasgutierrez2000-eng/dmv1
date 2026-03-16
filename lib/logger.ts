/**
 * Minimal structured logger. Output controlled by NODE_ENV and DEBUG_* env vars.
 * Use for server-side logging; production stays quiet unless explicitly enabled.
 */
/* eslint-disable no-console */

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
const debugModules = new Set(
  (typeof process !== 'undefined' && process.env.DEBUG ? process.env.DEBUG : '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

function shouldLog(module: string, level: 'error' | 'warn' | 'info' | 'debug'): boolean {
  if (level === 'error') return true;
  if (level === 'warn' && isDev) return true;
  if (level === 'info' || level === 'debug') {
    return isDev && (debugModules.size === 0 || debugModules.has(module) || debugModules.has('*'));
  }
  return false;
}

export function logError(module: string, message: string, err?: unknown): void {
  const payload = err instanceof Error ? { message: err.message, stack: err.stack } : err;
  console.error(`[${module}]`, message, payload !== undefined ? payload : '');
}

export function logWarn(module: string, message: string, data?: Record<string, unknown>): void {
  if (shouldLog(module, 'warn')) {
    console.warn(`[${module}]`, message, data ?? '');
  }
}

export function logInfo(module: string, message: string, data?: Record<string, unknown>): void {
  if (shouldLog(module, 'info')) {
    console.info(`[${module}]`, message, data ?? '');
  }
}

export function logDebug(module: string, message: string, data?: Record<string, unknown>): void {
  if (shouldLog(module, 'debug')) {
    console.debug(`[${module}]`, message, data ?? '');
  }
}
