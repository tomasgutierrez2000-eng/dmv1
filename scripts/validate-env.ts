#!/usr/bin/env npx tsx
/**
 * Validate .env against .env.example.
 * Ensures required vars are documented and optionally checks they are set.
 * Run: npx tsx scripts/validate-env.ts
 * Or: npx tsx scripts/validate-env.ts --require-agent  (fail if no agent key)
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const EXAMPLE = path.join(ROOT, '.env.example');
const ENV = path.join(ROOT, '.env');

function parseEnvFile(p: string): Map<string, string> {
  if (!fs.existsSync(p)) return new Map();
  const content = fs.readFileSync(p, 'utf-8');
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    map.set(key, val);
  }
  return map;
}

function main(): void {
  const requireAgent = process.argv.includes('--require-agent');

  if (!fs.existsSync(EXAMPLE)) {
    console.error('Missing .env.example');
    process.exit(1);
  }

  const example = parseEnvFile(EXAMPLE);
  const env = parseEnvFile(ENV);

  const required = ['DATABASE_URL']; // Only DATABASE_URL is truly required for DB features
  const agentVars = ['GOOGLE_GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'OLLAMA_BASE_URL'];

  let failed = false;

  for (const key of required) {
    if (example.has(key) && !env.get(key)?.trim()) {
      console.warn(`[warn] ${key} is not set (optional for basic run)`);
    }
  }

  if (requireAgent) {
    const hasAgent = agentVars.some((k) => env.get(k)?.trim());
    if (!hasAgent) {
      console.error('[error] No agent backend: set GOOGLE_GEMINI_API_KEY, ANTHROPIC_API_KEY, or OLLAMA_BASE_URL in .env');
      failed = true;
    }
  }

  if (!fs.existsSync(ENV)) {
    console.warn('[warn] .env not found. Copy from .env.example: cp .env.example .env');
  }

  if (failed) process.exit(1);
  console.log('Env validation OK');
}

main();
